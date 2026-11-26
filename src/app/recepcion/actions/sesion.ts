"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROL_RECEPCION } from "@/lib/auth/recepcion";
import { mensajeEsperaIntentos, reservarIntentoLogin } from "@/lib/auth/limite-intentos";

export interface EstadoLogin {
  error?: string;
}

export async function iniciarSesion(_previo: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const intento = await reservarIntentoLogin(`recepcion:${email.toLowerCase()}`);
  if (!intento.permitido) return { error: mensajeEsperaIntentos(intento.esperaSegundos) };

  let fallido = false;
  try {
    if (!email || !password) {
      fallido = true;
      return { error: "Ingresá tu email y tu contraseña." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      fallido = true;
      return { error: "Email o contraseña incorrectos." };
    }

    if (data.user.app_metadata?.role !== ROL_RECEPCION) {
      fallido = true;
      await supabase.auth.signOut();
      return { error: "Tu usuario no tiene permisos de recepción. Pedile a un administrador que te habilite." };
    }

    redirect("/recepcion");
  } finally {
    intento.finalizar(fallido);
  }
}

export async function cerrarSesion(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`No se pudo cerrar la sesión de recepción: ${error.message}`);
  redirect("/recepcion/login");
}
