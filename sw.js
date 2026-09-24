// Funziona anche senza internet: la pagina si salva nel telefono alla prima apertura.
// Cambia VER quando aggiorni l'app, cosi' il telefono prende la versione nuova.
var VER = 'viaggio-v3';
var FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VER).then(function (c) { return c.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VER; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  var mine = url.origin === location.origin;
  var font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!mine && !font) return;
  // Prima la rete (versione aggiornata); se non c'e' campo o la rete e' lenta
  // (oltre 3 secondi) mostra subito la copia salvata.
  var fromCache = function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (m) {
      return m || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined);
    });
  };
  var net = fetch(e.request).then(function (r) {
    if (r && (r.ok || r.type === 'opaque')) {
      var copy = r.clone();
      caches.open(VER).then(function (c) { c.put(e.request, copy); });
    }
    return r;
  });
  var slow = new Promise(function (ok) { setTimeout(ok, 3000); }).then(fromCache);
  e.respondWith(
    Promise.race([net.catch(fromCache), slow.then(function (m) { return m || net; })])
      .then(function (r) { return r || net.catch(fromCache); })
  );
});
