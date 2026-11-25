export type PerfilUsuario = "afiliado" | "invitado";
export type EstadoDocumento = "pendiente" | "vigente" | "vencida" | "rechazada";
export type OrigenDocumento = "digital" | "presencial";

export interface UsuarioFormValues {
  perfil: PerfilUsuario;
  dni: string;
  numero_legajo: string;
  nombre: string;
  apellido: string;
  telefono: string;
}

export interface UsuarioEditable {
  id: string;
  dni: string;
  numero_legajo: string | null;
  nombre: string;
  apellido: string;
  perfil: PerfilUsuario;
  telefono: string | null;
  huella_template_id?: string | null;
}

export interface DocumentoMedico {
  id: string;
  usuario_id: string;
  estado: EstadoDocumento;
  origen: OrigenDocumento | null;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  archivo_path: string | null;
  archivo_nombre: string | null;
  observaciones: string | null;
  created_at: string;
}

export interface ResultadoAccion {
  ok: boolean;
  mensaje?: string;
  error?: string;
  campos?: Record<string, string>;
}

export interface UrlsDocumento {
  ok: boolean;
  error?: string;
  urlVer?: string;
  urlDescarga?: string;
  nombre?: string;
  esImagen?: boolean;
}
