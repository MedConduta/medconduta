import { icon } from "./icons.js";
import { getEmail } from "../auth.js";
import { getSessaoAtiva, onSessaoFoco, encerrarSessaoAoSair, formatarMMSS } from "../foco.js";
import { getConstancia } from "../constancia.js";

/** Liga os elementos estáticos da barra superior (index.html): perfil, Modo Foco e ícones. */
export function initTopbar({ onSair }) {
  document.getElementById("topbar-busca-icone").innerHTML = icon("search", { size: 18 });
  initFocoTopbar();

  const email = getEmail() || "";
  const avatar = document.getElementById("perfil-btn");
  const menu = document.getElementById("perfil-menu");
  atualizarAvatar("");
  document.getElementById("perfil-email").textContent = email;

  document.getElementById("perfil-conta").innerHTML = `${icon("user")}<span class="nav-link__label">Meus dados</span>`;

  const admin = document.getElementById("perfil-admin");
  admin.innerHTML = `${icon("lock")}<span class="nav-link__label">Usuários e convites</span>`;

  const logout = document.getElementById("logout-btn");
  logout.innerHTML = `${icon("log-out")}<span class="nav-link__label">Sair</span>`;
  logout.addEventListener("click", async () => {
    await encerrarSessaoAoSair();
    onSair();
  });

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

/** Inicial do avatar: do nome escolhido em "Meus dados", senão do e-mail. */
export function atualizarAvatar(nome) {
  const base = (nome || "").trim() || getEmail() || "M";
  document.getElementById("perfil-btn").textContent = base[0].toUpperCase();
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

/**
 * Botão do Modo Foco: com uma sessão em andamento, mostra o tempo restante ao
 * lado do relógio, em qualquer tela. Ao terminar, avisa por alguns segundos.
 */
function initFocoTopbar() {
  const btn = document.getElementById("topbar-foco");
  btn.innerHTML = `${icon("clock", { size: 16 })}<span class="topbar-foco__label">Modo Foco</span><span class="topbar-foco__tempo" hidden></span>`;
  const label = btn.querySelector(".topbar-foco__label");
  const tempo = btn.querySelector(".topbar-foco__tempo");
  let avisoTimeout = null;

  function pintar(atual) {
    const ativo = Boolean(atual);
    btn.classList.toggle("is-ativo", ativo);
    btn.classList.toggle("is-pausado", atual?.estado === "pausado");
    tempo.hidden = !ativo;
    label.hidden = ativo;
    if (ativo) {
      clearTimeout(avisoTimeout);
      btn.classList.remove("is-concluido");
      tempo.textContent = `${atual.estado === "pausado" ? "⏸ " : ""}${formatarMMSS(atual.segundosRestantes)}`;
      btn.title = atual.estado === "pausado" ? "Modo Foco pausado — clique para retomar" : "Modo Foco em andamento — tempo restante";
    } else {
      btn.title = "Modo Foco";
    }
  }

  pintar(getSessaoAtiva());
  onSessaoFoco((atual, fim) => {
    pintar(atual);
    if (!fim) return;
    if (fim.concluida) {
      btn.classList.add("is-concluido");
      tempo.hidden = false;
      label.hidden = true;
      tempo.textContent = "Concluída ✓";
      btn.title = `Sessão de foco concluída: ${fim.minutos} min registrados`;
      avisoTimeout = setTimeout(() => {
        btn.classList.remove("is-concluido");
        pintar(getSessaoAtiva());
      }, 10000);
    }
    getConstancia()
      .then((c) => atualizarStreakTopbar(c.streakAtual))
      .catch(() => {});
  });
}
