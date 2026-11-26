"use client";

import { useState, useTransition } from "react";
import { Download, ExternalLink, Eye, X } from "lucide-react";
import { obtenerUrlsDocumento } from "@/app/recepcion/actions/altas-medicas";
import { estilos } from "@/components/recepcion/estilos";
import type { UrlsDocumento } from "@/types/recepcion";

export function VisorDocumento({ docId, etiqueta = "Ver archivo" }: { docId: string; etiqueta?: string }) {
  const [urls, setUrls] = useState<UrlsDocumento | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();

  function abrir() {
    iniciar(async () => {
      const resultado = await obtenerUrlsDocumento(docId);
      setUrls(resultado);
      setAbierto(true);
    });
  }

  return (
    <>
      <button type="button" onClick={abrir} disabled={pendiente} className={estilos.btnSecundario}>
        <Eye className="h-4 w-4" aria-hidden /> {pendiente ? "Abriendo…" : etiqueta}
      </button>

      {abierto && urls && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-atilra-carbon/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Vista previa del alta médica"
          onClick={() => setAbierto(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h3 className="min-w-0 break-words text-lg font-bold text-atilra-carbon">{urls.nombre ?? "Alta médica"}</h3>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="rounded-lg p-1 text-atilra-gris hover:bg-atilra-fondo"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!urls.ok ? (
              <p className="rounded-lg border border-semaforo-rojo bg-red-50 p-3 text-sm text-semaforo-rojo">
                {urls.error}
              </p>
            ) : (
              <>
                {urls.esImagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urls.urlVer}
                    alt="Alta médica enviada"
                    className="mx-auto max-h-[60vh] max-w-full rounded-lg border border-atilra-gris/20 object-contain"
                  />
                ) : (
                  <p className="rounded-lg bg-atilra-fondo p-4 text-sm text-atilra-gris">
                    Es un PDF: abrilo en una pestaña nueva o descargalo para revisarlo.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  <a href={urls.urlVer} target="_blank" rel="noopener noreferrer" className={estilos.btnPrimario}>
                    <ExternalLink className="h-4 w-4" aria-hidden /> Abrir en pestaña nueva
                  </a>
                  <a href={urls.urlDescarga} className={estilos.btnSecundario}>
                    <Download className="h-4 w-4" aria-hidden /> Descargar
                  </a>
                </div>
                <p className="mt-3 text-xs text-atilra-gris">El enlace es privado y vence en 5 minutos.</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
