import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_PLANILLA_INSCRIPCION } from "@/lib/constants";

export interface PlanillaPublicada {
  nombre: string;
  url: string;
}

export async function obtenerPlanillaPublicada(): Promise<PlanillaPublicada | null> {
  const supabase = createAdminClient();
  const { data: archivos, error } = await supabase.storage
    .from(BUCKET_PLANILLA_INSCRIPCION)
    .list("oficial", { limit: 100, sortBy: { column: "created_at", order: "desc" } });

  if (error) throw new Error("No se pudo consultar la planilla publicada.");

  const archivo = (archivos ?? []).find((item) =>
    item.name && /\.(pdf|jpe?g|png|webp)$/i.test(item.name),
  );
  if (!archivo) return null;

  const ruta = `oficial/${archivo.name}`;
  const { data } = supabase.storage
    .from(BUCKET_PLANILLA_INSCRIPCION)
    .getPublicUrl(ruta, { download: archivo.name });
  return { nombre: archivo.name, url: data.publicUrl };
}
