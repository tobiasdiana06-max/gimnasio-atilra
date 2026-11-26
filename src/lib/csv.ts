type ValorCSV = string | number | null | undefined;

function escaparCSV(valor: ValorCSV): string {
  const texto = String(valor ?? "");
  const seguro = /^[\t\r\n ]*[=+\-@]/.test(texto) ? `'${texto}` : texto;
  return `"${seguro.replace(/"/g, '""')}"`;
}

export function descargarCSV(
  nombreArchivo: string,
  encabezados: string[],
  filas: ValorCSV[][],
): void {
  const contenido = [encabezados, ...filas]
    .map((fila) => fila.map(escaparCSV).join(","))
    .join("\r\n");
  const archivo = new Blob([`\uFEFF${contenido}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
