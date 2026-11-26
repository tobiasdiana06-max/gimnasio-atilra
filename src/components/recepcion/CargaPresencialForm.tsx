"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { cargarAltaPresencial, simularEnvioDigital } from "@/app/recepcion/actions/altas-medicas";
import { estilos } from "@/components/recepcion/estilos";
import { useFechasAlta } from "@/components/recepcion/useFechasAlta";
import { ALTA_MEDICA_MAX_MB } from "@/lib/constants";

type Mensaje = { tipo: "ok" | "error"; texto: string } | null;

export function CargaPresencialForm({ usuarioId }: { usuarioId: string }) {
  const { emision, vencimiento, setEmision, setVencimiento, reiniciar } = useFechasAlta();
  const formRef = useRef<HTMLFormElement>(null);
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [pendiente, iniciar] = useTransition();

  function enviar(formData: FormData) {
    setMensaje(null);
    iniciar(async () => {
      const r = await cargarAltaPresencial(formData);
      if (r.ok) {
        setMensaje({ tipo: "ok", texto: r.mensaje ?? "Alta médica cargada." });
        formRef.current?.reset();
        reiniciar();
      } else {
        setMensaje({ tipo: "error", texto: r.error ?? "No se pudo cargar el alta médica." });
      }
    });
  }

  return (
    <form ref={formRef} action={enviar} className="space-y-3">
      <input type="hidden" name="usuario_id" value={usuarioId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={estilos.label} htmlFor="pres-emision">
            Fecha de emisión
          </label>
          <input
            id="pres-emision"
            name="fecha_emision"
            type="date"
            required
            value={emision}
            onChange={(e) => setEmision(e.target.value)}
            className={estilos.input}
          />
        </div>
        <div>
          <label className={estilos.label} htmlFor="pres-venc">
            Fecha de vencimiento
          </label>
          <input
            id="pres-venc"
            name="fecha_vencimiento"
            type="date"
            required
            value={vencimiento}
            onChange={(e) => setVencimiento(e.target.value)}
            className={estilos.input}
          />
        </div>
      </div>

      <div>
        <label className={estilos.label} htmlFor="pres-archivo">
          Certificado escaneado o foto (opcional)
        </label>
        <input
          id="pres-archivo"
          name="archivo"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="block w-full rounded-xl border border-slate-300 bg-white p-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-950 hover:file:bg-emerald-200"
        />
        <p className="mt-1 text-xs text-atilra-gris">
          JPG, PNG, WEBP o PDF, hasta {ALTA_MEDICA_MAX_MB} MB. Si lo dejás vacío, se registra la carga física sin adjunto.
        </p>
      </div>

      {mensaje && (
        <p
          className={
            mensaje.tipo === "ok"
              ? "rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-950"
              : "rounded-lg border border-semaforo-rojo bg-red-50 p-2 text-sm text-semaforo-rojo"
          }
        >
          {mensaje.texto}
        </p>
      )}

      <button type="submit" disabled={pendiente} className={estilos.btnPrimario}>
        <Upload className="h-4 w-4" aria-hidden /> {pendiente ? "Guardando…" : "Cargar alta médica vigente"}
      </button>
    </form>
  );
}

/** SOLO DESARROLLO: simula el envío por chat/WhatsApp de la Etapa 3 (queda "pendiente"). */
export function SimularEnvioDigitalForm({ usuarioId }: { usuarioId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [pendiente, iniciar] = useTransition();

  function enviar(formData: FormData) {
    setMensaje(null);
    iniciar(async () => {
      const r = await simularEnvioDigital(formData);
      setMensaje(
        r.ok
          ? { tipo: "ok", texto: r.mensaje ?? "Listo." }
          : { tipo: "error", texto: r.error ?? "No se pudo simular el envío." },
      );
      if (r.ok) formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={enviar} className="space-y-3">
      <input type="hidden" name="usuario_id" value={usuarioId} />
      <input
        name="archivo"
        type="file"
        required
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="block w-full rounded-xl border border-slate-300 bg-white p-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-800 hover:file:bg-slate-200"
      />
      {mensaje && (
        <p className={mensaje.tipo === "ok" ? "rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-950" : "rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800"}>
          {mensaje.texto}
        </p>
      )}
      <button type="submit" disabled={pendiente} className={estilos.btnSecundario}>
        {pendiente ? "Enviando…" : "Simular envío digital"}
      </button>
    </form>
  );
}
