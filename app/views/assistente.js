import { escapeHtml, renderMarkdown } from "../utils.js";
import { askAI, getAiEndpoint, setAiEndpoint } from "../ai.js";
import { buscarContextoRelevante } from "../rag.js";

// Histórico da conversa vive só na memória da aba (não persiste entre recargas).
let historico = [];

export async function renderAssistente(container) {
  const endpointAtual = await getAiEndpoint();
  historico = [];

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Assistente IA</div>
        <h1>Assistente de estudo</h1>
        <p class="page-header__desc">
          Responde com base no conteúdo do MedConduta (RAG) usando um modelo de IA gratuito,
          via um Worker que você mesmo hospeda. <strong>Sempre confira respostas em fonte oficial</strong> —
          é uma ferramenta de apoio ao estudo, não uma fonte de verdade clínica.
        </p>
      </div>

      <details class="card" id="config-box" ${endpointAtual ? "" : "open"} style="margin-bottom:20px;">
        <summary style="cursor:pointer;font-weight:600;">Configuração do assistente</summary>
        <div style="margin-top:16px;">
          <div class="field">
            <label for="endpoint-input">Endereço do Worker (URL do Cloudflare Workers)</label>
            <input type="text" id="endpoint-input" placeholder="https://medconduta-ai.SEUUSUARIO.workers.dev" value="${escapeHtml(endpointAtual)}" />
          </div>
          <div class="btn-row">
            <button class="btn btn--primary" id="btn-salvar-endpoint">Salvar</button>
          </div>
          <p class="page-header__desc" style="margin-top:12px;font-size:var(--fs-sm);">
            Veja no README como publicar seu próprio Worker gratuito (Cloudflare) com sua chave do
            Gemini — a chave nunca fica no app, só no Worker.
          </p>
        </div>
      </details>

      <div class="card" id="chat-card">
        <div id="chat-mensagens" class="chat-mensagens" aria-live="polite">
          <div class="empty-state" id="chat-vazio">Faça uma pergunta sobre algum tema de estudo para começar.</div>
        </div>
        <form id="chat-form" class="chat-form">
          <textarea id="chat-input" placeholder="Ex.: Quando devo suspeitar de gravidez ectópica?" rows="2" ${endpointAtual ? "" : "disabled"}></textarea>
          <button type="submit" class="btn btn--primary" id="chat-enviar" ${endpointAtual ? "" : "disabled"} aria-label="Enviar pergunta">Enviar</button>
        </form>
      </div>
    </div>
  `;

  const endpointInput = container.querySelector("#endpoint-input");
  const configBox = container.querySelector("#config-box");
  const chatForm = container.querySelector("#chat-form");
  const chatInput = container.querySelector("#chat-input");
  const chatEnviar = container.querySelector("#chat-enviar");
  const chatMensagens = container.querySelector("#chat-mensagens");

  container.querySelector("#btn-salvar-endpoint").addEventListener("click", async () => {
    await setAiEndpoint(endpointInput.value);
    const configurado = Boolean((await getAiEndpoint()).trim());
    chatInput.disabled = !configurado;
    chatEnviar.disabled = !configurado;
    configBox.open = !configurado;
    renderMensagemSistema(chatMensagens, configurado ? "Assistente configurado. Pode perguntar!" : "Endereço removido.");
  });

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pergunta = chatInput.value.trim();
    if (!pergunta) return;

    chatInput.value = "";
    chatInput.disabled = true;
    chatEnviar.disabled = true;

    adicionarMensagem(chatMensagens, "usuario", pergunta);
    const idCarregando = adicionarMensagem(chatMensagens, "ia", "Pensando...", { carregando: true });

    try {
      const contexto = await buscarContextoRelevante(pergunta);
      const resposta = await askAI({ pergunta, contexto, tarefa: "responder à pergunta do usuário usando o contexto de estudo" });
      atualizarMensagem(chatMensagens, idCarregando, resposta || "Não obtive resposta do modelo.");
    } catch (err) {
      atualizarMensagem(chatMensagens, idCarregando, `⚠ ${err.message}`, { erro: true });
    } finally {
      chatInput.disabled = false;
      chatEnviar.disabled = false;
      chatInput.focus();
    }
  });
}

let contadorMsg = 0;

function adicionarMensagem(container, autor, texto, { carregando = false, erro = false } = {}) {
  const vazio = container.querySelector("#chat-vazio");
  if (vazio) vazio.remove();

  const id = `msg-${++contadorMsg}`;
  historico.push({ id, autor, texto });

  const bloco = document.createElement("div");
  bloco.id = id;
  bloco.className = `chat-msg chat-msg--${autor}${carregando ? " chat-msg--loading" : ""}${erro ? " chat-msg--erro" : ""}`;
  bloco.innerHTML = renderConteudoMensagem(autor, texto);
  container.appendChild(bloco);
  container.scrollTop = container.scrollHeight;
  return id;
}

function atualizarMensagem(container, id, texto, { erro = false } = {}) {
  const bloco = container.querySelector(`#${id}`);
  if (!bloco) return;
  bloco.classList.remove("chat-msg--loading");
  if (erro) bloco.classList.add("chat-msg--erro");
  bloco.innerHTML = renderConteudoMensagem("ia", texto, { erro });
  container.scrollTop = container.scrollHeight;
}

function renderMensagemSistema(container, texto) {
  adicionarMensagem(container, "sistema", texto);
}

function renderConteudoMensagem(autor, texto, { erro = false } = {}) {
  const rotulo = autor === "usuario" ? "Você" : autor === "sistema" ? "Sistema" : "IA";
  const aviso = autor === "ia" && !erro ? '<div class="chat-msg__aviso">Gerado por IA — confira em fonte oficial.</div>' : "";
  const corpo = autor === "ia" && !erro ? renderMarkdown(texto) : `<p>${escapeHtml(texto)}</p>`;
  return `<div class="chat-msg__autor">${rotulo}</div><div class="chat-msg__texto">${corpo}</div>${aviso}`;
}
