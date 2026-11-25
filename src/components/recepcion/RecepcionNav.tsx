"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileCheck2, Fingerprint, LogOut, Newspaper, TicketCheck, Users, ClipboardList } from "lucide-react";
import { cerrarSesion } from "@/app/recepcion/actions/sesion";
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
    <aside className="bg-atilra-carbon text-atilra-blanco md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col">
      <div className="border-b-4 border-atilra-verde px-5 py-4">
        <p className="text-xs text-atilra-blanco/60">ATILRA · Gral. Rodríguez</p>
        <p className="text-lg font-bold">Gimnasio — Recepción</p>
      </div>

      <nav className="flex gap-1 overflow-x-auto p-3 md:flex-1 md:flex-col md:overflow-visible">
        {items.map(({ href, etiqueta, icono: Icono, activo, badge }) => (
          <Link
            key={href}
            href={href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition",
              activo
                ? "bg-atilra-verde text-atilra-carbon"
                : "text-atilra-blanco/80 hover:bg-atilra-blanco/10 hover:text-atilra-blanco",
            )}
          >
            <Icono className="h-4 w-4" aria-hidden />
            <span>{etiqueta}</span>
            {badge > 0 && (
              <span className="ml-auto rounded-full bg-semaforo-amarillo px-2 py-0.5 text-xs font-bold text-atilra-carbon">
                {badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="hidden border-t border-atilra-blanco/10 p-4 md:block">
        <p className="mb-2 truncate text-xs text-atilra-blanco/60" title={email}>
          {email}
        </p>
        <form action={cerrarSesion}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-atilra-blanco/80 transition hover:bg-atilra-blanco/10 hover:text-atilra-blanco"
          >
            <LogOut className="h-4 w-4" aria-hidden /> Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
