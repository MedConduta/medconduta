import { icon } from "./icons.js";

/**
 * Navegação principal: 7 destinos. As telas secundárias (Cronograma,
 * Prontidão, Meus Erros etc.) continuam existindo, mas são alcançadas pelas
 * abas de cada destino (ver ABAS) — `match` diz quais rotas acendem cada item.
 */
export const NAV_ITEMS = [
  {
    path: "/residencia/minha-preparacao",
    label: "Início",
    icon: "home",
    match: ["/residencia/minha-preparacao", "/residencia/planejador"],
  },
  {
    path: "/residencia/curso",
    label: "Curso",
    icon: "panel",
    match: ["/residencia/curso", "/residencia/cronograma", "/residencia/planejamento-semanal"],
  },
  { path: "/residencia/conteudo", label: "Conteúdo", icon: "book", match: ["/residencia/conteudo"] },
  { path: "/residencia/questoes", label: "Questões", icon: "checklist", match: ["/residencia/questoes"] },
  {
    path: "/residencia/revisar",
    label: "Revisar",
    icon: "layers",
    contador: "revisar",
    match: ["/residencia/revisar", "/residencia/erros", "/residencia/flashcards", "/residencia/revisao-alto-rendimento"],
  },
  { path: "/residencia/simulados", label: "Simulados", icon: "clock", match: ["/residencia/simulados"] },
  {
    path: "/residencia/desempenho",
    label: "Desempenho",
    icon: "chart-bar",
    match: ["/residencia/desempenho", "/residencia/prontidao", "/residencia/relatorio-semanal"],
  },
];

const ITEM_ADMIN = { path: "/residencia/admin", label: "Usuários e convites", icon: "lock", match: ["/residencia/admin"] };

/** Abas exibidas no topo das telas de cada destino que agrupa mais de uma tela. */
export const ABAS = {
  inicio: [
    { path: "/residencia/minha-preparacao", label: "Visão geral" },
    { path: "/residencia/planejador", label: "Agenda do dia" },
  ],
  curso: [
    { path: "/residencia/curso", label: "Trilha" },
    { path: "/residencia/cronograma", label: "Cronograma" },
    { path: "/residencia/planejamento-semanal", label: "Planejamento semanal" },
  ],
  revisar: [
    { path: "/residencia/revisar", label: "Para hoje" },
    { path: "/residencia/erros", label: "Meus erros" },
    { path: "/residencia/flashcards", label: "Flashcards" },
    { path: "/residencia/revisao-alto-rendimento", label: "Alto rendimento" },
  ],
  desempenho: [
    { path: "/residencia/desempenho", label: "Desempenho" },
    { path: "/residencia/prontidao", label: "Prontidão" },
    { path: "/residencia/relatorio-semanal", label: "Relatório semanal" },
  ],
};

export const BOTTOM_NAV_ITEMS = [
  { path: "/residencia/minha-preparacao", label: "Início", icon: "home", match: NAV_ITEMS[0].match },
  {
    path: "/residencia/curso",
    label: "Estudar",
    icon: "book",
    match: [...NAV_ITEMS[1].match, "/residencia/conteudo"],
  },
  { path: "/residencia/questoes", label: "Questões", icon: "checklist", match: ["/residencia/questoes", "/residencia/simulados"] },
  { path: "/residencia/revisar", label: "Revisar", icon: "layers", contador: "revisar", match: NAV_ITEMS[4].match },
];

let adminHabilitado = false;
const contadores = {};

/** Só é chamada depois que o Worker confirma (via /auth/me) que a conta é admin. */
export function habilitarSecaoAdmin() {
  adminHabilitado = true;
}

export function definirContador(chave, valor) {
  contadores[chave] = valor;
  document.querySelectorAll(`[data-contador="${chave}"]`).forEach((el) => {
    el.textContent = valor > 99 ? "99+" : String(valor);
    el.hidden = !valor;
  });
}

function itemAtivo(itens, currentPath) {
  let melhor = null;
  let tamanho = -1;
  for (const item of itens) {
    for (const prefixo of item.match) {
      if ((currentPath === prefixo || currentPath.startsWith(prefixo + "/")) && prefixo.length > tamanho) {
        melhor = item;
        tamanho = prefixo.length;
      }
    }
  }
  return melhor;
}

