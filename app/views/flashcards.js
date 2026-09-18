import { escapeHtml } from "../utils.js";
import { getItem, setItem, getAll } from "../db.js";
import { revisar, estaVencido, diasAteVencer } from "../sm2.js";
import {
  todosOsDecks,
  baralhoEditavel,
  criarBaralhoManual,
  excluirBaralho,
  adicionarCard,
  editarCard,
  excluirCard,
  marcarComoDificil,
  marcarComoDominado,
} from "../flashcardsGerenciar.js";

export async function renderLista(container) {
  const decks = await todosOsDecks();
  const srsRecords = await getAll("srs");
  const srsMap = new Map(srsRecords.map((r) => [r.id, r]));

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Flashcards</div>
        <h1>Baralhos por tema</h1>
        <p class="page-header__desc">Frente e verso, integrados à revisão espaçada (SM-2). Cada resposta ajusta o próximo intervalo de revisão daquele card. Baralhos gerados por IA aparecem marcados; os seus, também — e podem ser editados.</p>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <div class="list-card__top">
          <strong>Criar baralho próprio</strong>
        </div>
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin:8px 0 16px;">Monte seus próprios cards, do zero — sem depender de IA.</p>
        <form id="form-novo-baralho" style="display:flex;gap:12px;flex-wrap:wrap;">
          <input type="text" id="novo-baralho-titulo" placeholder="Nome do baralho" style="flex:1;min-width:200px;" required />
          <button class="btn btn--primary" type="submit">Criar</button>
        </form>
      </div>

      <div class="card-grid">
        ${decks
          .map((deck) => {
            const vencidos = deck.cards.filter((c) => estaVencido(srsMap.get(c.id))).length;
            const badgeOrigem = deck.origem === "ia" ? '<span class="badge badge--ia">✨ IA</span>' : deck.origem === "manual" ? '<span class="badge">Meu baralho</span>' : "";
            return `
            <a class="card card--interactive list-card" href="#/residencia/flashcards/${deck.id}">
              <div class="list-card__top">
                <span class="badge badge--accent">${deck.cards.length} cards</span>
                ${vencidos > 0 ? `<span class="badge badge--warning">${vencidos} p/ revisar</span>` : `<span class="badge">em dia</span>`}
                ${badgeOrigem}
              </div>
              <div class="list-card__title">${escapeHtml(deck.titulo)}</div>
            </a>`;
          })
          .join("")}
      </div>
    </div>
  `;

  container.querySelector("#form-novo-baralho").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = container.querySelector("#novo-baralho-titulo");
    const deck = await criarBaralhoManual(input.value);
    location.hash = `/residencia/flashcards/${deck.id}/gerenciar`;
  });
}

export async function renderEstudo(container, { deckId }) {
  const decks = await todosOsDecks();
  const deck = decks.find((d) => d.id === deckId);

  if (!deck) {
    container.innerHTML = `<div class="empty-state"><h2>Baralho não encontrado</h2><a class="btn btn--secondary" href="#/residencia/flashcards">Voltar</a></div>`;
    return;
  }

  let index = 0;
  let flipped = false;
  const cards = deck.cards;
  let concluidos = 0;

  function renderCard() {
    if (cards.length === 0) {
      container.innerHTML = `
        <div class="main__container">
          <div class="empty-state">
            <h2>Baralho vazio</h2>
            <p>"${escapeHtml(deck.titulo)}" ainda não tem cards.</p>
            <div class="btn-row" style="justify-content:center;margin-top:16px;">
              <a class="btn btn--secondary" href="#/residencia/flashcards">Voltar aos baralhos</a>
              ${baralhoEditavel(deck) ? `<a class="btn btn--primary" href="#/residencia/flashcards/${deck.id}/gerenciar">Adicionar cards</a>` : ""}
            </div>
          </div>
        </div>
      `;
      return;
    }

    if (index >= cards.length) {
      container.innerHTML = `
        <div class="main__container">
          <div class="empty-state">
            <h2>Sessão concluída 🎉</h2>
            <p>Você revisou ${concluidos} de ${cards.length} cards de "${escapeHtml(deck.titulo)}".</p>
            <div class="btn-row" style="justify-content:center;margin-top:16px;">
              <a class="btn btn--secondary" href="#/residencia/flashcards">Voltar aos baralhos</a>
              <a class="btn btn--primary" href="#/residencia/revisao">Ir para revisão espaçada</a>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const card = cards[index];
    container.innerHTML = `
      <div class="main__container">
        <div class="page-header">
          <div class="btn-row" style="justify-content:space-between;align-items:center;">
            <a class="btn btn--ghost" href="#/residencia/flashcards" style="padding-left:0;">← Baralhos</a>
            <a class="btn btn--ghost" href="#/residencia/flashcards/${deck.id}/gerenciar">${baralhoEditavel(deck) ? "Editar baralho" : "Gerenciar (marcar difícil/dominado)"}</a>
          </div>
          <div class="page-header__eyebrow">${escapeHtml(deck.titulo)}</div>
          <h1>Card ${index + 1} de ${cards.length}</h1>
        </div>
        <div class="flashcard-stage">
          <div class="flashcard" id="flashcard" role="button" tabindex="0" aria-label="Vire o card para ver a resposta">
            <div class="flashcard__inner">
              <div class="flashcard__face flashcard__face--front">
                <div>
                  <div class="flashcard__hint">Pergunta</div>
                  <p style="font-weight:500;margin-top:12px;">${escapeHtml(card.frente)}</p>
                </div>
              </div>
              <div class="flashcard__face flashcard__face--back">
                <div>
                  <div class="flashcard__hint">Resposta</div>
                  <p style="margin-top:12px;">${escapeHtml(card.verso)}</p>
                </div>
              </div>
            </div>
          </div>
          <div id="quality-area" style="width:100%;max-width:560px;text-align:center;">
            <p class="page-header__desc" style="margin:0 0 12px;">Toque no card para ver a resposta.</p>
          </div>
        </div>
      </div>
    `;

    const flashcardEl = container.querySelector("#flashcard");
    const qualityArea = container.querySelector("#quality-area");

    function flip() {
      flipped = !flipped;
      flashcardEl.classList.toggle("is-flipped", flipped);
      if (flipped) {
        qualityArea.innerHTML = `
          <p class="page-header__desc" style="margin:0 0 12px;">Como foi lembrar dessa resposta?</p>
          <div class="quality-scale" role="group" aria-label="Qualidade da resposta">
            ${[0, 1, 2, 3, 4, 5]
              .map(
                (q) => `<button class="quality-btn" data-q="${q}"><strong>${q}</strong><span>${qualityLabel(q)}</span></button>`
              )
              .join("")}
          </div>
        `;
        qualityArea.querySelectorAll(".quality-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const q = Number(btn.dataset.q);
            const estadoAtual = await getItem("srs", card.id);
            const novoEstado = { id: card.id, ...revisar(estadoAtual, q) };
            await setItem("srs", novoEstado);
            concluidos++;
            index++;
            flipped = false;
            renderCard();
          });
        });
      } else {
        qualityArea.innerHTML = `<p class="page-header__desc" style="margin:0 0 12px;">Toque no card para ver a resposta.</p>`;
      }
    }

    flashcardEl.addEventListener("click", flip);
    flashcardEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        flip();
      }
    });
  }

  renderCard();
}

