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
  const hash = window.location.hash.replace(/^#/, "") || "/residencia/minha-preparacao";
  const [path] = hash.split("?");
  return path.replace(/\/+$/, "") || "/residencia/minha-preparacao";
}

/** Query string do hash atual (ex.: "#/residencia/questoes?tema=X" -> {tema: "X"}). */
function parseQuery() {
  const hash = window.location.hash.replace(/^#/, "");
  const idx = hash.indexOf("?");
  if (idx === -1) return {};
  return Object.fromEntries(new URLSearchParams(hash.slice(idx + 1)));
}

let currentContainer = null;
let onNavigate = null;
let navegacaoAtual = 0;

let onRendered = null;

export function setNavigateCallback(fn) {
  onNavigate = fn;
}

/** Chamado só quando o render termina e o usuário ainda está na mesma tela. */
export function setRenderedCallback(fn) {
  onRendered = fn;
}

export async function handleRoute() {
  const path = parseHash();
  const estaNavegacao = ++navegacaoAtual;
  for (const route of routes) {
    const match = path.match(route.regex);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => (params[name] = decodeURIComponent(match[i + 1])));
      const query = parseQuery();
      if (currentContainer) {
        // Cada navegação ganha um elemento próprio: se a tela anterior ainda
        // estiver carregando quando o usuário troca de tela, o render atrasado
        // dela escreve num elemento que já saiu da página, e não por cima da nova.
        const alvo = document.createElement("div");
        alvo.className = "route-view";
        currentContainer.replaceChildren(alvo);
        window.scrollTo(0, 0);
        if (onNavigate) onNavigate(path, route.meta);
        currentContainer.setAttribute("aria-busy", "true");
        try {
          await route.render(alvo, params, query);
        } finally {
          if (estaNavegacao === navegacaoAtual) currentContainer.setAttribute("aria-busy", "false");
        }
        if (estaNavegacao === navegacaoAtual && onRendered) onRendered(path, route.meta, alvo);
      }
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
