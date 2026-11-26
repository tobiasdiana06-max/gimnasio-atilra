import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EstadoUsuario } from "@/types";
import type { ErrorFichadaTerminal, FichadaTerminal, UsuarioTerminal } from "@/types/terminal";

const CAMPOS_USUARIO =
  "id, dni, numero_legajo, nombre, apellido, perfil, foto_url";

type UsuarioTerminalDb = UsuarioTerminal & { id: string };

export async function registrarFichadaTerminal(
  identificador: { tipo: "huella"; valor: string } | { tipo: "dni"; valor: string },
): Promise<FichadaTerminal | ErrorFichadaTerminal> {
  const supabase = createAdminClient();
  let usuario: UsuarioTerminalDb | null = null;

  if (identificador.tipo === "huella") {
    const { data, error } = await supabase
      .from("usuarios")
      .select(CAMPOS_USUARIO)
      .eq("huella_template_id", identificador.valor)
      .limit(2);
    if (error) return { ok: false, status: 500, error: "No se pudo consultar la plantilla biométrica." };
    if (!data || data.length === 0) return { ok: false, status: 404, error: "No encontramos un usuario enrolado con esa huella." };
    if (data.length > 1) return { ok: false, status: 409, error: "La plantilla biométrica está asociada a más de un usuario. Revisá el enrolamiento." };
    usuario = data[0] as UsuarioTerminalDb;
  } else {
    const { data, error } = await supabase
      .from("usuarios")
      .select(CAMPOS_USUARIO)
      .eq("dni", identificador.valor)
      .maybeSingle();
    if (error) return { ok: false, status: 500, error: "No se pudo consultar el DNI." };
    if (!data) return { ok: false, status: 404, error: "No encontramos un usuario con ese DNI." };
    usuario = data as UsuarioTerminalDb;
  }

  const { data: estadoData, error: errorEstado } = await supabase
    .from("vista_estado_usuarios")
    .select("semaforo, motivo, dias_restantes")
    .eq("usuario_id", usuario.id)
    .maybeSingle();
  if (errorEstado) return { ok: false, status: 500, error: "No se pudo consultar el estado actualizado del usuario." };
  if (!estadoData) return { ok: false, status: 404, error: "El usuario no tiene un estado de acceso disponible." };

  const estado = estadoData as Pick<EstadoUsuario, "semaforo" | "motivo" | "dias_restantes">;
  const metodo = identificador.tipo === "huella" ? "huella" : "dni_manual";
  const { data: acceso, error: errorAcceso } = await supabase
    .from("accesos_huella")
    .insert({
      usuario_id: usuario.id,
      semaforo: estado.semaforo,
      motivo: estado.motivo,
      metodo,
    })
    .select("fecha_hora")
    .single();

  if (errorAcceso || !acceso) {
    return { ok: false, status: 500, error: "No se pudo guardar la fichada en la bitácora." };
  }

  return {
    ok: true,
    usuario: {
      dni: usuario.dni,
      numero_legajo: usuario.numero_legajo,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      perfil: usuario.perfil,
      foto_url: usuario.foto_url,
    },
    estado: {
      semaforo: estado.semaforo,
      motivo: estado.motivo,
      dias_restantes: estado.dias_restantes,
    },
    acceso: { fecha_hora: acceso.fecha_hora, metodo },
  };
}
