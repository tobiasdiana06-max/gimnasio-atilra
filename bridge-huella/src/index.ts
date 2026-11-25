import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createInterface } from "node:readline";
import { setTimeout as sleep } from "node:timers/promises";
import { createReader, type FingerprintReader } from "./reader";

interface TerminalResult {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

interface BridgeEvent {
  sequence: number;
  received_at: string;
  result: TerminalResult;
}

const nextAppUrl = process.env.NEXT_APP_URL?.replace(/\/+$/, "");
const terminalSecret = process.env.TERMINAL_BRIDGE_SECRET;
const modeValue = process.env.BRIDGE_MODE ?? "simulator";
const port = Number(process.env.BRIDGE_PORT ?? "8787");

if (!nextAppUrl) throw new Error("Falta NEXT_APP_URL en bridge-huella/.env.");
if (!terminalSecret || terminalSecret.length < 24) {
  throw new Error("TERMINAL_BRIDGE_SECRET es obligatorio y debe tener al menos 24 caracteres.");
}
if (modeValue !== "simulator" && modeValue !== "hardware") {
  throw new Error("BRIDGE_MODE debe ser simulator o hardware.");
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("BRIDGE_PORT debe ser un puerto válido.");
}

const mode = modeValue as "simulator" | "hardware";
const panelUrl = new URL(nextAppUrl);
const esLoopback = panelUrl.hostname === "localhost" || panelUrl.hostname === "127.0.0.1" || panelUrl.hostname === "[::1]";
if (panelUrl.protocol !== "https:" && !(panelUrl.protocol === "http:" && esLoopback)) {
  throw new Error("NEXT_APP_URL debe usar HTTPS; HTTP solo se permite para desarrollo local.");
}
const allowedOrigin = panelUrl.origin;
const reader: FingerprintReader = createReader(mode);
let eventSequence = 0;
let lastEvent: BridgeEvent | null = null;

function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(value));
}

async function bodyText(request: IncomingMessage, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > maxBytes) throw new Error("El cuerpo supera el tamaño permitido.");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function setCors(response: ServerResponse): void {
  response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Vary", "Origin");
}

async function registrarEnNube(identificador: { dni: string } | { huella_template_id: string }): Promise<TerminalResult> {
  let resultado: TerminalResult;
  try {
    const response = await fetch(`${nextAppUrl}/api/terminal/fichada`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-terminal-key": terminalSecret as string,
      },
      body: JSON.stringify(identificador),
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await response.json() as TerminalResult;
    resultado = payload && typeof payload === "object"
      ? payload
      : { ok: false, error: "El servidor devolvió una respuesta inválida." };
    if (!response.ok && resultado.ok) {
      resultado = { ok: false, error: `El servidor rechazó la fichada (${response.status}).` };
    }
  } catch (error) {
    const detalle = error instanceof Error ? error.message : "Error de red desconocido.";
    resultado = { ok: false, error: `No se pudo contactar al panel: ${detalle}` };
  }

  lastEvent = {
    sequence: ++eventSequence,
    received_at: new Date().toISOString(),
    result: resultado,
  };
  if (resultado.ok) {
    const usuario = resultado.usuario as { apellido?: string; nombre?: string } | undefined;
    console.log(`Fichada aceptada por el panel: ${usuario ? `${usuario.apellido ?? ""}, ${usuario.nombre ?? ""}` : "usuario validado"}.`);
  } else {
    console.warn(`Fichada no validada: ${resultado.error ?? "sin detalle"}`);
  }
  return resultado;
}

function origenPermitido(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  return !origin || origin === allowedOrigin;
}

