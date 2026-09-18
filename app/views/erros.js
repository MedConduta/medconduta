import { escapeHtml } from "../utils.js";
import { setItem } from "../db.js";
import { getQuestoesEmRevisao, registrarResultadoQuestao } from "../erros.js";
import { diasAteVencer } from "../sm2.js";

export async function renderErros(container) {
  await renderTela(container);
}

async function renderTela(container) {
  const { vencidas, proximas, total } = await getQuestoesEmRevisao();

  if (!total) {
    container.innerHTML = `
      <div class="main__container">
        <div class="page-header">
          <div class="page-header__eyebrow">Residência — Meus Erros</div>
          <h1>Revisão de erros</h1>
        </div>
        <div class="empty-state">
          <h2>Nenhum erro registrado ainda ✓</h2>
          <p>Toda questão que você errar aparece aqui para revisão espaçada, até você dominá-la de verdade.</p>
          <a class="btn btn--primary" href="#/residencia/questoes" style="margin-top:12px;">Resolver questões</a>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Meus Erros</div>
        <h1>Revisão de erros</h1>
        <p class="page-header__desc">Toda questão que você erra entra aqui numa fila de revisão espaçada: erre de novo e ela volta rápido; acerte e o intervalo até a próxima revisão cresce — até sumir da fila por bastante tempo, mas nunca ser esquecida de vez.</p>
      </div>
      <div class="stat-row">
        <div class="stat-tile"><div class="stat-tile__value">${vencidas.length}</div><div class="stat-tile__label">Para revisar agora</div></div>
        <div class="stat-tile"><div class="stat-tile__value">${total}</div><div class="stat-tile__label">Questões já erradas</div></div>
      </div>
      ${
        vencidas.length
          ? `<div id="erros-lista" class="plan-queue"></div>`
          : `<div class="empty-state"><h2>Tudo revisado por hoje ✓</h2><p>Nenhuma questão errada vencida agora. Volte mais tarde.</p></div>`
      }
      ${proximas.length ? renderProximas(proximas) : ""}
    </div>
  `;

  if (!vencidas.length) return;

  const listaEl = container.querySelector("#erros-lista");
  listaEl.innerHTML = vencidas
    .map(
      ({ questao }) => `
      <div class="card">
        <div class="list-card__top">
          <span class="badge badge--accent">${escapeHtml(questao.tema)}</span>
          <span class="badge">${escapeHtml(questao.banca)} · ${questao.ano}</span>
        </div>
        <p style="font-weight:500;margin:12px 0;">${escapeHtml(questao.enunciado)}</p>
        <div class="opcoes" data-qid="${questao.id}">
          ${questao.alternativas
            .map(
              (alt, i) => `
            <button class="question-option" data-i="${i}">
              <span class="question-option__letter">${String.fromCharCode(65 + i)}</span>
              <span>${escapeHtml(alt)}</span>
            </button>`
            )
            .join("")}
        </div>
        <div class="resultado" data-qid="${questao.id}"></div>
      </div>`
    )
    .join("");

  listaEl.querySelectorAll(".opcoes").forEach((opcoesEl) => {
    const qid = opcoesEl.dataset.qid;
    const item = vencidas.find((i) => i.questao.id === qid);
    const questao = item.questao;
    const exibidoEm = Date.now();

    opcoesEl.querySelectorAll(".question-option").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const escolhida = Number(btn.dataset.i);
        const acertou = escolhida === questao.correta;
        opcoesEl.querySelectorAll(".question-option").forEach((b, i) => {
          b.classList.add("is-disabled");
          if (i === questao.correta) b.classList.add("is-correct");
          if (i === escolhida && !acertou) b.classList.add("is-incorrect");
        });
        const resultadoEl = listaEl.querySelector(`.resultado[data-qid="${qid}"]`);
        resultadoEl.innerHTML = `
          <div class="explanation-box">
            <strong style="color:${acertou ? "var(--color-success)" : "var(--color-danger)"}">${
          acertou ? "Correto! Intervalo de revisão aumentou." : "Incorreto — volta para revisão em breve."
        }</strong>
            <p style="margin-top:8px;">${escapeHtml(questao.comentario)}</p>
          </div>
        `;
        await setItem("respostas", {
          id: `${questao.id}-${Date.now()}`,
          questaoId: questao.id,
          temaId: questao.temaId,
          tema: questao.tema,
          categoria: questao.categoria,
          banca: questao.banca,
          ano: questao.ano,
          acertou,
          tempoMs: Date.now() - exibidoEm,
          origemRevisaoErro: true,
          respondidoEm: new Date().toISOString(),
        });
        await registrarResultadoQuestao(questao.id, acertou);
      });
    });
  });
}

function renderProximas(proximas) {
  return `
    <div class="card" style="margin-top:24px;">
      <h3>Próximas revisões de erro</h3>
      <div class="plan-queue">
        ${proximas
          .slice(0, 8)
          .map(({ questao, estado }) => {
            const resumo = questao.enunciado.length > 80 ? `${questao.enunciado.slice(0, 80)}…` : questao.enunciado;
            return `
          <div class="plan-item">
            <span class="plan-item__duration">em ${diasAteVencer(estado)}d</span>
            <span>${escapeHtml(questao.tema)} — ${escapeHtml(resumo)}</span>
          </div>`;
          })
          .join("")}
      </div>
    </div>
  `;
}
