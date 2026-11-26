import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

const MAX_INTENTOS = 5;
const VENTANA_MS = 10 * 60 * 1000;
const MAX_BUCKETS = 10_000;

interface BucketIntentos {
  fallidos: number[];
  pendientes: Map<number, number>;
}

export type IntentoLogin =
  | { permitido: true; finalizar: (fallido: boolean) => void }
  | { permitido: false; esperaSegundos: number };

const buckets = new Map<string, BucketIntentos>();
let secuenciaIntento = 0;

function claveHash(tipo: "identidad" | "ip", valor: string): string {
  return createHash("sha256").update(`${tipo}:${valor}`).digest("hex");
}

function limpiarBucket(bucket: BucketIntentos, ahora: number): void {
  bucket.fallidos = bucket.fallidos.filter((fecha) => ahora - fecha < VENTANA_MS);
  for (const [id, iniciadoEn] of bucket.pendientes) {
    if (ahora - iniciadoEn >= VENTANA_MS) bucket.pendientes.delete(id);
  }
}

function limpiarBucketsVencidos(ahora: number): void {
  if (buckets.size < MAX_BUCKETS) return;

  for (const [clave, bucket] of buckets) {
    limpiarBucket(bucket, ahora);
    if (bucket.fallidos.length === 0 && bucket.pendientes.size === 0) buckets.delete(clave);
    if (buckets.size < MAX_BUCKETS) return;
  }
}

export async function reservarIntentoLogin(identidad: string): Promise<IntentoLogin> {
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("x-real-ip")?.trim()
    || "desconocida";
  const ahora = Date.now();
  const claves = [
    claveHash("identidad", identidad.trim().toLowerCase()),
    claveHash("ip", ip),
  ];

  limpiarBucketsVencidos(ahora);
  if (claves.some((clave) => !buckets.has(clave)) && buckets.size >= MAX_BUCKETS) {
    return { permitido: false, esperaSegundos: Math.ceil(VENTANA_MS / 1000) };
  }

  const estados = claves.map((clave) => {
    let bucket = buckets.get(clave);
    if (!bucket) {
      bucket = { fallidos: [], pendientes: new Map() };
      buckets.set(clave, bucket);
    }
    limpiarBucket(bucket, ahora);
    return bucket;
  });

  const bloqueado = estados.find((bucket) => bucket.fallidos.length + bucket.pendientes.size >= MAX_INTENTOS);
  if (bloqueado) {
    const expiraciones = [
      ...bloqueado.fallidos.map((fecha) => fecha + VENTANA_MS),
      ...Array.from(bloqueado.pendientes.values(), (fecha) => fecha + VENTANA_MS),
    ];
    const proximaExpiracion = Math.min(...expiraciones);
    return {
      permitido: false,
      esperaSegundos: Math.max(1, Math.ceil((proximaExpiracion - ahora) / 1000)),
    };
  }

  const idIntento = ++secuenciaIntento;
  for (const bucket of estados) bucket.pendientes.set(idIntento, ahora);
  let finalizado = false;

  return {
    permitido: true,
    finalizar(fallido) {
      if (finalizado) return;
      finalizado = true;
      const terminadoEn = Date.now();
      for (const bucket of estados) {
        if (!bucket.pendientes.delete(idIntento)) continue;
        if (fallido) bucket.fallidos.push(terminadoEn);
      }
    },
  };
}

export function mensajeEsperaIntentos(segundos: number): string {
  const minutos = Math.max(1, Math.ceil(segundos / 60));
  return `Demasiados intentos fallidos. Esperá ${minutos} minuto${minutos === 1 ? "" : "s"} antes de volver a intentar.`;
}
