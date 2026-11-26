import { createHash, timingSafeEqual } from "node:crypto";
import * as webpush from "web-push";
import type { PushSubscription } from "web-push";
import { HITOS_RECORDATORIO } from "@/lib/constants";
import { esFechaISO, hoyISO } from "@/lib/fechas";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function responder(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

type TipoVencimiento = "alta_medica" | "cuota" | "afiliacion";

interface EstadoCron {
  usuario_id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  alta_vencimiento: string | null;
  cuota_vencimiento: string | null;
  afiliacion_vencimiento: string | null;
}

interface Recordatorio {
  usuario: EstadoCron;
  tipo: TipoVencimiento;
  hitoDias: number;
  fechaReferencia: string;
}

interface SuscripcionPush {
  endpoint: string;
  subscription: PushSubscription;
}

function suscripcionPushValida(valor: unknown): valor is PushSubscription {
  if (!valor || typeof valor !== "object") return false;
  const suscripcion = valor as Record<string, unknown>;
  if (typeof suscripcion.endpoint !== "string" || !suscripcion.endpoint.startsWith("https://")) return false;
  if (!suscripcion.keys || typeof suscripcion.keys !== "object") return false;
  const keys = suscripcion.keys as Record<string, unknown>;
  return typeof keys.p256dh === "string" && typeof keys.auth === "string";
}

async function enviarPushVencimiento(
  supabase: ReturnType<typeof createAdminClient>,
  recordatorio: Recordatorio,
): Promise<{ enviados: number; error: string | null }> {
  const { data: registro, error: errorRegistro } = await supabase
    .from("push_notificaciones_enviadas")
    .select("enviado_at")
    .eq("usuario_id", recordatorio.usuario.usuario_id)
    .eq("tipo", recordatorio.tipo)
    .eq("hito_dias", recordatorio.hitoDias)
    .eq("fecha_referencia", recordatorio.fechaReferencia)
    .maybeSingle();
  if (errorRegistro) return { enviados: 0, error: "No se pudo consultar el estado del aviso push." };
  if (registro?.enviado_at) return { enviados: 0, error: null };

  const { data: filas, error: errorSuscripciones } = await supabase
    .from("push_subscriptions")
    .select("endpoint, subscription")
    .eq("usuario_id", recordatorio.usuario.usuario_id);
  if (errorSuscripciones) return { enviados: 0, error: "No se pudieron consultar los dispositivos suscritos." };

  const suscripciones = (filas ?? []).filter((fila): fila is SuscripcionPush =>
    typeof fila.endpoint === "string" && suscripcionPushValida(fila.subscription),
  );
  if (suscripciones.length === 0) return { enviados: 0, error: null };

  const payload = JSON.stringify({
    title: "Recordatorio de vencimiento",
    body: "Tenés un vencimiento próximo. Ingresá a Mi Credencial para ver los detalles.",
  });

  let enviados = 0;
  let fallidos = false;
  for (const fila of suscripciones) {
    try {
      await webpush.sendNotification(fila.subscription, payload);
      enviados += 1;
    } catch (error) {
      fallidos = true;
      const statusCode = typeof error === "object" && error !== null && "statusCode" in error
        ? error.statusCode
        : null;
      if (statusCode === 404 || statusCode === 410) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("usuario_id", recordatorio.usuario.usuario_id)
          .eq("endpoint", fila.endpoint);
      }
    }
  }

  if (fallidos) return { enviados, error: "No se pudieron entregar todos los avisos push." };
  const { error: errorActualizacion } = await supabase
    .from("push_notificaciones_enviadas")
    .insert({
      usuario_id: recordatorio.usuario.usuario_id,
      tipo: recordatorio.tipo,
      hito_dias: recordatorio.hitoDias,
      fecha_referencia: recordatorio.fechaReferencia,
    });
  if (errorActualizacion && errorActualizacion.code !== "23505") {
    return { enviados, error: "No se pudo registrar la entrega de los avisos push." };
  }
  return { enviados, error: null };
}

function autorizado(authorization: string | null, secret: string): boolean {
  if (!authorization?.startsWith("Bearer ")) return false;
  const recibido = authorization.slice("Bearer ".length);
  const esperadoHash = createHash("sha256").update(secret).digest();
  const recibidoHash = createHash("sha256").update(recibido).digest();
  return timingSafeEqual(esperadoHash, recibidoHash);
}

function diasHasta(fecha: string, hoy: string): number {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const [anioHoy, mesHoy, diaHoy] = hoy.split("-").map(Number);
  return (Date.UTC(anio, mes - 1, dia) - Date.UTC(anioHoy, mesHoy - 1, diaHoy)) / 86_400_000;
}

