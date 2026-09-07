import { fetchJsonCached, escapeHtml, uniq } from "../utils.js";
import { setItem, getAll } from "../db.js";

export async function renderLista(container) {
  const [curadas, geradas, temasCurados, respostasAnteriores] = await Promise.all([
    fetchJsonCached("data/questoes.json"),
    getAll("ia_questoes"),
    fetchJsonCached("data/temas.json"),
    getAll("respostas"),
  ]);
  const questoes = [...curadas, ...geradas];
  const temas = uniq(questoes.map((q) => q.tema));
  const bancas = uniq(questoes.map((q) => q.banca));
  const categoriaPorTemaId = Object.fromEntries(temasCurados.map((t) => [t.id, t.categoria]));
  const tentativasPorQuestao = new Map();
  respostasAnteriores.forEach((r) => {
    tentativasPorQuestao.set(r.questaoId, (tentativasPorQuestao.get(r.questaoId) || 0) + 1);
  });

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Questões</div>
        <h1>Banco de questões</h1>
        <p class="page-header__desc">Questões com resolução comentada, filtráveis por tema e banca. Enunciados e comentários são material de estudo próprio, não de provas reais.</p>
      </div>
      <div class="field" style="display:flex;gap:16px;flex-wrap:wrap;">
        <div style="flex:1;min-width:180px;">
          <label for="filtro-tema">Tema</label>
          <select id="filtro-tema">
            <option value="todos">Todos os temas</option>
            ${temas.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("")}
          </select>
        </div>
        <div style="flex:1;min-width:180px;">
          <label for="filtro-banca">Banca</label>
          <select id="filtro-banca">
            <option value="todas">Todas as bancas</option>
            ${bancas.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("")}
          </select>
        </div>
      </div>
      <div id="questoes-lista" class="plan-queue"></div>
    </div>
  `;

  const listaEl = container.querySelector("#questoes-lista");
  const filtroTema = container.querySelector("#filtro-tema");
  const filtroBanca = container.querySelector("#filtro-banca");

  function renderFiltradas() {
    const tema = filtroTema.value;
    const banca = filtroBanca.value;
    const filtradas = questoes.filter(
      (q) => (tema === "todos" || q.tema === tema) && (banca === "todas" || q.banca === banca)
    );
    if (!filtradas.length) {
      listaEl.innerHTML = `<div class="empty-state">Nenhuma questão encontrada com esses filtros.</div>`;
      return;
    }
    listaEl.innerHTML = filtradas
      .map(
        (q) => `
      <div class="card">
        <div class="list-card__top">
          <span class="badge badge--accent">${escapeHtml(q.tema)}</span>
          <span class="badge">${escapeHtml(q.banca)} · ${q.ano}</span>
          ${q.origem === "ia" ? '<span class="badge badge--ia">✨ IA</span>' : ""}
        </div>
        <p style="font-weight:500;margin:12px 0;">${escapeHtml(q.enunciado)}</p>
        <div class="opcoes" data-qid="${q.id}">
          ${q.alternativas
            .map(
              (alt, i) => `
            <button class="question-option" data-i="${i}">
              <span class="question-option__letter">${String.fromCharCode(65 + i)}</span>
              <span>${escapeHtml(alt)}</span>
            </button>`
            )
            .join("")}
        </div>
        <div class="resultado" data-qid="${q.id}"></div>
      </div>`
      )
      .join("");

    const exibidoEm = Date.now();

    listaEl.querySelectorAll(".opcoes").forEach((opcoesEl) => {
      const qid = opcoesEl.dataset.qid;
      const questao = filtradas.find((q) => q.id === qid);
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
              <strong style="color:${acertou ? "var(--color-success)" : "var(--color-danger)"}">${acertou ? "Correto!" : "Incorreto."}</strong>
              <p style="margin-top:8px;">${escapeHtml(questao.comentario)}</p>
            </div>
          `;
          const tentativa = (tentativasPorQuestao.get(questao.id) || 0) + 1;
          tentativasPorQuestao.set(questao.id, tentativa);
          await setItem("respostas", {
            id: `${questao.id}-${Date.now()}`,
            questaoId: questao.id,
            temaId: questao.temaId,
            tema: questao.tema,
            categoria: categoriaPorTemaId[questao.temaId] || null,
            banca: questao.banca,
            ano: questao.ano,
            acertou,
            tempoMs: Date.now() - exibidoEm,
            tentativa,
            respondidoEm: new Date().toISOString(),
          });
        });
      });
    });
  }

  filtroTema.addEventListener("change", renderFiltradas);
  filtroBanca.addEventListener("change", renderFiltradas);
  renderFiltradas();
}
