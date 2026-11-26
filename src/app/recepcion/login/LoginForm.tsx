"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "@/app/recepcion/actions/sesion";
import { estilos } from "@/components/recepcion/estilos";

const inicial: EstadoLogin = {};

export function LoginForm() {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, inicial);

  return (
    <form action={accion} className="space-y-4 rounded-2xl bg-atilra-blanco p-6 shadow">
      <div>
        <label className={estilos.label} htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className={estilos.input} />
      </div>
      <div>
        <label className={estilos.label} htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={estilos.input}
        />
      </div>

      {estado.error && (
        <p className="rounded-lg border border-semaforo-rojo bg-red-50 p-3 text-sm text-semaforo-rojo">{estado.error}</p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#047857] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#065f46] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10b981] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pendiente ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
