"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CircleDollarSign, Search } from "lucide-react";
import { obtenerHistorialCuotas, registrarPagoCuota, renovarAfiliacion } from "@/app/recepcion/actions/cuotas";
import { estilos } from "@/components/recepcion/estilos";
import { formatearFecha } from "@/lib/fechas";
import { cn } from "@/lib/utils";

export interface UsuarioCuota {
  id: string;
  dni: string;
  numero_legajo: string | null;
  nombre: string;
  apellido: string;
  perfil: "afiliado" | "invitado";
  fecha_renovacion_afiliacion: string | null;
}

export interface PagoCuota {
  id: string;
  usuario_id: string;
  periodo: string;
  monto: number;
  medio_pago: string;
  fecha_pago: string;
  fecha_vencimiento: string;
  observaciones: string | null;
}

export function GestorCuotas({
  usuarios,
  usuarioInicial,
  hoy,
}: {
  usuarios: UsuarioCuota[];
  usuarioInicial: string;
  hoy: string;
}) {
  const router = useRouter();
  const [seleccionado, setSeleccionado] = useState(usuarioInicial);
  const [busqueda, setBusqueda] = useState("");
  const [fechaPersonalizada, setFechaPersonalizada] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [historial, setHistorial] = useState<{ usuarioId: string; pagos: PagoCuota[] } | null>(null);
  const usuario = usuarios.find((u) => u.id === seleccionado);
  const pagosUsuario = historial?.usuarioId === seleccionado ? historial.pagos : [];
  const cargandoHistorial = usuario?.perfil === "invitado" && historial?.usuarioId !== seleccionado && !error;
  useEffect(() => {
    if (usuario?.perfil !== "invitado") return;
    let activo = true;
    obtenerHistorialCuotas(usuario.id).then((resultado) => {
      if (!activo) return;
      if (!resultado.ok) setError(resultado.error);
      else setHistorial({ usuarioId: usuario.id, pagos: resultado.pagos as PagoCuota[] });
    }).catch((err: unknown) => {
      if (activo) setError(err instanceof Error ? err.message : "No se pudo cargar el historial de cuotas.");
    });
    return () => { activo = false; };
  }, [usuario?.id, usuario?.perfil]);
  const usuariosVisibles = usuarios.filter((u) => {
    const q = busqueda.trim().toLowerCase();
    return !q || `${u.dni} ${u.numero_legajo ?? ""} ${u.apellido} ${u.nombre}`.toLowerCase().includes(q);
  });

  async function enviarPago(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensaje("");
    setError("");
    setOcupado(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const resultado = await registrarPagoCuota(formData);
    setOcupado(false);
    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo registrar el pago.");
      return;
    }
    setMensaje(resultado.mensaje ?? "Pago registrado.");
    form.reset();
    const historialActualizado = await obtenerHistorialCuotas(usuario?.id ?? "");
    if (historialActualizado.ok) {
      setHistorial({ usuarioId: usuario?.id ?? "", pagos: historialActualizado.pagos as PagoCuota[] });
    } else {
      setError(historialActualizado.error);
    }
    router.refresh();
  }

  async function renovar(fecha?: string) {
    if (!usuario) return;
    setMensaje("");
    setError("");
    setOcupado(true);
    const resultado = await renovarAfiliacion(usuario.id, fecha);
    setOcupado(false);
    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo renovar.");
      return;
    }
    setMensaje(resultado.mensaje ?? "Afiliación renovada.");
    setFechaPersonalizada("");
    router.refresh();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.4fr)]">
      <section className={cn(estilos.card, "space-y-4")}>
        <h2 className="text-lg font-bold text-atilra-carbon">Seleccionar usuario</h2>
        <div>
          <label htmlFor="buscar-usuario-cuota" className={estilos.label}>Buscar por DNI, legajo o nombre</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atilra-gris" aria-hidden />
            <input id="buscar-usuario-cuota" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              className={cn(estilos.input, "pl-9")} placeholder="DNI o apellido" />
          </div>
        </div>
        <label htmlFor="usuario-cuota" className={estilos.label}>Usuario</label>
        <select id="usuario-cuota" value={seleccionado} onChange={(e) => { setSeleccionado(e.target.value); setError(""); setMensaje(""); }} className={estilos.input}>
          <option value="">Seleccioná un usuario</option>
          {usuariosVisibles.map((u) => (
            <option key={u.id} value={u.id}>
              {u.apellido}, {u.nombre} · DNI {u.dni} · {u.perfil}
            </option>
          ))}
        </select>
        {usuario && (
          <div className="rounded-xl bg-atilra-fondo p-3 text-sm">
            <p className="font-semibold text-atilra-carbon">{usuario.apellido}, {usuario.nombre}</p>
            <p className="text-atilra-gris">DNI {usuario.dni}{usuario.numero_legajo ? ` · Legajo ${usuario.numero_legajo}` : ""}</p>
          </div>
        )}
      </section>

      <div className="space-y-5">
        {!usuario && (
          <section className={cn(estilos.card, "text-sm text-atilra-gris")}>
            Elegí un usuario para registrar una cuota o renovar su afiliación.
          </section>
        )}
        {usuario?.perfil === "invitado" && (
          <section className={cn(estilos.card, "space-y-4")}>
            <div className="flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5 text-atilra-verde-oscuro" aria-hidden />
              <h2 className="text-lg font-bold text-atilra-carbon">Registrar pago de invitado</h2>
            </div>
            <form key={usuario.id} onSubmit={enviarPago} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="usuario_id" value={usuario.id} />
              <div>
                <label htmlFor="periodo" className={estilos.label}>Período (AAAA-MM)</label>
                <input id="periodo" name="periodo" type="month" required className={estilos.input} />
              </div>
              <div>
                <label htmlFor="monto" className={estilos.label}>Monto</label>
                <input id="monto" name="monto" type="number" min="0.01" step="0.01" required className={estilos.input} />
              </div>
              <div>
                <label htmlFor="medio-pago" className={estilos.label}>Medio de pago</label>
                <select id="medio-pago" name="medio_pago" defaultValue="efectivo" className={estilos.input}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="debito">Débito</option>
                  <option value="credito">Crédito</option>
                </select>
              </div>
              <div>
                <label htmlFor="fecha-pago" className={estilos.label}>Fecha de pago</label>
                <input id="fecha-pago" name="fecha_pago" type="date" defaultValue={hoy} required className={estilos.input} />
              </div>
              <div>
                <label htmlFor="fecha-vencimiento" className={estilos.label}>Fecha de vencimiento</label>
                <input id="fecha-vencimiento" name="fecha_vencimiento" type="date" required className={estilos.input} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="observaciones" className={estilos.label}>Observaciones</label>
                <textarea id="observaciones" name="observaciones" rows={2} className={estilos.input} />
              </div>
              <button type="submit" disabled={ocupado} className={cn(estilos.btnPrimario, "sm:col-span-2")}>
                {ocupado ? "Guardando…" : "Registrar pago"}
              </button>
            </form>
          </section>
        )}
        {usuario?.perfil === "afiliado" && (
          <section className={cn(estilos.card, "space-y-4")}>
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-atilra-verde-oscuro" aria-hidden />
              <h2 className="text-lg font-bold text-atilra-carbon">Renovar afiliación</h2>
            </div>
            <p className="text-sm text-atilra-gris">
              Vigencia actual: <strong>{formatearFecha(usuario.fecha_renovacion_afiliacion)}</strong>. La renovación rápida suma un año a la fecha vigente o, si ya venció, desde hoy.
            </p>
            <button type="button" disabled={ocupado} onClick={() => renovar()} className={estilos.btnPrimario}>
              Renovar por un año
            </button>
            <div className="flex flex-wrap items-end gap-3 border-t border-atilra-gris/15 pt-4">
              <div>
                <label htmlFor="fecha-renovacion" className={estilos.label}>Fecha personalizada</label>
                <input id="fecha-renovacion" type="date" min={hoy} value={fechaPersonalizada}
                  onChange={(e) => setFechaPersonalizada(e.target.value)} className={estilos.input} />
              </div>
              <button type="button" disabled={ocupado || !fechaPersonalizada}
                onClick={() => renovar(fechaPersonalizada)} className={estilos.btnSecundario}>
                Guardar fecha
              </button>
            </div>
          </section>
        )}

        {mensaje && <p role="status" className="rounded-lg border border-atilra-verde-oscuro/40 bg-atilra-verde/15 p-3 text-sm text-atilra-carbon">{mensaje}</p>}
        {error && <p role="alert" className="rounded-lg border border-semaforo-rojo bg-red-50 p-3 text-sm text-semaforo-rojo">{error}</p>}

        {usuario?.perfil === "invitado" && (
          <section className={cn(estilos.card, "space-y-3")}>
            <h2 className="text-lg font-bold text-atilra-carbon">Historial de pagos</h2>
            {cargandoHistorial ? <p className="text-sm text-atilra-gris">Cargando historial…</p> : pagosUsuario.length === 0 ? <p className="text-sm text-atilra-gris">Este invitado todavía no tiene pagos registrados.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="bg-atilra-carbon text-atilra-blanco">
                    <tr><th className="p-3">Período</th><th className="p-3">Monto</th><th className="p-3">Medio</th><th className="p-3">Pago</th><th className="p-3">Vencimiento</th><th className="p-3">Observaciones</th></tr>
                  </thead>
                  <tbody>
                    {pagosUsuario.map((p) => (
                      <tr key={p.id} className="border-t border-atilra-gris/15">
                        <td className="p-3">{p.periodo}</td>
                        <td className="p-3">{Number(p.monto).toLocaleString("es-AR", { style: "currency", currency: "ARS" })}</td>
                        <td className="p-3 capitalize">{p.medio_pago}</td>
                        <td className="p-3">{formatearFecha(p.fecha_pago)}</td>
                        <td className="p-3">{formatearFecha(p.fecha_vencimiento)}</td>
                        <td className="p-3">{p.observaciones || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
