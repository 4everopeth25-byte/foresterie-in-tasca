/* Foresterie in tasca: tiene l'app in memoria per usarla senza rete. Cambiare VERSIONE a ogni pubblicazione. */
const VERSIONE = "fit-1";
const FILE = ["./", "index.html", "app.js", "logica.js", "memoria.js", "manifest.webmanifest",
  "icone/icona-192.png", "icone/icona-512.png", "icone/icona-maskable-512.png"];
self.addEventListener("install", e => e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(FILE)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(k => Promise.all(k.filter(x => x !== VERSIONE).map(x => caches.delete(x)))).then(() => self.clients.claim())));
/* prima la rete, se manca la copia: così un aggiornamento arriva subito quando c'è connessione */
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => {
    const copia = r.clone(); caches.open(VERSIONE).then(c => c.put(e.request, copia)); return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
