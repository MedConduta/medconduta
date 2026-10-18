import { escapeHtml } from "../utils.js";
import { entrar, registrar, pedirRedefinicaoSenha, redefinirSenha } from "../auth.js";
import { icon } from "../components/icons.js";
import { initThemeLocal } from "../theme.js";

const TITULOS = {
  entrar: "Entrar",
  criar: "Criar conta",
  esqueci: "Esqueci minha senha",
  codigo: "Criar nova senha",
};

/**
 * Tela de entrada/cadastro. Renderizada fora do roteador normal (ver
 * app/main.js) enquanto não houver sessão válida — o app-shell (sidebar,
 * topbar, bottom-nav) fica oculto até o login funcionar.
 *
 * Sem envio de e-mail, a redefinição de senha passa pelo administrador:
 * "esqueci" registra o pedido; com o código recebido, "codigo" cria a senha nova.
 */
export function renderLogin(container, { onAutenticado }) {
  // Link de convite gerado na tela de admin: ?convite=XXXX-XXXX abre direto no
  // modo "Criar conta" com o código preenchido.
  const conviteDaUrl = new URLSearchParams(window.location.search).get("convite") || "";
  let modo = conviteDaUrl ? "criar" : "entrar"; // "entrar" | "criar" | "esqueci" | "codigo"
  let emailDigitado = "";
  // "Esqueci minha senha" só aparece depois de uma senha errada.
  let senhaErrada = false;
  let pedidoEnviado = false;

  function campoEmail() {
    return `
      <div class="field">
        <label for="login-email">E-mail</label>
        <div class="input-icon">
          ${icon("mail", { size: 18 })}
          <input type="email" id="login-email" placeholder="voce@email.com" required autocomplete="email" value="${escapeHtml(emailDigitado)}" />
        </div>
      </div>`;
  }

  function campoSenha(rotulo, autocomplete) {
    return `
      <div class="field">
        <label for="login-password">${rotulo}</label>
        <div class="input-icon">
          ${icon("lock", { size: 18 })}
          <input type="password" id="login-password" placeholder="••••••••" required autocomplete="${autocomplete}" minlength="8" />
        </div>
      </div>`;
  }

  function camposDoModo() {
    if (modo === "esqueci") {
      if (pedidoEnviado) {
        return `<p class="login-hint login-hint--ok">Pedido enviado. O administrador vai te mandar um código de redefinição (vale 24 horas). Quando receber, toque em “Já tenho o código”.</p>`;
      }
      return `
        <p class="login-hint">Informe o e-mail da sua conta. O administrador da plataforma recebe o pedido e te envia um código para criar uma senha nova.</p>
        ${campoEmail()}`;
    }
    if (modo === "codigo") {
      return `
        ${campoEmail()}
        <div class="field">
          <label for="login-codigo">Código de redefinição</label>
          <div class="input-icon">
            ${icon("bookmark", { size: 18 })}
            <input type="text" id="login-codigo" placeholder="ABCD-EFGH" required autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" />
          </div>
        </div>
        ${campoSenha("Nova senha", "new-password")}`;
    }
    const ehCriar = modo === "criar";
    return `
      ${campoEmail()}
      ${campoSenha("Senha", ehCriar ? "new-password" : "current-password")}
      ${
        ehCriar
          ? `<div class="field">
        <label for="login-convite">Código de convite</label>
        <div class="input-icon">
          ${icon("bookmark", { size: 18 })}
          <input type="text" id="login-convite" placeholder="ABCD-EFGH" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${escapeHtml(conviteDaUrl)}" />
        </div>
        <p class="login-hint">Peça o código a quem te convidou para a plataforma.</p>
      </div>`
          : ""
      }`;
  }

  function rotuloBotao() {
    if (modo === "esqueci") return "Pedir redefinição";
    if (modo === "codigo") return "Salvar nova senha e entrar";
    return TITULOS[modo];
  }

  function rodape() {
    if (modo === "esqueci") {
      return `<p class="login-switch"><a href="#" data-modo="codigo">Já tenho o código</a> · <a href="#" data-modo="entrar">Voltar para Entrar</a></p>`;
    }
    if (modo === "codigo") {
      return `<p class="login-switch"><a href="#" data-modo="entrar">Voltar para Entrar</a></p>`;
    }
    const ehCriar = modo === "criar";
    return `
      <p class="login-switch">
        ${ehCriar ? "Já tem conta?" : "Ainda não tem conta?"}
        <a href="#" data-modo="${ehCriar ? "entrar" : "criar"}">${ehCriar ? "Entrar" : "Criar conta"}</a>
      </p>`;
  }

  function template() {
    const semFormulario = modo === "esqueci" && pedidoEnviado;
    return `
      <div class="login-page">
        <button class="icon-btn login-theme-toggle" id="login-theme-toggle" type="button"></button>
        <div class="login-card">
          <div class="login-brand">
            <div class="login-brand__mark" aria-hidden="true">M</div>
            <span class="login-brand__name">MedConduta</span>
            <span class="login-brand__tagline">Estudo estruturado para residência médica</span>
          </div>

          <div class="login-card__header">
            <h1>${TITULOS[modo]}</h1>
          </div>

          <form id="login-form">
            ${camposDoModo()}
            <p class="explanation-box" id="login-erro" hidden style="border-color:var(--color-danger-border);background:var(--color-danger-soft);color:var(--color-danger);"></p>
            ${
              modo === "entrar"
                ? `<p class="login-esqueci" id="login-esqueci" ${senhaErrada ? "" : "hidden"}><a href="#" data-modo="esqueci">Esqueci minha senha</a></p>`
                : ""
            }
            ${semFormulario ? "" : `<button type="submit" class="btn btn--primary" style="width:100%;" id="login-submit">${rotuloBotao()}</button>`}
          </form>
          ${rodape()}
        </div>
      </div>
    `;
  }

  function trocarModo(novo) {
    const emailEl = container.querySelector("#login-email");
    if (emailEl) emailDigitado = emailEl.value.trim();
    modo = novo;
    pedidoEnviado = false;
    render();
  }

  function render() {
    container.innerHTML = template();
    initThemeLocal(container.querySelector("#login-theme-toggle"));

    container.querySelectorAll("[data-modo]").forEach((link) =>
      link.addEventListener("click", (e) => {
        e.preventDefault();
        trocarModo(link.dataset.modo);
      })
    );

    const form = container.querySelector("#login-form");
    const erroEl = container.querySelector("#login-erro");
    const submitBtn = container.querySelector("#login-submit");
    if (!submitBtn) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = container.querySelector("#login-email").value.trim();
      const password = container.querySelector("#login-password")?.value || "";
      emailDigitado = email;

      erroEl.hidden = true;
      submitBtn.disabled = true;
      submitBtn.textContent = "Aguarde...";

      try {
        if (modo === "esqueci") {
          await pedirRedefinicaoSenha(email);
          pedidoEnviado = true;
          render();
          return;
        }
        if (modo === "codigo") {
          await redefinirSenha(email, container.querySelector("#login-codigo").value.trim(), password);
        } else if (modo === "criar") {
          await registrar(email, password, container.querySelector("#login-convite").value.trim());
        } else {
          await entrar(email, password);
        }
        if (conviteDaUrl) history.replaceState(null, "", window.location.pathname + window.location.hash);
        onAutenticado();
      } catch (err) {
        erroEl.textContent = err.message;
        erroEl.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = rotuloBotao();
        if (modo === "entrar" && err.status === 401) {
          senhaErrada = true;
          container.querySelector("#login-esqueci").hidden = false;
        }
      }
    });
  }

  render();
}
