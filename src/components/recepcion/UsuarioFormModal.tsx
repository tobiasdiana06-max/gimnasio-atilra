"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { guardarUsuario } from "@/app/recepcion/actions/usuarios";
import { estilos } from "@/components/recepcion/estilos";
import { validarUsuario } from "@/lib/validaciones";
import { cn } from "@/lib/utils";
import type { PerfilUsuario, UsuarioEditable, UsuarioFormValues } from "@/types/recepcion";

interface Props {
  /** null = alta de usuario nuevo */
  usuario: UsuarioEditable | null;
  onCerrar: () => void;
}

export function UsuarioFormModal({ usuario, onCerrar }: Props) {
  const [valores, setValores] = useState<UsuarioFormValues>({
    perfil: usuario?.perfil ?? "afiliado",
    dni: usuario?.dni ?? "",
    numero_legajo: usuario?.numero_legajo ?? "",
    nombre: usuario?.nombre ?? "",
    apellido: usuario?.apellido ?? "",
    telefono: usuario?.telefono ?? "",
  });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  function cambiar<K extends keyof UsuarioFormValues>(campo: K, valor: UsuarioFormValues[K]) {
    setValores((v) => ({ ...v, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: "" }));
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);

    const encontrados = validarUsuario(valores);
    if (Object.keys(encontrados).length > 0) {
      setErrores(encontrados);
      return;
    }

    iniciar(async () => {
      const r = await guardarUsuario(usuario?.id ?? null, valores);
      if (r.ok) {
        onCerrar();
      } else {
        setErrores(r.campos ?? {});
        setErrorGeneral(r.error ?? "No se pudo guardar.");
      }
    });
  }

  const perfiles: { valor: PerfilUsuario; etiqueta: string }[] = [
    { valor: "afiliado", etiqueta: "Afiliado/a" },
    { valor: "invitado", etiqueta: "Invitado/a" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-atilra-carbon/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={usuario ? "Editar usuario" : "Nuevo usuario"}
      onClick={onCerrar}
    >
      <form
        onSubmit={enviar}
        noValidate
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-atilra-blanco p-6 shadow-xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold text-atilra-carbon">{usuario ? "Editar usuario" : "Nuevo usuario"}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1 text-atilra-gris hover:bg-atilra-fondo">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <span className={estilos.label}>Perfil</span>
          <div className="grid grid-cols-2 gap-2">
            {perfiles.map((p) => (
              <button
                key={p.valor}
                type="button"
                onClick={() => cambiar("perfil", p.valor)}
                aria-pressed={valores.perfil === p.valor}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-semibold transition",
                  valores.perfil === p.valor
                    ? "border-atilra-verde-oscuro bg-atilra-verde text-atilra-carbon"
                    : "border-atilra-gris/40 text-atilra-gris hover:bg-atilra-fondo",
                )}
              >
                {p.etiqueta}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-atilra-gris">
            {valores.perfil === "afiliado"
              ? "Se identifica con N.° de legajo + DNI. Necesita alta médica y renovación de afiliación al día."
              : "Se identifica solo con DNI. Necesita alta médica y cuota mensual al día."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={estilos.label} htmlFor="u-dni">
              DNI
            </label>
            <input
              id="u-dni"
              inputMode="numeric"
              value={valores.dni}
              onChange={(e) => cambiar("dni", e.target.value)}
              className={estilos.input}
              placeholder="Sin puntos"
            />
            {errores.dni && <p className={estilos.error}>{errores.dni}</p>}
          </div>

          {valores.perfil === "afiliado" && (
            <div>
              <label className={estilos.label} htmlFor="u-legajo">
                N.° de legajo
              </label>
              <input
                id="u-legajo"
                value={valores.numero_legajo}
                onChange={(e) => cambiar("numero_legajo", e.target.value)}
                className={estilos.input}
              />
              {errores.numero_legajo && <p className={estilos.error}>{errores.numero_legajo}</p>}
            </div>
          )}

          <div>
            <label className={estilos.label} htmlFor="u-apellido">
              Apellido
            </label>
            <input
              id="u-apellido"
              value={valores.apellido}
              onChange={(e) => cambiar("apellido", e.target.value)}
              className={estilos.input}
            />
            {errores.apellido && <p className={estilos.error}>{errores.apellido}</p>}
          </div>

          <div>
            <label className={estilos.label} htmlFor="u-nombre">
              Nombre
            </label>
            <input
              id="u-nombre"
              value={valores.nombre}
              onChange={(e) => cambiar("nombre", e.target.value)}
              className={estilos.input}
            />
            {errores.nombre && <p className={estilos.error}>{errores.nombre}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className={estilos.label} htmlFor="u-tel">
              Teléfono / WhatsApp (opcional)
            </label>
            <input
              id="u-tel"
              inputMode="tel"
              value={valores.telefono}
              onChange={(e) => cambiar("telefono", e.target.value)}
              className={estilos.input}
              placeholder="+54 9 11 2345 6789"
            />
            {errores.telefono && <p className={estilos.error}>{errores.telefono}</p>}
          </div>
        </div>

        {errorGeneral && (
          <p className="mt-4 rounded-lg border border-semaforo-rojo bg-red-50 p-3 text-sm text-semaforo-rojo">
            {errorGeneral}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCerrar} disabled={pendiente} className={estilos.btnSecundario}>
            Cancelar
          </button>
          <button type="submit" disabled={pendiente} className={estilos.btnPrimario}>
            {pendiente ? "Guardando…" : usuario ? "Guardar cambios" : "Crear usuario"}
          </button>
        </div>
      </form>
    </div>
  );
}
