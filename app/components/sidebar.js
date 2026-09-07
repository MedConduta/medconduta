import { icon } from "./icons.js";

export const NAV_ITEMS = [
  {
    section: "Residência (estudo)",
    items: [
      { path: "/residencia/conteudo", label: "Conteúdo", icon: "book" },
      { path: "/residencia/assistente", label: "Assistente IA", icon: "sparkles" },
      { path: "/residencia/revisao", label: "Revisão espaçada", icon: "brain" },
      { path: "/residencia/flashcards", label: "Flashcards", icon: "layers" },
      { path: "/residencia/questoes", label: "Questões", icon: "checklist" },
      { path: "/residencia/planejador", label: "Planejador do dia", icon: "calendar" },
    ],
  },
  {
    section: "Guia de Prescrição (prática)",
    items: [
      { path: "/pratica/prescricao", label: "Por doença", icon: "pill" },
      { path: "/pratica/prescricao/az", label: "Medicamentos A-Z", icon: "search" },
    ],
  },
];

export const BOTTOM_NAV_ITEMS = [
  { path: "/residencia/conteudo", label: "Conteúdo", icon: "book" },
  { path: "/residencia/revisao", label: "Revisão", icon: "brain" },
  { path: "/residencia/planejador", label: "Plano", icon: "calendar" },
  { path: "/pratica/prescricao", label: "Prescrição", icon: "pill" },
];

// Entre itens cujo caminho é prefixo de outro (ex.: "/pratica/prescricao" e
// "/pratica/prescricao/az"), só o prefixo mais específico (mais longo) que
// combina com a rota atual fica marcado como ativo.
function bestMatch(paths, currentPath) {
  let best = null;
  for (const path of paths) {
    if (currentPath === path || currentPath.startsWith(path + "/")) {
      if (!best || path.length > best.length) best = path;
    }
  }
  return best;
}

export function renderSidebarNav(currentPath) {
  const best = bestMatch(
    NAV_ITEMS.flatMap((group) => group.items.map((item) => item.path)),
    currentPath
  );
  return NAV_ITEMS.map(
    (group) => `
      <div class="nav-section">
        <div class="nav-section__title">${group.section}</div>
        <ul class="nav-list">
          ${group.items
            .map(
              (item) => `
            <li>
              <a class="nav-link${item.path === best ? " is-active" : ""}" href="#${item.path}" ${
                item.path === best ? 'aria-current="page"' : ""
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
  const best = bestMatch(
    BOTTOM_NAV_ITEMS.map((item) => item.path),
    currentPath
  );
  return BOTTOM_NAV_ITEMS.map(
    (item) => `
      <a class="bottom-nav__link${item.path === best ? " is-active" : ""}" href="#${item.path}" ${
        item.path === best ? 'aria-current="page"' : ""
      }>
        ${icon(item.icon, { size: 22 })}
        <span>${item.label}</span>
      </a>`
  ).join("");
}

// Cada superfície de navegação (sidebar, bottom-nav) resolve seu próprio
// "melhor" item ativo de forma independente — a sidebar pode ter um item
// mais específico (ex.: "Medicamentos A-Z") que não existe na bottom-nav.
function updateGroup(selector, currentPath) {
  const links = document.querySelectorAll(selector);
  const paths = Array.from(links)
    .map((el) => el.getAttribute("href")?.replace(/^#/, ""))
    .filter(Boolean);
  const best = bestMatch(paths, currentPath);
  links.forEach((el) => {
    const href = el.getAttribute("href")?.replace(/^#/, "");
    const active = href === best;
    el.classList.toggle("is-active", active);
    if (active) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
}

export function updateActiveNav(currentPath) {
  updateGroup(".nav-link", currentPath);
  updateGroup(".bottom-nav__link", currentPath);
}
