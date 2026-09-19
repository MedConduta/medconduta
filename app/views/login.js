import { escapeHtml } from "../utils.js";
import { entrar, registrar } from "../auth.js";
import { icon } from "../components/icons.js";

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
          <div class="login-brand">
            <div class="login-brand__mark" aria-hidden="true">M</div>
            <span class="login-brand__name">MedConduta</span>
            <span class="login-brand__tagline">Estudo estruturado para residência médica</span>
          </div>

          <div class="login-card__header">
            <h1>${ehCriar ? "Criar conta" : "Entrar"}</h1>
          </div>

          <form id="login-form">
            <div class="field">
              <label for="login-email">E-mail</label>
              <div class="input-icon">
                ${icon("mail", { size: 18 })}
                <input type="email" id="login-email" placeholder="voce@email.com" required autocomplete="email" />
              </div>
            </div>
            <div class="field">
              <label for="login-password">Senha</label>
              <div class="input-icon">
                ${icon("lock", { size: 18 })}
                <input type="password" id="login-password" placeholder="••••••••" required autocomplete="${ehCriar ? "new-password" : "current-password"}" minlength="8" />
              </div>
            </div>
            <p class="explanation-box" id="login-erro" hidden style="border-color:var(--color-danger-border);background:var(--color-danger-soft);color:var(--color-danger);"></p>
            <button type="submit" class="btn btn--primary" style="width:100%;" id="login-submit">${ehCriar ? "Criar conta" : "Entrar"}</button>
          </form>
          <p class="login-switch">
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
