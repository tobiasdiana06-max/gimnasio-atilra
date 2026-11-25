import { createHash, timingSafeEqual } from "node:crypto";
import { HITOS_RECORDATORIO } from "@/lib/constants";
import { esFechaISO, hoyISO } from "@/lib/fechas";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type TipoVencimiento = "alta_medica" | "cuota" | "afiliacion";

interface EstadoCron {
  usuario_id: string;
  dni: string;
  nombre: string;
  apellido: string;
  perfil: "afiliado" | "invitado";
  telefono: string | null;
  activo: boolean;
  alta_vencimiento: string | null;
  cuota_vencimiento: string | null;
  afiliacion_vencimiento: string | null;
  semaforo: "verde" | "amarillo" | "rojo";
  motivo: string;
}

interface Recordatorio {
  usuario: EstadoCron;
  tipo: TipoVencimiento;
  hitoDias: number;
  fechaReferencia: string;
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
      .select("usuario_id, dni, nombre, apellido, perfil, telefono, activo, alta_vencimiento, cuota_vencimiento, afiliacion_vencimiento, semaforo, motivo")
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
          id: recordatorio.usuario.usuario_id,
          nombre: recordatorio.usuario.nombre,
          apellido: recordatorio.usuario.apellido,
          dni: recordatorio.usuario.dni,
          perfil: recordatorio.usuario.perfil,
        },
        recordatorio: {
          tipo: recordatorio.tipo,
          hito_dias: recordatorio.hitoDias,
          fecha_referencia: recordatorio.fechaReferencia,
          semaforo: recordatorio.usuario.semaforo,
          motivo: recordatorio.usuario.motivo,
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
  if (!secret) return Response.json({ ok: false, error: "El endpoint cron no está configurado." }, { status: 503 });
  if (!autorizado(request.headers.get("authorization"), secret)) {
    return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL?.trim() || null;
  if (webhookUrl) {
    try {
      const parsed = new URL(webhookUrl);
      const esHttpLocal = parsed.protocol === "http:" &&
        (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
      if (parsed.protocol !== "https:" && !esHttpLocal) {
        return Response.json({ ok: false, error: "WHATSAPP_WEBHOOK_URL debe usar HTTPS." }, { status: 500 });
      }
    } catch {
      return Response.json({ ok: false, error: "WHATSAPP_WEBHOOK_URL no es una URL válida." }, { status: 500 });
    }
  }

  const { estados, error } = await consultarEstados();
  if (error || !estados) {
    console.error("Cron de vencimientos: no se pudo consultar la vista de estado.", error?.message);
    return Response.json({ ok: false, error: "No se pudo consultar el padrón para calcular vencimientos." }, { status: 500 });
  }

  const recordatorios = recordatoriosDe(estados, hoyISO());
  const resumen = { revisados: estados.length, encontrados: recordatorios.length, enviados: 0, simulados: 0, duplicados: 0, sinTelefono: 0, errores: 0 };
  const detallesError: Array<{ usuario_id: string; tipo: TipoVencimiento; hito_dias: number; error: string }> = [];
  const supabase = createAdminClient();

  for (const recordatorio of recordatorios) {
    if (webhookUrl && !recordatorio.usuario.telefono?.trim()) {
      resumen.sinTelefono += 1;
      continue;
    }

    const { data: registro, error: errorRegistro } = await supabase
      .from("notificaciones_enviadas")
      .insert({
        usuario_id: recordatorio.usuario.usuario_id,
        tipo: recordatorio.tipo,
        hito_dias: recordatorio.hitoDias,
        canal: webhookUrl ? "whatsapp" : "simulacion",
        fecha_referencia: recordatorio.fechaReferencia,
      })
      .select("id")
      .maybeSingle();

    let registroId = registro?.id as string | undefined;
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
            usuario_id: recordatorio.usuario.usuario_id,
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
              usuario_id: recordatorio.usuario.usuario_id,
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
        usuario_id: recordatorio.usuario.usuario_id,
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
        usuario_id: recordatorio.usuario.usuario_id,
        tipo: recordatorio.tipo,
        hito_dias: recordatorio.hitoDias,
        error: "No se recibió el identificador de la reserva del recordatorio.",
      });
      continue;
    }

    if (!webhookUrl) {
      resumen.simulados += 1;
      console.info("[SIMULACIÓN WhatsApp]", JSON.stringify({
        usuario_id: recordatorio.usuario.usuario_id,
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
        usuario_id: recordatorio.usuario.usuario_id,
        tipo: recordatorio.tipo,
        hito_dias: recordatorio.hitoDias,
        error: errorReserva ? `${errorWebhook} No se pudo liberar la reserva para reintentar.` : errorWebhook,
      });
      continue;
    }

    resumen.enviados += 1;
  }

  const ok = resumen.errores === 0;
  return Response.json(
    { ok, ...resumen, errores_detalle: detallesError },
    { status: ok ? 200 : 502, headers: { "Cache-Control": "no-store" } },
  );
}
