"use client";

import { useState } from "react";
import { VIGENCIA_ALTA_MEDICA_ANIOS } from "@/lib/constants";
import { esFechaISO, hoyISO, sumarAnios } from "@/lib/fechas";

/**
 * Estado de emisión/vencimiento de un alta médica.
 * El vencimiento se autocompleta (emisión + 1 año) hasta que recepción lo edita a mano.
 */
export function useFechasAlta() {
  const [emision, setEmisionEstado] = useState(() => hoyISO());
  const [vencimiento, setVencimientoEstado] = useState(() => sumarAnios(hoyISO(), VIGENCIA_ALTA_MEDICA_ANIOS));
  const [vencimientoManual, setVencimientoManual] = useState(false);

  function setEmision(valor: string) {
    setEmisionEstado(valor);
    if (!vencimientoManual && esFechaISO(valor)) {
      setVencimientoEstado(sumarAnios(valor, VIGENCIA_ALTA_MEDICA_ANIOS));
    }
  }

  function setVencimiento(valor: string) {
    setVencimientoEstado(valor);
    setVencimientoManual(true);
  }

  function reiniciar() {
    const hoy = hoyISO();
    setEmisionEstado(hoy);
    setVencimientoEstado(sumarAnios(hoy, VIGENCIA_ALTA_MEDICA_ANIOS));
    setVencimientoManual(false);
  }

  return { emision, vencimiento, setEmision, setVencimiento, reiniciar };
}
