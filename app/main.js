import { registerRoute, initRouter, setNavigateCallback, setRenderedCallback } from "./router.js";
import {
  renderSidebarNav,
  renderBottomNav,
  updateActiveNav,
  habilitarSecaoAdmin,
  definirContador,
  comAbas,
} from "./components/sidebar.js";
import { initTopbar, mostrarAdminNoPerfil, atualizarStreakTopbar } from "./components/topbar.js";
import { initBusca } from "./components/busca.js";
import { initTheme } from "./theme.js";
import { isAuthenticated, sair, buscarPerfil } from "./auth.js";
import { renderLogin } from "./views/login.js";
import { registrarAtividade } from "./ultimaAtividade.js";
import { getRevisarHoje } from "./revisarHoje.js";
import { getConstancia } from "./constancia.js";

import * as inicio from "./views/inicio.js";
import * as conteudo from "./views/conteudo.js";
import * as assistente from "./views/assistente.js";
import * as questoes from "./views/questoes.js";
import * as planejador from "./views/planejador.js";
import * as cronograma from "./views/cronograma.js";
import * as erros from "./views/erros.js";
import * as prontidao from "./views/prontidao.js";
import * as foco from "./views/foco.js";
import * as simulados from "./views/simulados.js";
import * as analiseDesempenho from "./views/analiseDesempenho.js";
import * as relatorioSemanal from "./views/relatorioSemanal.js";
import * as planejamentoSemanal from "./views/planejamentoSemanal.js";
import * as revisaoAltoRendimento from "./views/revisaoAltoRendimento.js";
import * as curso from "./views/curso.js";
import * as flashcards from "./views/flashcards.js";
import * as revisar from "./views/revisar.js";
import * as admin from "./views/admin.js";
import { rodarBackupDiarioSeNecessario } from "./backup.js";

const mainEl = document.getElementById("main-content");
const sidebarNavEl = document.getElementById("sidebar-nav");
const bottomNavEl = document.getElementById("bottom-nav");
const appShell = document.getElementById("app-shell");

function caminhoAtual() {
  return window.location.hash.replace(/^#/, "").split("?")[0] || "/residencia/minha-preparacao";
}

function paintNav(path) {
  sidebarNavEl.innerHTML = renderSidebarNav(path);
  bottomNavEl.innerHTML = renderBottomNav(path);
}

// ---------- Rotas ----------
// Os caminhos antigos são mantidos (links internos, favoritos e o manifest
// apontam para eles); o que mudou é como são agrupados no menu e nas abas.
registerRoute("/residencia/minha-preparacao", comAbas("inicio", inicio.renderInicio), { title: "Início" });
registerRoute("/residencia/planejador", comAbas("inicio", planejador.renderPlanejador), { title: "Agenda do dia" });

registerRoute("/residencia/curso", comAbas("curso", curso.renderCurso), { title: "Curso" });
registerRoute("/residencia/cronograma", comAbas("curso", cronograma.renderCronograma), { title: "Cronograma" });
registerRoute("/residencia/planejamento-semanal", comAbas("curso", planejamentoSemanal.renderPlanejamentoSemanal), {
  title: "Planejamento Semanal",
});

registerRoute("/residencia/conteudo", conteudo.renderLista, { title: "Conteúdo" });
registerRoute("/residencia/conteudo/:id", conteudo.renderDetalhe, { title: "Conteúdo" });
registerRoute("/residencia/questoes", questoes.renderLista, { title: "Questões" });

registerRoute("/residencia/revisar", comAbas("revisar", revisar.renderRevisar), { title: "Revisar" });
registerRoute("/residencia/erros", comAbas("revisar", erros.renderErros), { title: "Meus Erros" });
registerRoute("/residencia/flashcards", comAbas("revisar", flashcards.renderFlashcards), { title: "Flashcards" });
registerRoute("/residencia/revisao-alto-rendimento", comAbas("revisar", revisaoAltoRendimento.renderRevisaoAltoRendimento), {
  title: "Revisão de Alto Rendimento",
});

registerRoute("/residencia/simulados", simulados.renderSimulados, { title: "Simulados" });

registerRoute("/residencia/desempenho", comAbas("desempenho", analiseDesempenho.renderAnaliseDesempenho), { title: "Desempenho" });
registerRoute("/residencia/prontidao", comAbas("desempenho", prontidao.renderProntidao), { title: "Prontidão" });
registerRoute("/residencia/relatorio-semanal", comAbas("desempenho", relatorioSemanal.renderRelatorioSemanal), {
  title: "Relatório Semanal",
});

registerRoute("/residencia/foco", foco.renderFoco, { title: "Modo Foco" });
registerRoute("/residencia/assistente", assistente.renderAssistente, { title: "Assistente IA" });
registerRoute("/residencia/admin", admin.renderAdmin, { title: "Administração" });

// ---------- Navegação / sidebar / mobile ----------
setNavigateCallback((path, meta) => {
  updateActiveNav(path);
  document.title = meta?.title ? `${meta.title} · MedConduta` : "MedConduta";
  closeMobileNav();
});

setRenderedCallback((path, meta, alvo) => {
  const h1 = alvo.querySelector("h1");
  const tituloH1 = h1 ? [...h1.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("").trim() : "";
  const titulo = path.startsWith("/residencia/conteudo/") ? tituloH1 : meta?.title;
  registrarAtividade(path, window.location.hash, titulo).catch(() => {
    /* best-effort */
  });
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
bottomNavEl.addEventListener("click", (e) => {
  if (e.target.closest("#bottom-nav-mais")) {
    appShell.classList.toggle("nav-open");
    return;
  }
  closeMobileNav();
});

async function atualizarContadorRevisar() {
  try {
    const { total } = await getRevisarHoje();
    definirContador("revisar", total);
  } catch {
    /* best-effort — o contador só fica oculto */
  }
}

// ---------- Boot ----------
let appIniciado = false;

function iniciarApp() {
  paintNav(caminhoAtual());
  if (!appIniciado) {
    appIniciado = true;
    initTopbar({
      onSair: async () => {
        await sair();
        window.location.reload();
      },
    });
    initBusca(document.getElementById("topbar-busca"));
    initTheme([document.getElementById("theme-toggle")]);
  }
  initRouter(mainEl);

  buscarPerfil().then((perfil) => {
    if (!perfil?.admin) return;
    habilitarSecaoAdmin();
    mostrarAdminNoPerfil();
    paintNav(caminhoAtual());
  });

  getConstancia()
    .then((c) => atualizarStreakTopbar(c.streakAtual))
    .catch(() => {});

  // Atrasados de propósito: tanto o contador de revisões quanto o backup
  // disparam várias chamadas de rede — rodar no exato instante do boot
  // competiria com o carregamento da tela que o usuário abriu.
  setTimeout(atualizarContadorRevisar, 2500);
  setTimeout(() => {
    rodarBackupDiarioSeNecessario().catch(() => {
      /* best-effort — falha de rede aqui não deve afetar o restante do app */
    });
  }, 5000);

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
