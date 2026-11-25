import { createHash, timingSafeEqual } from "node:crypto";
import { normalizarDni } from "@/lib/validaciones";
import { registrarFichadaTerminal } from "@/lib/terminal/fichada";

export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 4096;

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
    return Response.json({ ok: false, error: "La terminal biométrica no está configurada." }, { status: 503 });
  }
  if (!secretoValido(request.headers.get("x-terminal-key"))) {
    return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const longitud = Number(request.headers.get("content-length") ?? 0);
  if (longitud > MAX_BODY_BYTES) {
    return Response.json({ ok: false, error: "La solicitud supera el tamaño permitido." }, { status: 413 });
  }
  const lector = request.body?.getReader();
  const fragmentos: Uint8Array[] = [];
  let bytes = 0;
  if (lector) {
    while (true) {
      const { done, value } = await lector.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await lector.cancel();
        return Response.json({ ok: false, error: "La solicitud supera el tamaño permitido." }, { status: 413 });
      }
      fragmentos.push(value);
    }
  }
  const texto = Buffer.concat(fragmentos.map((parte) => Buffer.from(parte))).toString("utf8");

  let body: unknown;
  try {
    body = JSON.parse(texto);
  } catch {
    return Response.json({ ok: false, error: "El cuerpo debe ser JSON válido." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ ok: false, error: "El cuerpo debe ser un objeto JSON." }, { status: 400 });
  }

  const datos = body as Record<string, unknown>;
  const tieneHuella = typeof datos.huella_template_id === "string" && datos.huella_template_id.trim().length > 0;
  const tieneDni = typeof datos.dni === "string" && datos.dni.trim().length > 0;
  if (tieneHuella === tieneDni) {
    return Response.json({ ok: false, error: "Enviá exactamente uno: huella_template_id o dni." }, { status: 400 });
  }

  if (tieneHuella) {
    const plantilla = (datos.huella_template_id as string).trim();
    if (plantilla.length > 512 || /[\u0000-\u001f\u007f]/.test(plantilla)) {
      return Response.json({ ok: false, error: "El identificador de huella no es válido." }, { status: 400 });
    }
    const resultado = await registrarFichadaTerminal({ tipo: "huella", valor: plantilla });
    return Response.json(resultado, { status: resultado.ok ? 200 : resultado.status });
  }

  const dni = normalizarDni(datos.dni as string);
  if (dni.length < 7 || dni.length > 8) {
    return Response.json({ ok: false, error: "El DNI debe tener 7 u 8 dígitos." }, { status: 400 });
  }
  const resultado = await registrarFichadaTerminal({ tipo: "dni", valor: dni });
  return Response.json(resultado, { status: resultado.ok ? 200 : resultado.status });
}
