import { registerRoute, initRouter, setNavigateCallback } from "./router.js";
import { renderSidebarNav, renderBottomNav, updateActiveNav } from "./components/sidebar.js";
import { initTheme } from "./theme.js";
import { isAuthenticated, sair } from "./auth.js";
import { renderLogin } from "./views/login.js";
import { icon } from "./components/icons.js";

import * as conteudo from "./views/conteudo.js";
import * as assistente from "./views/assistente.js";
import * as revisao from "./views/revisao.js";
import * as flashcards from "./views/flashcards.js";
import * as questoes from "./views/questoes.js";
import * as planejador from "./views/planejador.js";
import * as cronograma from "./views/cronograma.js";
import * as erros from "./views/erros.js";
import * as prontidao from "./views/prontidao.js";
import * as foco from "./views/foco.js";
import * as simulados from "./views/simulados.js";
import * as minhaPreparacao from "./views/minhaPreparacao.js";
import * as analiseDesempenho from "./views/analiseDesempenho.js";
import * as relatorioSemanal from "./views/relatorioSemanal.js";
import * as planejamentoSemanal from "./views/planejamentoSemanal.js";
import * as prescricaoPratica from "./views/prescricaoPratica.js";

const mainEl = document.getElementById("main-content");
const sidebarNavEl = document.getElementById("sidebar-nav");
const bottomNavEl = document.getElementById("bottom-nav");
const appShell = document.getElementById("app-shell");

function paintNav(path) {
  sidebarNavEl.innerHTML = renderSidebarNav(path);
  bottomNavEl.innerHTML = renderBottomNav(path);
}

// ---------- Rotas ----------
registerRoute("/residencia/minha-preparacao", minhaPreparacao.renderMinhaPreparacao, { title: "Minha Preparação" });
registerRoute("/residencia/conteudo", conteudo.renderLista, { title: "Conteúdo" });
registerRoute("/residencia/conteudo/:id", conteudo.renderDetalhe, { title: "Conteúdo" });
registerRoute("/residencia/assistente", assistente.renderAssistente, { title: "Assistente IA" });
registerRoute("/residencia/revisao", revisao.renderRevisao, { title: "Revisão espaçada" });
registerRoute("/residencia/flashcards", flashcards.renderLista, { title: "Flashcards" });
registerRoute("/residencia/flashcards/:deckId", flashcards.renderEstudo, { title: "Flashcards" });
registerRoute("/residencia/questoes", questoes.renderLista, { title: "Questões" });
registerRoute("/residencia/erros", erros.renderErros, { title: "Meus Erros" });
registerRoute("/residencia/planejador", planejador.renderPlanejador, { title: "Hoje" });
registerRoute("/residencia/cronograma", cronograma.renderCronograma, { title: "Cronograma" });
registerRoute("/residencia/prontidao", prontidao.renderProntidao, { title: "Prontidão" });
registerRoute("/residencia/desempenho", analiseDesempenho.renderAnaliseDesempenho, { title: "Desempenho" });
registerRoute("/residencia/relatorio-semanal", relatorioSemanal.renderRelatorioSemanal, { title: "Relatório Semanal" });
registerRoute("/residencia/planejamento-semanal", planejamentoSemanal.renderPlanejamentoSemanal, { title: "Planejamento Semanal" });
registerRoute("/residencia/foco", foco.renderFoco, { title: "Modo Foco" });
registerRoute("/residencia/simulados", simulados.renderSimulados, { title: "Simulados" });

registerRoute("/pratica/prescricao", prescricaoPratica.renderLista, { title: "Guia de Prescrição" });
registerRoute("/pratica/prescricao/az", prescricaoPratica.renderIndiceMedicamentos, { title: "Medicamentos A-Z" });
registerRoute("/pratica/prescricao/:id", prescricaoPratica.renderDetalhe, { title: "Guia de Prescrição" });

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

const logoutBtn = document.getElementById("logout-btn");
logoutBtn.innerHTML = `${icon("log-out")}<span class="nav-link__label">Sair</span>`;
logoutBtn.addEventListener("click", async () => {
  await sair();
  boot();
});

// ---------- Boot ----------
function iniciarApp() {
  paintNav("/residencia/minha-preparacao");
  initRouter(mainEl);
  initTheme([document.getElementById("theme-toggle"), document.getElementById("topbar-theme-btn")]);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
        /* offline-first é best-effort; app continua funcional sem SW */
      });
    });
  }
}

function boot() {
  if (isAuthenticated()) {
    appShell.classList.remove("is-logged-out");
    iniciarApp();
  } else {
    appShell.classList.add("is-logged-out");
    renderLogin(mainEl, { onAutenticado: () => window.location.reload() });
  }
}

boot();
