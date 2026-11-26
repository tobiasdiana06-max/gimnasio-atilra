import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { SEMAFORO_CLASES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { EstadoUsuario } from "@/types";

export const dynamic = "force-dynamic";

// Página de verificación SOLO para desarrollo (usa service_role). Borrala al terminar la Etapa 1.
export default async function DevSemaforoPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("vista_estado_usuarios")
    .select("*")
    .order("dni", { ascending: false });

  const filas = (data ?? []) as EstadoUsuario[];

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-1 text-2xl font-bold text-atilra-carbon">Semáforo de acceso — prueba</h1>
      <p className="mb-6 text-sm text-atilra-gris">
        Lee <code>vista_estado_usuarios</code> con service_role. Esperado con el seed: verde, amarillo y rojo.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-semaforo-rojo bg-red-50 p-4 text-sm text-semaforo-rojo">
          Error al consultar Supabase: {error.message}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl bg-atilra-blanco shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-atilra-carbon text-atilra-blanco">
            <tr>
              <th className="p-3">DNI</th>
              <th className="p-3">Legajo</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Perfil</th>
              <th className="p-3">Semáforo</th>
              <th className="p-3">Días</th>
              <th className="p-3">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.usuario_id} className="border-t border-atilra-gris/15">
                <td className="p-3 font-mono">{f.dni}</td>
                <td className="p-3">{f.numero_legajo ?? "—"}</td>
                <td className="p-3">
                  {f.apellido}, {f.nombre}
                </td>
                <td className="p-3 capitalize">{f.perfil}</td>
                <td className="p-3">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", SEMAFORO_CLASES[f.semaforo].badge)}>
                    {f.semaforo.toUpperCase()}
                  </span>
                </td>
                <td className="p-3">{f.dias_restantes ?? "—"}</td>
                <td className="p-3">{f.motivo}</td>
              </tr>
            ))}
            {filas.length === 0 && !error && (
              <tr>
                <td className="p-4 text-atilra-gris" colSpan={7}>
                  Sin datos. ¿Corriste seed.sql?
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