async function consultarEstados() {
  const supabase = createAdminClient();
  const pagina = 1000;
  const estados: EstadoCron[] = [];

  for (let desde = 0; ; desde += pagina) {
    const { data, error } = await supabase
      .from("vista_estado_usuarios")
      .select("usuario_id, nombre, apellido, telefono, alta_vencimiento, cuota_vencimiento, afiliacion_vencimiento")
      .eq("activo", true)
      .range(desde, desde + pagina - 1);
    if (error) return { estados: null, error };
    const filas = (data ?? []) as EstadoCron[];
    estados.push(...filas);
    if (filas.length < pagina) break;
  }
  return { estados, error: null };
}

function recordatoriosDe(estados: EstadoCron[], hoy: string): Recordatorio[] {
  const recordatorios: Recordatorio[] = [];
  for (const usuario of estados) {
    const fechas: Array<{ tipo: TipoVencimiento; fecha: string | null }> = [
      { tipo: "alta_medica", fecha: usuario.alta_vencimiento },
      { tipo: "cuota", fecha: usuario.cuota_vencimiento },
      { tipo: "afiliacion", fecha: usuario.afiliacion_vencimiento },
    ];

    for (const vencimiento of fechas) {
      const fecha = vencimiento.fecha?.slice(0, 10);
      if (!fecha || !esFechaISO(fecha)) continue;
      const hito = diasHasta(fecha, hoy);
      if (!HITOS_RECORDATORIO.includes(hito as (typeof HITOS_RECORDATORIO)[number])) continue;
      recordatorios.push({
        usuario,
        tipo: vencimiento.tipo,
        hitoDias: hito,
        fechaReferencia: fecha,
      });
    }
  }
  return recordatorios;
}

