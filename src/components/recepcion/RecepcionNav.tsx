"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileCheck2, Fingerprint, LockKeyhole, Newspaper, TicketCheck, Users, ClipboardList, FileDown } from "lucide-react";
import { cerrarSesion } from "@/app/recepcion/actions/sesion";
import { LogoAtilra } from "@/components/ui/LogoAtilra";
import { cn } from "@/lib/utils";

interface Props {
  email: string;
  pendientes: number;
}

export function RecepcionNav({ email, pendientes }: Props) {
  const pathname = usePathname();

  const items = [
    {
      href: "/recepcion",
      etiqueta: "Padrón",
      icono: Users,
      activo: pathname === "/recepcion" || pathname.startsWith("/recepcion/usuarios"),
      badge: 0,
    },
    {
      href: "/recepcion/altas-medicas",
      etiqueta: "Altas médicas",
      icono: FileCheck2,
      activo: pathname.startsWith("/recepcion/altas-medicas"),
      badge: pendientes,
    },
    {
      href: "/recepcion/cuotas",
      etiqueta: "Cuotas",
      icono: TicketCheck,
      activo: pathname.startsWith("/recepcion/cuotas"),
      badge: 0,
    },
    {
      href: "/recepcion/noticias",
      etiqueta: "Noticias",
      icono: Newspaper,
      activo: pathname.startsWith("/recepcion/noticias"),
      badge: 0,
    },
    {
      href: "/recepcion/planilla-inscripcion",
      etiqueta: "Planilla",
      icono: FileDown,
      activo: pathname.startsWith("/recepcion/planilla-inscripcion"),
      badge: 0,
    },
    {
      href: "/recepcion/accesos",
      etiqueta: "Accesos",
      icono: ClipboardList,
      activo: pathname.startsWith("/recepcion/accesos"),
      badge: 0,
    },
    {
      href: "/recepcion/terminal",
      etiqueta: "Terminal",
      icono: Fingerprint,
      activo: pathname.startsWith("/recepcion/terminal"),
      badge: 0,
    },
  ];

  return (
    <aside className="sticky top-0 z-30 bg-[#1e2421] text-white shadow-md">
      <div className="mx-auto max-w-[1440px] px-3 sm:px-5 lg:px-8">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded-xl bg-[#29312d] p-1.5">
              <LogoAtilra className="h-9 w-9 shrink-0" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-300">ATILRA · Seccional General Rodríguez</p>
              <p className="truncate text-base font-bold text-white sm:text-lg">Recepción · Gimnasio ATILRA</p>
            </div>
          </div>
          <div className="hidden min-w-0 items-center gap-4 sm:flex">
            <p className="max-w-64 truncate text-xs text-white/65" title={email}>{email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 py-2">
          <nav aria-label="Navegación de recepción" className="flex min-w-0 flex-1 gap-1 overflow-x-auto lg:justify-between lg:overflow-visible">
            {items.map(({ href, etiqueta, icono: Icono, activo, badge }) => (
              <Link
                key={href}
                href={href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition lg:flex-1 lg:justify-center lg:px-2",
                  activo
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-white/75 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icono className="h-4 w-4 shrink-0" aria-hidden />
                <span>{etiqueta}</span>
                {badge > 0 && (
                  <span className="rounded-full bg-semaforo-amarillo px-2 py-0.5 text-xs font-bold text-atilra-carbon">
                    {badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <div className="hidden shrink-0 lg:block">
            <form action={cerrarSesion}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-emerald-700 bg-emerald-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-800"
              >
                <LockKeyhole className="h-4 w-4" aria-hidden /> Bloquear sesión
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-white/10 py-2 lg:hidden">
          <form action={cerrarSesion}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              <LockKeyhole className="h-4 w-4" aria-hidden /> Bloquear sesión
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
