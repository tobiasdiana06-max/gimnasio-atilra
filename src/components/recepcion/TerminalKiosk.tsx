"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Fingerprint, Radio, ShieldAlert, UserRound } from "lucide-react";
import { ficharDniManual } from "@/app/recepcion/actions/terminal";
import { SemaforoBadge } from "@/components/recepcion/SemaforoBadge";
import { estilos } from "@/components/recepcion/estilos";
import { LogoAtilra } from "@/components/ui/LogoAtilra";
import { SEMAFORO_CLASES } from "@/lib/constants";
import { formatearFechaHora } from "@/lib/fechas";
import { cn } from "@/lib/utils";
import type { ErrorFichadaTerminal, FichadaTerminal } from "@/types/terminal";

const BRIDGE_URL = "http://127.0.0.1:8787";

interface EstadoPuente {
  mode: "simulator" | "hardware";
  readerConnected: boolean;
  readerName?: string;
}

interface EventoPuente {
  sequence: number;
  received_at: string;
  result: FichadaTerminal | ErrorFichadaTerminal;
}

export function TerminalKiosk() {
  const [hora, setHora] = useState("");
  const [puente, setPuente] = useState<EstadoPuente | null>(null);
  const [fichada, setFichada] = useState<FichadaTerminal | null>(null);
  const [errorFichada, setErrorFichada] = useState("");
  const [dni, setDni] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [errorPuente, setErrorPuente] = useState("");
  const ultimaSecuencia = useRef(0);

  useEffect(() => {
    const actualizar = () => {
      setHora(new Intl.DateTimeFormat("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date()));
    };
    actualizar();
    const interval = window.setInterval(actualizar, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let activa = true;
    let timer: ReturnType<typeof setTimeout>;

    async function consultarPuente() {
      try {
        const [saludResponse, eventoResponse] = await Promise.all([
          fetch(`${BRIDGE_URL}/health`, { cache: "no-store" }),
          fetch(`${BRIDGE_URL}/last-event`, { cache: "no-store" }),
        ]);
        if (!saludResponse.ok || !eventoResponse.ok) throw new Error("Respuesta inválida del puente local.");
        const salud = await saludResponse.json() as EstadoPuente;
        const ultimo = await eventoResponse.json() as { event: EventoPuente | null };
        if (!activa) return;
        setPuente(salud);
        setErrorPuente("");
        const evento = ultimo.event;
        if (evento && evento.sequence > ultimaSecuencia.current) {
          ultimaSecuencia.current = evento.sequence;
          if (evento.result.ok) {
            setFichada(evento.result);
            setErrorFichada("");
          } else {
            setFichada(null);
            setErrorFichada(evento.result.error);
          }
        }
      } catch {
        if (activa) {
          setPuente(null);
          setErrorPuente("Puente local no disponible en esta PC.");
        }
      } finally {
        if (activa) timer = setTimeout(consultarPuente, 1500);
      }
    }

    void consultarPuente();
    return () => {
      activa = false;
      clearTimeout(timer);
    };
  }, []);

  async function ingresoDni(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOcupado(true);
    setErrorFichada("");
    try {
      const resultado = await ficharDniManual(dni);
      if (!resultado.ok) {
        setFichada(null);
        setErrorFichada(resultado.error);
      } else {
        setFichada(resultado);
        setDni("");
      }
    } catch (err) {
      setFichada(null);
      setErrorFichada(err instanceof Error ? err.message : "No se pudo registrar el ingreso manual.");
    } finally {
      setOcupado(false);
    }
  }

  const conectado = puente?.readerConnected === true;
  const modoSimulador = puente?.mode === "simulator";

  return (
    <main className="min-h-[calc(100vh-3rem)] rounded-3xl bg-atilra-carbon p-4 text-atilra-blanco sm:p-6 xl:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-atilra-blanco/15 pb-5">
        <div className="flex items-center gap-3">
          <LogoAtilra className="h-12 w-12 shrink-0" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-atilra-verde-claro">Gimnasio ATILRA · General Rodríguez</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">Terminal de ingreso</h1>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold tabular-nums sm:text-2xl">{hora || "—"}</p>
          <div className="mt-1 flex items-center justify-end gap-2 text-sm">
            <span className={cn("h-2.5 w-2.5 rounded-full", conectado ? "bg-atilra-verde-claro" : modoSimulador ? "bg-semaforo-amarillo" : "bg-semaforo-rojo")} />
            <span>{puente ? conectado ? `Lector conectado${puente.readerName ? ` · ${puente.readerName}` : ""}` : modoSimulador ? "Puente activo · simulador sin lector físico" : "Puente activo · lector desconectado" : errorPuente}</span>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.8fr)] 2xl:gap-8">
        <section aria-live="polite" aria-label="Resultado de la última fichada">
          {fichada ? (
            <div className={cn(
              "flex min-h-[460px] flex-col items-center justify-center rounded-3xl border-4 p-6 text-center sm:p-10",
              SEMAFORO_CLASES[fichada.estado.semaforo].panel,
              fichada.estado.semaforo === "rojo" && "border-semaforo-rojo",
              fichada.estado.semaforo === "amarillo" && "border-semaforo-amarillo",
              fichada.estado.semaforo === "verde" && "border-atilra-verde",
            )}>
              {fichada.usuario.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fichada.usuario.foto_url} alt="" referrerPolicy="no-referrer" className="mb-5 h-28 w-28 rounded-full border-4 border-atilra-blanco object-cover shadow-xl sm:h-36 sm:w-36" />
              ) : (
                <div className="mb-5 flex h-28 w-28 items-center justify-center rounded-full border-4 border-atilra-blanco bg-atilra-carbon/10 sm:h-36 sm:w-36">
                  <UserRound className="h-16 w-16 text-atilra-carbon" aria-hidden />
                </div>
              )}
              <SemaforoBadge semaforo={fichada.estado.semaforo} className="px-5 py-2 text-base" />
              <p className="mt-5 text-3xl font-black text-atilra-carbon sm:text-5xl">
                {fichada.estado.semaforo === "verde" ? "ACCESO HABILITADO" : fichada.estado.semaforo === "amarillo" ? "HABILITADO · ATENCIÓN" : "ACCESO BLOQUEADO"}
              </p>
              <p className="mt-3 text-2xl font-bold text-atilra-carbon sm:text-3xl">
                {fichada.usuario.apellido}, {fichada.usuario.nombre}
              </p>
              <p className="mt-1 text-base text-atilra-carbon/80">
                DNI {fichada.usuario.dni} · {fichada.usuario.perfil}
                {fichada.usuario.numero_legajo ? ` · Legajo ${fichada.usuario.numero_legajo}` : ""}
              </p>
              <p className="mt-5 max-w-3xl text-lg font-semibold text-atilra-carbon sm:text-xl">{fichada.estado.motivo}</p>
              {fichada.estado.semaforo === "amarillo" && (
                <p className="mt-4 rounded-xl bg-semaforo-amarillo px-5 py-3 text-xl font-black text-atilra-carbon sm:text-2xl">
                  Vencimiento próximo · {fichada.estado.dias_restantes ?? "—"} días restantes
                </p>
              )}
              {fichada.estado.semaforo === "rojo" && (
                <p className="mt-4 flex items-center gap-2 text-lg font-bold text-semaforo-rojo">
                  <ShieldAlert className="h-6 w-6" aria-hidden /> Consultar en recepción
                </p>
              )}
              <p className="mt-5 text-sm text-atilra-carbon/70">
                {formatearFechaHora(fichada.acceso.fecha_hora)} · {fichada.acceso.metodo === "huella" ? "Huella biométrica" : "DNI manual"}
              </p>
            </div>
          ) : errorFichada ? (
            <div className="flex min-h-[460px] flex-col items-center justify-center rounded-3xl border-4 border-semaforo-rojo bg-semaforo-rojo/10 p-8 text-center">
              <ShieldAlert className="h-20 w-20 text-semaforo-rojo" aria-hidden />
              <h2 className="mt-5 text-3xl font-black text-atilra-blanco">No se pudo validar el ingreso</h2>
              <p className="mt-3 max-w-2xl text-xl text-atilra-blanco">{errorFichada}</p>
            </div>
          ) : (
            <div className="flex min-h-[460px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-atilra-blanco/25 p-8 text-center">
              <Fingerprint className="h-28 w-28 text-atilra-verde" aria-hidden />
              <h2 className="mt-6 text-3xl font-black sm:text-4xl">Apoyá tu dedo en el lector</h2>
              <p className="mt-3 max-w-xl text-lg text-atilra-blanco/70">El resultado de acceso aparecerá en esta pantalla.</p>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-atilra-blanco/15 bg-atilra-blanco/5 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Radio className="h-5 w-5 text-atilra-verde" aria-hidden />
              <h2 className="text-lg font-bold">Ingreso de respaldo por DNI</h2>
            </div>
            <p className="mb-4 text-sm text-atilra-blanco/70">Usalo si la huella está gastada o la persona todavía no fue enrolada.</p>
            <form onSubmit={(event) => void ingresoDni(event)} className="space-y-3">
              <label htmlFor="terminal-dni" className="text-xs font-semibold uppercase tracking-wide text-atilra-blanco/70">DNI</label>
              <input id="terminal-dni" value={dni} onChange={(event) => setDni(event.target.value)} inputMode="numeric"
                autoComplete="off" maxLength={12} placeholder="Ingresá el DNI" className={cn(estilos.input, "py-3 text-lg")} />
              <button type="submit" disabled={ocupado || !dni} className={cn(estilos.btnPrimario, "w-full py-3 text-base")}>
                {ocupado ? "Validando…" : "Validar e ingresar"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-atilra-blanco/15 bg-atilra-blanco/5 p-5">
            <h2 className="font-bold">Estado de conexión</h2>
            <p className="mt-2 text-sm text-atilra-blanco/70">{puente ? modoSimulador ? "Modo simulador de consola activo." : puente.readerConnected ? "El puente informa que el lector está conectado." : "El puente está activo, pero no detecta un lector USB." : "Iniciá bridge-huella en esta PC para recibir lecturas biométricas."}</p>
            <p className="mt-3 text-xs text-atilra-blanco/50">La validación de DNI manual funciona aunque el puente local no esté disponible.</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
