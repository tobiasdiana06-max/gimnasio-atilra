"use server";

import { revalidatePath } from "next/cache";
import { requireRecepcion } from "@/lib/auth/recepcion";
import { registrarFichadaTerminal } from "@/lib/terminal/fichada";
import { normalizarDni } from "@/lib/validaciones";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ErrorFichadaTerminal, FichadaTerminal } from "@/types/terminal";
import type { ResultadoAccion } from "@/types/recepcion";

export async function ficharDniManual(dniEntrada: string): Promise<FichadaTerminal | ErrorFichadaTerminal> {
  await requireRecepcion();
  const dni = normalizarDni(dniEntrada);
  if (dni.length < 7 || dni.length > 8) {
    return { ok: false, status: 400, error: "Ingresá un DNI válido de 7 u 8 dígitos." };
  }

  const resultado = await registrarFichadaTerminal({ tipo: "dni", valor: dni });
  if (resultado.ok) revalidatePath("/recepcion/terminal");
  return resultado;
}

export async function guardarHuellaTemplate(
  usuarioId: string,
  templateId: string,
): Promise<ResultadoAccion> {
  await requireRecepcion();
  const plantilla = templateId.trim();
  if (!usuarioId) return { ok: false, error: "No se indicó el usuario." };
  if (!plantilla || plantilla.length > 512 || /[\u0000-\u001f\u007f]/.test(plantilla)) {
    return { ok: false, error: "El identificador biométrico recibido no es válido." };
  }

  const supabase = createAdminClient();
  const { data: otroUsuario, error: errorDuplicado } = await supabase
    .from("usuarios")
    .select("id")
    .eq("huella_template_id", plantilla)
    .neq("id", usuarioId)
    .limit(1);
  if (errorDuplicado) return { ok: false, error: `No se pudo verificar la plantilla: ${errorDuplicado.message}` };
  if (otroUsuario && otroUsuario.length > 0) {
    return { ok: false, error: "Esa plantilla ya está asignada a otro usuario." };
  }

  const { data: actualizado, error } = await supabase
    .from("usuarios")
    .update({ huella_template_id: plantilla })
    .eq("id", usuarioId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: `No se pudo guardar la huella: ${error.message}` };
  if (!actualizado) return { ok: false, error: "No encontramos al usuario para asociar la huella." };

  revalidatePath(`/recepcion/usuarios/${usuarioId}`);
  return { ok: true, mensaje: "Huella enrolada y asociada al usuario." };
}
