"use client";

import { useEffect } from "react";

export function ServiceWorkerUpdater() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const wasControlled = Boolean(navigator.serviceWorker.controller);
    let registration: ServiceWorkerRegistration | undefined;
    let reloading = false;

    const handleControllerChange = () => {
      if (!wasControlled || reloading) return;
      reloading = true;
      window.location.reload();
    };

    const checkForUpdates = () => {
      if (document.visibilityState !== "visible" || !registration) return;
      void registration.update().catch((error: unknown) => {
        console.error("No se pudo comprobar si hay una actualización de Mi Atilra.", error);
      });
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    document.addEventListener("visibilitychange", checkForUpdates);

    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((serviceWorkerRegistration) => {
        registration = serviceWorkerRegistration;
        checkForUpdates();
      })
      .catch((error: unknown) => {
        console.error("No se pudo registrar el Service Worker de Mi Atilra.", error);
      });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      document.removeEventListener("visibilitychange", checkForUpdates);
    };
  }, []);

  return null;
}
