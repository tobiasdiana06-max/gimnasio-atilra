import type { EstadoUsuario } from "@/types";

export interface UsuarioTerminal {
  id: string;
  dni: string;
  numero_legajo: string | null;
  nombre: string;
  apellido: string;
  perfil: "afiliado" | "invitado";
  telefono: string | null;
  email: string | null;
  foto_url: string | null;
  activo: boolean;
  fecha_renovacion_afiliacion: string | null;
}

export interface FichadaTerminal {
  ok: true;
  usuario: UsuarioTerminal;
  estado: EstadoUsuario;
  acceso: {
    id: string;
    fecha_hora: string;
    metodo: "huella" | "dni_manual";
  };
}

export interface ErrorFichadaTerminal {
  ok: false;
  status: number;
  error: string;
}
