"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROL_RECEPCION } from "@/lib/auth/recepcion";

export interface EstadoLogin {
  error?: string;
}

export async function iniciarSesion(_previo: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Ingresá tu email y tu contraseña." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "Email o contraseña incorrectos." };

  if (data.user.app_metadata?.role !== ROL_RECEPCION) {
    await supabase.auth.signOut();
    return { error: "Tu usuario no tiene permisos de recepción. Pedile a un administrador que te habilite." };
  }

  redirect("/recepcion");
}

export async function cerrarSesion(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/recepcion/login");
}
