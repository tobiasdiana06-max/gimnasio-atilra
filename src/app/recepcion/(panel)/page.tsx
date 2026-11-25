import { PadronUsuarios, type FilaPadron } from "@/components/recepcion/PadronUsuarios";
import { requireRecepcion } from "@/lib/auth/recepcion";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EstadoUsuario } from "@/types";

export const dynamic = "force-dynamic";

export default async function PadronPage() {
  await requireRecepcion();
  const supabase = createAdminClient();

  const [estados, telefonos] = await Promise.all([
    supabase.from("vista_estado_usuarios").select("*").order("apellido", { ascending: true }).limit(5000),
    supabase.from("usuarios").select("id, telefono").limit(5000),
  ]);

  const error = estados.error ?? telefonos.error;
  const telefonoPorId = new Map<string, string | null>(
    ((telefonos.data ?? []) as { id: string; telefono: string | null }[]).map((u) => [u.id, u.telefono]),
  );
  const filas: FilaPadron[] = ((estados.data ?? []) as EstadoUsuario[]).map((f) => ({
    ...f,
    telefono: telefonoPorId.get(f.usuario_id) ?? null,
  }));

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg border border-semaforo-rojo bg-red-50 p-4 text-sm text-semaforo-rojo">
          Error al consultar Supabase: {error.message}. Si dice que falta la columna «telefono», corré{" "}
          <code>supabase/ajustes_etapa1_panel.sql</code>.
        </div>
      )}
      <PadronUsuarios filas={filas} />
    </>
  );
}
