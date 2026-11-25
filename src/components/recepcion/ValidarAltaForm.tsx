"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { aprobarAltaMedica, rechazarAltaMedica } from "@/app/recepcion/actions/altas-medicas";
import { estilos } from "@/components/recepcion/estilos";
import { useFechasAlta } from "@/components/recepcion/useFechasAlta";

export function ValidarAltaForm({ docId }: { docId: string }) {
  const { emision, vencimiento, setEmision, setVencimiento } = useFechasAlta();
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function aprobar() {
    setError(null);
    iniciar(async () => {
      const r = await aprobarAltaMedica(docId, emision, vencimiento);
      if (!r.ok) setError(r.error ?? "No se pudo aprobar.");
    });
  }

  function rechazar() {
    setError(null);
    iniciar(async () => {
      const r = await rechazarAltaMedica(docId, motivo);
      if (!r.ok) setError(r.error ?? "No se pudo rechazar.");
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={estilos.label} htmlFor={`emision-${docId}`}>
            Fecha de emisión
          </label>
          <input
            id={`emision-${docId}`}
            type="date"
            value={emision}
            onChange={(e) => setEmision(e.target.value)}
            className={estilos.input}
          />
        </div>
        <div>
          <label className={estilos.label} htmlFor={`venc-${docId}`}>
            Fecha de vencimiento
          </label>
          <input
            id={`venc-${docId}`}
            type="date"
            value={vencimiento}
            onChange={(e) => setVencimiento(e.target.value)}
            className={estilos.input}
          />
        </div>
      </div>

      {rechazando && (
        <div>
          <label className={estilos.label} htmlFor={`motivo-${docId}`}>
            Motivo del rechazo (opcional)
          </label>
          <input
            id={`motivo-${docId}`}
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej.: la foto está borrosa, enviala de nuevo"
            className={estilos.input}
          />
        </div>
      )}

      {error && <p className="rounded-lg border border-semaforo-rojo bg-red-50 p-2 text-sm text-semaforo-rojo">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {!rechazando ? (
          <>
            <button type="button" onClick={aprobar} disabled={pendiente} className={estilos.btnPrimario}>
              <Check className="h-4 w-4" aria-hidden /> {pendiente ? "Guardando…" : "Aprobar"}
            </button>
            <button type="button" onClick={() => setRechazando(true)} disabled={pendiente} className={estilos.btnPeligro}>
              <X className="h-4 w-4" aria-hidden /> Rechazar
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={rechazar} disabled={pendiente} className={estilos.btnPeligro}>
              {pendiente ? "Guardando…" : "Confirmar rechazo"}
            </button>
            <button type="button" onClick={() => setRechazando(false)} disabled={pendiente} className={estilos.btnSecundario}>
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
