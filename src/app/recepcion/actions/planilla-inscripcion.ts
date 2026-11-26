"use server";

import { revalidatePath } from "next/cache";
import { requireRecepcion } from "@/lib/auth/recepcion";
import { validarArchivoMedico } from "@/lib/archivos-medicos";
import {
  BUCKET_PLANILLA_INSCRIPCION,
  PLANILLA_INSCRIPCION_MAX_BYTES,
  PLANILLA_INSCRIPCION_MAX_MB,
} from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ResultadoAccion } from "@/types/recepcion";

const CARPETA_PLANILLA = "oficial";

async function rutasExistentes() {
  const { data, error } = await createAdminClient().storage
    .from(BUCKET_PLANILLA_INSCRIPCION)
    .list(CARPETA_PLANILLA, { limit: 100 });
  if (error) return { rutas: null, error };
  return {
    rutas: (data ?? [])
      .filter((archivo) => archivo.name && /\.(pdf|jpe?g|png|webp)$/i.test(archivo.name))
      .map((archivo) => `${CARPETA_PLANILLA}/${archivo.name}`),
    error: null,
  };
}

export async function publicarPlanillaInscripcion(formData: FormData): Promise<ResultadoAccion> {
  await requireRecepcion();
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: "Seleccioná un archivo PDF o una imagen." };
  }
  if (archivo.size > PLANILLA_INSCRIPCION_MAX_BYTES) {
    return { ok: false, error: `El archivo supera el máximo de ${PLANILLA_INSCRIPCION_MAX_MB} MB.` };
  }

  const validacion = await validarArchivoMedico(archivo);
  if (!validacion.ok) return { ok: false, error: "El archivo debe ser un PDF o una imagen JPG, PNG o WEBP válida." };

  const supabase = createAdminClient();
  const { rutas, error: errorListado } = await rutasExistentes();
  if (errorListado || !rutas) return { ok: false, error: "No se pudo consultar la planilla actual." };

  const rutaNueva = `${CARPETA_PLANILLA}/${crypto.randomUUID()}.${validacion.extension}`;
  const { error: errorSubida } = await supabase.storage
    .from(BUCKET_PLANILLA_INSCRIPCION)
    .upload(rutaNueva, Buffer.from(await archivo.arrayBuffer()), {
      contentType: validacion.mime,
      upsert: false,
    });
  if (errorSubida) return { ok: false, error: "No se pudo publicar la planilla." };

  if (rutas.length > 0) {
    const { error: errorLimpieza } = await supabase.storage.from(BUCKET_PLANILLA_INSCRIPCION).remove(rutas);
    if (errorLimpieza) {
      const { error: errorReversion } = await supabase.storage
        .from(BUCKET_PLANILLA_INSCRIPCION)
        .remove([rutaNueva]);
      return {
        ok: false,
        error: errorReversion
          ? "No se pudo completar el reemplazo ni limpiar el archivo nuevo. Revisá la publicación desde recepción."
          : "No se pudo reemplazar la planilla anterior.",
      };
    }
  }

  revalidatePath("/recepcion/planilla-inscripcion");
  revalidatePath("/mi-credencial");
  return { ok: true, mensaje: "Planilla publicada correctamente." };
}

export async function eliminarPlanillaInscripcion(): Promise<ResultadoAccion> {
  await requireRecepcion();
  const { rutas, error: errorListado } = await rutasExistentes();
  if (errorListado || !rutas) return { ok: false, error: "No se pudo consultar la planilla publicada." };
  if (rutas.length === 0) return { ok: true, mensaje: "No hay una planilla publicada." };

  const { error } = await createAdminClient().storage.from(BUCKET_PLANILLA_INSCRIPCION).remove(rutas);
  if (error) return { ok: false, error: "No se pudo eliminar la planilla publicada." };

  revalidatePath("/recepcion/planilla-inscripcion");
  revalidatePath("/mi-credencial");
  return { ok: true, mensaje: "Planilla eliminada." };
}
