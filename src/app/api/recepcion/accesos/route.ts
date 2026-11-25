import { requireRecepcion } from "@/lib/auth/recepcion";
import { esFechaISO } from "@/lib/fechas";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SemaforoAcceso } from "@/types";

export const dynamic = "force-dynamic";

const SEMAFOROS: SemaforoAcceso[] = ["verde", "amarillo", "rojo"];

export async function GET(request: Request) {
  await requireRecepcion();

  const parametros = new URL(request.url).searchParams;
  const desde = parametros.get("desde") ?? "";
  const hasta = parametros.get("hasta") ?? "";
  const semaforo = parametros.get("semaforo") ?? "";

  if ((desde && !esFechaISO(desde)) || (hasta && !esFechaISO(hasta))) {
    return Response.json({ error: "El rango de fechas no es válido." }, { status: 400 });
  }
  if (desde && hasta && desde > hasta) {
    return Response.json({ error: "La fecha inicial no puede ser posterior a la fecha final." }, { status: 400 });
  }
  if (semaforo && !SEMAFOROS.includes(semaforo as SemaforoAcceso)) {
    return Response.json({ error: "El color del semáforo no es válido." }, { status: 400 });
  }

  const supabase = createAdminClient();
  let consulta = supabase
    .from("accesos_huella")
    .select("id, usuario_id, fecha_hora, semaforo, motivo, metodo")
    .order("fecha_hora", { ascending: false })
    .limit(200);

  if (desde) consulta = consulta.gte("fecha_hora", `${desde}T00:00:00-03:00`);
  if (hasta) consulta = consulta.lte("fecha_hora", `${hasta}T23:59:59.999-03:00`);
  if (semaforo) consulta = consulta.eq("semaforo", semaforo);

  const { data: accesos, error } = await consulta;
  if (error) return Response.json({ error: `No se pudo cargar la bitácora: ${error.message}` }, { status: 500 });

  const ids = [...new Set((accesos ?? []).map((acceso) => acceso.usuario_id as string))];
  const usuariosPorId = new Map<string, {
    dni: string;
    numero_legajo: string | null;
    nombre: string;
    apellido: string;
    perfil: string;
  }>();

  if (ids.length > 0) {
    const { data: usuarios, error: errorUsuarios } = await supabase
      .from("usuarios")
      .select("id, dni, numero_legajo, nombre, apellido, perfil")
      .in("id", ids);
    if (errorUsuarios) {
      return Response.json({ error: `No se pudieron cargar los datos de usuarios: ${errorUsuarios.message}` }, { status: 500 });
    }
    for (const usuario of usuarios ?? []) usuariosPorId.set(usuario.id, usuario);
  }

  const filas = (accesos ?? []).map((acceso) => ({
    ...acceso,
    usuario: usuariosPorId.get(acceso.usuario_id as string) ?? null,
  }));
  return Response.json({ accesos: filas }, { headers: { "Cache-Control": "no-store" } });
}
