import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard } from "lucide-react";
import { BotonEditarUsuario } from "@/components/recepcion/BotonEditarUsuario";
import { CargaPresencialForm, SimularEnvioDigitalForm } from "@/components/recepcion/CargaPresencialForm";
import { EnrolarHuellaForm } from "@/components/recepcion/EnrolarHuellaForm";
import { PerfilBadge, SemaforoBadge } from "@/components/recepcion/SemaforoBadge";
import { ValidarAltaForm } from "@/components/recepcion/ValidarAltaForm";
import { VisorDocumento } from "@/components/recepcion/VisorDocumento";
import { estilos } from "@/components/recepcion/estilos";
import { requireRecepcion } from "@/lib/auth/recepcion";
import { SEMAFORO_CLASES } from "@/lib/constants";
import { estadoVisible } from "@/lib/documentos";
import { formatearFecha, formatearFechaHora, hoyISO } from "@/lib/fechas";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";
import type { EstadoUsuario } from "@/types";
import type { DocumentoMedico, PerfilUsuario, UsuarioEditable } from "@/types/recepcion";

export const dynamic = "force-dynamic";

export default async function FichaUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRecepcion();
  const { id } = await params;
  const supabase = createAdminClient();

  const [usuarioRes, estadoRes, docsRes] = await Promise.all([
    supabase.from("usuarios").select("id, dni, numero_legajo, nombre, apellido, perfil, telefono, huella_template_id").eq("id", id).maybeSingle(),
    supabase.from("vista_estado_usuarios").select("*").eq("usuario_id", id).maybeSingle(),
    supabase
      .from("documentacion_medica")
      .select("id, usuario_id, estado, origen, fecha_emision, fecha_vencimiento, archivo_path, archivo_nombre, observaciones, created_at")
      .eq("usuario_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (usuarioRes.error || !usuarioRes.data) notFound();

  const u = usuarioRes.data as UsuarioEditable;
  const estado = (estadoRes.data ?? null) as EstadoUsuario | null;
  const documentos = (docsRes.data ?? []) as DocumentoMedico[];
  const hoy = hoyISO();
  const esDesarrollo = process.env.NODE_ENV !== "production";

  const usuarioEditable: UsuarioEditable = {
    id: u.id,
    dni: String(u.dni),
    numero_legajo: u.numero_legajo ? String(u.numero_legajo) : null,
    nombre: u.nombre,
    apellido: u.apellido,
    perfil: u.perfil as PerfilUsuario,
    telefono: u.telefono,
  };

  return (
    <div className="space-y-6">
      <Link href="/recepcion" className="inline-flex items-center gap-1 text-sm font-semibold text-atilra-gris hover:text-atilra-carbon">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Volver al padrón
      </Link>

      <section className={cn(estilos.card, "space-y-4")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-atilra-carbon">
              {u.apellido}, {u.nombre}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-atilra-gris">
              <PerfilBadge perfil={u.perfil} />
              <span>
                DNI <span className="font-mono">{u.dni}</span>
              </span>
              {u.numero_legajo && <span>· Legajo {u.numero_legajo}</span>}
              {u.telefono && <span>· {u.telefono}</span>}
            </div>
          </div>
          <BotonEditarUsuario usuario={usuarioEditable} />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
          <Link href={`/recepcion/cuotas?usuario=${u.id}`} className={estilos.btnSecundario}>
            <CreditCard className="h-4 w-4" aria-hidden />
            {u.perfil === "invitado" ? "Registrar / ver cuotas" : "Renovar afiliación"}
          </Link>
        </div>

        {estado && (
          <div className={cn("rounded-xl border-l-4 p-4", SEMAFORO_CLASES[estado.semaforo].panel)}>
            <div className="flex flex-wrap items-center gap-3">
              <SemaforoBadge semaforo={estado.semaforo} />
              <span className="font-semibold text-atilra-carbon">{SEMAFORO_CLASES[estado.semaforo].etiqueta}</span>
              {estado.dias_restantes !== null && estado.dias_restantes !== undefined && (
                <span className="text-sm text-atilra-gris">· {estado.dias_restantes} días restantes</span>
              )}
            </div>
            <p className="mt-2 text-sm text-atilra-carbon">{estado.motivo}</p>
          </div>
        )}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className={cn(estilos.card, "space-y-4")}>
          <div>
            <h2 className="text-lg font-bold text-atilra-carbon">Cargar alta médica presencial</h2>
            <p className="text-sm text-atilra-gris">
              Para cuando el socio trae el certificado en papel. Queda vigente de inmediato.
            </p>
          </div>
          <CargaPresencialForm usuarioId={u.id} />
        </section>

        <section className={cn(estilos.card, "space-y-3")}>
          <div>
            <h2 className="text-lg font-bold text-atilra-carbon">Huella biométrica</h2>
            <p className="text-sm text-atilra-gris">
              Estado: {u.huella_template_id ? "Enrolada" : "Sin enrolar"}.
            </p>
          </div>
          <EnrolarHuellaForm usuarioId={u.id} tieneHuella={Boolean(u.huella_template_id)} />
        </section>
      </div>

      <section className={cn(estilos.card, "space-y-4")}>
        <h2 className="text-lg font-bold text-atilra-carbon">Historial de altas médicas</h2>

        {docsRes.error && (
          <p className="rounded-lg border border-semaforo-rojo bg-red-50 p-3 text-sm text-semaforo-rojo">
            Error al consultar el historial: {docsRes.error.message}
          </p>
        )}

        {documentos.length === 0 && !docsRes.error && (
          <p className="text-sm text-atilra-gris">Todavía no hay altas médicas registradas para este usuario.</p>
        )}

        <ul className="space-y-3">
          {documentos.map((d) => {
            const visible = estadoVisible(d, hoy);
            return (
              <li key={d.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold", visible.clase)}>
                      {visible.etiqueta}
                    </span>
                    <p className="text-sm text-atilra-carbon">
                      Emisión {formatearFecha(d.fecha_emision)} · Vence {formatearFecha(d.fecha_vencimiento)}
                    </p>
                    <p className="text-xs text-atilra-gris">
                      {d.origen === "presencial" ? "Carga presencial" : "Enviada por chat/WhatsApp"} ·{" "}
                      {formatearFechaHora(d.created_at)}
                    </p>
                    {d.observaciones && <p className="text-xs text-atilra-gris">Observación: {d.observaciones}</p>}
                  </div>
                  {d.archivo_path ? (
                    <VisorDocumento docId={d.id} />
                  ) : (
                    <span className="text-xs text-atilra-gris">Sin archivo adjunto</span>
                  )}
                </div>

                {d.estado === "pendiente" && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <ValidarAltaForm docId={d.id} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {esDesarrollo && (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-atilra-gris">Solo desarrollo</h2>
          <p className="mb-3 text-sm text-atilra-gris">
            Simula el envío por chat/WhatsApp de la Etapa 3: el archivo queda «pendiente» para probar la bandeja.
          </p>
          <SimularEnvioDigitalForm usuarioId={u.id} />
        </section>
      )}
    </div>
  );
}
