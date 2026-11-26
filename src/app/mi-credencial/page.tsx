import { MiCredencialPortal, type NoticiaPortal, type UsuarioMiCredencial } from "@/components/mi-credencial/MiCredencialPortal";
import { obtenerUsuarioCredencialId } from "@/lib/auth/credencial";
import { hoyISO } from "@/lib/fechas";
import { obtenerPlanillaPublicada } from "@/lib/planilla-inscripcion";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EstadoUsuario } from "@/types";

export const dynamic = "force-dynamic";

export default async function MiCredencialPage() {
  const usuarioId = await obtenerUsuarioCredencialId();
  let planillaUrl: string | null = null;
  let planillaError: string | undefined;
  try {
    planillaUrl = (await obtenerPlanillaPublicada())?.url ?? null;
  } catch {
    planillaError = "No se pudo consultar la planilla de inscripción.";
  }

  if (!usuarioId) {
    return (
      <MiCredencialPortal
        usuario={null}
        estado={null}
        noticias={[]}
        hoy={hoyISO()}
        planillaUrl={planillaUrl}
        planillaError={planillaError}
      />
    );
  }

  const supabase = createAdminClient();
  const [usuarioRes, estadoRes, noticiasRes] = await Promise.all([
    supabase
      .from("usuarios")
      .select("id, dni, numero_legajo, nombre, apellido, perfil, foto_url, telefono")
      .eq("id", usuarioId)
      .eq("activo", true)
      .maybeSingle(),
    supabase.from("vista_estado_usuarios").select("*").eq("usuario_id", usuarioId).maybeSingle(),
    supabase
      .from("noticias")
      .select("id, titulo, contenido, imagen_url, fecha_publicacion")
      .eq("publicada", true)
      .order("fecha_publicacion", { ascending: false })
      .limit(100),
  ]);

  const errorCarga = usuarioRes.error?.message ?? estadoRes.error?.message ?? noticiasRes.error?.message;
  const usuario = usuarioRes.data as (UsuarioMiCredencial & { telefono: string | null }) | null;
  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-100 via-emerald-50/40 to-slate-200/70">
      <MiCredencialPortal
        usuario={usuario}
        avisarTelefonoInvitado={usuario?.perfil === "invitado" && !usuario.telefono?.trim()}
        estado={(estadoRes.data ?? null) as EstadoUsuario | null}
        noticias={(noticiasRes.data ?? []) as NoticiaPortal[]}
        hoy={hoyISO()}
        planillaUrl={planillaUrl}
        planillaError={planillaError}
        claveVapidPublica={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
        errorCarga={errorCarga ? `No se pudieron cargar todos los datos: ${errorCarga}` : undefined}
      />
    </div>
  );
}
