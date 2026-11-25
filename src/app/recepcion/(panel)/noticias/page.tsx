import { GestorNoticias, type Noticia } from "@/components/recepcion/GestorNoticias";
import { requireRecepcion } from "@/lib/auth/recepcion";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function NoticiasPage() {
  await requireRecepcion();
  const { data, error } = await createAdminClient()
    .from("noticias")
    .select("id, titulo, contenido, imagen_url, publicada, fecha_publicacion, created_at")
    .order("fecha_publicacion", { ascending: false })
    .limit(500);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-atilra-carbon">Noticias del gimnasio</h1>
        <p className="text-sm text-atilra-gris">Administrá la cartelera y publicá u ocultá novedades para afiliados e invitados.</p>
      </header>
      {error && <p role="alert" className="rounded-lg border border-semaforo-rojo bg-red-50 p-3 text-sm text-semaforo-rojo">Error al consultar Supabase: {error.message}</p>}
      <GestorNoticias noticias={(data ?? []) as Noticia[]} />
    </div>
  );
}