function badgeContador(item) {
  if (!item.contador) return "";
  const valor = contadores[item.contador] || 0;
  return `<span class="nav-contador" data-contador="${item.contador}" ${valor ? "" : "hidden"}>${valor > 99 ? "99+" : valor}</span>`;
}

function linkSidebar(item, ativo, cor) {
  return `
    <li>
      <a class="nav-link${ativo ? " is-active" : ""}" href="#${item.path}" data-cor="${cor}" data-match="${item.match.join(" ")}" ${
        ativo ? 'aria-current="page"' : ""
      }>
        <span class="nav-link__icon">${icon(item.icon)}</span>
        <span class="nav-link__label">${item.label}</span>
        ${badgeContador(item)}
      </a>
    </li>`;
}

export function renderSidebarNav(currentPath) {
  const todos = adminHabilitado ? [...NAV_ITEMS, ITEM_ADMIN] : NAV_ITEMS;
  const ativo = itemAtivo(todos, currentPath);
  return `
    <div class="nav-section">
      <ul class="nav-list">
        ${NAV_ITEMS.map((item, i) => linkSidebar(item, item === ativo, (i % 5) + 1)).join("")}
      </ul>
    </div>
    ${
      adminHabilitado
        ? `<div class="nav-section">
      <div class="nav-section__title">Administração</div>
      <ul class="nav-list">${linkSidebar(ITEM_ADMIN, ITEM_ADMIN === ativo, 1)}</ul>
    </div>`
        : ""
    }`;
}

export function renderBottomNav(currentPath) {
  const ativo = itemAtivo(BOTTOM_NAV_ITEMS, currentPath);
  return `
    ${BOTTOM_NAV_ITEMS.map(
      (item) => `
      <a class="bottom-nav__link${item === ativo ? " is-active" : ""}" href="#${item.path}" data-match="${item.match.join(" ")}" ${
        item === ativo ? 'aria-current="page"' : ""
      }>
        <span class="bottom-nav__icon">${icon(item.icon, { size: 22 })}${badgeContador(item)}</span>
        <span>${item.label}</span>
      </a>`
    ).join("")}
    <button type="button" class="bottom-nav__link" id="bottom-nav-mais" aria-label="Mais opções">
      <span class="bottom-nav__icon">${icon("menu", { size: 22 })}</span>
      <span>Mais</span>
    </button>`;
}

// Cada superfície (sidebar, bottom-nav) resolve seu próprio item ativo de
// forma independente, a partir dos prefixos em data-match de cada link.
function updateGroup(selector, currentPath) {
  const links = [...document.querySelectorAll(selector)].filter((el) => el.dataset.match);
  let melhor = null;
  let tamanho = -1;
  for (const el of links) {
    for (const prefixo of el.dataset.match.split(" ")) {
      if ((currentPath === prefixo || currentPath.startsWith(prefixo + "/")) && prefixo.length > tamanho) {
        melhor = el;
        tamanho = prefixo.length;
      }
    }
  }
  links.forEach((el) => {
    const ativo = el === melhor;
    el.classList.toggle("is-active", ativo);
    if (ativo) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
}

export function updateActiveNav(currentPath) {
  updateGroup(".nav-link", currentPath);
  updateGroup(".bottom-nav__link", currentPath);
}

/** Envolve o render de uma tela com a barra de abas do grupo a que ela pertence. */
export function comAbas(grupo, render) {
  return (container, params, query) => {
    const atual = window.location.hash.replace(/^#/, "").split("?")[0];
    container.innerHTML = `
      <div class="main__container page-tabs-wrap${grupo === "inicio" ? " main__container--largo" : ""}">
        <nav class="page-tabs" aria-label="Seções">
          ${ABAS[grupo]
            .map(
              (aba) =>
                `<a class="page-tab${aba.path === atual ? " is-active" : ""}" href="#${aba.path}" ${aba.path === atual ? 'aria-current="page"' : ""}>${aba.label}</a>`
            )
            .join("")}
        </nav>
      </div>
      <div class="page-tabs-view"></div>`;
    return render(container.querySelector(".page-tabs-view"), params, query);
  };
}
