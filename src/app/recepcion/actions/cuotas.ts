"use server";

import { revalidatePath } from "next/cache";
import { requireRecepcion } from "@/lib/auth/recepcion";
import { esFechaISO, hoyISO, sumarAnios } from "@/lib/fechas";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ResultadoAccion } from "@/types/recepcion";

const MEDIOS_PAGO = ["efectivo", "transferencia", "debito", "credito"] as const;

export async function obtenerHistorialCuotas(usuarioId: string): Promise<
  { ok: true; pagos: Array<{
    id: string;
    usuario_id: string;
    periodo: string;
    monto: number;
    medio_pago: string;
    fecha_pago: string;
    fecha_vencimiento: string;
    observaciones: string | null;
  }> } | { ok: false; error: string }
> {
  await requireRecepcion();
  if (!usuarioId) return { ok: false, error: "Seleccioná un usuario." };

  const supabase = createAdminClient();
  const { data: usuario, error: errorUsuario } = await supabase
    .from("usuarios")
    .select("id, perfil")
    .eq("id", usuarioId)
    .maybeSingle();
  if (errorUsuario) return { ok: false, error: `No se pudo verificar el usuario: ${errorUsuario.message}` };
  if (!usuario || usuario.perfil !== "invitado") return { ok: false, error: "El historial de cuotas es solo para invitados." };

  const { data, error } = await supabase
    .from("cuotas_pagos")
    .select("id, usuario_id, periodo, monto, medio_pago, fecha_pago, fecha_vencimiento, observaciones")
    .eq("usuario_id", usuarioId)
    .order("fecha_pago", { ascending: false })
    .range(0, 4999);
  if (error) return { ok: false, error: `No se pudo cargar el historial: ${error.message}` };
  return { ok: true, pagos: data ?? [] };
}

export async function registrarPagoCuota(formData: FormData): Promise<ResultadoAccion> {
  await requireRecepcion();

  const usuarioId = String(formData.get("usuario_id") ?? "");
  const periodo = String(formData.get("periodo") ?? "").trim();
  const monto = Number(formData.get("monto"));
  const medioPago = String(formData.get("medio_pago") ?? "");
  const fechaPago = String(formData.get("fecha_pago") ?? "");
  const fechaVencimiento = String(formData.get("fecha_vencimiento") ?? "");
  const observaciones = String(formData.get("observaciones") ?? "").trim();

  if (!usuarioId) return { ok: false, error: "Seleccioná un invitado." };
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
    return { ok: false, error: "El período debe tener formato AAAA-MM." };
  }
  if (!Number.isFinite(monto) || monto <= 0) return { ok: false, error: "El monto debe ser mayor que cero." };
  if (!MEDIOS_PAGO.includes(medioPago as (typeof MEDIOS_PAGO)[number])) {
    return { ok: false, error: "Seleccioná un medio de pago válido." };
  }
  if (!esFechaISO(fechaPago) || !esFechaISO(fechaVencimiento)) {
    return { ok: false, error: "Ingresá fechas de pago y vencimiento válidas." };
  }
  const supabase = createAdminClient();
  const { data: usuario, error: errorUsuario } = await supabase
    .from("usuarios")
    .select("id, perfil")
    .eq("id", usuarioId)
    .maybeSingle();

  if (errorUsuario) return { ok: false, error: `No se pudo verificar el usuario: ${errorUsuario.message}` };
  if (!usuario || usuario.perfil !== "invitado") return { ok: false, error: "Las cuotas solo se registran para invitados." };

  const { error } = await supabase.from("cuotas_pagos").insert({
    usuario_id: usuarioId,
    periodo,
    monto: Math.round(monto * 100) / 100,
    medio_pago: medioPago,
    fecha_pago: fechaPago,
    fecha_vencimiento: fechaVencimiento,
    observaciones: observaciones || null,
  });

  if (error) return { ok: false, error: `No se pudo registrar el pago: ${error.message}` };

  revalidatePath("/recepcion/cuotas");
  revalidatePath(`/recepcion/usuarios/${usuarioId}`);
  return { ok: true, mensaje: "Pago registrado correctamente." };
}

export async function renovarAfiliacion(
  usuarioId: string,
  fechaPersonalizada?: string,
): Promise<ResultadoAccion> {
  await requireRecepcion();

  if (!usuarioId) return { ok: false, error: "No se indicó el afiliado." };
  if (fechaPersonalizada && (!esFechaISO(fechaPersonalizada) || fechaPersonalizada < hoyISO())) {
    return { ok: false, error: "La fecha de renovación debe ser válida y no puede estar vencida." };
  }

  const supabase = createAdminClient();
  const { data: usuario, error: errorUsuario } = await supabase
    .from("usuarios")
    .select("id, perfil, fecha_renovacion_afiliacion")
    .eq("id", usuarioId)
    .maybeSingle();

  if (errorUsuario) return { ok: false, error: `No se pudo verificar el usuario: ${errorUsuario.message}` };
  if (!usuario || usuario.perfil !== "afiliado") return { ok: false, error: "La renovación solo está disponible para afiliados." };

  const base = usuario.fecha_renovacion_afiliacion && usuario.fecha_renovacion_afiliacion > hoyISO()
    ? usuario.fecha_renovacion_afiliacion
    : hoyISO();
  const nuevaFecha = fechaPersonalizada || sumarAnios(base, 1);

  const { error } = await supabase
    .from("usuarios")
    .update({ fecha_renovacion_afiliacion: nuevaFecha })
    .eq("id", usuarioId);

  if (error) return { ok: false, error: `No se pudo renovar la afiliación: ${error.message}` };

  revalidatePath("/recepcion/cuotas");
  revalidatePath("/recepcion");
  revalidatePath(`/recepcion/usuarios/${usuarioId}`);
  return { ok: true, mensaje: `Afiliación renovada hasta el ${nuevaFecha.split("-").reverse().join("/")}.` };
}
