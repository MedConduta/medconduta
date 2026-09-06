/**
 * MedConduta — roteador leve baseado em hash (#/area/secao/:id).
 * Cada rota registra uma função render(container, params) que popula o <main>.
 */

const routes = [];

export function registerRoute(pattern, render, meta = {}) {
  const paramNames = [];
  const regexStr = pattern
    .split("/")
    .map((seg) => {
      if (seg.startsWith(":")) {
        paramNames.push(seg.slice(1));
        return "([^/]+)";
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  routes.push({ regex: new RegExp(`^${regexStr}$`), paramNames, render, meta, pattern });
}

function parseHash() {
  const hash = window.location.hash.replace(/^#/, "") || "/residencia/conteudo";
  const [path] = hash.split("?");
  return path.replace(/\/+$/, "") || "/residencia/conteudo";
}

let currentContainer = null;
let onNavigate = null;

export function setNavigateCallback(fn) {
  onNavigate = fn;
}

export async function handleRoute() {
  const path = parseHash();
  for (const route of routes) {
    const match = path.match(route.regex);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => (params[name] = decodeURIComponent(match[i + 1])));
      if (currentContainer) {
        currentContainer.setAttribute("aria-busy", "true");
        try {
          await route.render(currentContainer, params);
        } finally {
          currentContainer.setAttribute("aria-busy", "false");
          currentContainer.scrollTop = 0;
          window.scrollTo(0, 0);
        }
      }
      if (onNavigate) onNavigate(path, route.meta);
      return;
    }
  }
  if (currentContainer) {
    currentContainer.innerHTML = `<div class="empty-state"><h2>Página não encontrada</h2><p>O conteúdo solicitado não existe.</p></div>`;
  }
}

export function initRouter(container) {
  currentContainer = container;
  window.addEventListener("hashchange", handleRoute);
  handleRoute();
}

export function navigate(path) {
  window.location.hash = path;
}

export function currentPath() {
  return parseHash();
}
