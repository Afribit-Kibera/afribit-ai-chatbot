// Production build injects a versioned list including hashed JS/CSS/font assets.
const CACHE_NAME = "afribit-shell-dev";
const SHELL_ASSETS = [
  "/app",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)),
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) => key.startsWith("afribit-shell-") && key !== CACHE_NAME,
              )
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api"))
    return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(url.pathname, copy)),
            );
          }
          return response;
        })
        .catch(
          async () =>
            (await caches.match(url.pathname)) ??
            (url.pathname.startsWith("/app")
              ? await caches.match("/app")
              : await caches.match("/")) ??
            Response.error(),
        ),
    );
    return;
  }
  // Cache only our shell resources; API and third-party responses are never cached.
  if (!SHELL_ASSETS.includes(url.pathname)) return;
  // These immutable, same-origin build files have identical content for every
  // request. Ignore server CORS Vary headers so pre-cached files also match
  // the browser's module-script requests during an offline reload.
  event.respondWith(
    caches
      .match(event.request, { ignoreVary: true })
      .then((cached) => cached ?? fetch(event.request)),
  );
});
self.addEventListener("push", (event) => {
  let payload = {
    title: "Afribit AI",
    body: "Afribit has an update for you.",
    url: "/app",
  };
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url ?? "/app" },
      tag: payload.tag ?? "afribit-ai",
      renotify: false,
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    event.notification.data?.url ?? "/app",
    self.location.origin,
  );
  const targetUrl =
    url.origin === self.location.origin
      ? url.href
      : `${self.location.origin}/app`;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients)
          if ("focus" in client && client.url === targetUrl)
            return client.focus();
        return self.clients.openWindow(targetUrl);
      }),
  );
});
