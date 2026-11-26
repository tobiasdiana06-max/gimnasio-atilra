import { redirect } from "next/navigation";
import { ClipboardCheck, Fingerprint, FileCheck2, Users } from "lucide-react";
import { obtenerSesionRecepcion } from "@/lib/auth/recepcion";
import { LoginForm } from "@/app/recepcion/login/LoginForm";
import { LogoAtilra } from "@/components/ui/LogoAtilra";

export const dynamic = "force-dynamic";

export default async function LoginRecepcionPage() {
  if (await obtenerSesionRecepcion()) redirect("/recepcion");

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-900 via-[#1b2622] to-emerald-950 px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto grid min-h-[min(760px,calc(100vh-6rem))] w-full max-w-5xl grid-cols-1 items-stretch gap-6 lg:grid-cols-12 lg:gap-8">
        <section className="flex flex-col justify-between gap-10 rounded-3xl border border-white/10 bg-[#1e2421] p-6 text-white shadow-2xl sm:p-8 lg:col-span-6 lg:p-10">
          <div>
            <header className="flex items-center gap-4">
              <span className="rounded-2xl bg-[#29312d] p-2.5">
                <LogoAtilra className="h-12 w-12 shrink-0" />
              </span>
              <div>
                <p className="text-sm font-bold text-emerald-300">ATILRA</p>
                <p className="text-xs text-white/70">Seccional General Rodríguez</p>
              </div>
            </header>
            <h1 className="mt-10 text-3xl font-black leading-tight sm:text-4xl">Recepción · Gimnasio ATILRA</h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
              Panel de gestión para el equipo de profesores y recepción. Administrá el padrón y acompañá la operación diaria del gimnasio.
            </p>
          </div>
          <ul className="space-y-3">
            {[
              { icon: Fingerprint, label: "Control de accesos biométricos" },
              { icon: FileCheck2, label: "Gestión de cuotas y aptos médicos" },
              { icon: ClipboardCheck, label: "Exportación de reportes" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#29312d] p-4 text-sm font-medium text-white/90">
                <Icon className="h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col justify-center rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl sm:p-8 lg:col-span-6 lg:p-10">
          <div className="mb-6">
            <p className="text-sm font-semibold text-emerald-700">Acceso administrativo</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Ingresá al panel</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Usá las credenciales habilitadas para el equipo de recepción.</p>
          </div>
          <LoginForm />
          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Users className="h-4 w-4" aria-hidden /> Acceso exclusivo para personal autorizado
          </p>
        </section>
      </div>
    </main>
  );
}
