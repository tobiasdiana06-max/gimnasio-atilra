import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const ROL_RECEPCION = "admin_recepcion";

export interface SesionRecepcion {
  email: string;
}

/** Atajo SOLO para desarrollo local: RECEPCION_AUTH_DISABLED=true en .env.local. Se ignora en producción. */
function autenticacionDeshabilitada(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.RECEPCION_AUTH_DISABLED === "true";
}

export async function obtenerSesionRecepcion(): Promise<SesionRecepcion | null> {
  if (autenticacionDeshabilitada()) return { email: "desarrollo@local" };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || user.app_metadata?.role !== ROL_RECEPCION) return null;
  return { email: user.email ?? "recepción" };
}

/** Llamala en cada página y en cada Server Action del panel: las acciones son endpoints públicos. */
export async function requireRecepcion(): Promise<SesionRecepcion> {
  const sesion = await obtenerSesionRecepcion();
  if (!sesion) redirect("/recepcion/login");
  return sesion;
}
