import type { DocumentoMedico } from "@/types/recepcion";

/** Etiqueta y color para mostrar el estado real de un documento (un "vigente" con fecha pasada se ve vencido). */
export function estadoVisible(doc: Pick<DocumentoMedico, "estado" | "fecha_vencimiento">, hoy: string) {
  if (doc.estado === "vigente" && doc.fecha_vencimiento && doc.fecha_vencimiento < hoy) {
    return { etiqueta: "Vencida", clase: "bg-semaforo-rojo text-white" };
  }
  switch (doc.estado) {
    case "vigente":
      return { etiqueta: "Vigente", clase: "bg-atilra-verde text-atilra-carbon" };
    case "pendiente":
      return { etiqueta: "Pendiente de validación", clase: "bg-semaforo-amarillo text-atilra-carbon" };
    case "rechazada":
      return { etiqueta: "Rechazada", clase: "bg-atilra-gris text-white" };
    default:
      return { etiqueta: "Vencida", clase: "bg-semaforo-rojo text-white" };
  }
}
