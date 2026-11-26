"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRecepcion } from "@/lib/auth/recepcion";
import {
  BUCKET_ALTAS_MEDICAS,
} from "@/lib/constants";
import { asegurarBucketMedicoPrivado, validarArchivoMedico } from "@/lib/archivos-medicos";
import { hoyISO } from "@/lib/fechas";
import { validarFechasAlta } from "@/lib/validaciones";
import type { ResultadoAccion, UrlsDocumento } from "@/types/recepcion";

type Admin = ReturnType<typeof createAdminClient>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ArchivoSubido = { ok: true; path: string; nombre: string } | { ok: false; error: string };

async function subirArchivo(supabase: Admin, usuarioId: string, archivo: File): Promise<ArchivoSubido> {
  const validacion = await validarArchivoMedico(archivo);
  if (!validacion.ok) return validacion;
  const errorBucket = await asegurarBucketMedicoPrivado(supabase);
  if (errorBucket) return { ok: false, error: errorBucket };

  const path = `${usuarioId}/${crypto.randomUUID()}.${validacion.extension}`;
  const contenido = Buffer.from(await archivo.arrayBuffer());
  const { error } = await supabase.storage
    .from(BUCKET_ALTAS_MEDICAS)
    .upload(path, contenido, { contentType: validacion.mime, upsert: false });

  if (error) return { ok: false, error: `No se pudo subir el archivo: ${error.message}` };
  return { ok: true, path, nombre: `certificado.${validacion.extension}` };
}

function archivoDelFormulario(formData: FormData): File | null {
  const valor = formData.get("archivo");
  return valor instanceof File && valor.size > 0 ? valor : null;
}

/** URLs firmadas (5 min) para ver/descargar un certificado del bucket privado. */
export async function obtenerUrlsDocumento(docId: string): Promise<UrlsDocumento> {
  await requireRecepcion();
  if (!UUID.test(docId)) return { ok: false, error: "No encontramos ese registro." };

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("documentacion_medica")
    .select("usuario_id, archivo_path")
    .eq("id", docId)
    .maybeSingle();

  const doc = data as { usuario_id: string; archivo_path: string | null } | null;
  if (error || !doc) return { ok: false, error: "No encontramos ese registro." };
  if (!doc.archivo_path) return { ok: false, error: "Este registro no tiene archivo adjunto." };

  const archivo = doc.archivo_path.match(/^([0-9a-f-]{36})\/([0-9a-f-]{36})\.(jpg|png|webp|pdf)$/i);
  if (
    !archivo
    || !UUID.test(archivo[1])
    || !UUID.test(archivo[2])
    || !UUID.test(doc.usuario_id)
    || archivo[1].toLowerCase() !== doc.usuario_id.toLowerCase()
  ) {
    return { ok: false, error: "El archivo asociado a este registro no es válido." };
  }
  const extension = archivo[3].toLowerCase();
  const errorBucket = await asegurarBucketMedicoPrivado(supabase);
  if (errorBucket) return { ok: false, error: errorBucket };

  const [ver, descarga] = await Promise.all([
    supabase.storage.from(BUCKET_ALTAS_MEDICAS).createSignedUrl(doc.archivo_path, 300),
    supabase.storage
      .from(BUCKET_ALTAS_MEDICAS)
      .createSignedUrl(doc.archivo_path, 300, { download: `certificado.${extension}` }),
  ]);

  if (ver.error || !ver.data || descarga.error || !descarga.data) {
    return { ok: false, error: "No se pudo generar el enlace seguro. Probá de nuevo." };
  }

  return {
    ok: true,
    urlVer: ver.data.signedUrl,
    urlDescarga: descarga.data.signedUrl,
    nombre: "Certificado médico",
    esImagen: extension !== "pdf",
  };
}

/** Confirma fechas de un alta pendiente y la deja vigente. */
export async function aprobarAltaMedica(
  docId: string,
  fechaEmision: string,
  fechaVencimiento: string,
): Promise<ResultadoAccion> {
  await requireRecepcion();

  const errorFechas = validarFechasAlta(fechaEmision, fechaVencimiento, hoyISO());
  if (errorFechas) return { ok: false, error: errorFechas };

  const supabase = createAdminClient();
  const { data, error: errLectura } = await supabase
    .from("documentacion_medica")
    .select("id, estado")
    .eq("id", docId)
    .maybeSingle();

  const doc = data as { id: string; estado: string } | null;
  if (errLectura || !doc) return { ok: false, error: "No encontramos esa alta médica." };
  if (doc.estado !== "pendiente") return { ok: false, error: "Esta alta médica ya fue procesada por otra persona." };

  const { error } = await supabase
    .from("documentacion_medica")
    .update({
      estado: "vigente",
      fecha_emision: fechaEmision,
      fecha_vencimiento: fechaVencimiento,
      validado_en: new Date().toISOString(),
    })
    .eq("id", docId)
    .eq("estado", "pendiente");

  if (error) return { ok: false, error: `No se pudo aprobar: ${error.message}` };

  revalidatePath("/recepcion", "layout");
  return { ok: true, mensaje: "Alta médica aprobada." };
}

