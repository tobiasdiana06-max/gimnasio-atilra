"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cerrarSesion } from "@/app/recepcion/actions/sesion";

const TIEMPO_INACTIVIDAD_MS = 15 * 60 * 1000;

export function AutoLockGuard() {
  const [bloqueando, setBloqueando] = useState(false);
  const [error, setError] = useState("");
  const bloqueoEnCurso = useRef(false);

  const bloquear = useCallback(async () => {
    if (bloqueoEnCurso.current) return;
    bloqueoEnCurso.current = true;
    setBloqueando(true);
    setError("");

    try {
      await cerrarSesion();
    } catch (err) {
      console.error("No se pudo bloquear la sesión de recepción.", err);
      bloqueoEnCurso.current = false;
      setBloqueando(false);
      setError("No se pudo cerrar la sesión. Volvé a intentar para proteger esta computadora.");
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const registrarActividad = () => {
      if (bloqueoEnCurso.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => void bloquear(), TIEMPO_INACTIVIDAD_MS);
    };

    const eventos = ["mousemove", "keydown", "touchstart", "pointerdown"] as const;
    eventos.forEach((evento) => window.addEventListener(evento, registrarActividad, { passive: true }));
    registrarActividad();

    return () => {
      clearTimeout(timer);
      eventos.forEach((evento) => window.removeEventListener(evento, registrarActividad));
    };
  }, [bloquear]);

  if (!bloqueando && !error) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="bloqueo-recepcion-titulo"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#292929]/95 p-6 text-center text-white"
    >
      <div className="max-w-md rounded-2xl border border-white/15 bg-[#292929] p-8 shadow-2xl">
        <h2 id="bloqueo-recepcion-titulo" className="text-2xl font-black">
          {error ? "Sesión sin bloquear" : "Bloqueando sesión"}
        </h2>
        <p className="mt-3 text-sm text-white/75">{error || "Cerrando la sesión de recepción…"}</p>
        {error && (
          <button
            type="button"
            onClick={() => void bloquear()}
            className="mt-5 rounded-xl bg-[#9AC201] px-5 py-3 font-bold text-[#292929]"
          >
            Reintentar bloqueo
          </button>
        )}
      </div>
    </div>
  );
}
