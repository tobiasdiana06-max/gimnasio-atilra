import { PanelAccesos, type UsuarioAcceso } from "@/components/recepcion/PanelAccesos";
import { requireRecepcion } from "@/lib/auth/recepcion";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AccesosPage({ searchParams }: { searchParams: Promise<{ dni?: string }> }) {
  await requireRecepcion();
  const { dni } = await searchParams;
  const { data, error } = await createAdminClient()
    .from("usuarios")
    .select("id, dni, numero_legajo, nombre, apellido, perfil")
    .eq("activo", true)
    .order("apellido", { ascending: true })
    .limit(5000);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-atilra-carbon">Bitácora de accesos</h1>
        <p className="text-sm text-atilra-gris">Consultá las fichadas recientes y simulá un ingreso desde recepción.</p>
      </header>
      {error && <p role="alert" className="rounded-lg border border-semaforo-rojo bg-red-50 p-3 text-sm text-semaforo-rojo">Error al consultar usuarios: {error.message}</p>}
      <PanelAccesos usuarios={(data ?? []) as UsuarioAcceso[]} dniInicial={dni ?? ""} />
    </div>
  );
}