const server = createServer((request, response) => {
  void (async () => {
    const origin = request.headers.origin;
    if (!origenPermitido(request)) {
      json(response, 403, { ok: false, error: "Origen no permitido." });
      return;
    }
    if (origin === allowedOrigin) setCors(response);

    if (request.method === "OPTIONS") {
      if (origin !== allowedOrigin) {
        json(response, 403, { ok: false, error: "Origen no permitido." });
        return;
      }
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
    if (request.method === "GET" && url.pathname === "/health") {
      const estado = await reader.getStatus();
      json(response, 200, { ok: true, mode, readerConnected: estado.connected, readerName: estado.name });
      return;
    }
    if (request.method === "GET" && url.pathname === "/last-event") {
      json(response, 200, { event: lastEvent });
      return;
    }
    if (request.method === "POST" && url.pathname === "/enroll") {
      if (origin !== allowedOrigin) {
        json(response, 403, { ok: false, error: "El enrolamiento requiere un origen del panel autorizado." });
        return;
      }
      const contentLength = Number(request.headers["content-length"] ?? 0);
      if (contentLength > 4096) {
        json(response, 413, { ok: false, error: "La solicitud supera el tamaño permitido." });
        return;
      }
      let payload: unknown;
      try {
        payload = JSON.parse(await bodyText(request, 4096));
      } catch (error) {
        json(response, 400, { ok: false, error: error instanceof Error ? error.message : "JSON inválido." });
        return;
      }
      const usuarioId =
        payload && typeof payload === "object" && "usuario_id" in payload
          ? (payload as { usuario_id?: unknown }).usuario_id
          : null;
      if (typeof usuarioId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(usuarioId)) {
        json(response, 400, { ok: false, error: "El usuario indicado no es válido." });
        return;
      }
      try {
        const templateId = await reader.enrollTemplateId();
        console.log(`Enrolamiento completado para usuario ${usuarioId}.`);
        json(response, 200, { ok: true, huella_template_id: templateId });
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : "El lector no pudo enrolar la huella.";
        json(response, 503, { ok: false, error: mensaje });
      }
      return;
    }

    json(response, 404, { ok: false, error: "Ruta local no encontrada." });
  })().catch((error: unknown) => {
    console.error("Error en el servidor local del puente:", error);
    if (!response.headersSent) json(response, 500, { ok: false, error: "Error interno del puente local." });
    else response.destroy();
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Puente ATILRA escuchando solo en 127.0.0.1:${port} (${mode}).`);
  console.log(`Panel autorizado: ${allowedOrigin}`);
});

async function cicloLector(): Promise<void> {
  while (true) {
    try {
      const templateId = await reader.readMatchedTemplateId();
      if (templateId) await registrarEnNube({ huella_template_id: templateId });
    } catch (error) {
      console.error("Error del SDK del lector:", error);
    }
    await sleep(350);
  }
}

if (mode === "hardware") {
  void cicloLector();
} else {
  console.log("Simulador listo. Comandos: dni <número>, huella <template-id>, enrol, salir.");
  const consola = createInterface({ input: process.stdin, output: process.stdout, prompt: "lector> " });
  let consolaAbierta = true;
  consola.on("close", () => {
    consolaAbierta = false;
  });
  consola.prompt();
  consola.on("line", (line) => {
    const [comando, ...partes] = line.trim().split(/\s+/);
    const valor = partes.join(" ");
    void (async () => {
      if (comando === "salir") {
        consola.close();
        server.close();
        return;
      }
      if (comando === "dni" && valor) {
        await registrarEnNube({ dni: valor });
      } else if (comando === "huella" && valor) {
        await registrarEnNube({ huella_template_id: valor });
      } else if (comando === "enrol") {
        const templateId = await reader.enrollTemplateId();
        console.log(`Plantilla simulada: ${templateId}. Enrolala desde la ficha del usuario para asociarla.`);
      } else {
        console.log("Comando no reconocido. Usá dni <número>, huella <template-id>, enrol o salir.");
      }
      if (consolaAbierta) consola.prompt();
    })().catch((error: unknown) => {
      console.error("Error en el simulador:", error);
      if (consolaAbierta) consola.prompt();
    });
  });
}
