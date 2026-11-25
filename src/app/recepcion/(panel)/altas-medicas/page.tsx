import Link from "next/link";
import { FolderOpen, Inbox } from "lucide-react";
import { PerfilBadge } from "@/components/recepcion/SemaforoBadge";
import { ValidarAltaForm } from "@/components/recepcion/ValidarAltaForm";
import { VisorDocumento } from "@/components/recepcion/VisorDocumento";
import { estilos } from "@/components/recepcion/estilos";
import { requireRecepcion } from "@/lib/auth/recepcion";
import { formatearFechaHora } from "@/lib/fechas";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface Pendiente {
  id: string;
  usuario_id: string;
  origen: string | null;
  archivo_path: string | null;
  archivo_nombre: string | null;
  created_at: string;
}

interface UsuarioMin {
  id: string;
  dni: string;
  numero_legajo: string | null;
  nombre: string;
  apellido: string;
  perfil: string;
}

export default async function AltasMedicasPage() {
  await requireRecepcion();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("documentacion_medica")
    .select("id, usuario_id, origen, archivo_path, archivo_nombre, created_at")
    .eq("estado", "pendiente")
    .order("created_at", { ascending: true });

  const pendientes = (data ?? []) as Pendiente[];
  const ids = [...new Set(pendientes.map((p) => p.usuario_id))];

  let usuarios = new Map<string, UsuarioMin>();
  if (ids.length > 0) {
    const { data: filas } = await supabase
      .from("usuarios")
      .select("id, dni, numero_legajo, nombre, apellido, perfil")
      .in("id", ids);
    usuarios = new Map(((filas ?? []) as UsuarioMin[]).map((u) => [u.id, u]));
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-atilra-carbon">Altas médicas pendientes</h1>
        <p className="text-sm text-atilra-gris">
          Certificados enviados por chat o WhatsApp. Revisá el archivo, confirmá las fechas y aprobalo. Los más antiguos
          aparecen primero.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-semaforo-rojo bg-red-50 p-4 text-sm text-semaforo-rojo">
          Error al consultar Supabase: {error.message}
        </div>
      )}

      {pendientes.length === 0 && !error && (
        <div className={`${estilos.card} flex flex-col items-center gap-2 py-10 text-center`}>
          <Inbox className="h-8 w-8 text-atilra-verde-oscuro" aria-hidden />
          <p className="font-semibold text-atilra-carbon">No hay altas médicas por validar</p>
          <p className="text-sm text-atilra-gris">Cuando alguien envíe su certificado, aparece acá.</p>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {pendientes.map((p) => {
          const u = usuarios.get(p.usuario_id);
          return (
            <article key={p.id} className={`${estilos.card} space-y-4 border-l-4 border-l-semaforo-amarillo`}>
              <header className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-atilra-carbon">
                    {u ? `${u.apellido}, ${u.nombre}` : "Usuario desconocido"}
                  </h2>
                  {u && (
                    <p className="text-sm text-atilra-gris">
                      DNI <span className="font-mono">{u.dni}</span>
                      {u.numero_legajo ? ` · Legajo ${u.numero_legajo}` : ""}
                    </p>
                  )}
                </div>
                {u && <PerfilBadge perfil={u.perfil} />}
              </header>

              <p className="text-xs text-atilra-gris">
                Recibida el {formatearFechaHora(p.created_at)} · {p.origen === "presencial" ? "presencial" : "digital"}
              </p>

              <div className="flex flex-wrap gap-2">
                {p.archivo_path ? (
                  <VisorDocumento docId={p.id} />
                ) : (
                  <span className="text-sm text-atilra-gris">Sin archivo adjunto</span>
                )}
                {u && (
                  <Link
                    href={`/recepcion/usuarios/${u.id}`}
                    className={estilos.btnSecundario}
                  >
                    <FolderOpen className="h-4 w-4" aria-hidden /> Ver ficha
                  </Link>
                )}
              </div>

              <ValidarAltaForm docId={p.id} />
            </article>
          );
        })}
      </div>
    </div>
  );
}
