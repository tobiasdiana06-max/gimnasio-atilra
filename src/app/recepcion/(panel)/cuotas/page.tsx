import { GestorCuotas, type UsuarioCuota } from "@/components/recepcion/GestorCuotas";
import { requireRecepcion } from "@/lib/auth/recepcion";
import { createAdminClient } from "@/lib/supabase/admin";
import { hoyISO } from "@/lib/fechas";

export const dynamic = "force-dynamic";

export default async function CuotasPage({
  searchParams,
}: {
  searchParams: Promise<{ usuario?: string }>;
}) {
  await requireRecepcion();
  const { usuario: usuarioInicial } = await searchParams;
  const supabase = createAdminClient();
  const usuariosRes = await supabase
    .from("usuarios")
    .select("id, dni, numero_legajo, nombre, apellido, perfil, fecha_renovacion_afiliacion")
    .eq("activo", true)
    .order("apellido", { ascending: true })
    .limit(5000);
  const usuarios = (usuariosRes.data ?? []) as UsuarioCuota[];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-atilra-carbon">Cuotas y renovaciones</h1>
        <p className="text-sm text-atilra-gris">
          Registrá los pagos de invitados y renová la afiliación. Los pagos más recientes se muestran primero.
        </p>
      </header>
      {usuariosRes.error && (
        <p role="alert" className="rounded-lg border border-semaforo-rojo bg-red-50 p-3 text-sm text-semaforo-rojo">
          Error al consultar Supabase: {usuariosRes.error.message}
        </p>
      )}
      <GestorCuotas
        usuarios={usuarios}
        usuarioInicial={usuarioInicial ?? ""}
        hoy={hoyISO()}
      />
    </div>
  );
}
