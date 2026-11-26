import { AutoLockGuard } from "@/components/recepcion/AutoLockGuard";
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
    <div className="min-h-screen bg-atilra-fondo">
      <AutoLockGuard />
      <RecepcionNav email={sesion.email} pendientes={count ?? 0} />
      <main className="mx-auto min-w-0 w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
        {children}
      </main>
    </div>
  );
}
