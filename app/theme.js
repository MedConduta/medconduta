import { getPref, setPref } from "./db.js";
import { icon } from "./components/icons.js";

const THEME_KEY = "theme"; // "light" | "dark" | "system"

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

function applyTheme(theme) {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

function updateButton(btn, theme) {
  const labels = { light: "Tema claro", dark: "Tema escuro", system: "Tema automático" };
  const icons = { light: "sun", dark: "moon", system: "sun" };
  btn.innerHTML = `${icon(icons[theme])}<span class="nav-link__label">${labels[theme]}</span>`;
  btn.setAttribute("aria-label", `Alternar tema (atual: ${labels[theme]})`);
}
