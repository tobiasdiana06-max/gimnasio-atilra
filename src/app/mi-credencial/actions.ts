"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { guardarSesionCredencial, requerirUsuarioCredencialId, cerrarSesionCredencial } from "@/lib/auth/credencial";
import { BUCKET_ALTAS_MEDICAS } from "@/lib/constants";
import { asegurarBucketMedicoPrivado, validarArchivoMedico } from "@/lib/archivos-medicos";
import { mensajeEsperaIntentos, reservarIntentoLogin } from "@/lib/auth/limite-intentos";
import { normalizarDni } from "@/lib/validaciones";
import type { ResultadoAccion } from "@/types/recepcion";

export async function iniciarSesionCredencial(formData: FormData): Promise<ResultadoAccion> {
  const dni = normalizarDni(String(formData.get("dni") ?? ""));
  const numeroLegajo = String(formData.get("numero_legajo") ?? "").trim();
  const telefonoUltimos4 = normalizarDni(String(formData.get("telefono_ultimos4") ?? ""));
  const intento = await reservarIntentoLogin(`credencial:${dni}`);
  if (!intento.permitido) {
    return { ok: false, error: mensajeEsperaIntentos(intento.esperaSegundos) };
  }

  let fallido = false;
  try {
    if (dni.length < 7 || dni.length > 8) {
      fallido = true;
      return { ok: false, error: "Ingresá un DNI válido." };
    }

    const { data, error } = await createAdminClient()
      .from("usuarios")
      .select("id, perfil, numero_legajo, telefono, activo")
      .eq("dni", dni)
      .maybeSingle();
    if (error) return { ok: false, error: "No se pudieron verificar los datos. Probá nuevamente." };
    if (!data || !data.activo) {
      fallido = true;
      return { ok: false, error: "No pudimos verificar el DNI y los datos requeridos." };
    }

    if (data.perfil === "afiliado") {
      const legajoRegistrado = String(data.numero_legajo ?? "").trim();
      if (!numeroLegajo || numeroLegajo !== legajoRegistrado) {
        fallido = true;
        return { ok: false, error: "No pudimos verificar el DNI y los datos requeridos." };
      }
    } else if (data.perfil === "invitado") {
      const telefonoRegistrado = String(data.telefono ?? "").trim();
      if (telefonoRegistrado) {
        const digitosTelefono = telefonoRegistrado.replace(/\D/g, "");
        if (
          telefonoUltimos4.length !== 4
          || digitosTelefono.length < 4
          || telefonoUltimos4 !== digitosTelefono.slice(-4)
        ) {
          fallido = true;
          return { ok: false, error: "No pudimos verificar el DNI y los datos requeridos." };
        }
      }
    } else {
      fallido = true;
      return { ok: false, error: "No pudimos verificar el DNI y los datos requeridos." };
    }

    await guardarSesionCredencial(data.id);
    revalidatePath("/mi-credencial");
    return {
      ok: true,
      mensaje: "Datos verificados.",
    };
  } finally {
    intento.finalizar(fallido);
  }
}

export async function salirCredencial(): Promise<void> {
  await cerrarSesionCredencial();
  revalidatePath("/mi-credencial");
}

function archivoFormulario(formData: FormData): File | null {
  const candidatos = ["foto", "archivo"].map((campo) => formData.get(campo));
  const archivos = candidatos.filter((valor): valor is File => valor instanceof File && valor.size > 0);
  return archivos.length === 1 ? archivos[0] : null;
}

export async function subirAltaMedicaSocio(formData: FormData): Promise<ResultadoAccion> {
  const usuarioId = await requerirUsuarioCredencialId();
  const archivo = archivoFormulario(formData);
  if (!archivo) return { ok: false, error: "Elegí una foto o un PDF del certificado." };

  const validacion = await validarArchivoMedico(archivo);
  if (!validacion.ok) return { ok: false, error: validacion.error };

  const supabase = createAdminClient();
  const errorBucket = await asegurarBucketMedicoPrivado(supabase);
  if (errorBucket) return { ok: false, error: errorBucket };

  const path = `${usuarioId}/${crypto.randomUUID()}.${validacion.extension}`;
  const { error: errorSubida } = await supabase.storage
    .from(BUCKET_ALTAS_MEDICAS)
    .upload(path, Buffer.from(await archivo.arrayBuffer()), { contentType: validacion.mime, upsert: false });
  if (errorSubida) return { ok: false, error: `No se pudo subir el certificado: ${errorSubida.message}` };

  const { error: errorRegistro } = await supabase.from("documentacion_medica").insert({
    usuario_id: usuarioId,
    estado: "pendiente",
    origen: "app",
    archivo_path: path,
    archivo_nombre: `certificado.${validacion.extension}`,
  });

  if (errorRegistro) {
    const { error: errorLimpieza } = await supabase.storage.from(BUCKET_ALTAS_MEDICAS).remove([path]);
    const detalleLimpieza = errorLimpieza ? ` También falló la limpieza del archivo temporal: ${errorLimpieza.message}` : "";
    return { ok: false, error: `No se pudo registrar el certificado.${detalleLimpieza}` };
  }

  revalidatePath("/mi-credencial");
  revalidatePath("/recepcion", "layout");
  return { ok: true, mensaje: "Certificado enviado. Recepción lo revisará para actualizar tu estado." };
}