async function enviarWebhook(url: string, recordatorio: Recordatorio): Promise<string | null> {
  if (!recordatorio.usuario.telefono?.trim()) return "El usuario no tiene teléfono registrado.";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "gimnasio-atilra",
        to: recordatorio.usuario.telefono,
        usuario: {
          nombre: recordatorio.usuario.nombre,
          apellido: recordatorio.usuario.apellido,
        },
        recordatorio: {
          tipo: recordatorio.tipo,
          hito_dias: recordatorio.hitoDias,
          fecha_referencia: recordatorio.fechaReferencia,
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return `El webhook respondió HTTP ${response.status}.`;
    return null;
  } catch {
    return "No se pudo contactar al webhook configurado.";
  }
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return responder({ ok: false, error: "El endpoint cron no está configurado." }, 503);
  if (!autorizado(request.headers.get("authorization"), secret)) {
    return responder({ ok: false, error: "No autorizado." }, 401);
  }

  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL?.trim() || null;
  if (webhookUrl) {
    try {
      const parsed = new URL(webhookUrl);
      const esHttpLocal = parsed.protocol === "http:" &&
        (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
      if (parsed.protocol !== "https:" && !esHttpLocal) {
        return responder({ ok: false, error: "WHATSAPP_WEBHOOK_URL debe usar HTTPS." }, 500);
      }
    } catch {
      return responder({ ok: false, error: "WHATSAPP_WEBHOOK_URL no es una URL válida." }, 500);
    }
  }

  const { estados, error } = await consultarEstados();
  if (error || !estados) {
    console.error("Cron de vencimientos: no se pudo consultar la vista de estado.", error?.message);
    return responder({ ok: false, error: "No se pudo consultar el padrón para calcular vencimientos." }, 500);
  }

  const recordatorios = recordatoriosDe(estados, hoyISO());
  const vapidPublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
  const vapidPrivada = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const vapidSubject = process.env.VAPID_SUBJECT?.trim() ?? "";
  const pushConfigurado = Boolean(vapidPublica && vapidPrivada && vapidSubject);
  const resumen = { revisados: estados.length, encontrados: recordatorios.length, enviados: 0, push_enviados: 0, push_configurado: pushConfigurado, simulados: 0, duplicados: 0, sinTelefono: 0, errores: 0 };
  const detallesError: Array<{ tipo: TipoVencimiento; hito_dias: number; error: string }> = [];
  const supabase = createAdminClient();

  if (pushConfigurado) {
    try {
      webpush.setVapidDetails(vapidSubject, vapidPublica, vapidPrivada);
    } catch {
      console.error("Cron de vencimientos: la configuración VAPID no es válida.");
      return responder({ ok: false, error: "La configuración de notificaciones push no es válida." }, 500);
    }
  }

  for (const recordatorio of recordatorios) {
    const sinTelefono = Boolean(webhookUrl && !recordatorio.usuario.telefono?.trim());
    if (sinTelefono) {
      resumen.sinTelefono += 1;
      if (!pushConfigurado || recordatorio.tipo === "afiliacion") continue;
    }

    const { data: registro, error: errorRegistro } = await supabase
      .from("notificaciones_enviadas")
      .insert({
        usuario_id: recordatorio.usuario.usuario_id,
        tipo: recordatorio.tipo,
        hito_dias: recordatorio.hitoDias,
        canal: webhookUrl && !sinTelefono ? "whatsapp" : "simulacion",
        fecha_referencia: recordatorio.fechaReferencia,
      })
      .select("id")
      .maybeSingle();

    let registroId = registro?.id as string | undefined;
    if (
      pushConfigurado
      && recordatorio.tipo !== "afiliacion"
      && (!errorRegistro || errorRegistro.code === "23505")
    ) {
      const resultadoPush = await enviarPushVencimiento(supabase, recordatorio);
      resumen.push_enviados += resultadoPush.enviados;
      if (resultadoPush.error) {
        resumen.errores += 1;
        detallesError.push({
          tipo: recordatorio.tipo,
          hito_dias: recordatorio.hitoDias,
          error: resultadoPush.error,
        });
      }
    }

    if (errorRegistro?.code === "23505") {
      if (webhookUrl) {
        const { data: anterior, error: errorAnterior } = await supabase
          .from("notificaciones_enviadas")
          .select("id, canal")
          .eq("usuario_id", recordatorio.usuario.usuario_id)
          .eq("tipo", recordatorio.tipo)
          .eq("hito_dias", recordatorio.hitoDias)
          .eq("fecha_referencia", recordatorio.fechaReferencia)
          .maybeSingle();
        if (errorAnterior) {
          resumen.errores += 1;
          detallesError.push({
            tipo: recordatorio.tipo,
            hito_dias: recordatorio.hitoDias,
            error: "No se pudo verificar el registro previo del recordatorio.",
          });
          continue;
        }
        if (anterior?.canal === "simulacion") {
          const { data: promovido, error: errorPromocion } = await supabase
            .from("notificaciones_enviadas")
            .update({ canal: "whatsapp" })
            .eq("id", anterior.id)
            .eq("canal", "simulacion")
            .select("id")
            .maybeSingle();
          if (errorPromocion) {
            resumen.errores += 1;
            detallesError.push({
              tipo: recordatorio.tipo,
              hito_dias: recordatorio.hitoDias,
              error: "No se pudo reservar el recordatorio simulado para el envío real.",
            });
            continue;
          }
          registroId = promovido?.id as string | undefined;
        }
      }
      if (!registroId) {
        resumen.duplicados += 1;
        continue;
      }
    }
    if (errorRegistro && errorRegistro.code !== "23505") {
      resumen.errores += 1;
      detallesError.push({
        tipo: recordatorio.tipo,
        hito_dias: recordatorio.hitoDias,
        error: "No se pudo reservar el recordatorio en notificaciones_enviadas.",
      });
      console.error("Cron de vencimientos: error al reservar recordatorio.", errorRegistro?.message);
      continue;
    }
    if (!registroId) {
      resumen.errores += 1;
      detallesError.push({
        tipo: recordatorio.tipo,
        hito_dias: recordatorio.hitoDias,
        error: "No se recibió el identificador de la reserva del recordatorio.",
      });
      continue;
    }
    if (sinTelefono) continue;

    if (!webhookUrl) {
      resumen.simulados += 1;
      console.info("[SIMULACIÓN WhatsApp]", JSON.stringify({
        tipo: recordatorio.tipo,
        hito_dias: recordatorio.hitoDias,
        fecha_referencia: recordatorio.fechaReferencia,
      }));
      continue;
    }

    const errorWebhook = await enviarWebhook(webhookUrl, recordatorio);
    if (errorWebhook) {
      const { error: errorReserva } = await supabase
        .from("notificaciones_enviadas")
        .delete()
        .eq("id", registroId);
      if (errorReserva) console.error("Cron de vencimientos: no se pudo liberar la reserva fallida.", errorReserva.message);
      resumen.errores += 1;
      detallesError.push({
        tipo: recordatorio.tipo,
        hito_dias: recordatorio.hitoDias,
        error: errorReserva ? `${errorWebhook} No se pudo liberar la reserva para reintentar.` : errorWebhook,
      });
      continue;
    }

    resumen.enviados += 1;
  }

  const ok = resumen.errores === 0;
  return responder({ ok, ...resumen, errores_detalle: detallesError }, ok ? 200 : 502);
}
