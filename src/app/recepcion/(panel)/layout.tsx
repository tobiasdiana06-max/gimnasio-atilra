import { RecepcionNav } from "@/components/recepcion/RecepcionNav";
import { requireRecepcion } from "@/lib/auth/recepcion";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function PanelRecepcionLayout({ children }: { children: React.ReactNode }) {
  const sesion = await requireRecepcion();

  const supabase = createAdminClient();
  const { count } = await supabase
    .from("documentacion_medica")
    .select("id", { count: "exact", head: true })
    .eq("estado", "pendiente");

  return (
    <div className="min-h-screen md:flex">
      <RecepcionNav email={sesion.email} pendientes={count ?? 0} />
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
