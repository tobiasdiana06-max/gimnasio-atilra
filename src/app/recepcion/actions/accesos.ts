"use server";

import { revalidatePath } from "next/cache";
import { requireRecepcion } from "@/lib/auth/recepcion";
import { normalizarDni } from "@/lib/validaciones";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EstadoUsuario } from "@/types";

export type ResultadoEstadoAcceso = { ok: true; estado: EstadoUsuario } | { ok: false; error: string };

async function obtenerEstado(usuarioId?: string, dni?: string): Promise<ResultadoEstadoAcceso> {
  const supabase = createAdminClient();
  let consulta = supabase.from("vista_estado_usuarios").select("*");
  if (usuarioId) consulta = consulta.eq("usuario_id", usuarioId);
  else if (dni) consulta = consulta.eq("dni", dni);
  else return { ok: false, error: "Ingresá un DNI o seleccioná un usuario." };

  const { data, error } = await consulta.maybeSingle();
  if (error) return { ok: false, error: `No se pudo consultar el estado de acceso: ${error.message}` };
  if (!data) return { ok: false, error: "No encontramos un usuario con esos datos." };
  return { ok: true, estado: data as EstadoUsuario };
}

export async function consultarAccesoPorDni(dniEntrada: string): Promise<ResultadoEstadoAcceso> {
  await requireRecepcion();
  const dni = normalizarDni(dniEntrada);
  if (dni.length < 7 || dni.length > 8) return { ok: false, error: "Ingresá un DNI válido de 7 u 8 dígitos." };
  return obtenerEstado(undefined, dni);
}

export async function consultarAccesoPorUsuario(usuarioId: string): Promise<ResultadoEstadoAcceso> {
  await requireRecepcion();
  if (!usuarioId) return { ok: false, error: "Seleccioná un usuario." };
  return obtenerEstado(usuarioId);
}

export async function simularFichada(usuarioId: string): Promise<ResultadoEstadoAcceso> {
  await requireRecepcion();
  if (!usuarioId) return { ok: false, error: "Seleccioná un usuario." };

  const resultado = await obtenerEstado(usuarioId);
  if (!resultado.ok) return resultado;

  const { error } = await createAdminClient().from("accesos_huella").insert({
    usuario_id: usuarioId,
    semaforo: resultado.estado.semaforo,
    motivo: resultado.estado.motivo,
    metodo: "recepcion_simulada",
  });

  if (error) return { ok: false, error: `No se pudo registrar la fichada: ${error.message}` };

  revalidatePath("/recepcion/accesos");
  return resultado;
}
