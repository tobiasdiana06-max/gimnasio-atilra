"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Bell, CalendarDays, Download, FileUp, Fingerprint, LogOut, Newspaper, ShieldAlert, UserRound } from "lucide-react";
import { iniciarSesionCredencial, salirCredencial, subirAltaMedicaSocio } from "@/app/mi-credencial/actions";
import { PerfilBadge } from "@/components/recepcion/SemaforoBadge";
import { estilos } from "@/components/recepcion/estilos";
import { LogoAtilra } from "@/components/ui/LogoAtilra";
import { CONTACTO } from "@/lib/constants";
import { esFechaISO, formatearFecha, formatearFechaHora } from "@/lib/fechas";
import { cn } from "@/lib/utils";
import type { EstadoUsuario } from "@/types";

export interface UsuarioMiCredencial {
  id: string;
  dni: string;
  numero_legajo: string | null;
  nombre: string;
  apellido: string;
  perfil: "afiliado" | "invitado";
  foto_url: string | null;
}

export interface NoticiaPortal {
  id: string;
  titulo: string;
  contenido: string;
  imagen_url: string | null;
  fecha_publicacion: string;
}

type Seccion = "credencial" | "alta" | "noticias";

function PrivacidadDatos({ className }: { className?: string } = {}) {
  return (
    <section aria-labelledby="privacidad-datos" className={cn("mt-6 rounded-2xl border border-[#9AC201]/40 bg-white p-4 text-sm text-[#292929] shadow-sm", className)}>
      <h2 id="privacidad-datos" className="font-bold">Privacidad y tratamiento de datos</h2>
      <p className="mt-2 leading-relaxed">
        El gimnasio utiliza tus datos para gestionar la credencial, verificar el acceso, administrar la afiliación o cuota,
        recibir y revisar certificados médicos y comunicar novedades relacionadas con sus servicios.
      </p>
      <p className="mt-2 leading-relaxed">
        Conforme a la Ley 25.326, podés solicitar acceso, rectificación o supresión de tus datos a través de los canales de contacto del gimnasio.
      </p>
      <p className="mt-2">
        Contacto telefónico del gimnasio:{" "}
        {CONTACTO.sede.telefonos.map((telefono, index) => (
          <span key={telefono}>
            {index > 0 && " · "}
            <a className="font-semibold underline" href={`tel:${telefono.replace(/[^\d+]/g, "")}`}>
              {telefono}
            </a>
          </span>
        ))}
      </p>
    </section>
  );
}

