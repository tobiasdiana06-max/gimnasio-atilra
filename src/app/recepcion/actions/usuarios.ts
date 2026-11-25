"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRecepcion } from "@/lib/auth/recepcion";
import { normalizarDni, normalizarTelefono, validarUsuario } from "@/lib/validaciones";
import type { ResultadoAccion, UsuarioFormValues } from "@/types/recepcion";

/** Alta (id = null) o edición de un usuario. Valida en servidor: legajo obligatorio y único para afiliados. */
export async function guardarUsuario(id: string | null, valores: UsuarioFormValues): Promise<ResultadoAccion> {
  await requireRecepcion();

  const errores = validarUsuario(valores);
  if (Object.keys(errores).length > 0) {
    return { ok: false, error: "Revisá los datos marcados.", campos: errores };
  }

  const supabase = createAdminClient();
  const dni = normalizarDni(valores.dni);
  const legajo = valores.perfil === "afiliado" ? valores.numero_legajo.trim() : null;

  // DNI único
  let consultaDni = supabase.from("usuarios").select("id").eq("dni", dni);
  if (id) consultaDni = consultaDni.neq("id", id);
  const { data: dniRepetido, error: errDni } = await consultaDni.limit(1);
  if (errDni) return { ok: false, error: `No se pudo verificar el DNI: ${errDni.message}` };
  if (dniRepetido && dniRepetido.length > 0) {
    return { ok: false, error: "Ya existe un usuario con ese DNI.", campos: { dni: "Ese DNI ya está cargado." } };
  }

  // Legajo único (solo afiliados)
  if (legajo) {
    let consultaLegajo = supabase.from("usuarios").select("id").eq("numero_legajo", legajo);
    if (id) consultaLegajo = consultaLegajo.neq("id", id);
    const { data: legajoRepetido, error: errLegajo } = await consultaLegajo.limit(1);
    if (errLegajo) return { ok: false, error: `No se pudo verificar el legajo: ${errLegajo.message}` };
    if (legajoRepetido && legajoRepetido.length > 0) {
      return {
        ok: false,
        error: "Ya existe un afiliado con ese legajo.",
        campos: { numero_legajo: "Ese N.° de legajo ya está asignado." },
      };
    }
  }

  const fila = {
    perfil: valores.perfil,
    dni,
    numero_legajo: legajo,
    nombre: valores.nombre.trim(),
    apellido: valores.apellido.trim(),
    telefono: valores.telefono.trim() ? normalizarTelefono(valores.telefono) : null,
  };

  const { error } = id
    ? await supabase.from("usuarios").update(fila).eq("id", id)
    : await supabase.from("usuarios").insert(fila);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ya existe un usuario con ese DNI o ese legajo." };
    }
    return { ok: false, error: `No se pudo guardar: ${error.message}` };
  }

  revalidatePath("/recepcion", "layout");
  return { ok: true, mensaje: id ? "Usuario actualizado." : "Usuario creado." };
}
