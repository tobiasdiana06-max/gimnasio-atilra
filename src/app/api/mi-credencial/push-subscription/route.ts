import { obtenerUsuarioCredencialId } from "@/lib/auth/credencial";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function responder(body: { ok: false; error: string }, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function mismoOrigen(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function suscripcionValida(valor: unknown): valor is {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} {
  if (!valor || typeof valor !== "object") return false;
  const suscripcion = valor as Record<string, unknown>;
  if (typeof suscripcion.endpoint !== "string" || suscripcion.endpoint.length > 2048) return false;
  try {
    if (new URL(suscripcion.endpoint).protocol !== "https:") return false;
  } catch {
    return false;
  }
  if (!suscripcion.keys || typeof suscripcion.keys !== "object") return false;
  const keys = suscripcion.keys as Record<string, unknown>;
  return typeof keys.p256dh === "string"
    && keys.p256dh.length <= 256
    && typeof keys.auth === "string"
    && keys.auth.length <= 256;
}

export async function POST(request: Request): Promise<Response> {
  if (!mismoOrigen(request)) return responder({ ok: false, error: "Solicitud no permitida." }, 403);
  const usuarioId = await obtenerUsuarioCredencialId();
  if (!usuarioId) return responder({ ok: false, error: "Iniciá sesión en Mi Credencial para activar las notificaciones." }, 401);

  let subscription: unknown;
  try {
    subscription = (await request.json() as { subscription?: unknown }).subscription;
  } catch {
    return responder({ ok: false, error: "La suscripción recibida no es válida." }, 400);
  }
  if (!suscripcionValida(subscription)) {
    return responder({ ok: false, error: "La suscripción del dispositivo no es válida." }, 400);
  }

  const supabase = createAdminClient();
  const { data: existente, error: errorConsulta } = await supabase
    .from("push_subscriptions")
    .select("usuario_id")
    .eq("endpoint", subscription.endpoint)
    .maybeSingle();
  if (errorConsulta) return responder({ ok: false, error: "No se pudo guardar la suscripción." }, 500);
  if (existente && existente.usuario_id !== usuarioId) {
    return responder({ ok: false, error: "Este dispositivo ya está asociado a otra credencial." }, 409);
  }

  const { error } = existente
    ? await supabase
        .from("push_subscriptions")
        .update({ subscription, updated_at: new Date().toISOString() })
        .eq("endpoint", subscription.endpoint)
        .eq("usuario_id", usuarioId)
    : await supabase.from("push_subscriptions").insert({
        usuario_id: usuarioId,
        endpoint: subscription.endpoint,
        subscription,
      });

  if (error) return responder({ ok: false, error: "No se pudo guardar la suscripción." }, 500);
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request): Promise<Response> {
  if (!mismoOrigen(request)) return responder({ ok: false, error: "Solicitud no permitida." }, 403);
  const usuarioId = await obtenerUsuarioCredencialId();
  if (!usuarioId) return responder({ ok: false, error: "Iniciá sesión en Mi Credencial para administrar las notificaciones." }, 401);

  let endpoint: unknown;
  try {
    endpoint = (await request.json() as { endpoint?: unknown }).endpoint;
  } catch {
    return responder({ ok: false, error: "El dispositivo indicado no es válido." }, 400);
  }
  if (typeof endpoint !== "string" || endpoint.length > 2048) {
    return responder({ ok: false, error: "El dispositivo indicado no es válido." }, 400);
  }
  try {
    if (new URL(endpoint).protocol !== "https:") {
      return responder({ ok: false, error: "El dispositivo indicado no es válido." }, 400);
    }
  } catch {
    return responder({ ok: false, error: "El dispositivo indicado no es válido." }, 400);
  }

  const { error } = await createAdminClient()
    .from("push_subscriptions")
    .delete()
    .eq("usuario_id", usuarioId)
    .eq("endpoint", endpoint);
  if (error) return responder({ ok: false, error: "No se pudo desactivar la suscripción." }, 500);
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
