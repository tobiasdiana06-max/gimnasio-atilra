import { ZONA_HORARIA } from "@/lib/constants";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function esFechaISO(valor: string): boolean {
  if (!ISO.test(valor)) return false;
  const [a, m, d] = valor.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

/** Fecha de hoy (YYYY-MM-DD) en horario de Buenos Aires. */
export function hoyISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Suma años a una fecha ISO. El 29/02 pasa al 28/02 en años no bisiestos. */
export function sumarAnios(iso: string, anios: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const destino = new Date(Date.UTC(a + anios, m - 1, d));
  if (destino.getUTCMonth() !== m - 1) destino.setUTCDate(0);
  return destino.toISOString().slice(0, 10);
}

/** 2027-03-05 -> 05/03/2027 */
export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** Timestamp -> 05/03/2027 14:32 (horario de Buenos Aires). */
export function formatearFechaHora(ts: string | null | undefined): string {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA_HORARIA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ts));
}