/** Rechaza un alta pendiente (foto ilegible, documento equivocado, etc.). */
export async function rechazarAltaMedica(docId: string, motivo: string): Promise<ResultadoAccion> {
  await requireRecepcion();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("documentacion_medica")
    .update({
      estado: "rechazada",
      observaciones: motivo.trim() || null,
      validado_en: new Date().toISOString(),
    })
    .eq("id", docId)
    .eq("estado", "pendiente");

  if (error) return { ok: false, error: `No se pudo rechazar: ${error.message}` };

  revalidatePath("/recepcion", "layout");
  return { ok: true, mensaje: "Alta médica rechazada." };
}

/** Carga presencial: recepción registra el certificado en papel (con o sin archivo escaneado). Queda vigente. */
export async function cargarAltaPresencial(formData: FormData): Promise<ResultadoAccion> {
  await requireRecepcion();

  const usuarioId = String(formData.get("usuario_id") ?? "");
  const fechaEmision = String(formData.get("fecha_emision") ?? "");
  const fechaVencimiento = String(formData.get("fecha_vencimiento") ?? "");
  const archivo = archivoDelFormulario(formData);

  const errorFechas = validarFechasAlta(fechaEmision, fechaVencimiento, hoyISO());
  if (errorFechas) return { ok: false, error: errorFechas };

  const supabase = createAdminClient();
  const { data: usuario, error: errorUsuario } = await supabase.from("usuarios").select("id").eq("id", usuarioId).maybeSingle();
  if (errorUsuario) return { ok: false, error: "No se pudo verificar el usuario." };
  if (!usuario) return { ok: false, error: "No encontramos al usuario." };

  let subido: { path: string; nombre: string } | null = null;
  if (archivo) {
    const resultado = await subirArchivo(supabase, usuario.id, archivo);
    if (!resultado.ok) return { ok: false, error: resultado.error };
    subido = { path: resultado.path, nombre: resultado.nombre };
  }

  const { error } = await supabase.from("documentacion_medica").insert({
    usuario_id: usuarioId,
    estado: "vigente",
    origen: "presencial",
    fecha_emision: fechaEmision,
    fecha_vencimiento: fechaVencimiento,
    archivo_path: subido?.path ?? null,
    archivo_nombre: subido?.nombre ?? null,
    validado_en: new Date().toISOString(),
  });

  if (error) {
    if (subido) await supabase.storage.from(BUCKET_ALTAS_MEDICAS).remove([subido.path]);
    return { ok: false, error: `No se pudo registrar el alta médica: ${error.message}` };
  }

  revalidatePath("/recepcion", "layout");
  return { ok: true, mensaje: "Alta médica cargada y vigente." };
}

/**
 * SOLO DESARROLLO: simula lo que va a hacer el chat/WhatsApp en la Etapa 3
 * (subir un archivo que queda "pendiente" sin fechas) para poder probar la bandeja.
 */
export async function simularEnvioDigital(formData: FormData): Promise<ResultadoAccion> {
  await requireRecepcion();
  if (process.env.NODE_ENV === "production") return { ok: false, error: "No disponible en producción." };

  const usuarioId = String(formData.get("usuario_id") ?? "");
  const archivo = archivoDelFormulario(formData);
  if (!archivo) return { ok: false, error: "Elegí un archivo para simular el envío." };

  const supabase = createAdminClient();
  const { data: usuario, error: errorUsuario } = await supabase.from("usuarios").select("id").eq("id", usuarioId).maybeSingle();
  if (errorUsuario) return { ok: false, error: "No se pudo verificar el usuario." };
  if (!usuario) return { ok: false, error: "No encontramos al usuario." };

  const subido = await subirArchivo(supabase, usuario.id, archivo);
  if (!subido.ok) return { ok: false, error: subido.error };

  const { error } = await supabase.from("documentacion_medica").insert({
    usuario_id: usuario.id,
    estado: "pendiente",
    origen: "digital",
    archivo_path: subido.path,
    archivo_nombre: subido.nombre,
  });

  if (error) {
    await supabase.storage.from(BUCKET_ALTAS_MEDICAS).remove([subido.path]);
    return { ok: false, error: `No se pudo simular el envío: ${error.message}` };
  }

  revalidatePath("/recepcion", "layout");
  return { ok: true, mensaje: "Envío digital simulado: ya aparece en la bandeja de pendientes." };
}
