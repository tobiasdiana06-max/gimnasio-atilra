import { GestorPlanillaInscripcion } from "@/components/recepcion/GestorPlanillaInscripcion";
import { requireRecepcion } from "@/lib/auth/recepcion";
import { obtenerPlanillaPublicada } from "@/lib/planilla-inscripcion";

export const dynamic = "force-dynamic";

export default async function PlanillaInscripcionPage() {
  await requireRecepcion();
  let planilla = null;
  let errorCarga: string | undefined;
  try {
    planilla = await obtenerPlanillaPublicada();
  } catch {
    errorCarga = "No se pudo consultar la planilla en Supabase Storage.";
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-atilra-carbon">Planilla de inscripción</h1>
        <p className="text-sm text-atilra-gris">Administrá el archivo oficial disponible para los socios desde Mi Credencial.</p>
      </header>
      <GestorPlanillaInscripcion planilla={planilla} errorCarga={errorCarga} />
    </div>
  );
}
