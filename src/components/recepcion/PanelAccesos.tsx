"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Search, ShieldCheck, UserRoundCheck } from "lucide-react";
import { consultarAccesoPorDni, consultarAccesoPorUsuario, simularFichada, type ResultadoEstadoAcceso } from "@/app/recepcion/actions/accesos";
import { PerfilBadge, SemaforoBadge } from "@/components/recepcion/SemaforoBadge";
import { estilos } from "@/components/recepcion/estilos";
import { formatearFechaHora } from "@/lib/fechas";
import { descargarCSV } from "@/lib/csv";
import { SEMAFORO_CLASES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { SemaforoAcceso } from "@/types";

export interface UsuarioAcceso {
  id: string;
  dni: string;
  numero_legajo: string | null;
  nombre: string;
  apellido: string;
  perfil: string;
}

type UsuarioAccesoResumen = Omit<UsuarioAcceso, "id">;

interface Acceso {
  id: string;
  fecha_hora: string;
  semaforo: SemaforoAcceso;
  motivo: string;
  metodo: string;
  usuario: UsuarioAccesoResumen | null;
}

const colores: { value: string; label: string }[] = [
  { value: "", label: "Todos los colores" },
  { value: "verde", label: "Verde" },
  { value: "amarillo", label: "Amarillo" },
  { value: "rojo", label: "Rojo" },
];

export function PanelAccesos({ usuarios, dniInicial }: { usuarios: UsuarioAcceso[]; dniInicial: string }) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [semaforo, setSemaforo] = useState("");
  const [accesos, setAccesos] = useState<Acceso[]>([]);
  const [errorLista, setErrorLista] = useState("");
  const [cargando, setCargando] = useState(true);
  const [usuarioId, setUsuarioId] = useState("");
  const [dni, setDni] = useState(dniInicial);
  const [estado, setEstado] = useState<ResultadoEstadoAcceso | null>(null);
  const [errorSimulador, setErrorSimulador] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const cargarAccesos = useCallback(async () => {
    const params = new URLSearchParams();
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    if (semaforo) params.set("semaforo", semaforo);
    try {
      const response = await fetch(`/api/recepcion/accesos?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json() as { accesos?: Acceso[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No se pudo actualizar la bitácora.");
      setAccesos(payload.accesos ?? []);
      setErrorLista("");
    } catch (err) {
      setErrorLista(err instanceof Error ? err.message : "Error inesperado al actualizar la bitácora.");
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, semaforo]);

  useEffect(() => {
    let activa = true;
    let temporizador: ReturnType<typeof setTimeout>;
    const actualizar = async () => {
      if (activa) await cargarAccesos();
      if (activa) temporizador = setTimeout(actualizar, 5000);
    };
    void actualizar();
    return () => { activa = false; clearTimeout(temporizador); };
  }, [cargarAccesos]);

  useEffect(() => {
    if (!dniInicial) return;
    let activa = true;
    void consultarAccesoPorDni(dniInicial).then((resultado) => {
      if (!activa) return;
      if (!resultado.ok) setErrorSimulador(resultado.error);
      else {
        setEstado(resultado);
        setUsuarioId(resultado.estado.usuario_id);
      }
    });
    return () => { activa = false; };
  }, [dniInicial]);

  async function consultarDni() {
    setEstado(null);
    setErrorSimulador("");
    setOcupado(true);
    const resultado = await consultarAccesoPorDni(dni);
    setOcupado(false);
    if (!resultado.ok) {
      setErrorSimulador(resultado.error);
      return;
    }
    setEstado(resultado);
    setUsuarioId(resultado.estado.usuario_id);
  }

  async function seleccionarUsuario(id: string) {
    setUsuarioId(id);
    setDni("");
    setEstado(null);
    setErrorSimulador("");
    if (!id) return;
    setOcupado(true);
    const resultado = await consultarAccesoPorUsuario(id);
    setOcupado(false);
    if (!resultado.ok) setErrorSimulador(resultado.error);
    else setEstado(resultado);
  }

  async function registrar() {
    if (!usuarioId) return;
    setOcupado(true);
    setErrorSimulador("");
    const resultado = await simularFichada(usuarioId);
    setOcupado(false);
    if (!resultado.ok) {
      setErrorSimulador(resultado.error);
      return;
    }
    setEstado(resultado);
    await cargarAccesos();
  }

  function exportarAccesos() {
    descargarCSV(
      "bitacora-asistencias.csv",
      ["Fecha y hora", "Persona", "Perfil", "Resultado", "Método"],
      accesos.map((acceso) => [
        formatearFechaHora(acceso.fecha_hora),
        acceso.usuario ? `${acceso.usuario.apellido}, ${acceso.usuario.nombre}` : "Usuario eliminado",
        acceso.usuario?.perfil ?? "",
        acceso.semaforo,
        acceso.metodo,
      ]),
    );
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,0.9fr)] 2xl:gap-6">
      <section className={cn(estilos.card, "space-y-4")}>
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(440px,1.8fr)] lg:items-end">
          <div>
            <h2 className="text-lg font-bold text-atilra-carbon">Últimas fichadas</h2>
            <p className="text-xs text-atilra-gris">Actualización automática cada 5 segundos · máximo 200 resultados.</p>
            <button type="button" onClick={exportarAccesos} disabled={accesos.length === 0} title="Exporta los resultados filtrados (máximo 200)" className={cn(estilos.btnSecundario, "mt-2")}>
              <Download className="h-4 w-4" aria-hidden /> Exportar CSV
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div><label htmlFor="acceso-desde" className={estilos.label}>Desde</label><input id="acceso-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={estilos.input} /></div>
            <div><label htmlFor="acceso-hasta" className={estilos.label}>Hasta</label><input id="acceso-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={estilos.input} /></div>
            <div><label htmlFor="acceso-semaforo" className={estilos.label}>Semáforo</label><select id="acceso-semaforo" value={semaforo} onChange={(e) => setSemaforo(e.target.value)} className={estilos.input}>{colores.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          </div>
        </div>
        {errorLista && <p role="alert" className="rounded-lg border border-semaforo-rojo bg-red-50 p-3 text-sm text-semaforo-rojo">{errorLista}</p>}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-atilra-carbon text-atilra-blanco">
              <tr><th className="p-3">Fecha y hora</th><th className="p-3">Usuario</th><th className="p-3">DNI / legajo</th><th className="p-3">Perfil</th><th className="p-3">Semáforo</th><th className="p-3">Motivo</th><th className="p-3">Método</th></tr>
            </thead>
            <tbody>
              {accesos.map((acceso) => (
                <tr key={acceso.id} className="border-t border-slate-200 align-top">
                  <td className="whitespace-nowrap p-3">{formatearFechaHora(acceso.fecha_hora)}</td>
                  <td className="p-3 font-medium">{acceso.usuario ? `${acceso.usuario.apellido}, ${acceso.usuario.nombre}` : "Usuario eliminado"}</td>
                  <td className="p-3 font-mono">{acceso.usuario ? `${acceso.usuario.dni}${acceso.usuario.numero_legajo ? ` / ${acceso.usuario.numero_legajo}` : ""}` : "—"}</td>
                  <td className="p-3">{acceso.usuario ? <PerfilBadge perfil={acceso.usuario.perfil} /> : "—"}</td>
                  <td className="p-3"><SemaforoBadge semaforo={acceso.semaforo} /></td>
                  <td className="max-w-sm p-3">{acceso.motivo}</td>
                  <td className="p-3">{acceso.metodo}</td>
                </tr>
              ))}
              {accesos.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-atilra-gris">{cargando ? "Cargando fichadas…" : "No hay accesos para estos filtros."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <aside className={cn(estilos.card, "space-y-4 border-t-4 border-t-atilra-verde")} aria-label="Simular fichada en recepción">
        <div className="flex items-center gap-2">
          <UserRoundCheck className="h-5 w-5 text-atilra-verde-oscuro" aria-hidden />
          <h2 className="text-lg font-bold text-atilra-carbon">Simular fichada en recepción</h2>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void consultarDni(); }} className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atilra-gris" aria-hidden />
            <input value={dni} onChange={(e) => { setDni(e.target.value); setEstado(null); setUsuarioId(""); }} inputMode="numeric"
              aria-label="Buscar por DNI" placeholder="Buscar por DNI" className={cn(estilos.input, "pl-9")} />
          </div>
          <button type="submit" disabled={ocupado || !dni} className={estilos.btnSecundario}>Buscar</button>
        </form>
        <div>
          <label htmlFor="usuario-fichada" className={estilos.label}>O seleccionar usuario</label>
          <select id="usuario-fichada" value={usuarioId} onChange={(e) => void seleccionarUsuario(e.target.value)} className={estilos.input}>
            <option value="">Seleccioná una persona</option>
            {usuarios.map((u) => <option key={u.id} value={u.id}>{u.apellido}, {u.nombre} · DNI {u.dni}</option>)}
          </select>
        </div>
        {errorSimulador && <p role="alert" className="rounded-lg border border-semaforo-rojo bg-red-50 p-3 text-sm text-semaforo-rojo">{errorSimulador}</p>}
        {estado?.ok && (
          <>
            <div className={cn("rounded-2xl border-l-8 p-5 text-center", SEMAFORO_CLASES[estado.estado.semaforo].panel)}>
              <div className={cn("mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full shadow-inner sm:h-40 sm:w-40",
                estado.estado.semaforo === "verde" ? "bg-atilra-verde" : estado.estado.semaforo === "amarillo" ? "bg-semaforo-amarillo" : "bg-semaforo-rojo")}>
                <span className={cn("text-2xl font-black uppercase tracking-wider", estado.estado.semaforo === "rojo" ? "text-white" : "text-atilra-carbon")}>
                  {estado.estado.semaforo}
                </span>
              </div>
              <div className="mb-2 flex justify-center"><SemaforoBadge semaforo={estado.estado.semaforo} /></div>
              <p className="text-2xl font-black text-atilra-carbon">{estado.estado.apellido}, {estado.estado.nombre}</p>
              <p className="text-sm text-atilra-gris">DNI {estado.estado.dni} · {estado.estado.perfil}</p>
              <p className="mt-3 text-base font-semibold text-atilra-carbon">{estado.estado.motivo}</p>
              {estado.estado.semaforo === "amarillo" && estado.estado.dias_restantes !== null && (
                <p className="mt-1 font-bold text-atilra-carbon">Vencimiento próximo · {estado.estado.dias_restantes} días restantes</p>
              )}
              {estado.estado.semaforo === "rojo" && <p className="mt-1 font-bold text-semaforo-rojo">Acceso bloqueado</p>}
              {estado.estado.semaforo === "verde" && <p className="mt-1 font-semibold text-atilra-carbon">Habilitado sin observaciones</p>}
            </div>
            <button type="button" disabled={ocupado || !usuarioId} onClick={() => void registrar()} className={cn(estilos.btnPrimario, "w-full py-3 text-base")}>
              <ShieldCheck className="h-5 w-5" aria-hidden /> {ocupado ? "Registrando…" : "Registrar fichada simulada"}
            </button>
            <p className="text-center text-xs text-atilra-gris">Se registrará el resultado actual de la vista de estado en la bitácora.</p>
          </>
        )}
        {!estado && !errorSimulador && <p className="rounded-xl bg-atilra-fondo p-4 text-sm text-atilra-gris">Buscá por DNI o elegí una persona para consultar el semáforo antes de fichar.</p>}
      </aside>
    </div>
  );
}
