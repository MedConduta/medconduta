import { icon } from "./icons.js";
import { getEmail } from "../auth.js";

/** Liga os elementos estáticos da barra superior (index.html): perfil, Modo Foco e ícones. */
export function initTopbar({ onSair }) {
  document.getElementById("topbar-busca-icone").innerHTML = icon("search", { size: 18 });
  document.getElementById("topbar-foco").innerHTML = `${icon("clock", { size: 16 })}<span class="topbar-foco__label">Modo Foco</span>`;

  const email = getEmail() || "";
  const avatar = document.getElementById("perfil-btn");
  const menu = document.getElementById("perfil-menu");
  avatar.textContent = (email[0] || "M").toUpperCase();
  document.getElementById("perfil-email").textContent = email;

  const admin = document.getElementById("perfil-admin");
  admin.innerHTML = `${icon("lock")}<span class="nav-link__label">Usuários e convites</span>`;

  const logout = document.getElementById("logout-btn");
  logout.innerHTML = `${icon("log-out")}<span class="nav-link__label">Sair</span>`;
  logout.addEventListener("click", onSair);

  function fechar() {
    menu.hidden = true;
    avatar.setAttribute("aria-expanded", "false");
  }
  avatar.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    avatar.setAttribute("aria-expanded", String(!menu.hidden));
  });
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a, #logout-btn")) fechar();
  });
  document.addEventListener("click", (e) => {
    if (!menu.hidden && !e.target.closest(".perfil")) fechar();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fechar();
  });
}

export function mostrarAdminNoPerfil() {
  document.getElementById("perfil-admin").hidden = false;
}

export function atualizarStreakTopbar(dias) {
  const el = document.getElementById("topbar-streak");
  if (!el) return;
  el.hidden = false;
  el.classList.toggle("is-inativo", !dias);
  el.textContent = `🔥 ${dias}`;
  el.title = dias ? `${dias} dia${dias === 1 ? "" : "s"} seguido${dias === 1 ? "" : "s"} estudando` : "Estude hoje para começar uma sequência";
}
