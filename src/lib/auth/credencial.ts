import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

const COOKIE_NAME = "atilra_mi_credencial";
const DURACION_SEGUNDOS = 7 * 24 * 60 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function firmar(payload: string): string {
  const clave = process.env.CRON_SECRET || process.env.TERMINAL_BRIDGE_SECRET;
  if (!clave) throw new Error("Falta CRON_SECRET o TERMINAL_BRIDGE_SECRET para proteger la sesión de credencial.");
  return createHmac("sha256", clave).update(payload).digest("base64url");
}

export async function guardarSesionCredencial(usuarioId: string): Promise<void> {
  const payload = Buffer.from(JSON.stringify({
    sub: usuarioId,
    exp: Math.floor(Date.now() / 1000) + DURACION_SEGUNDOS,
  })).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${payload}.${firmar(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_SEGUNDOS,
  });
}

export async function leerUsuarioCredencialId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  const [payload, firma, extra] = token.split(".");
  if (!payload || !firma || extra || !/^[A-Za-z0-9_-]+$/.test(payload)) return null;
  const esperada = Buffer.from(firmar(payload));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;

  try {
    const datos = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: unknown; exp?: unknown };
    if (typeof datos.sub !== "string" || !UUID.test(datos.sub)) return null;
    if (typeof datos.exp !== "number" || datos.exp <= Math.floor(Date.now() / 1000)) return null;
    return datos.sub;
  } catch {
    return null;
  }
}

export async function obtenerUsuarioCredencialId(): Promise<string | null> {
  const usuarioId = await leerUsuarioCredencialId();
  if (!usuarioId) return null;

  const { data, error } = await createAdminClient()
    .from("usuarios")
    .select("id, activo")
    .eq("id", usuarioId)
    .maybeSingle();
  if (error) throw new Error(`No se pudo verificar la sesión de credencial: ${error.message}`);
  return data?.activo ? data.id : null;
}

export async function requerirUsuarioCredencialId(): Promise<string> {
  const usuarioId = await obtenerUsuarioCredencialId();
  if (!usuarioId) redirect("/mi-credencial");
  return usuarioId;
}

export async function cerrarSesionCredencial(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
