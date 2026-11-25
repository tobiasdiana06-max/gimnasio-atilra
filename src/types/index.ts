export type SemaforoAcceso = "verde" | "amarillo" | "rojo";

export interface EstadoUsuario {
  usuario_id: string;
  dni: string;
  numero_legajo: string | null;
  nombre: string;
  apellido: string;
  perfil: "afiliado" | "invitado";
  telefono: string | null;
  activo: boolean;
  alta_vencimiento: string | null;
  cuota_vencimiento: string | null;
  afiliacion_vencimiento: string | null;
  dias_restantes: number | null;
  semaforo: SemaforoAcceso;
  motivo: string;
}
