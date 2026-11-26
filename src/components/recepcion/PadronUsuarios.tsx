"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { FolderOpen, Pencil, Plus, Search } from "lucide-react";
import { PerfilBadge, SemaforoBadge } from "@/components/recepcion/SemaforoBadge";
import { UsuarioFormModal } from "@/components/recepcion/UsuarioFormModal";
import { estilos } from "@/components/recepcion/estilos";
import { SEMAFORO_CLASES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { EstadoUsuario, SemaforoAcceso } from "@/types";
import type { PerfilUsuario, UsuarioEditable } from "@/types/recepcion";

export type FilaPadron = EstadoUsuario & { telefono: string | null };

type FiltroPerfil = "todos" | PerfilUsuario;
type FiltroSemaforo = "todos" | SemaforoAcceso;

/** Minúsculas y sin tildes, para buscar "Peña" escribiendo "pena". */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function PadronUsuarios({ filas }: { filas: FilaPadron[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [perfil, setPerfil] = useState<FiltroPerfil>("todos");
  const [semaforo, setSemaforo] = useState<FiltroSemaforo>("todos");
  const [modal, setModal] = useState<{ usuario: UsuarioEditable | null } | null>(null);
  const cerrarModal = useCallback(() => setModal(null), []);

  // Base para los contadores: respeta búsqueda y perfil, pero no el semáforo elegido.
  const baseSinSemaforo = useMemo(() => {
    const q = normalizar(busqueda);
    const qNumerica = q.replace(/[.\s]/g, "");
    return filas.filter((f) => {
      if (perfil !== "todos" && f.perfil !== perfil) return false;
      if (!q) return true;
      const texto = normalizar(`${f.apellido} ${f.nombre} ${f.nombre} ${f.apellido}`);
      const dni = String(f.dni ?? "");
      const legajo = normalizar(String(f.numero_legajo ?? ""));
      return texto.includes(q) || dni.includes(qNumerica) || legajo.includes(q);
    });
  }, [filas, busqueda, perfil]);

  const visibles = useMemo(
    () => (semaforo === "todos" ? baseSinSemaforo : baseSinSemaforo.filter((f) => f.semaforo === semaforo)),
    [baseSinSemaforo, semaforo],
  );

  const conteo = useMemo(() => {
    const c: Record<SemaforoAcceso, number> = { verde: 0, amarillo: 0, rojo: 0 };
    baseSinSemaforo.forEach((f) => {
      c[f.semaforo] += 1;
    });
    return c;
  }, [baseSinSemaforo]);

  function editar(f: FilaPadron) {
    setModal({
      usuario: {
        id: f.usuario_id,
        dni: String(f.dni),
        numero_legajo: f.numero_legajo ? String(f.numero_legajo) : null,
        nombre: f.nombre,
        apellido: f.apellido,
        perfil: f.perfil as PerfilUsuario,
        telefono: f.telefono,
      },
    });
  }

  const perfiles: { valor: FiltroPerfil; etiqueta: string }[] = [
    { valor: "todos", etiqueta: "Todos" },
    { valor: "afiliado", etiqueta: "Afiliados" },
    { valor: "invitado", etiqueta: "Invitados" },
  ];

  const semaforos: { valor: FiltroSemaforo; etiqueta: string; cantidad: number }[] = [
    { valor: "todos", etiqueta: "Todos", cantidad: baseSinSemaforo.length },
    { valor: "verde", etiqueta: "Verde", cantidad: conteo.verde },
    { valor: "amarillo", etiqueta: "Amarillo", cantidad: conteo.amarillo },
    { valor: "rojo", etiqueta: "Rojo", cantidad: conteo.rojo },
  ];

  return (
    <div id="padron" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-atilra-carbon">Padrón de usuarios</h1>
          <p className="text-sm text-atilra-gris">
            {filas.length} registrados · mostrando {visibles.length}
          </p>
        </div>
        <button type="button" onClick={() => setModal({ usuario: null })} className={estilos.btnPrimario}>
          <Plus className="h-4 w-4" aria-hidden /> Nuevo usuario
        </button>
      </div>

      <div className={cn(estilos.card, "grid gap-4 lg:grid-cols-[minmax(300px,1.3fr)_minmax(190px,0.8fr)_minmax(320px,1.5fr)] lg:items-end")}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atilra-gris" aria-hidden />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por DNI, apellido, nombre o N.° de legajo…"
            aria-label="Buscar usuarios"
            className={cn(estilos.input, "pl-9")}
            autoFocus
          />
        </div>

        <div>
          <span className={estilos.label}>Perfil</span>
          <div className="flex flex-wrap gap-1.5">
            {perfiles.map((p) => (
              <button
                key={p.valor}
                type="button"
                onClick={() => setPerfil(p.valor)}
                aria-pressed={perfil === p.valor}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm font-semibold transition",
                  perfil === p.valor
                    ? "border-atilra-carbon bg-atilra-carbon text-atilra-blanco"
                    : "border-atilra-gris/40 text-atilra-gris hover:bg-atilra-fondo",
                )}
              >
                {p.etiqueta}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={estilos.label}>Semáforo</span>
          <div className="flex flex-wrap gap-1.5">
            {semaforos.map((s) => (
              <button
                key={s.valor}
                type="button"
                onClick={() => setSemaforo(s.valor)}
                aria-pressed={semaforo === s.valor}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm font-semibold transition",
                  semaforo === s.valor
                    ? s.valor === "todos"
                      ? "border-atilra-carbon bg-atilra-carbon text-atilra-blanco"
                      : cn("border-transparent", SEMAFORO_CLASES[s.valor].badge)
                    : "border-atilra-gris/40 text-atilra-gris hover:bg-atilra-fondo",
                )}
              >
                {s.etiqueta} ({s.cantidad})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-atilra-gris/15 bg-atilra-blanco shadow-sm">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-atilra-carbon text-atilra-blanco">
            <tr>
              <th className="p-3">DNI</th>
              <th className="p-3">Legajo</th>
              <th className="p-3">Apellido y nombre</th>
              <th className="p-3">Perfil</th>
              <th className="p-3">Semáforo</th>
              <th className="p-3">Días</th>
              <th className="p-3">Motivo</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => (
              <tr key={f.usuario_id} className="border-t border-atilra-gris/15 hover:bg-atilra-fondo/70">
                  <td className="whitespace-nowrap p-3 font-mono">{f.dni}</td>
                  <td className="whitespace-nowrap p-3">{f.numero_legajo ?? "—"}</td>
                <td className="p-3 font-medium text-atilra-carbon">
                  {f.apellido}, {f.nombre}
                </td>
                <td className="whitespace-nowrap p-3">
                  <PerfilBadge perfil={f.perfil} />
                </td>
                <td className="whitespace-nowrap p-3">
                  <SemaforoBadge semaforo={f.semaforo} />
                </td>
                <td className="whitespace-nowrap p-3">{f.dias_restantes ?? "—"}</td>
                <td className="max-w-xs p-3 text-atilra-gris">{f.motivo}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/recepcion/usuarios/${f.usuario_id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-atilra-gris/40 px-2.5 py-1.5 text-xs font-semibold text-atilra-carbon transition hover:border-atilra-verde-oscuro hover:bg-atilra-fondo"
                    >
                      <FolderOpen className="h-3.5 w-3.5" aria-hidden /> Ficha
                    </Link>
                    <button
                      type="button"
                      onClick={() => editar(f)}
                      className="inline-flex items-center gap-1 rounded-lg border border-atilra-gris/40 px-2.5 py-1.5 text-xs font-semibold text-atilra-carbon transition hover:border-atilra-verde-oscuro hover:bg-atilra-fondo"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden /> Editar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-atilra-gris">
                  {filas.length === 0
                    ? "Todavía no hay usuarios cargados. Usá «Nuevo usuario» para empezar."
                    : "No encontramos usuarios con esos filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <UsuarioFormModal key={modal.usuario?.id ?? "nuevo"} usuario={modal.usuario} onCerrar={cerrarModal} />
      )}
    </div>
  );
}
