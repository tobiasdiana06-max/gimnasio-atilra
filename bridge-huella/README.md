# Puente local para lector biométrico

El proceso se ejecuta en segundo plano en la PC de recepción, escucha solo en `127.0.0.1` y envía fichadas al endpoint del panel por HTTPS usando `TERMINAL_BRIDGE_SECRET`. HTTP se permite únicamente para desarrollo en `localhost`/`127.0.0.1`. El secreto nunca se entrega al navegador.

## Inicio en Windows

1. Instalar Node.js 20 o posterior.
2. Desde `bridge-huella`, copiar `.env.example` a `.env`.
3. Configurar `NEXT_APP_URL` y el mismo `TERMINAL_BRIDGE_SECRET` que se definió en el servidor Next.js. Usar un secreto aleatorio largo; no publicar ni compartir `.env`.
4. Ejecutar `npm install` y luego `npm start`.
5. Abrir `/recepcion/terminal` desde la PC de recepción. El kiosco detecta el puente en `http://127.0.0.1:8787`.

El servidor Next.js necesita `TERMINAL_BRIDGE_SECRET` configurado en su entorno. No agregar ese secreto a variables `NEXT_PUBLIC_*`.
Para iniciar el lector con el SDK en segundo plano en Windows, configurar `BRIDGE_MODE=hardware` y ejecutar `.\start-background.ps1` desde PowerShell. El PID del proceso y las rutas de logs se muestran al iniciarlo. En modo simulador, usar `npm start` en una consola interactiva.

## Simulador por consola

El modo por defecto es `BRIDGE_MODE=simulator`. En la consola del puente:

```text
dni 12345678
huella SIM-una-plantilla-asociada
enrol
salir
```

`dni` y `huella` llaman al endpoint real y actualizan la pantalla del kiosco. `enrol` crea un identificador de prueba; para guardarlo en el perfil, iniciar el enrolamiento desde la ficha del usuario en el panel.

## Integrar el SDK USB

El fabricante y el modelo del lector no fueron especificados, por eso no se incluye un SDK inventado. Implementar `FingerprintReader` en `src/reader.ts` con las APIs oficiales del fabricante:

- `getStatus()` informa conexión y nombre del lector.
- `readMatchedTemplateId()` devuelve un identificador enrolado una sola vez por lectura reconocida, o `null`.
- `enrollTemplateId()` realiza el enrolamiento y devuelve el identificador que el SDK asigna a la plantilla.

Luego usar `BRIDGE_MODE=hardware`. El puente mantiene el mismo endpoint local de enrolamiento y el mismo contrato de fichada con Supabase.

El bridge solo permite solicitudes del origen indicado por `NEXT_APP_URL` y no escucha en interfaces de red externas. Al acceder al panel desde otra URL/origen, actualizar `NEXT_APP_URL` para que coincida exactamente.
