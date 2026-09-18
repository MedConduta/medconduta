import { escapeHtml, renderMarkdown, fetchJsonCached } from "../utils.js";
import { askAI } from "../ai.js";
import { buscarContextoRelevante } from "../rag.js";
import { getAll } from "../db.js";
import { calcularDesempenhoPorCategoria, calcularScorePrioridade } from "../planner.js";
import { getEstadoPreparo } from "../modo.js";

// Histórico da conversa vive só na memória da aba (não persiste entre recargas).
let historico = [];

export async function renderAssistente(container) {
  historico = [];

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Assistente IA</div>
        <h1>Assistente de estudo</h1>
        <p class="page-header__desc">
          Responde com base no conteúdo do MedConduta (RAG). Também é quem gera temas, flashcards e
          questões novas (veja os botões de IA em cada tema, em <a href="#/residencia/conteudo">Conteúdo</a>).
          <strong>Sempre confira respostas em fonte oficial</strong> — é uma ferramenta de apoio, não uma
          fonte de verdade clínica.
        </p>
      </div>

      <div class="card" id="chat-card">
        <div id="chat-mensagens" class="chat-mensagens" aria-live="polite">
          <div class="empty-state" id="chat-vazio">Faça uma pergunta sobre algum tema de estudo para começar.</div>
        </div>
        <form id="chat-form" class="chat-form">
          <textarea id="chat-input" placeholder="Ex.: Quando devo suspeitar de gravidez ectópica?" rows="2"></textarea>
          <button type="submit" class="btn btn--primary" id="chat-enviar" aria-label="Enviar pergunta">Enviar</button>
        </form>
      </div>
    </div>
  `;

  const chatForm = container.querySelector("#chat-form");
  const chatInput = container.querySelector("#chat-input");
  const chatEnviar = container.querySelector("#chat-enviar");
  const chatMensagens = container.querySelector("#chat-mensagens");

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
      const [contextoTema, contextoAluno] = await Promise.all([buscarContextoRelevante(pergunta), montarContextoAluno()]);
      const contexto = [contextoAluno, contextoTema].filter(Boolean).join("\n\n---\n\n");
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

/**
 * Fase 10 — "tutor contextual": monta um resumo curto de onde o aluno está
 * (fase da preparação, maiores gargalos) usando dados que a plataforma já
 * calcula (ver planner.js/modo.js), pra IA poder personalizar a resposta
 * quando fizer sentido — sem precisar de nenhuma chamada extra ao Gemini,
 * só reaproveitando o que já existe.
 */
async function montarContextoAluno() {
  const [temas, respostas, estado] = await Promise.all([
    fetchJsonCached("data/temas.json"),
    getAll("respostas"),
    getEstadoPreparo(),
  ]);

  const desempenhoPorCategoria = calcularDesempenhoPorCategoria(respostas);
  const categorias = [...new Set(temas.map((t) => t.categoria))];
  const gargalos = categorias
    .map((categoria) => ({ categoria, score: calcularScorePrioridade(categoria, desempenhoPorCategoria) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => {
      const info = desempenhoPorCategoria.get(r.categoria);
      return info ? `${r.categoria} (${Math.round(info.taxa * 100)}% de acerto)` : `${r.categoria} (sem questões respondidas ainda)`;
    });

  if (!estado.fase.id && !gargalos.length) return "";

  const linhaFase = estado.fase.id
    ? `Fase da preparação: ${estado.fase.nome}${estado.diasRestantes !== null ? ` (${estado.diasRestantes} dias até a prova)` : ""}.`
    : "";
  const linhaGargalos = gargalos.length ? `Maiores gargalos atuais (alta incidência na prova + desempenho a melhorar): ${gargalos.join("; ")}.` : "";

  return `CONTEXTO DO ALUNO (uso interno — só personalize a resposta com isso se for natural fazer; não cite estes dados a menos que ajudem a responder):\n${linhaFase}\n${linhaGargalos}`;
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

function renderConteudoMensagem(autor, texto, { erro = false } = {}) {
  const rotulo = autor === "usuario" ? "Você" : autor === "sistema" ? "Sistema" : "IA";
  const aviso = autor === "ia" && !erro ? '<div class="chat-msg__aviso">Gerado por IA — confira em fonte oficial.</div>' : "";
  const corpo = autor === "ia" && !erro ? renderMarkdown(texto) : `<p>${escapeHtml(texto)}</p>`;
  return `<div class="chat-msg__autor">${rotulo}</div><div class="chat-msg__texto">${corpo}</div>${aviso}`;
}
