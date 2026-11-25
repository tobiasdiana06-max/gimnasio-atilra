"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ImagePlus, Newspaper, Pencil, Plus, Trash2 } from "lucide-react";
import { cambiarPublicacionNoticia, eliminarNoticia, guardarNoticia } from "@/app/recepcion/actions/noticias";
import { estilos } from "@/components/recepcion/estilos";
import { formatearFechaHora } from "@/lib/fechas";
import { cn } from "@/lib/utils";

export interface Noticia {
  id: string;
  titulo: string;
  contenido: string;
  imagen_url: string | null;
  publicada: boolean;
  fecha_publicacion: string;
  created_at: string;
}

function fechaLocal(valor: string): string {
  const fecha = new Date(valor);
  const partes = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    hour12: false,
  }).format(fecha);
  return partes.replace(" ", "T");
}

export function GestorNoticias({ noticias }: { noticias: Noticia[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<Noticia | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensaje("");
    setError("");
    setOcupado(true);
    const resultado = await guardarNoticia(new FormData(event.currentTarget));
    setOcupado(false);
    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo guardar la noticia.");
      return;
    }
    setMensaje(resultado.mensaje ?? "Noticia guardada.");
    setEditando(null);
    router.refresh();
  }

  async function alternar(noticia: Noticia) {
    setMensaje("");
    setError("");
    const resultado = await cambiarPublicacionNoticia(noticia.id, !noticia.publicada);
    if (!resultado.ok) setError(resultado.error ?? "No se pudo cambiar la publicación.");
    else { setMensaje(resultado.mensaje ?? "Estado actualizado."); router.refresh(); }
  }

  async function borrar(noticia: Noticia) {
    if (!window.confirm(`¿Eliminar la noticia «${noticia.titulo}»? Esta acción no se puede deshacer.`)) return;
    setMensaje("");
    setError("");
    const resultado = await eliminarNoticia(noticia.id);
    if (!resultado.ok) setError(resultado.error ?? "No se pudo eliminar la noticia.");
    else { setMensaje(resultado.mensaje ?? "Noticia eliminada."); router.refresh(); }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]">
      <section className={cn(estilos.card, "h-fit space-y-4")}>
        <div className="flex items-center gap-2">
          {editando ? <Pencil className="h-5 w-5 text-atilra-verde-oscuro" aria-hidden /> : <Plus className="h-5 w-5 text-atilra-verde-oscuro" aria-hidden />}
          <h2 className="text-lg font-bold text-atilra-carbon">{editando ? "Editar noticia" : "Nueva noticia"}</h2>
        </div>
        <form key={editando?.id ?? "nueva"} onSubmit={guardar} className="space-y-4">
          <input type="hidden" name="id" value={editando?.id ?? ""} />
          <div>
            <label htmlFor="noticia-titulo" className={estilos.label}>Título</label>
            <input id="noticia-titulo" name="titulo" required defaultValue={editando?.titulo ?? ""} className={estilos.input} />
          </div>
          <div>
            <label htmlFor="noticia-contenido" className={estilos.label}>Contenido</label>
            <textarea id="noticia-contenido" name="contenido" required rows={7} defaultValue={editando?.contenido ?? ""} className={estilos.input} />
          </div>
          <div>
            <label htmlFor="noticia-imagen" className={estilos.label}><ImagePlus className="mr-1 inline h-3.5 w-3.5" aria-hidden />URL de imagen (opcional)</label>
            <input id="noticia-imagen" name="imagen_url" type="url" defaultValue={editando?.imagen_url ?? ""} className={estilos.input} placeholder="https://…" />
          </div>
          <div>
            <label htmlFor="noticia-fecha" className={estilos.label}>Fecha de publicación</label>
            <input id="noticia-fecha" name="fecha_publicacion" type="datetime-local"
              defaultValue={editando ? fechaLocal(editando.fecha_publicacion) : ""} className={estilos.input} />
            <p className="mt-1 text-xs text-atilra-gris">Si se deja vacía, se usa la fecha y hora actuales.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-atilra-carbon">
            <input name="publicada" type="checkbox" defaultChecked={editando?.publicada ?? true} className="h-4 w-4 accent-atilra-verde-oscuro" />
            Publicada
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={ocupado} className={estilos.btnPrimario}>{ocupado ? "Guardando…" : editando ? "Guardar cambios" : "Crear noticia"}</button>
            {editando && <button type="button" onClick={() => setEditando(null)} className={estilos.btnSecundario}>Cancelar edición</button>}
          </div>
        </form>
        {mensaje && <p role="status" className="rounded-lg bg-atilra-verde/15 p-3 text-sm text-atilra-carbon">{mensaje}</p>}
        {error && <p role="alert" className="rounded-lg border border-semaforo-rojo bg-red-50 p-3 text-sm text-semaforo-rojo">{error}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-atilra-carbon">Cartelera ({noticias.length})</h2>
        {noticias.length === 0 && <div className={cn(estilos.card, "text-sm text-atilra-gris")}>Todavía no hay noticias. Creá la primera desde el formulario.</div>}
        {noticias.map((noticia) => (
          <article key={noticia.id} className={cn(estilos.card, "space-y-3", !noticia.publicada && "opacity-75")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Newspaper className="mt-1 h-5 w-5 shrink-0 text-atilra-verde-oscuro" aria-hidden />
                <div>
                  <h3 className="font-bold text-atilra-carbon">{noticia.titulo}</h3>
                  <p className="text-xs text-atilra-gris">Publicación: {formatearFechaHora(noticia.fecha_publicacion)}</p>
                </div>
              </div>
              <span className={cn("rounded-full px-3 py-1 text-xs font-bold", noticia.publicada ? "bg-atilra-verde/20 text-atilra-carbon" : "bg-atilra-gris/15 text-atilra-gris")}>
                {noticia.publicada ? "Publicada" : "Oculta"}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-atilra-carbon">{noticia.contenido}</p>
            {noticia.imagen_url && <a href={noticia.imagen_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-atilra-verde-oscuro underline">Ver imagen</a>}
            <div className="flex flex-wrap gap-2 border-t border-atilra-gris/15 pt-3">
              <button type="button" onClick={() => { setEditando(noticia); setMensaje(""); setError(""); }} className={estilos.btnSecundario}>
                <Pencil className="h-4 w-4" aria-hidden /> Editar
              </button>
              <button type="button" onClick={() => alternar(noticia)} className={estilos.btnSecundario}>
                {noticia.publicada ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                {noticia.publicada ? "Ocultar" : "Publicar"}
              </button>
              <button type="button" onClick={() => borrar(noticia)} className={estilos.btnPeligro}>
                <Trash2 className="h-4 w-4" aria-hidden /> Eliminar
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
