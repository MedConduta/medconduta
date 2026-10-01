import { getPref, setPref } from "./db.js";
import { icon } from "./components/icons.js";

const THEME_KEY = "theme"; // "light" | "dark" | "system"
// Antes do login não há conta (sem token, sem acesso ao getPref/setPref do
// servidor) — a tela de entrada usa essa chave local só pra lembrar a
// escolha de tema *neste aparelho* enquanto a pessoa ainda não autenticou.
// Depois do login, a preferência de verdade (por conta, no servidor) assume.
const LOCAL_THEME_KEY = "medconduta-theme-login";

export async function initTheme(buttonEls = []) {
  const saved = (await getPref(THEME_KEY, "system")) || "system";
  applyTheme(saved);
  buttonEls.forEach((btn) => updateButton(btn, saved));

  buttonEls.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const current = document.documentElement.getAttribute("data-theme") || "system";
      const next = current === "dark" ? "light" : current === "light" ? "system" : "dark";
      applyTheme(next);
      await setPref(THEME_KEY, next);
      buttonEls.forEach((b) => updateButton(b, next));
    });
  });
}

/** Alternância de tema pra tela de login (sem conta ainda) — guarda só no localStorage deste aparelho. */
export function initThemeLocal(btn) {
  let saved = "system";
  try {
    saved = localStorage.getItem(LOCAL_THEME_KEY) || "system";
  } catch {
    /* localStorage indisponível (ex.: aba anônima) — segue com "system" */
  }
  applyTheme(saved);
  updateButton(btn, saved);

  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "system";
    const next = current === "dark" ? "light" : current === "light" ? "system" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(LOCAL_THEME_KEY, next);
    } catch {
      /* best-effort — não quebra a troca de tema se não puder persistir */
    }
    updateButton(btn, next);
  });
}

export function applyTheme(theme) {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export function updateButton(btn, theme) {
  const labels = { light: "Tema claro", dark: "Tema escuro", system: "Tema automático" };
  const icons = { light: "sun", dark: "moon", system: "sun" };
  btn.innerHTML = `${icon(icons[theme])}<span class="nav-link__label">${labels[theme]}</span>`;
  btn.setAttribute("aria-label", `Alternar tema (atual: ${labels[theme]})`);
}
