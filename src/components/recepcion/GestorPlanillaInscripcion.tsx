"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Download, FileUp, Trash2 } from "lucide-react";
import { eliminarPlanillaInscripcion, publicarPlanillaInscripcion } from "@/app/recepcion/actions/planilla-inscripcion";
import { estilos } from "@/components/recepcion/estilos";
import { PLANILLA_INSCRIPCION_MAX_MB } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PlanillaPublicada } from "@/lib/planilla-inscripcion";

export function GestorPlanillaInscripcion({
  planilla,
  errorCarga,
}: {
  planilla: PlanillaPublicada | null;
  errorCarga?: string;
}) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function publicar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMensaje("");
    setError("");
    setOcupado(true);
    try {
      const resultado = await publicarPlanillaInscripcion(new FormData(event.currentTarget));
      if (!resultado.ok) {
        setError(resultado.error ?? "No se pudo publicar la planilla.");
        return;
      }
      setMensaje(resultado.mensaje ?? "Planilla publicada.");
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo publicar la planilla.");
    } finally {
      setOcupado(false);
    }
  }

  async function eliminar() {
    if (!window.confirm("¿Eliminar la planilla publicada? Los socios ya no podrán descargarla.")) return;
    setMensaje("");
    setError("");
    setOcupado(true);
    try {
      const resultado = await eliminarPlanillaInscripcion();
      if (!resultado.ok) {
        setError(resultado.error ?? "No se pudo eliminar la planilla.");
        return;
      }
      setMensaje(resultado.mensaje ?? "Planilla eliminada.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la planilla.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className={cn(estilos.card, "max-w-2xl space-y-5")}>
      <div>
        <h2 className="text-lg font-bold text-atilra-carbon">Planilla de Inscripción al Gimnasio</h2>
        <p className="mt-1 text-sm text-atilra-gris">
          Publicá un PDF o una imagen de hasta {PLANILLA_INSCRIPCION_MAX_MB} MB. El archivo publicado queda disponible para afiliados e invitados.
        </p>
      </div>

      {errorCarga && <p role="alert" className="rounded-lg border border-semaforo-rojo bg-red-50 p-3 text-sm text-semaforo-rojo">{errorCarga}</p>}
      {planilla ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-atilra-gris/20 bg-atilra-fondo p-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-atilra-carbon">Planilla actual</p>
            <p className="truncate text-sm text-atilra-gris">{planilla.nombre}</p>
          </div>
          <a href={planilla.url} download className={estilos.btnSecundario}>
            <Download className="h-4 w-4" aria-hidden /> Descargar
          </a>
        </div>
      ) : (
        <p className="rounded-xl bg-atilra-fondo p-4 text-sm text-atilra-gris">Todavía no hay una planilla publicada.</p>
      )}

      <form onSubmit={(event) => void publicar(event)} className="space-y-3">
        <label htmlFor="planilla-inscripcion-archivo" className={estilos.label}>Subir o reemplazar archivo oficial</label>
        <input
          id="planilla-inscripcion-archivo"
          name="archivo"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          required
          className="block w-full rounded-lg border border-atilra-gris/40 bg-white p-2 text-sm text-atilra-gris file:mr-3 file:rounded-lg file:border-0 file:bg-atilra-verde file:px-4 file:py-2 file:font-semibold file:text-atilra-carbon"
        />
        <p className="text-xs text-atilra-gris">Formatos PDF, JPG, PNG o WEBP · máximo {PLANILLA_INSCRIPCION_MAX_MB} MB.</p>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={ocupado} className={estilos.btnPrimario}>
            <FileUp className="h-4 w-4" aria-hidden /> {ocupado ? "Publicando…" : planilla ? "Reemplazar planilla" : "Publicar planilla"}
          </button>
          {planilla && (
            <button type="button" disabled={ocupado} onClick={() => void eliminar()} className={estilos.btnPeligro}>
              <Trash2 className="h-4 w-4" aria-hidden /> Eliminar
            </button>
          )}
        </div>
      </form>

      {mensaje && <p role="status" className="rounded-lg bg-atilra-verde/15 p-3 text-sm text-atilra-carbon">{mensaje}</p>}
      {error && <p role="alert" className="rounded-lg border border-semaforo-rojo bg-red-50 p-3 text-sm text-semaforo-rojo">{error}</p>}
    </section>
  );
}
