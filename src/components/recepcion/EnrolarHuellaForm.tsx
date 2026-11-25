"use client";

import { useState } from "react";
import { Fingerprint } from "lucide-react";
import { useRouter } from "next/navigation";
import { guardarHuellaTemplate } from "@/app/recepcion/actions/terminal";
import { estilos } from "@/components/recepcion/estilos";

const BRIDGE_URL = "http://127.0.0.1:8787";

export function EnrolarHuellaForm({
  usuarioId,
  tieneHuella,
}: {
  usuarioId: string;
  tieneHuella: boolean;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  async function enrolar() {
    setOcupado(true);
    setMensaje("");
    setError("");

    try {
      const response = await fetch(`${BRIDGE_URL}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: usuarioId }),
      });
      const resultado = await response.json() as { ok?: boolean; huella_template_id?: string; error?: string };
      if (!response.ok || !resultado.ok || !resultado.huella_template_id) {
        throw new Error(resultado.error ?? "El puente local no pudo enrolar la huella.");
      }

      const guardado = await guardarHuellaTemplate(usuarioId, resultado.huella_template_id);
      if (!guardado.ok) throw new Error(guardado.error ?? "No se pudo asociar la huella al usuario.");
      setMensaje(guardado.mensaje ?? "Huella enrolada.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} Verificá que bridge-huella esté iniciado en esta PC.`
          : "No se pudo comunicar con el puente local.",
      );
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={() => void enrolar()} disabled={ocupado} className={estilos.btnSecundario}>
        <Fingerprint className="h-4 w-4" aria-hidden />
        {ocupado ? "Esperando lector…" : tieneHuella ? "Volver a enrolar huella" : "Enrolar huella"}
      </button>
      {mensaje && <p role="status" className="text-sm font-medium text-atilra-verde-oscuro">{mensaje}</p>}
      {error && <p role="alert" className="text-sm text-semaforo-rojo">{error}</p>}
      <p className="text-xs text-atilra-gris">
        El SDK del lector debe estar conectado al puente local de esta PC. El identificador biométrico se guarda en el perfil.
      </p>
    </div>
  );
}
