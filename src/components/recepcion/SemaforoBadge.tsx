import { SEMAFORO_CLASES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { SemaforoAcceso } from "@/types";

export function SemaforoBadge({ semaforo, className }: { semaforo: SemaforoAcceso; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
        SEMAFORO_CLASES[semaforo].badge,
        className,
      )}
    >
      {semaforo}
    </span>
  );
}

export function PerfilBadge({ perfil }: { perfil: string }) {
  const esAfiliado = perfil === "afiliado";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        esAfiliado
          ? "bg-emerald-100 text-emerald-950"
          : "border border-slate-300 bg-white text-slate-700",
      )}
    >
      {perfil}
    </span>
  );
}
