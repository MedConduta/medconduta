import { fetchJsonCached, escapeHtml } from "../utils.js";
import { getItem, setItem, getAll } from "../db.js";
import { revisar, estaVencido, diasAteVencer } from "../sm2.js";

export async function renderRevisao(container) {
  const decks = await fetchJsonCached("data/flashcards.json");
  const srsRecords = await getAll("srs");
  const srsMap = new Map(srsRecords.map((r) => [r.id, r]));

  const todosCards = decks.flatMap((deck) => deck.cards.map((c) => ({ ...c, deckTitulo: deck.titulo })));
  const vencidos = todosCards.filter((c) => estaVencido(srsMap.get(c.id)));
  const proximos = todosCards
    .filter((c) => !estaVencido(srsMap.get(c.id)) && srsMap.get(c.id))
    .sort((a, b) => diasAteVencer(srsMap.get(a.id)) - diasAteVencer(srsMap.get(b.id)))
    .slice(0, 5);

  const totalRevisados = srsRecords.length;

  if (vencidos.length === 0) {
    container.innerHTML = `
      <div class="main__container">
        <div class="page-header">
          <div class="page-header__eyebrow">Residência — Revisão espaçada</div>
          <h1>Fila de revisão (SM-2)</h1>
        </div>
        <div class="stat-row">
          <div class="stat-tile"><div class="stat-tile__value">0</div><div class="stat-tile__label">Vencidas hoje</div></div>
          <div class="stat-tile"><div class="stat-tile__value">${totalRevisados}</div><div class="stat-tile__label">Cards no sistema</div></div>
        </div>
        <div class="empty-state">
          <h2>Tudo em dia! ✓</h2>
          <p>Nenhuma revisão vencida no momento. Volte mais tarde ou estude um baralho novo.</p>
          <a class="btn btn--primary" href="#/residencia/flashcards" style="margin-top:12px;">Ver flashcards</a>
        </div>
        ${proximos.length ? renderProximas(proximos, srsMap) : ""}
      </div>
    `;
    return;
  }

  let index = 0;
  let flipped = false;

  function renderCard() {
    if (index >= vencidos.length) {
      container.innerHTML = `
        <div class="main__container">
          <div class="empty-state">
            <h2>Revisão do dia concluída ✓</h2>
            <p>Você revisou ${vencidos.length} card(s) vencido(s).</p>
            <a class="btn btn--primary" href="#/residencia/planejador" style="margin-top:12px;">Ver planejador do dia</a>
          </div>
        </div>
      `;
      return;
    }

    const card = vencidos[index];
    container.innerHTML = `
      <div class="main__container">
        <div class="page-header">
          <div class="page-header__eyebrow">Revisão espaçada · ${escapeHtml(card.deckTitulo)}</div>
          <h1>Vencidas: ${vencidos.length - index} restante(s)</h1>
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
              .map((q) => `<button class="quality-btn" data-q="${q}"><strong>${q}</strong><span>${qualityLabel(q)}</span></button>`)
              .join("")}
          </div>
        `;
        qualityArea.querySelectorAll(".quality-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const q = Number(btn.dataset.q);
            const estadoAtual = await getItem("srs", card.id);
            const novoEstado = { id: card.id, ...revisar(estadoAtual, q) };
            await setItem("srs", novoEstado);
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

function renderProximas(proximos, srsMap) {
  return `
    <div class="card" style="margin-top:24px;">
      <h3>Próximas revisões</h3>
      <div class="plan-queue">
        ${proximos
          .map(
            (c) => `
          <div class="plan-item">
            <span class="plan-item__duration">em ${diasAteVencer(srsMap.get(c.id))}d</span>
            <span>${escapeHtml(c.deckTitulo)} — ${escapeHtml(c.frente)}</span>
          </div>`
          )
          .join("")}
      </div>
    </div>
  `;
}

function qualityLabel(q) {
  return ["Total branco", "Errei", "Difícil", "Confuso", "Bom", "Fácil"][q] ?? "";
}
