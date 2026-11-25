import { redirect } from "next/navigation";
import { obtenerSesionRecepcion } from "@/lib/auth/recepcion";
import { LoginForm } from "@/app/recepcion/login/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginRecepcionPage() {
  if (await obtenerSesionRecepcion()) redirect("/recepcion");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <header className="rounded-2xl border-b-4 border-atilra-verde bg-atilra-carbon p-6 text-atilra-blanco shadow">
        <p className="text-sm text-atilra-blanco/70">ATILRA · Seccional General Rodríguez</p>
        <h1 className="text-2xl font-bold">Recepción del Gimnasio</h1>
      </header>
      <LoginForm />
    </main>
  );
}
