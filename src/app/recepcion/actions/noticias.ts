"use server";

import { revalidatePath } from "next/cache";
import { requireRecepcion } from "@/lib/auth/recepcion";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ResultadoAccion } from "@/types/recepcion";

function validarNoticia(titulo: string, contenido: string, imagenUrl: string): string | null {
  if (!titulo.trim()) return "El título es obligatorio.";
  if (!contenido.trim()) return "El contenido es obligatorio.";
  if (imagenUrl.trim()) {
    try {
      const url = new URL(imagenUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") return "La imagen debe usar una URL HTTP o HTTPS.";
    } catch {
      return "Ingresá una URL de imagen válida.";
    }
  }
  return null;
}

export async function guardarNoticia(formData: FormData): Promise<ResultadoAccion> {
  await requireRecepcion();

  const id = String(formData.get("id") ?? "").trim();
  const titulo = String(formData.get("titulo") ?? "");
  const contenido = String(formData.get("contenido") ?? "");
  const imagenUrl = String(formData.get("imagen_url") ?? "").trim();
  const fechaPublicacion = String(formData.get("fecha_publicacion") ?? "").trim();
  const publicada = formData.get("publicada") === "on";
  const errorValidacion = validarNoticia(titulo, contenido, imagenUrl);

  if (errorValidacion) return { ok: false, error: errorValidacion };

  let fechaISO: string | undefined;
  if (fechaPublicacion) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(fechaPublicacion)) {
      return { ok: false, error: "La fecha de publicación no es válida." };
    }
    const fecha = new Date(`${fechaPublicacion}:00-03:00`);
    if (Number.isNaN(fecha.getTime())) return { ok: false, error: "La fecha de publicación no es válida." };
    fechaISO = fecha.toISOString();
  }

  const fila = {
    titulo: titulo.trim(),
    contenido: contenido.trim(),
    imagen_url: imagenUrl || null,
    publicada,
    ...(fechaISO ? { fecha_publicacion: fechaISO } : {}),
  };
  const supabase = createAdminClient();
  const { error } = id
    ? await supabase.from("noticias").update(fila).eq("id", id)
    : await supabase.from("noticias").insert(fila);

  if (error) return { ok: false, error: `No se pudo guardar la noticia: ${error.message}` };

  revalidatePath("/recepcion/noticias");
  return { ok: true, mensaje: id ? "Noticia actualizada." : "Noticia creada." };
}

export async function cambiarPublicacionNoticia(id: string, publicada: boolean): Promise<ResultadoAccion> {
  await requireRecepcion();
  if (!id) return { ok: false, error: "No se indicó la noticia." };

  const { error } = await createAdminClient().from("noticias").update({ publicada }).eq("id", id);
  if (error) return { ok: false, error: `No se pudo cambiar la publicación: ${error.message}` };

  revalidatePath("/recepcion/noticias");
  return { ok: true, mensaje: publicada ? "Noticia publicada." : "Noticia ocultada." };
}

export async function eliminarNoticia(id: string): Promise<ResultadoAccion> {
  await requireRecepcion();
  if (!id) return { ok: false, error: "No se indicó la noticia." };

  const { error } = await createAdminClient().from("noticias").delete().eq("id", id);
  if (error) return { ok: false, error: `No se pudo eliminar la noticia: ${error.message}` };

  revalidatePath("/recepcion/noticias");
  return { ok: true, mensaje: "Noticia eliminada." };
}
