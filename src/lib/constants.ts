import type { SemaforoAcceso } from "@/types";

export const UMBRAL_PREVENTIVO_DIAS = 15;

/** Hitos de recordatorio automático (días antes del vencimiento). 0 = el día del vencimiento. */
export const HITOS_RECORDATORIO = [15, 3, 0] as const;

export const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

export const BUCKET_ALTAS_MEDICAS = "altas-medicas";
export const BUCKET_PLANILLA_INSCRIPCION = "planilla-inscripcion";
export const PLANILLA_INSCRIPCION_MAX_MB = 10;
export const PLANILLA_INSCRIPCION_MAX_BYTES = PLANILLA_INSCRIPCION_MAX_MB * 1024 * 1024;

/** Vigencia por defecto de un alta médica al validarla (editable en recepción). */
export const VIGENCIA_ALTA_MEDICA_ANIOS = 1;

/** Archivos aceptados para altas médicas (fotos o PDF) y tope de tamaño. */
export const ALTA_MEDICA_MAX_MB = 10;
export const ALTA_MEDICA_MAX_BYTES = ALTA_MEDICA_MAX_MB * 1024 * 1024;
export const ALTA_MEDICA_EXTENSION_POR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/**
 * Semáforo: verde institucional con texto carbón (el blanco sobre #9AC201 no tiene contraste suficiente).
 * Amarillo y rojo son auxiliares exclusivos del semáforo.
 */
export const SEMAFORO_CLASES: Record<
  SemaforoAcceso,
  { badge: string; etiqueta: string; panel: string }
> = {
  verde: {
    badge: "bg-atilra-verde text-atilra-carbon",
    etiqueta: "Habilitado",
    panel: "border-atilra-verde bg-emerald-50",
  },
  amarillo: {
    badge: "bg-semaforo-amarillo text-atilra-carbon",
    etiqueta: "Alerta preventiva",
    panel: "border-semaforo-amarillo bg-amber-50",
  },
  rojo: {
    badge: "bg-semaforo-rojo text-white",
    etiqueta: "Acceso retenido",
    panel: "border-semaforo-rojo bg-red-50",
  },
};

export const CONTACTO = {
  ospil: {
    direccion: "Belgrano 443",
    telefono: "(0237) 485-1414",
    whatsapp: "+54 9 11 2377-1502",
  },
  sede: {
    direccion: "Belgrano 443",
    telefonos: ["(0237) 485-1414", "(0237) 484-1580"],
  },
} as const;
