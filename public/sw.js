const CACHE_NAME = "mi-atilra-runtime";
const ASSET_DESTINATIONS = new Set(["font", "image", "manifest", "script", "style"]);

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith("mi-atilra-"))
        .map((name) => caches.delete(name)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() ?? "" };
  }

  event.waitUntil(self.registration.showNotification(payload.title || "Mi Atilra", {
    body: payload.body || "Tenés un aviso sobre el vencimiento de tu credencial.",
    icon: "/icons/atilra-192.png",
    badge: "/icons/atilra-192.png",
    data: { url: "/mi-credencial" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const pagina = new URL("/mi-credencial", self.location.origin).href;
    const clientes = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const cliente of clientes) {
      if (cliente.url.startsWith(self.location.origin) && "focus" in cliente) {
        await cliente.navigate(pagina);
        return cliente.focus();
      }
    }
    return self.clients.openWindow(pagina);
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(new Request(request, { cache: "no-store" })));
    return;
  }

  if (
    !ASSET_DESTINATIONS.has(request.destination) ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  event.respondWith((async () => {
    let response;
    try {
      response = await fetch(new Request(request, { cache: "no-store" }));
    } catch (error) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) return cachedResponse;
      throw error;
    }

    const cacheControl = response.headers.get("cache-control")
      ?.split(",")
      .map((directive) => directive.trim().toLowerCase()) ?? [];
    const vary = response.headers.get("vary");
    const canCache = response.ok
      && response.type === "basic"
      && !cacheControl.some((directive) => directive === "no-store" || directive.startsWith("private"))
      && vary !== "*";

    if (canCache) {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      } catch (error) {
        console.error("No se pudo actualizar la caché de activos de Mi Atilra.", error);
      }
    }

    return response;
  })());
});
