import { redirect } from "next/navigation";
import { obtenerSesionRecepcion } from "@/lib/auth/recepcion";
import { LoginForm } from "@/app/recepcion/login/LoginForm";
import { LogoAtilra } from "@/components/ui/LogoAtilra";

export const dynamic = "force-dynamic";

export default async function LoginRecepcionPage() {
  if (await obtenerSesionRecepcion()) redirect("/recepcion");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <header className="flex items-center gap-4 rounded-2xl border-b-4 border-[#10b981] bg-[#292929] p-6 text-white shadow">
        <LogoAtilra className="h-14 w-14 shrink-0 rounded-xl bg-white/10 p-1" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#22c55e]">ATILRA · Seccional General Rodríguez</p>
          <h1 className="mt-1 text-xl font-black leading-tight text-white sm:text-2xl">
            Recepción · Gimnasio ATILRA
          </h1>
        </div>
      </header>
      <LoginForm />
    </main>
  );
}
