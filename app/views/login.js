import { escapeHtml } from "../utils.js";
import { entrar, registrar } from "../auth.js";

/**
 * Tela de entrada/cadastro. Renderizada fora do roteador normal (ver
 * app/main.js) enquanto não houver sessão válida — o app-shell (sidebar,
 * topbar, bottom-nav) fica oculto até o login funcionar.
 */
export function renderLogin(container, { onAutenticado }) {
  let modo = "entrar"; // "entrar" | "criar"

  function template() {
    const ehCriar = modo === "criar";
    return `
      <div class="login-page">
        <div class="login-card">
          <div class="sidebar__brand" style="justify-content:center;margin-bottom:24px;">
            <div class="sidebar__brand-mark" aria-hidden="true">M</div>
            <span class="sidebar__brand-name">MedConduta</span>
          </div>
          <h1 style="text-align:center;">${ehCriar ? "Criar conta" : "Entrar"}</h1>
          <p class="page-header__desc" style="text-align:center;margin:0 auto 24px;">
            ${ehCriar ? "Seus dados de estudo ficam salvos na nuvem, acessíveis de qualquer aparelho." : "Acesse sua conta para continuar sua preparação."}
          </p>
          <form id="login-form">
            <div class="field">
              <label for="login-email">E-mail</label>
              <input type="email" id="login-email" required autocomplete="email" />
            </div>
            <div class="field">
              <label for="login-password">Senha</label>
              <input type="password" id="login-password" required autocomplete="${ehCriar ? "new-password" : "current-password"}" minlength="8" />
            </div>
            <p class="explanation-box" id="login-erro" hidden style="border-color:var(--color-danger-border);background:var(--color-danger-soft);color:var(--color-danger);"></p>
            <button type="submit" class="btn btn--primary" style="width:100%;" id="login-submit">${ehCriar ? "Criar conta" : "Entrar"}</button>
          </form>
          <p style="text-align:center;margin-top:16px;font-size:var(--fs-sm);color:var(--color-text-secondary);">
            ${ehCriar ? "Já tem conta?" : "Ainda não tem conta?"}
            <a href="#" id="login-alternar">${ehCriar ? "Entrar" : "Criar conta"}</a>
          </p>
        </div>
      </div>
    `;
  }

  function render() {
    container.innerHTML = template();

    container.querySelector("#login-alternar").addEventListener("click", (e) => {
      e.preventDefault();
      modo = modo === "entrar" ? "criar" : "entrar";
      render();
    });

    const form = container.querySelector("#login-form");
    const erroEl = container.querySelector("#login-erro");
    const submitBtn = container.querySelector("#login-submit");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = container.querySelector("#login-email").value.trim();
      const password = container.querySelector("#login-password").value;

      erroEl.hidden = true;
      submitBtn.disabled = true;
      submitBtn.textContent = modo === "criar" ? "Criando conta..." : "Entrando...";

      try {
        if (modo === "criar") {
          await registrar(email, password);
        } else {
          await entrar(email, password);
        }
        onAutenticado();
      } catch (err) {
        erroEl.textContent = escapeHtml(err.message);
        erroEl.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = modo === "criar" ? "Criar conta" : "Entrar";
      }
    });
  }

  render();
}