function qualityLabel(q) {
  return ["Total branco", "Errei", "Difícil", "Confuso", "Bom", "Fácil"][q] ?? "";
}

/**
 * Fase 15b — gerenciar um baralho: criar/editar/excluir cards (só em
 * baralhos que não são conteúdo curado do curso, ver flashcardsGerenciar.js)
 * e marcar difícil/dominado (disponível em qualquer baralho, curado
 * incluso — só ajusta o estado pessoal de revisão espaçada).
 */
export async function renderGerenciar(container, { deckId }) {
  await renderTelaGerenciar(container, deckId);
}

async function renderTelaGerenciar(container, deckId) {
  const decks = await todosOsDecks();
  const deck = decks.find((d) => d.id === deckId);

  if (!deck) {
    container.innerHTML = `<div class="empty-state"><h2>Baralho não encontrado</h2><a class="btn btn--secondary" href="#/residencia/flashcards">Voltar</a></div>`;
    return;
  }

  const srsRecords = await getAll("srs");
  const srsMap = new Map(srsRecords.map((r) => [r.id, r]));
  const editavel = baralhoEditavel(deck);

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <a class="btn btn--ghost" href="#/residencia/flashcards/${deck.id}" style="padding-left:0;">← Voltar a estudar</a>
        <div class="page-header__eyebrow">Residência — Flashcards</div>
        <h1>Gerenciar: ${escapeHtml(deck.titulo)}</h1>
        <p class="page-header__desc">
          ${editavel ? "Adicione, edite ou exclua cards deste baralho. " : "Baralho curado (conteúdo do curso) — sem edição. "}
          "Marcar difícil"/"marcar dominado" ajusta quando esse card volta a aparecer na revisão espaçada, em qualquer baralho.
        </p>
      </div>

      ${
        editavel
          ? `
        <div class="card" style="margin-bottom:24px;">
          <div class="list-card__top"><strong>Adicionar card</strong></div>
          <form id="form-novo-card" style="display:flex;flex-direction:column;gap:12px;margin-top:12px;">
            <div class="field">
              <label for="novo-card-frente">Frente (pergunta)</label>
              <textarea id="novo-card-frente" rows="2" required></textarea>
            </div>
            <div class="field">
              <label for="novo-card-verso">Verso (resposta)</label>
              <textarea id="novo-card-verso" rows="2" required></textarea>
            </div>
            <button class="btn btn--primary" type="submit" style="align-self:flex-start;">Adicionar</button>
          </form>
        </div>
        <button class="btn btn--secondary" id="btn-excluir-baralho" style="margin-bottom:24px;">Excluir baralho inteiro</button>
      `
          : ""
      }

      <h3>Cards (${deck.cards.length})</h3>
      <div class="plan-queue">
        ${deck.cards.map((card) => renderLinhaCard(card, srsMap.get(card.id), editavel)).join("") || '<p class="page-header__desc">Nenhum card ainda.</p>'}
      </div>
    </div>
  `;

  if (editavel) {
    container.querySelector("#form-novo-card").addEventListener("submit", async (e) => {
      e.preventDefault();
      const frente = container.querySelector("#novo-card-frente").value;
      const verso = container.querySelector("#novo-card-verso").value;
      if (!frente.trim() || !verso.trim()) return;
      await adicionarCard(deck, { frente, verso });
      await renderTelaGerenciar(container, deckId);
    });

    container.querySelector("#btn-excluir-baralho").addEventListener("click", async () => {
      if (!confirm(`Excluir o baralho "${deck.titulo}" e todos os seus ${deck.cards.length} cards? Essa ação não pode ser desfeita.`)) return;
      await excluirBaralho(deck);
      location.hash = "/residencia/flashcards";
    });

    container.querySelectorAll("[data-editar-card]").forEach((btn) => {
      btn.addEventListener("click", () => {
        abrirEdicaoCard(container, deck, btn.dataset.editarCard, deckId);
      });
    });

    container.querySelectorAll("[data-excluir-card]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Excluir este card?")) return;
        await excluirCard(deck, btn.dataset.excluirCard);
        await renderTelaGerenciar(container, deckId);
      });
    });
  }

  container.querySelectorAll("[data-marcar]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (btn.dataset.marcar === "dificil") await marcarComoDificil(btn.dataset.cardId);
      else await marcarComoDominado(btn.dataset.cardId);
      await renderTelaGerenciar(container, deckId);
    });
  });
}

function renderLinhaCard(card, srsEstado, editavel) {
  const statusRevisao = !srsEstado
    ? "Nunca revisado"
    : estaVencido(srsEstado)
      ? "Vencido — pronto pra revisar"
      : `Revisa em ${diasAteVencer(srsEstado)} dia${diasAteVencer(srsEstado) === 1 ? "" : "s"}`;

  return `
    <div class="card" data-card-linha="${card.id}">
      <p style="font-weight:500;">${escapeHtml(card.frente)}</p>
      <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:4px;">${escapeHtml(card.verso)}</p>
      <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">${statusRevisao}</p>
      <div class="btn-row" style="margin-top:12px;flex-wrap:wrap;">
        <button class="btn btn--secondary" data-marcar="dificil" data-card-id="${card.id}">Marcar difícil</button>
        <button class="btn btn--secondary" data-marcar="dominado" data-card-id="${card.id}">Marcar dominado</button>
        ${editavel ? `<button class="btn btn--ghost" data-editar-card="${card.id}">Editar</button>` : ""}
        ${editavel ? `<button class="btn btn--ghost" data-excluir-card="${card.id}">Excluir</button>` : ""}
      </div>
    </div>
  `;
}

function abrirEdicaoCard(container, deck, cardId, deckId) {
  const card = deck.cards.find((c) => c.id === cardId);
  const linha = container.querySelector(`[data-card-linha="${cardId}"]`);
  if (!card || !linha) return;

  linha.innerHTML = `
    <form style="display:flex;flex-direction:column;gap:12px;">
      <div class="field">
        <label>Frente</label>
        <textarea rows="2" id="editar-frente-${cardId}">${escapeHtml(card.frente)}</textarea>
      </div>
      <div class="field">
        <label>Verso</label>
        <textarea rows="2" id="editar-verso-${cardId}">${escapeHtml(card.verso)}</textarea>
      </div>
      <div class="btn-row">
        <button class="btn btn--primary" type="submit">Salvar</button>
        <button class="btn btn--ghost" type="button" data-cancelar-edicao>Cancelar</button>
      </div>
    </form>
  `;

  linha.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const frente = linha.querySelector(`#editar-frente-${cardId}`).value;
    const verso = linha.querySelector(`#editar-verso-${cardId}`).value;
    if (!frente.trim() || !verso.trim()) return;
    await editarCard(deck, cardId, { frente, verso });
    await renderTelaGerenciar(container, deckId);
  });
  linha.querySelector("[data-cancelar-edicao]").addEventListener("click", () => renderTelaGerenciar(container, deckId));
}
