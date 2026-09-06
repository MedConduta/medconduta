import { icon } from "./icons.js";

export const NAV_ITEMS = [
  {
    section: "Residência (estudo)",
    items: [
      { path: "/residencia/conteudo", label: "Conteúdo", icon: "book" },
      { path: "/residencia/revisao", label: "Revisão espaçada", icon: "brain" },
      { path: "/residencia/flashcards", label: "Flashcards", icon: "layers" },
      { path: "/residencia/fluxogramas", label: "Fluxogramas", icon: "flowchart" },
      { path: "/residencia/questoes", label: "Questões", icon: "checklist" },
      { path: "/residencia/planejador", label: "Planejador do dia", icon: "calendar" },
    ],
  },
  {
    section: "Guia de bolso (prática)",
    items: [
      { path: "/bolso/atencao-basica", label: "Atenção Básica", icon: "stethoscope" },
      { path: "/bolso/urgencia", label: "Urgência e Emergência", icon: "siren" },
      { path: "/bolso/prescricoes", label: "Condutas rápidas", icon: "clipboard" },
    ],
  },
];

export const BOTTOM_NAV_ITEMS = [
  { path: "/residencia/conteudo", label: "Conteúdo", icon: "book" },
  { path: "/residencia/revisao", label: "Revisão", icon: "brain" },
  { path: "/residencia/planejador", label: "Plano", icon: "calendar" },
  { path: "/bolso/urgencia", label: "Urgência", icon: "siren" },
  { path: "/bolso/prescricoes", label: "Condutas", icon: "clipboard" },
];

function isActive(path, currentPath) {
  return currentPath === path || currentPath.startsWith(path + "/");
}

export function renderSidebarNav(currentPath) {
  return NAV_ITEMS.map(
    (group) => `
      <div class="nav-section">
        <div class="nav-section__title">${group.section}</div>
        <ul class="nav-list">
          ${group.items
            .map(
              (item) => `
            <li>
              <a class="nav-link${isActive(item.path, currentPath) ? " is-active" : ""}" href="#${item.path}" ${
                isActive(item.path, currentPath) ? 'aria-current="page"' : ""
              }>
                <span class="nav-link__icon">${icon(item.icon)}</span>
                <span class="nav-link__label">${item.label}</span>
              </a>
            </li>`
            )
            .join("")}
        </ul>
      </div>`
  ).join("");
}

export function renderBottomNav(currentPath) {
  return BOTTOM_NAV_ITEMS.map(
    (item) => `
      <a class="bottom-nav__link${isActive(item.path, currentPath) ? " is-active" : ""}" href="#${item.path}" ${
        isActive(item.path, currentPath) ? 'aria-current="page"' : ""
      }>
        ${icon(item.icon, { size: 22 })}
        <span>${item.label}</span>
      </a>`
  ).join("");
}

export function updateActiveNav(currentPath) {
  document.querySelectorAll(".nav-link, .bottom-nav__link").forEach((el) => {
    const href = el.getAttribute("href")?.replace(/^#/, "");
    const active = href && isActive(href, currentPath);
    el.classList.toggle("is-active", !!active);
    if (active) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
}
