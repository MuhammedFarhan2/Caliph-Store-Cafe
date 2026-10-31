const CACHE = "caliph-v5";
const APP_SHELL = ["./", "index.html", "manifest.json"];
const OFFLINE_LIBS = [
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js",
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(APP_SHELL);
    // Cache third-party libs as opaque responses so the app boots offline.
    await Promise.all(OFFLINE_LIBS.map(async (url) => {
      try {
        const res = await fetch(url, { mode: "no-cors" });
        await cache.put(url, res);
      } catch (_) { }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // App page: network-first so updates show up; fall back to cache offline.
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put("index.html", fresh.clone());
        return fresh;
      } catch (err) {
        return (await caches.match("index.html")) || (await caches.match("./")) || Response.error();
      }
    })());
    return;
  }

  // Other assets: cache-first, network fallback.
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    return fetch(req);
  })());
});
