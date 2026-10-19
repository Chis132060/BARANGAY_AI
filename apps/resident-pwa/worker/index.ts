/// <reference lib="webworker" />
export default null;
declare let self: ServiceWorkerGlobalScope;

self.addEventListener("activate", (event) => {
  // skipWaiting/clientsClaim can move an already-open PWA to a new worker
  // while its HTML and React chunks still belong to the previous build. Reload
  // those windows so the modal and the rest of the app hydrate from one build.
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) =>
      Promise.all(
        clients
          .filter((client) => new URL(client.url).origin === self.location.origin)
          .map((client) => client.navigate(client.url).catch(() => null))
      )
    )
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const title = data.title || "Barangay AI";
  const options = {
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    data: data.url || "/",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.notification.data && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(event.notification.data);
      }
    })
  );
});
