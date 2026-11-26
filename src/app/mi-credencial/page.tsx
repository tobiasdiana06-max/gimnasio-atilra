import { MiCredencialPortal, type NoticiaPortal, type UsuarioMiCredencial } from "@/components/mi-credencial/MiCredencialPortal";
import { obtenerUsuarioCredencialId } from "@/lib/auth/credencial";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EstadoUsuario } from "@/types";

export const dynamic = "force-dynamic";

export default async function MiCredencialPage() {
  const usuarioId = await obtenerUsuarioCredencialId();
  if (!usuarioId) {
    return <MiCredencialPortal usuario={null} estado={null} noticias={[]} />;
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
    <div className="min-h-screen bg-[#F4F6F4]">
      <MiCredencialPortal
        usuario={usuario}
        avisarTelefonoInvitado={usuario?.perfil === "invitado" && !usuario.telefono?.trim()}
        estado={(estadoRes.data ?? null) as EstadoUsuario | null}
        noticias={(noticiasRes.data ?? []) as NoticiaPortal[]}
        errorCarga={errorCarga ? `No se pudieron cargar todos los datos: ${errorCarga}` : undefined}
      />
    </div>
  );
}
