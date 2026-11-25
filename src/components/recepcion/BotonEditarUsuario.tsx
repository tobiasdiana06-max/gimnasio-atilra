"use client";

import { useCallback, useState } from "react";
import { Pencil } from "lucide-react";
import { UsuarioFormModal } from "@/components/recepcion/UsuarioFormModal";
import { estilos } from "@/components/recepcion/estilos";
import type { UsuarioEditable } from "@/types/recepcion";

export function BotonEditarUsuario({ usuario }: { usuario: UsuarioEditable }) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={estilos.btnSecundario}>
        <Pencil className="h-4 w-4" aria-hidden /> Editar datos
      </button>
      {abierto && <UsuarioFormModal usuario={usuario} onCerrar={cerrar} />}
    </>
  );
}
