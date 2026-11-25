import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EstadoUsuario } from "@/types";
import type { ErrorFichadaTerminal, FichadaTerminal, UsuarioTerminal } from "@/types/terminal";

const CAMPOS_USUARIO =
  "id, dni, numero_legajo, nombre, apellido, perfil, telefono, email, foto_url, activo, fecha_renovacion_afiliacion";

export async function registrarFichadaTerminal(
  identificador: { tipo: "huella"; valor: string } | { tipo: "dni"; valor: string },
): Promise<FichadaTerminal | ErrorFichadaTerminal> {
  const supabase = createAdminClient();
  let usuario: UsuarioTerminal | null = null;

  if (identificador.tipo === "huella") {
    const { data, error } = await supabase
      .from("usuarios")
      .select(CAMPOS_USUARIO)
      .eq("huella_template_id", identificador.valor)
      .limit(2);
    if (error) return { ok: false, status: 500, error: "No se pudo consultar la plantilla biométrica." };
    if (!data || data.length === 0) return { ok: false, status: 404, error: "No encontramos un usuario enrolado con esa huella." };
    if (data.length > 1) return { ok: false, status: 409, error: "La plantilla biométrica está asociada a más de un usuario. Revisá el enrolamiento." };
    usuario = data[0] as UsuarioTerminal;
  } else {
    const { data, error } = await supabase
      .from("usuarios")
      .select(CAMPOS_USUARIO)
      .eq("dni", identificador.valor)
      .maybeSingle();
    if (error) return { ok: false, status: 500, error: "No se pudo consultar el DNI." };
    if (!data) return { ok: false, status: 404, error: "No encontramos un usuario con ese DNI." };
    usuario = data as UsuarioTerminal;
  }

  const { data: estadoData, error: errorEstado } = await supabase
    .from("vista_estado_usuarios")
    .select("*")
    .eq("usuario_id", usuario.id)
    .maybeSingle();
  if (errorEstado) return { ok: false, status: 500, error: "No se pudo consultar el estado actualizado del usuario." };
  if (!estadoData) return { ok: false, status: 404, error: "El usuario no tiene un estado de acceso disponible." };

  const estado = estadoData as EstadoUsuario;
  const metodo = identificador.tipo === "huella" ? "huella" : "dni_manual";
  const { data: acceso, error: errorAcceso } = await supabase
    .from("accesos_huella")
    .insert({
      usuario_id: usuario.id,
      semaforo: estado.semaforo,
      motivo: estado.motivo,
      metodo,
    })
    .select("id, fecha_hora")
    .single();

  if (errorAcceso || !acceso) {
    return { ok: false, status: 500, error: "No se pudo guardar la fichada en la bitácora." };
  }

  return {
    ok: true,
    usuario,
    estado,
    acceso: { id: acceso.id, fecha_hora: acceso.fecha_hora, metodo },
  };
}
