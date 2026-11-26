import Link from "next/link";
import { ArrowUpRight, CreditCard, FileCheck2, LogIn, Users } from "lucide-react";
import { PadronUsuarios, type FilaPadron } from "@/components/recepcion/PadronUsuarios";
import { estilos } from "@/components/recepcion/estilos";
import { requireRecepcion } from "@/lib/auth/recepcion";
import { formatearFecha, hoyISO } from "@/lib/fechas";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";
import type { EstadoUsuario } from "@/types";

export const dynamic = "force-dynamic";

function sumarDiasISO(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

export default async function PadronPage() {
  await requireRecepcion();
  const supabase = createAdminClient();
  const hoy = hoyISO();
  const hasta = sumarDiasISO(hoy, 7);
  const manana = sumarDiasISO(hoy, 1);

  const [
    estados,
    telefonos,
    sociosActivos,
    ingresosHoy,
    cuotasPorVencer,
    aptosPendientes,
    aptosPorVencer,
  ] = await Promise.all([
    supabase.from("vista_estado_usuarios").select("*").order("apellido", { ascending: true }).limit(5000),
    supabase.from("usuarios").select("id, telefono").limit(5000),
    supabase.from("usuarios").select("id", { count: "exact", head: true }).eq("activo", true).eq("perfil", "afiliado"),
    supabase
      .from("accesos_huella")
      .select("id", { count: "exact", head: true })
      .gte("fecha_hora", `${hoy}T00:00:00-03:00`)
      .lt("fecha_hora", `${manana}T00:00:00-03:00`),
    supabase
      .from("vista_estado_usuarios")
      .select("usuario_id", { count: "exact", head: true })
      .eq("activo", true)
      .eq("perfil", "invitado")
      .gte("cuota_vencimiento", hoy)
      .lte("cuota_vencimiento", hasta),
    supabase
      .from("documentacion_medica")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente"),
    supabase
      .from("vista_estado_usuarios")
      .select("usuario_id", { count: "exact", head: true })
      .eq("activo", true)
      .gte("alta_vencimiento", hoy)
      .lte("alta_vencimiento", hasta),
  ]);

  const error = [
    estados.error,
    telefonos.error,
    sociosActivos.error,
    ingresosHoy.error,
    cuotasPorVencer.error,
    aptosPendientes.error,
    aptosPorVencer.error,
  ].find((resultado) => resultado !== null);
  const telefonoPorId = new Map<string, string | null>(
    ((telefonos.data ?? []) as { id: string; telefono: string | null }[]).map((u) => [u.id, u.telefono]),
  );
  const filas: FilaPadron[] = ((estados.data ?? []) as EstadoUsuario[]).map((f) => ({
    ...f,
    telefono: telefonoPorId.get(f.usuario_id) ?? null,
  }));
  const resumen = [
    {
      titulo: "Socios activos",
      valor: sociosActivos.count ?? 0,
      detalle: "Afiliados habilitados",
      href: "/recepcion#padron",
      enlace: "Abrir padrón",
      Icono: Users,
      iconoClase: "bg-atilra-verde/20 text-atilra-verde-oscuro",
    },
    {
      titulo: "Ingresos de hoy",
      valor: ingresosHoy.count ?? 0,
      detalle: `Registrados el ${formatearFecha(hoy)}`,
      href: "/recepcion/accesos",
      enlace: "Ver accesos",
      Icono: LogIn,
      iconoClase: "bg-sky-100 text-sky-800",
    },
    {
      titulo: "Cuotas por vencer",
      valor: cuotasPorVencer.count ?? 0,
      detalle: "Invitados · próximos 7 días",
      href: "/recepcion/cuotas",
      enlace: "Gestionar cuotas",
      Icono: CreditCard,
      iconoClase: "bg-amber-100 text-amber-800",
    },
    {
      titulo: "Aptos médicos",
      valor: (aptosPendientes.count ?? 0) + (aptosPorVencer.count ?? 0),
      detalle: `${aptosPendientes.count ?? 0} por validar · ${aptosPorVencer.count ?? 0} por vencer`,
      href: "/recepcion/altas-medicas",
      enlace: "Revisar altas",
      Icono: FileCheck2,
      iconoClase: "bg-rose-100 text-rose-800",
    },
  ];

  return (
    <div className="space-y-7">
      <section aria-labelledby="resumen-operativo" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 id="resumen-operativo" className="text-2xl font-bold text-atilra-carbon">Resumen operativo</h1>
            <p className="text-sm text-atilra-gris">Indicadores del día · {formatearFecha(hoy)}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {resumen.map(({ titulo, valor, detalle, href, enlace, Icono, iconoClase }) => (
            <Link
              key={titulo}
              href={href}
              className={cn(estilos.card, "group flex min-h-36 items-start justify-between gap-3 transition hover:-translate-y-0.5 hover:shadow-md")}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-atilra-gris">{titulo}</p>
                <p className="mt-2 text-3xl font-black tabular-nums text-atilra-carbon">{valor}</p>
                <p className="mt-1 text-xs text-atilra-gris">{detalle}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-atilra-verde-oscuro">
                  {enlace} <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                </span>
              </div>
              <span className={cn("rounded-xl p-3", iconoClase)}>
                <Icono className="h-5 w-5" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {error && (
        <div className="mb-4 rounded-lg border border-semaforo-rojo bg-red-50 p-4 text-sm text-semaforo-rojo">
          Error al consultar Supabase: {error.message}
        </div>
      )}
      <PadronUsuarios filas={filas} />
    </div>
  );
}
