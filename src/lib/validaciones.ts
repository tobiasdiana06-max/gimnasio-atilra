import { esFechaISO } from "@/lib/fechas";
import type { UsuarioFormValues } from "@/types/recepcion";

export function normalizarDni(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function normalizarTelefono(valor: string): string {
  return valor.replace(/[\s()-]/g, "");
}

/** Devuelve un mapa campo -> mensaje. Vacío si todo está bien. Se usa en cliente y en servidor. */
export function validarUsuario(v: UsuarioFormValues): Record<string, string> {
  const errores: Record<string, string> = {};
  const dni = normalizarDni(v.dni);

  if (dni.length < 7 || dni.length > 8) errores.dni = "El DNI tiene que tener 7 u 8 dígitos.";
  if (!v.nombre.trim()) errores.nombre = "Cargá el nombre.";
  if (!v.apellido.trim()) errores.apellido = "Cargá el apellido.";
  if (v.perfil === "afiliado" && !v.numero_legajo.trim()) {
    errores.numero_legajo = "El N.° de legajo es obligatorio para afiliados.";
  }
  if (v.telefono.trim() && !/^\+?\d{8,15}$/.test(normalizarTelefono(v.telefono))) {
    errores.telefono = "Revisá el teléfono: solo números, con código de área (ej. 11 2377 1502).";
  }
  return errores;
}

/** Valida emisión/vencimiento de un alta médica. Devuelve un mensaje de error o null. */
export function validarFechasAlta(emision: string, vencimiento: string, hoy: string): string | null {
  if (!esFechaISO(emision)) return "Cargá una fecha de emisión válida.";
  if (!esFechaISO(vencimiento)) return "Cargá una fecha de vencimiento válida.";
  if (emision > hoy) return "La fecha de emisión no puede ser futura.";
  if (vencimiento <= emision) return "El vencimiento tiene que ser posterior a la emisión.";
  if (vencimiento < hoy) return "Con ese vencimiento el alta médica ya estaría vencida. Revisá las fechas.";
  return null;
}
