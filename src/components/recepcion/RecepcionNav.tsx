"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileCheck2, Fingerprint, LockKeyhole, LogOut, Newspaper, TicketCheck, Users, ClipboardList, FileDown } from "lucide-react";
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
    <aside className="sticky top-0 z-30 bg-atilra-carbon text-atilra-blanco shadow-md">
      <div className="mx-auto max-w-[1440px] px-3 sm:px-5 lg:px-8">
        <div className="flex items-center justify-between gap-3 border-b-4 border-atilra-verde py-3">
          <div className="flex min-w-0 items-center gap-3">
            <LogoAtilra className="h-10 w-10 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-atilra-blanco/60">ATILRA · Gral. Rodríguez</p>
              <p className="truncate text-base font-bold sm:text-lg">Gimnasio — Recepción</p>
            </div>
          </div>
          <div className="hidden min-w-0 items-center gap-4 sm:flex">
            <p className="max-w-64 truncate text-xs text-atilra-blanco/60" title={email}>{email}</p>
            <form action={cerrarSesion}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-atilra-blanco/80 transition hover:bg-atilra-blanco/10 hover:text-atilra-blanco"
              >
                <LogOut className="h-4 w-4" aria-hidden /> Cerrar sesión
              </button>
            </form>
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
                  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition lg:flex-1 lg:justify-center lg:px-2",
                  activo
                    ? "bg-atilra-verde text-atilra-carbon"
                    : "text-atilra-blanco/80 hover:bg-atilra-blanco/10 hover:text-atilra-blanco",
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
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-atilra-blanco/20 px-3 py-2 text-sm font-bold text-atilra-blanco transition hover:bg-atilra-blanco/10"
              >
                <LockKeyhole className="h-4 w-4" aria-hidden /> Bloquear sesión
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-atilra-blanco/10 py-2 lg:hidden">
          <form action={cerrarSesion}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-atilra-blanco/20 px-3 py-2 text-sm font-bold text-atilra-blanco transition hover:bg-atilra-blanco/10"
            >
              <LockKeyhole className="h-4 w-4" aria-hidden /> Bloquear sesión
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
