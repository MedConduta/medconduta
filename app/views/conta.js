import { escapeHtml } from "../utils.js";
import { buscarPerfil, getEmail, trocarSenha } from "../auth.js";
import { getItem, setItem } from "../db.js";
import { atualizarAvatar } from "../components/topbar.js";

const STORE_PERFIL = "perfil";
const ID_PERFIL = "dados";

/** Nome que o usuário escolheu mostrar (ou "" se ainda não definiu). */
export async function getNomeUsuario() {
  const registro = await getItem(STORE_PERFIL, ID_PERFIL).catch(() => null);
  return registro?.nome || "";
}

/** Meus dados: informações básicas da conta e troca de senha. */
export async function renderConta(container) {
  const [perfil, nome] = await Promise.all([buscarPerfil(), getNomeUsuario()]);
  const email = perfil?.email || getEmail() || "";
  const criadoEm = perfil?.criadoEm ? new Date(perfil.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Conta</div>
        <h1>Meus dados</h1>
      </div>

      <div class="conta-grid">
        <section class="card">
          <h2 style="font-size:var(--fs-lg);">Dados da conta</h2>
          <dl class="conta-dados">
            <div><dt>E-mail</dt><dd>${escapeHtml(email)}</dd></div>
            <div><dt>Conta criada em</dt><dd>${escapeHtml(criadoEm)}</dd></div>
            <div><dt>Tipo de conta</dt><dd>${perfil?.admin ? "Administrador" : "Aluno"}</dd></div>
          </dl>
          <form class="conta-form" id="conta-form-nome">
            <div class="field">
              <label for="conta-nome">Nome</label>
              <input type="text" id="conta-nome" maxlength="80" autocomplete="name" placeholder="Como quer ser chamado(a)" value="${escapeHtml(nome)}" />
            </div>
            <button type="submit" class="btn btn--secondary">Salvar nome</button>
            <p class="conta-feedback" id="conta-feedback-nome" role="status"></p>
          </form>
        </section>

        <section class="card">
          <h2 style="font-size:var(--fs-lg);">Trocar senha</h2>
          <form class="conta-form" id="conta-form-senha">
            <div class="field">
              <label for="conta-senha-atual">Senha atual</label>
              <input type="password" id="conta-senha-atual" required autocomplete="current-password" />
            </div>
            <div class="field">
              <label for="conta-senha-nova">Nova senha</label>
              <input type="password" id="conta-senha-nova" required minlength="8" autocomplete="new-password" placeholder="Pelo menos 8 caracteres" />
            </div>
            <div class="field">
              <label for="conta-senha-confirma">Confirmar nova senha</label>
              <input type="password" id="conta-senha-confirma" required minlength="8" autocomplete="new-password" />
            </div>
            <button type="submit" class="btn btn--primary" id="conta-senha-btn">Trocar senha</button>
            <p class="conta-feedback" id="conta-feedback-senha" role="status"></p>
          </form>
        </section>
      </div>
    </div>
  `;

  const feedbackNome = container.querySelector("#conta-feedback-nome");
  container.querySelector("#conta-form-nome").addEventListener("submit", async (e) => {
    e.preventDefault();
    const novoNome = container.querySelector("#conta-nome").value.trim();
    try {
      await setItem(STORE_PERFIL, { id: ID_PERFIL, nome: novoNome, atualizadoEm: new Date().toISOString() });
      atualizarAvatar(novoNome);
      mostrar(feedbackNome, "Nome salvo.");
    } catch {
      mostrar(feedbackNome, "Não foi possível salvar agora. Tente de novo.", true);
    }
  });

  const feedbackSenha = container.querySelector("#conta-feedback-senha");
  const formSenha = container.querySelector("#conta-form-senha");
  formSenha.addEventListener("submit", async (e) => {
    e.preventDefault();
    const atual = container.querySelector("#conta-senha-atual").value;
    const nova = container.querySelector("#conta-senha-nova").value;
    const confirma = container.querySelector("#conta-senha-confirma").value;
    if (nova !== confirma) return mostrar(feedbackSenha, "A confirmação não é igual à nova senha.", true);
    if (nova === atual) return mostrar(feedbackSenha, "A nova senha precisa ser diferente da atual.", true);

    const botao = container.querySelector("#conta-senha-btn");
    botao.disabled = true;
    try {
      await trocarSenha(atual, nova);
      formSenha.reset();
      mostrar(feedbackSenha, "Senha alterada. Os outros aparelhos conectados foram desconectados.");
    } catch (err) {
      mostrar(feedbackSenha, err.message, true);
    } finally {
      botao.disabled = false;
    }
  });
}

function mostrar(el, texto, erro = false) {
  el.textContent = texto;
  el.classList.toggle("is-erro", erro);
}
