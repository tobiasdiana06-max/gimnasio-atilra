import type { EstadoUsuario } from "@/types";

export interface UsuarioTerminal {
  dni: string;
  numero_legajo: string | null;
  nombre: string;
  apellido: string;
  perfil: "afiliado" | "invitado";
  foto_url: string | null;
}

export interface FichadaTerminal {
  ok: true;
  usuario: UsuarioTerminal;
  estado: Pick<EstadoUsuario, "semaforo" | "motivo" | "dias_restantes">;
  acceso: {
    fecha_hora: string;
    metodo: "huella" | "dni_manual";
  };
}

export interface ErrorFichadaTerminal {
  ok: false;
  status: number;
  error: string;
}
