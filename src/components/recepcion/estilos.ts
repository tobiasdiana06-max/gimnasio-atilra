export const estilos = {
  input:
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/25",
  label: "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600",
  error: "mt-1 text-xs text-semaforo-rojo",
  btnPrimario:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-[#047857] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#065f46] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60",
  btnSecundario:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60",
  btnPeligro:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-semaforo-rojo px-4 py-2 text-sm font-semibold text-semaforo-rojo transition hover:bg-semaforo-rojo hover:text-white disabled:cursor-not-allowed disabled:opacity-60",
  card: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6",
} as const;
