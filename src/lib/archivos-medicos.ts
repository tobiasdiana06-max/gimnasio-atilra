import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { ALTA_MEDICA_EXTENSION_POR_MIME, ALTA_MEDICA_MAX_BYTES, ALTA_MEDICA_MAX_MB, BUCKET_ALTAS_MEDICAS } from "@/lib/constants";

export type ValidacionArchivoMedico =
  | { ok: true; mime: string; extension: string }
  | { ok: false; error: string };

function comienzaCon(bytes: Uint8Array, firma: number[]): boolean {
  return firma.every((byte, indice) => bytes[indice] === byte);
}

function ascii(bytes: Uint8Array, desde: number, hasta: number): string {
  return String.fromCharCode(...bytes.slice(desde, hasta));
}

export async function validarArchivoMedico(archivo: File): Promise<ValidacionArchivoMedico> {
  if (archivo.size <= 0) return { ok: false, error: "El archivo está vacío." };
  if (archivo.size > ALTA_MEDICA_MAX_BYTES) {
    return { ok: false, error: `El archivo supera el máximo de ${ALTA_MEDICA_MAX_MB} MB.` };
  }

  const bytes = new Uint8Array(await archivo.slice(0, 12).arrayBuffer());
  const mimeDetectado = comienzaCon(bytes, [0xff, 0xd8, 0xff])
    ? "image/jpeg"
    : comienzaCon(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      ? "image/png"
      : ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP"
        ? "image/webp"
        : ascii(bytes, 0, 5) === "%PDF-"
          ? "application/pdf"
          : null;

  if (!mimeDetectado) {
    return { ok: false, error: "El contenido no coincide con un JPG, PNG, WEBP o PDF válido." };
  }
  if (archivo.type && archivo.type.toLowerCase() !== mimeDetectado) {
    return { ok: false, error: "El tipo declarado no coincide con el contenido del archivo." };
  }

  const extension = ALTA_MEDICA_EXTENSION_POR_MIME[mimeDetectado];
  if (!extension) return { ok: false, error: "El formato del archivo no está permitido." };
  return { ok: true, mime: mimeDetectado, extension };
}

export async function asegurarBucketMedicoPrivado(supabase: SupabaseClient): Promise<string | null> {
  const { data: bucket, error } = await supabase.storage.getBucket(BUCKET_ALTAS_MEDICAS);
  if (error || !bucket) {
    console.error("No se pudo verificar el bucket privado de certificados médicos.", error?.message);
    return "El almacenamiento privado de certificados no está disponible.";
  }
  if (!bucket.public) return null;

  const { error: errorActualizacion } = await supabase.storage.updateBucket(BUCKET_ALTAS_MEDICAS, { public: false });
  if (errorActualizacion) {
    console.error("No se pudo convertir a privado el bucket de certificados médicos.", errorActualizacion.message);
    return "No se pudo asegurar el acceso privado a los certificados.";
  }

  const { data: bucketVerificado, error: errorVerificacion } = await supabase.storage.getBucket(BUCKET_ALTAS_MEDICAS);
  if (errorVerificacion || !bucketVerificado || bucketVerificado.public) {
    console.error("No se pudo confirmar la privacidad del bucket de certificados médicos.", errorVerificacion?.message);
    return "No se pudo asegurar el acceso privado a los certificados.";
  }
  return null;
}
