export const estilos = {
  input:
    "w-full rounded-lg border border-atilra-gris/40 bg-atilra-blanco px-3 py-2 text-sm text-atilra-carbon placeholder:text-atilra-gris/70 focus:border-atilra-verde-oscuro focus:outline-none focus:ring-2 focus:ring-atilra-verde/40",
  label: "mb-1 block text-xs font-semibold uppercase tracking-wide text-atilra-gris",
  error: "mt-1 text-xs text-semaforo-rojo",
  btnPrimario:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-atilra-verde px-4 py-2 text-sm font-semibold text-atilra-carbon transition hover:bg-atilra-verde-oscuro disabled:cursor-not-allowed disabled:opacity-60",
  btnSecundario:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-atilra-gris/50 bg-atilra-blanco px-4 py-2 text-sm font-semibold text-atilra-carbon transition hover:border-atilra-verde-oscuro hover:bg-atilra-fondo disabled:cursor-not-allowed disabled:opacity-60",
  btnPeligro:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-semaforo-rojo px-4 py-2 text-sm font-semibold text-semaforo-rojo transition hover:bg-semaforo-rojo hover:text-white disabled:cursor-not-allowed disabled:opacity-60",
  card: "rounded-2xl border border-atilra-gris/15 bg-atilra-blanco p-4 shadow-sm sm:p-5 lg:p-6",
} as const;