function AccesoDni({ planillaUrl, planillaError }: { planillaUrl: string | null; planillaError?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function ingresar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setOcupado(true);
    const formData = new FormData(event.currentTarget);
    try {
      const resultado = await iniciarSesionCredencial(formData);
      if (!resultado.ok) {
        setError(resultado.error ?? "No se pudieron verificar los datos.");
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar la sesión.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center border-x border-slate-200 bg-[#F4F6F4] px-5 py-8 shadow-2xl lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)] lg:items-center lg:gap-x-10 lg:px-10 lg:shadow-xl">
      <header className="mb-6 rounded-3xl border-b-4 border-[#9AC201] bg-[#292929] p-6 text-white shadow-lg lg:row-span-2 lg:mb-0 lg:p-8">
        <div className="flex items-center gap-3">
          <LogoAtilra className="h-11 w-11 shrink-0" />
          <div>
            <p className="text-sm font-bold">Gimnasio ATILRA</p>
            <p className="text-xs text-white/70">Seccional General Rodríguez (CCT 02/88)</p>
          </div>
        </div>
        <h1 className="mt-5 text-3xl font-black">Mi Credencial</h1>
        <p className="mt-2 text-sm text-white/75">Consultá tu estado, enviá el certificado médico y mirá las novedades.</p>
      </header>
      <form onSubmit={(event) => void ingresar(event)} className="mx-1 space-y-4 rounded-3xl bg-white p-6 shadow-lg lg:mx-0">
        <div>
          <label htmlFor="dni-credencial" className={estilos.label}>DNI</label>
          <input id="dni-credencial" name="dni" type="text" inputMode="numeric" autoComplete="username"
            minLength={7} maxLength={12} required className={estilos.input} placeholder="Tu número de DNI" />
        </div>
        <div>
          <label htmlFor="legajo-credencial" className={estilos.label}>Número de legajo (solo afiliados)</label>
          <input id="legajo-credencial" name="numero_legajo" type="text" autoComplete="off"
            className={estilos.input} placeholder="Dejalo vacío si sos invitado" />
        </div>
        <div>
          <label htmlFor="telefono-credencial" className={estilos.label}>Últimos 4 dígitos del teléfono (solo invitados)</label>
          <input id="telefono-credencial" name="telefono_ultimos4" type="text" inputMode="numeric"
            autoComplete="off" maxLength={4} className={estilos.input} placeholder="Dejalo vacío si no tenés teléfono registrado" />
        </div>
        {error && <p role="alert" className="rounded-lg border border-semaforo-rojo bg-red-50 p-3 text-sm text-semaforo-rojo">{error}</p>}
        <button type="submit" disabled={ocupado} className={cn(estilos.btnPrimario, "w-full py-3")}>
          {ocupado ? "Verificando…" : "Ingresar a mi credencial"}
        </button>
        <p className="text-xs text-[#606062]">La sesión queda protegida en este dispositivo y vence automáticamente.</p>
      </form>
      <div className="space-y-4 lg:col-start-2">
        {planillaError && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{planillaError}</p>}
        <BotonPlanilla url={planillaUrl} />
        <PrivacidadDatos className="mt-0" />
      </div>
    </main>
  );
}

function TarjetaSemaforo({ estado }: { estado: EstadoUsuario | null }) {
  const visual = estado
    ? {
        verde: { color: "#16A34A", label: "ACCESO HABILITADO", panel: "border-green-200 bg-green-50 text-green-900" },
        amarillo: { color: "#EAB308", label: "VENCIMIENTO PRÓXIMO", panel: "border-yellow-200 bg-yellow-50 text-yellow-950" },
        rojo: { color: "#DC2626", label: "ACCESO BLOQUEADO", panel: "border-red-200 bg-red-50 text-red-900" },
      }[estado.semaforo]
    : null;

  return (
    <div
      aria-live="polite"
      className={cn("mt-5 rounded-2xl border p-4", visual?.panel ?? "border-slate-200 bg-slate-50 text-slate-700")}
    >
      <div className="flex items-start gap-3">
        {visual ? (
          <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: visual.color }} aria-hidden />
        ) : (
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#606062]" aria-hidden />
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider opacity-70">Estado de acceso</p>
          <h3 className="mt-1 text-lg font-black leading-tight">{visual?.label ?? "ESTADO NO DISPONIBLE"}</h3>
          <p className="mt-2 text-sm font-medium leading-relaxed">
            {estado?.motivo ?? "Consultá en recepción para verificar tu estado."}
          </p>
          {estado?.semaforo === "amarillo" && estado.dias_restantes !== null && (
            <p className="mt-3 inline-flex rounded-full bg-yellow-200 px-3 py-1 text-sm font-bold text-yellow-950">
              {estado.dias_restantes} días restantes
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function diasRestantes(fecha: string | null | undefined, hoy: string): number | null {
  const fechaISO = fecha?.slice(0, 10);
  if (!fechaISO || !esFechaISO(fechaISO) || !esFechaISO(hoy)) return null;
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const [anioHoy, mesHoy, diaHoy] = hoy.split("-").map(Number);
  return (Date.UTC(anio, mes - 1, dia) - Date.UTC(anioHoy, mesHoy - 1, diaHoy)) / 86_400_000;
}

function AlertaVencimientos({
  usuario,
  estado,
  hoy,
}: {
  usuario: UsuarioMiCredencial;
  estado: EstadoUsuario | null;
  hoy: string;
}) {
  const vencimientos = [
    { nombre: "Apto médico", fecha: estado?.alta_vencimiento },
    ...(usuario.perfil === "invitado" ? [{ nombre: "Cuota mensual", fecha: estado?.cuota_vencimiento }] : []),
  ].flatMap(({ nombre, fecha }) => {
    const dias = diasRestantes(fecha, hoy);
    const fechaISO = fecha?.slice(0, 10);
    return dias !== null && dias <= 7 && fechaISO ? [{ nombre, fecha: fechaISO, dias }] : [];
  });

  if (vencimientos.length === 0) return null;
  const hayVencido = vencimientos.some(({ dias }) => dias < 0);

  return (
    <aside
      role="status"
      aria-live="polite"
      className={cn(
        "mt-4 rounded-2xl border p-4",
        hayVencido ? "border-red-300 bg-red-50 text-red-900" : "border-amber-300 bg-amber-50 text-amber-950",
      )}
    >
      <h3 className="font-black">{hayVencido ? "Revisá tus vencimientos" : "Vencimiento próximo"}</h3>
      <ul className="mt-2 space-y-2 text-sm">
        {vencimientos.map(({ nombre, fecha, dias }) => (
          <li key={nombre}>
            <span className="font-bold">{nombre}:</span>{" "}
            {dias < 0
              ? `vencido el ${formatearFecha(fecha)} (hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "día" : "días"}).`
              : dias === 0
                ? `vence hoy, ${formatearFecha(fecha)}.`
                : `vence el ${formatearFecha(fecha)} (faltan ${dias} ${dias === 1 ? "día" : "días"}).`}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function clavePublicaBytes(clave: string): Uint8Array {
  const padding = "=".repeat((4 - (clave.length % 4)) % 4);
  const base64 = (clave + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (caracter) => caracter.charCodeAt(0));
}

function NotificacionesPush({ clavePublica }: { clavePublica: string }) {
  const [soportado, setSoportado] = useState(false);
  const [activa, setActiva] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return;
    }

    void navigator.serviceWorker.ready
      .then((registration) => {
        if (vigente) setSoportado(true);
        return registration.pushManager.getSubscription();
      })
      .then((subscription) => {
        if (vigente) setActiva(Boolean(subscription));
      })
      .catch(() => {
        if (vigente) setError("No se pudo consultar la suscripción de este dispositivo.");
      });

    return () => { vigente = false; };
  }, []);

  async function cambiarSuscripcion() {
    setMensaje("");
    setError("");
    setOcupado(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const respuesta = await fetch("/api/mi-credencial/push-subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (!respuesta.ok) throw new Error("No se pudo desactivar la suscripción en el servidor.");
        await subscription.unsubscribe();
        setActiva(false);
        setMensaje("Las notificaciones de vencimiento quedaron desactivadas en este dispositivo.");
        return;
      }

      if (!clavePublica) throw new Error("Las notificaciones push todavía no están configuradas.");
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") throw new Error("Necesitás permitir las notificaciones para activar los avisos.");

      const nuevaSuscripcion = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: clavePublicaBytes(clavePublica).buffer as ArrayBuffer,
      });
      const respuesta = await fetch("/api/mi-credencial/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: nuevaSuscripcion.toJSON() }),
      });
      if (!respuesta.ok) {
        await nuevaSuscripcion.unsubscribe();
        const resultado = await respuesta.json() as { error?: string };
        throw new Error(resultado.error ?? "No se pudo guardar la suscripción.");
      }
      setActiva(true);
      setMensaje("Este celular recibirá avisos de vencimiento.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la suscripción.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 h-5 w-5 shrink-0 text-[#7EA100]" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[#292929]">Avisos en este celular</h3>
          <p className="mt-1 text-sm text-[#606062]">Recibí notificaciones de vencimiento aunque no tengas Mi Credencial abierta.</p>
        </div>
      </div>
      {soportado ? (
        <button type="button" disabled={ocupado} onClick={() => void cambiarSuscripcion()} className={cn(estilos.btnSecundario, "mt-3 w-full")}>
          <Bell className="h-4 w-4" aria-hidden />
          {ocupado ? "Actualizando…" : activa ? "Desactivar notificaciones en este celular" : "Recibir notificaciones de vencimiento en este celular"}
        </button>
      ) : (
        <p className="mt-3 text-sm text-[#606062]">Este navegador no admite notificaciones push.</p>
      )}
      {mensaje && <p role="status" className="mt-3 text-sm text-green-800">{mensaje}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
    </section>
  );
}

function BotonPlanilla({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <a href={url} download className={cn(estilos.btnPrimario, "mt-4 w-full py-3")}>
      <Download className="h-4 w-4" aria-hidden /> Descargar planilla de inscripción
    </a>
  );
}

function Credencial({
  usuario,
  estado,
  hoy,
  planillaUrl,
  claveVapidPublica,
}: {
  usuario: UsuarioMiCredencial;
  estado: EstadoUsuario | null;
  hoy: string;
  planillaUrl: string | null;
  claveVapidPublica: string;
}) {
  const esAfiliado = usuario.perfil === "afiliado";
  return (
    <div className="space-y-4">
      <article className="overflow-hidden rounded-3xl bg-white shadow-lg">
        <div
          className="h-2"
          style={{
            backgroundColor:
              estado?.semaforo === "verde" ? "#16A34A"
                : estado?.semaforo === "amarillo" ? "#EAB308"
                  : estado?.semaforo === "rojo" ? "#DC2626" : "#606062",
          }}
        />
        <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-start">
          <div className="min-w-0">
            <div className="flex items-center gap-4">
              {usuario.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={usuario.foto_url} alt="" referrerPolicy="no-referrer" className="h-20 w-20 rounded-2xl object-cover ring-2 ring-slate-100" />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#292929]">
                  <UserRound className="h-10 w-10 text-[#9AC201]" aria-hidden />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-[#606062]">Credencial digital</p>
                <h2 className="mt-1 text-xl font-black leading-tight text-[#292929]">{usuario.nombre} {usuario.apellido}</h2>
                <p className="mt-1 text-sm text-[#606062]">DNI {usuario.dni}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <PerfilBadge perfil={usuario.perfil} />
              {esAfiliado && <span className="rounded-full bg-[#9AC201]/25 px-2.5 py-1 text-xs font-bold text-[#292929]">CCT 02/88</span>}
              {esAfiliado && usuario.numero_legajo && (
                <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-[#606062]">
                  Legajo {usuario.numero_legajo}
                </span>
              )}
            </div>
            <TarjetaSemaforo estado={estado} />
            <AlertaVencimientos usuario={usuario} estado={estado} hoy={hoy} />
          </div>

          <div className="min-w-0">
            <NotificacionesPush clavePublica={claveVapidPublica} />
            <BotonPlanilla url={planillaUrl} />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="min-w-0 rounded-2xl border border-slate-100 bg-[#F4F6F4] p-3.5">
                <div className="mb-2 flex items-center gap-2 text-[#606062]">
                  <CalendarDays className="h-4 w-4 shrink-0 text-[#7EA100]" aria-hidden />
                  <p className="text-xs font-bold leading-tight">Alta Médica</p>
                </div>
                <p className="text-sm font-black text-[#292929]">{formatearFecha(estado?.alta_vencimiento)}</p>
              </div>
              <div className="min-w-0 rounded-2xl border border-slate-100 bg-[#F4F6F4] p-3.5">
                <div className="mb-2 flex items-center gap-2 text-[#606062]">
                  <CalendarDays className="h-4 w-4 shrink-0 text-[#7EA100]" aria-hidden />
                  <p className="text-xs font-bold leading-tight">{esAfiliado ? "Afiliación" : "Cuota"}</p>
                </div>
                <p className="text-sm font-black text-[#292929]">
                  {formatearFecha(esAfiliado ? estado?.afiliacion_vencimiento : estado?.cuota_vencimiento)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

function SubirAlta() {
  const fotoRef = useRef<HTMLInputElement>(null);
  const archivoRef = useRef<HTMLInputElement>(null);
  const [archivoNombre, setArchivoNombre] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensaje("");
    setError("");
    setOcupado(true);
    const form = event.currentTarget;
    try {
      const resultado = await subirAltaMedicaSocio(new FormData(form));
      if (!resultado.ok) {
        setError(resultado.error ?? "No se pudo enviar el certificado.");
        return;
      }
      setMensaje(resultado.mensaje ?? "Certificado enviado.");
      setArchivoNombre("");
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el certificado.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5 rounded-3xl bg-white p-6 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-[#9AC201]/20 p-3"><FileUp className="h-6 w-6 text-[#7EA100]" aria-hidden /></div>
        <div>
          <h2 className="text-lg font-bold text-[#292929]">Subir alta médica</h2>
          <p className="text-sm text-[#606062]">Sacá una foto del certificado o adjuntá una imagen/PDF.</p>
        </div>
      </div>
      <form onSubmit={(event) => void enviar(event)} className="space-y-4">
        <div>
          <label htmlFor="foto-alta" className={cn(estilos.label, "mb-2 block")}>Sacar foto</label>
          <input id="foto-alta" name="foto" type="file" accept="image/*" capture="environment"
            ref={fotoRef}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file && archivoRef.current) archivoRef.current.value = "";
              setArchivoNombre(file?.name ?? "");
            }}
            className="block w-full rounded-xl border border-slate-200 bg-white p-2 text-sm text-[#606062] file:mr-3 file:rounded-lg file:border-0 file:bg-[#9AC201] file:px-4 file:py-2 file:font-semibold file:text-[#292929]" />
        </div>
        <div>
          <label htmlFor="archivo-alta" className={cn(estilos.label, "mb-2 block")}>Adjuntar imagen o PDF</label>
          <input id="archivo-alta" name="archivo" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
            ref={archivoRef}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file && fotoRef.current) fotoRef.current.value = "";
              setArchivoNombre(file?.name ?? "");
            }}
            className="block w-full rounded-xl border border-slate-200 bg-white p-2 text-sm text-[#606062] file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-semibold file:text-[#292929]" />
        </div>
        {archivoNombre && <p className="text-sm text-[#606062]">Seleccionado: {archivoNombre}</p>}
        <p className="text-xs text-[#606062]">Formatos JPG, PNG, WEBP o PDF · máximo 10 MB. El archivo queda pendiente de revisión.</p>
        {mensaje && <p role="status" className="rounded-lg bg-atilra-verde/15 p-3 text-sm text-atilra-carbon">{mensaje}</p>}
        {error && <p role="alert" className="rounded-lg border border-semaforo-rojo bg-red-50 p-3 text-sm text-semaforo-rojo">{error}</p>}
        <button type="submit" disabled={ocupado || !archivoNombre} className={cn(estilos.btnPrimario, "w-full py-3")}>
          {ocupado ? "Enviando…" : "Enviar certificado"}
        </button>
      </form>
    </section>
  );
}

function Cartelera({ noticias }: { noticias: NoticiaPortal[] }) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <h2 className="flex items-center gap-2 text-xl font-black text-[#292929] lg:col-span-2">
        <Newspaper className="h-5 w-5 text-[#7EA100]" aria-hidden /> Cartelera del gimnasio
      </h2>
      {noticias.length === 0 && <div className="rounded-3xl bg-white p-6 text-sm text-[#606062] shadow-lg lg:col-span-2">No hay novedades publicadas por el momento.</div>}
      {noticias.map((noticia) => (
        <article key={noticia.id} className="space-y-3 rounded-3xl bg-white p-5 shadow-lg">
          <div>
            <h3 className="text-lg font-bold text-[#292929]">{noticia.titulo}</h3>
            <p className="text-xs text-[#606062]">{formatearFechaHora(noticia.fecha_publicacion)}</p>
          </div>
          {noticia.imagen_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={noticia.imagen_url} alt="" loading="lazy" referrerPolicy="no-referrer" className="max-h-64 w-full rounded-xl object-cover" />
          )}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#292929]">{noticia.contenido}</p>
        </article>
      ))}
    </section>
  );
}

export function MiCredencialPortal({
  usuario,
  avisarTelefonoInvitado = false,
  estado,
  noticias,
  hoy,
  planillaUrl = null,
  planillaError,
  claveVapidPublica = "",
  errorCarga,
}: {
  usuario: UsuarioMiCredencial | null;
  avisarTelefonoInvitado?: boolean;
  estado: EstadoUsuario | null;
  noticias: NoticiaPortal[];
  hoy: string;
  planillaUrl?: string | null;
  planillaError?: string;
  claveVapidPublica?: string;
  errorCarga?: string;
}) {
  const [seccion, setSeccion] = useState<Seccion>("credencial");
  if (!usuario) {
    return <AccesoDni planillaUrl={planillaUrl} planillaError={planillaError} />;
  }

  const tabs: { id: Seccion; label: string; icon: typeof BadgeCheck }[] = [
    { id: "credencial", label: "Mi Credencial", icon: BadgeCheck },
    { id: "alta", label: "Subir Alta", icon: FileUp },
    { id: "noticias", label: "Cartelera", icon: Newspaper },
  ];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col border-x border-slate-200 bg-[#F4F6F4] pb-24 shadow-2xl lg:border-x-0 lg:pb-8 lg:shadow-xl">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-[#292929] px-4 py-3 text-white shadow-md">
        <div className="flex min-w-0 items-center gap-3">
          <LogoAtilra className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">Gimnasio ATILRA</p>
            <p className="mt-0.5 text-[11px] leading-tight text-white/70">Seccional General Rodríguez (CCT 02/88)</p>
          </div>
        </div>
        <form action={salirCredencial}>
          <button type="submit" aria-label="Cerrar sesión" title="Cerrar sesión" className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" aria-hidden />
          </button>
        </form>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8 pt-5 sm:px-6 lg:px-8 lg:pt-8">
        {avisarTelefonoInvitado && usuario.perfil === "invitado" && (
          <aside role="status" className="mb-4 rounded-2xl border border-[#9AC201]/50 bg-[#9AC201]/15 p-4 text-sm text-[#292929]">
            <p className="font-bold">Agregá un teléfono para proteger tu credencial</p>
            <p className="mt-1">Tu ficha no tiene un teléfono registrado. Acercate a recepción para cargarlo y reforzar la seguridad de tu cuenta.</p>
          </aside>
        )}
        {errorCarga && <p role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{errorCarga}</p>}
        {planillaError && <p role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{planillaError}</p>}
        {seccion === "credencial" && (
          <Credencial
            usuario={usuario}
            estado={estado}
            hoy={hoy}
            planillaUrl={planillaUrl}
            claveVapidPublica={claveVapidPublica}
          />
        )}
        {seccion === "alta" && <SubirAlta />}
        {seccion === "noticias" && <Cartelera noticias={noticias} />}
        <PrivacidadDatos />
        <footer className="mt-6 text-center text-xs text-[#606062]">
          <span className="inline-flex items-center gap-1"><Fingerprint className="h-3.5 w-3.5" aria-hidden /> Credencial digital ATILRA</span>
        </footer>
      </main>

      <nav aria-label="Secciones de mi credencial" className="fixed bottom-0 left-1/2 z-40 grid w-full max-w-6xl -translate-x-1/2 grid-cols-3 gap-1 border-x border-t border-white/10 bg-[#292929] px-2 pb-3 pt-2 shadow-2xl lg:bottom-5 lg:w-fit lg:grid-cols-[repeat(3,minmax(150px,1fr))] lg:rounded-2xl lg:border lg:pb-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setSeccion(id)} aria-current={seccion === id ? "page" : undefined}
            className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-bold transition",
              seccion === id ? "bg-[#9AC201] text-[#292929]" : "text-white/70 hover:bg-white/10 hover:text-white")}>
            <Icon className="h-5 w-5" aria-hidden /> {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
