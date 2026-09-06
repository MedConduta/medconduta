import { fetchJsonCached, escapeHtml } from "../utils.js";
import { getItem, setItem, getAll } from "../db.js";
import { revisar, estaVencido } from "../sm2.js";

export async function renderLista(container) {
  const decks = await fetchJsonCached("data/flashcards.json");
  const srsRecords = await getAll("srs");
  const srsMap = new Map(srsRecords.map((r) => [r.id, r]));

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Flashcards</div>
        <h1>Baralhos por tema</h1>
        <p class="page-header__desc">Frente e verso, integrados à revisão espaçada (SM-2). Cada resposta ajusta o próximo intervalo de revisão daquele card.</p>
      </div>
      <div class="card-grid">
        ${decks
          .map((deck) => {
            const vencidos = deck.cards.filter((c) => estaVencido(srsMap.get(c.id))).length;
            return `
            <a class="card card--interactive list-card" href="#/residencia/flashcards/${deck.id}">
              <div class="list-card__top">
                <span class="badge badge--accent">${deck.cards.length} cards</span>
                ${vencidos > 0 ? `<span class="badge badge--warning">${vencidos} p/ revisar</span>` : `<span class="badge">em dia</span>`}
              </div>
              <div class="list-card__title">${escapeHtml(deck.titulo)}</div>
            </a>`;
          })
          .join("")}
      </div>
    </div>
  `;
}

export async function renderEstudo(container, { deckId }) {
  const decks = await fetchJsonCached("data/flashcards.json");
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
          <a class="btn btn--ghost" href="#/residencia/flashcards" style="padding-left:0;">← Baralhos</a>
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
