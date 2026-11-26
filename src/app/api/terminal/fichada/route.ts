import { createHash, timingSafeEqual } from "node:crypto";
import { normalizarDni } from "@/lib/validaciones";
import { registrarFichadaTerminal } from "@/lib/terminal/fichada";

export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 4096;
const RESPONSE_HEADERS = { "Cache-Control": "no-store" };

function responder(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

function secretoValido(presentado: string | null): boolean {
  const esperado = process.env.TERMINAL_BRIDGE_SECRET;
  if (!esperado || !presentado) return false;
  const a = createHash("sha256").update(esperado).digest();
  const b = createHash("sha256").update(presentado).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const esperado = process.env.TERMINAL_BRIDGE_SECRET;
  if (!esperado) {
    return responder({ ok: false, error: "La terminal biométrica no está configurada." }, 503);
  }
  if (!secretoValido(request.headers.get("x-terminal-key"))) {
    return responder({ ok: false, error: "No autorizado." }, 401);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return responder({ ok: false, error: "El contenido debe ser JSON." }, 415);
  }

  const longitud = Number(request.headers.get("content-length") ?? 0);
  if (longitud > MAX_BODY_BYTES) {
    return responder({ ok: false, error: "La solicitud supera el tamaño permitido." }, 413);
  }
  const lector = request.body?.getReader();
  const fragmentos: Uint8Array[] = [];
  let bytes = 0;
  try {
    if (lector) {
      while (true) {
        const { done, value } = await lector.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BODY_BYTES) {
          await lector.cancel();
          return responder({ ok: false, error: "La solicitud supera el tamaño permitido." }, 413);
        }
        fragmentos.push(value);
      }
    }
  } catch {
    return responder({ ok: false, error: "No se pudo leer el cuerpo de la solicitud." }, 400);
  }
  const texto = Buffer.concat(fragmentos.map((parte) => Buffer.from(parte))).toString("utf8");

  let body: unknown;
  try {
    body = JSON.parse(texto);
  } catch {
    return responder({ ok: false, error: "El cuerpo debe ser JSON válido." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return responder({ ok: false, error: "El cuerpo debe ser un objeto JSON." }, 400);
  }

  const datos = body as Record<string, unknown>;
  const campos = Object.keys(datos);
  if (
    campos.length !== 1
    || !["huella_template_id", "dni"].includes(campos[0])
    || typeof datos[campos[0]] !== "string"
  ) {
    return responder({ ok: false, error: "Enviá exactamente uno: huella_template_id o dni." }, 400);
  }

  if (campos[0] === "huella_template_id") {
    const plantilla = (datos.huella_template_id as string).trim();
    if (!plantilla) return responder({ ok: false, error: "El identificador de huella no es válido." }, 400);
    if (plantilla.length > 512 || /[\u0000-\u001f\u007f]/.test(plantilla)) {
      return responder({ ok: false, error: "El identificador de huella no es válido." }, 400);
    }
    const resultado = await registrarFichadaTerminal({ tipo: "huella", valor: plantilla });
    return responder(resultado, resultado.ok ? 200 : resultado.status);
  }

  const dniEntrada = (datos.dni as string).trim();
  const dni = normalizarDni(dniEntrada);
  if (!/^[\d\s.-]+$/.test(dniEntrada) || dni.length < 7 || dni.length > 8) {
    return responder({ ok: false, error: "El DNI debe tener 7 u 8 dígitos." }, 400);
  }
  const resultado = await registrarFichadaTerminal({ tipo: "dni", valor: dni });
  return responder(resultado, resultado.ok ? 200 : resultado.status);
}
