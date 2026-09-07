import { registerRoute, initRouter, setNavigateCallback } from "./router.js";
import { renderSidebarNav, renderBottomNav, updateActiveNav } from "./components/sidebar.js";
import { initTheme } from "./theme.js";

import * as conteudo from "./views/conteudo.js";
import * as assistente from "./views/assistente.js";
import * as revisao from "./views/revisao.js";
import * as flashcards from "./views/flashcards.js";
import * as questoes from "./views/questoes.js";
import * as planejador from "./views/planejador.js";

const mainEl = document.getElementById("main-content");
const sidebarNavEl = document.getElementById("sidebar-nav");
const bottomNavEl = document.getElementById("bottom-nav");
const appShell = document.getElementById("app-shell");

function paintNav(path) {
  sidebarNavEl.innerHTML = renderSidebarNav(path);
  bottomNavEl.innerHTML = renderBottomNav(path);
}

// ---------- Rotas ----------
registerRoute("/residencia/conteudo", conteudo.renderLista, { title: "Conteúdo" });
registerRoute("/residencia/conteudo/:id", conteudo.renderDetalhe, { title: "Conteúdo" });
registerRoute("/residencia/assistente", assistente.renderAssistente, { title: "Assistente IA" });
registerRoute("/residencia/revisao", revisao.renderRevisao, { title: "Revisão espaçada" });
registerRoute("/residencia/flashcards", flashcards.renderLista, { title: "Flashcards" });
registerRoute("/residencia/flashcards/:deckId", flashcards.renderEstudo, { title: "Flashcards" });
registerRoute("/residencia/questoes", questoes.renderLista, { title: "Questões" });
registerRoute("/residencia/planejador", planejador.renderPlanejador, { title: "Planejador do dia" });

// ---------- Navegação / sidebar / mobile ----------
setNavigateCallback((path, meta) => {
  updateActiveNav(path);
  document.title = meta?.title ? `${meta.title} · MedConduta` : "MedConduta";
  closeMobileNav();
});

function closeMobileNav() {
  appShell.classList.remove("nav-open");
}

document.getElementById("topbar-menu-btn").addEventListener("click", () => {
  appShell.classList.toggle("nav-open");
});
document.getElementById("sidebar-overlay").addEventListener("click", closeMobileNav);

document.getElementById("sidebar-collapse").addEventListener("click", () => {
  appShell.classList.toggle("is-collapsed");
});

// Delegação de clique para fechar o drawer mobile ao navegar por um link do menu
sidebarNavEl.addEventListener("click", (e) => {
  if (e.target.closest("a")) closeMobileNav();
});
bottomNavEl.addEventListener("click", () => closeMobileNav());

// ---------- Boot ----------
paintNav("/residencia/conteudo");
initRouter(mainEl);
initTheme([document.getElementById("theme-toggle"), document.getElementById("topbar-theme-btn")]);

// ---------- PWA ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* offline-first é best-effort; app continua funcional sem SW */
    });
  });
}
