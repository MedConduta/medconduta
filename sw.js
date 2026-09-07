/**
 * MedConduta — Service Worker
 * Cache-first para o app shell inteiro (o guia de bolso precisa funcionar
 * offline, à beira do leito). Requisições do mesmo domínio não pré-cacheadas
 * são armazenadas em runtime na primeira visita.
 */

const CACHE_VERSION = "medconduta-v36";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",

  "./styles/tokens.css",
  "./styles/base.css",
  "./styles/layout.css",
  "./styles/components.css",

  "./app/main.js",
  "./app/router.js",
  "./app/db.js",
  "./app/sm2.js",
  "./app/planner.js",
  "./app/theme.js",
  "./app/utils.js",
  "./app/ai.js",
  "./app/rag.js",
  "./app/areas.js",
  "./app/iaConteudo.js",

  "./app/components/sidebar.js",
  "./app/components/flowchart.js",
  "./app/components/icons.js",

  "./app/views/conteudo.js",
  "./app/views/assistente.js",
  "./app/views/revisao.js",
  "./app/views/flashcards.js",
  "./app/views/questoes.js",
  "./app/views/planejador.js",
  "./app/views/guiaClinico.js",
  "./app/views/guiaAB.js",
  "./app/views/guiaUrgencia.js",
  "./app/views/prescricoes.js",

  "./data/temas.json",
  "./data/flashcards.json",
  "./data/fluxogramas.json",
  "./data/questoes.json",
  "./data/guia_ab.json",
  "./data/guia_urgencia.json",
  "./data/prescricoes.json",

  "./icons/icon.svg",
  "./icons/icon-maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) =>
        // Busca cada arquivo ignorando o cache HTTP do navegador (`cache: "reload"`).
        // cache.addAll() usa fetch() padrão, que pode servir uma versão antiga do
        // disco do navegador mesmo com CACHE_VERSION novo — resultando num Worker
        // "atualizado" que na prática guarda código desatualizado.
        Promise.all(
          PRECACHE_URLS.map((url) =>
            fetch(url, { cache: "reload" }).then((res) => {
              if (!res.ok) throw new Error(`Falha ao pré-cachear ${url}: ${res.status}`);
              return cache.put(url, res);
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          if (request.mode === "navigate") return caches.match("./index.html");
          return new Response("", { status: 504, statusText: "Offline" });
        });
    })
  );
});
