import { escapeHtml } from "../utils.js";
import {
  gerarResumoCronograma,
  setConfiguracaoProva,
  PROVAS_ALVO,
  FASES,
} from "../cronograma.js";

export async function renderCronograma(container) {
  await renderTela(container);
}

async function renderTela(container) {
  const resumo = await gerarResumoCronograma();

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Cronograma</div>
        <h1>Sua preparação até a prova</h1>
        <p class="page-header__desc">Informe a data da prova-alvo para a plataforma calcular automaticamente em qual fase da preparação você está (Construção → Consolidação → Intensificação → Reta Final) e ajustar o foco das suas sessões em "Hoje" de acordo.</p>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <form id="form-prova" style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;">
          <div class="field" style="flex:1;min-width:180px;">
            <label for="prova-data">Data da prova</label>
            <input type="date" id="prova-data" value="${escapeHtml(resumo.dataProva || "")}" />
          </div>
          <div class="field" style="flex:1;min-width:180px;">
            <label for="prova-alvo">Prova-alvo</label>
            <select id="prova-alvo">
              ${PROVAS_ALVO.map(
                (p) => `<option value="${escapeHtml(p)}" ${p === resumo.provaAlvo ? "selected" : ""}>${escapeHtml(p)}</option>`
              ).join("")}
            </select>
          </div>
          <button class="btn btn--primary" type="submit">Salvar</button>
        </form>
      </div>

      ${renderResumo(resumo)}
    </div>
  `;

  container.querySelector("#form-prova").addEventListener("submit", async (e) => {
    e.preventDefault();
    const dataProva = container.querySelector("#prova-data").value || null;
    const provaAlvo = container.querySelector("#prova-alvo").value;
    await setConfiguracaoProva({ dataProva, provaAlvo });
    await renderTela(container);
  });
}

function renderResumo(resumo) {
  const { diasRestantes, fase, dataProva } = resumo;

  if (!dataProva) {
    return `
      <div class="empty-state">
        <h2>Configure a data da sua prova</h2>
        <p>Sem uma data definida, a plataforma usa um equilíbrio padrão entre conteúdo novo e questões. Assim que você informar a data, o foco das suas sessões em "Hoje" passa a se ajustar automaticamente conforme a proximidade da prova.</p>
      </div>
    `;
  }

  return `
    <div class="stat-row">
      <div class="stat-tile"><div class="stat-tile__value">${diasRestantes >= 0 ? diasRestantes : 0}</div><div class="stat-tile__label">${diasRestantes >= 0 ? "Dias até a prova" : "Prova já passou"}</div></div>
      <div class="stat-tile"><div class="stat-tile__value">${resumo.percentualConteudo}%</div><div class="stat-tile__label">Conteúdo concluído (${resumo.temasConcluidos}/${resumo.totalTemas})</div></div>
      <div class="stat-tile"><div class="stat-tile__value">${resumo.totalQuestoesRespondidas}</div><div class="stat-tile__label">Questões respondidas</div></div>
      <div class="stat-tile"><div class="stat-tile__value">${resumo.percentualAcerto !== null ? `${resumo.percentualAcerto}%` : "—"}</div><div class="stat-tile__label">Acerto geral</div></div>
    </div>

    <div class="card" style="margin-bottom:24px;">
      <div class="list-card__top" style="margin-bottom:8px;">
        <span class="badge badge--accent">Fase atual</span>
      </div>
      <div class="list-card__title" style="font-size:var(--fs-lg);margin-bottom:8px;">${escapeHtml(fase.nome)}</div>
      <p style="color:var(--color-text-secondary);">${escapeHtml(fase.descricao)}</p>
      <p style="margin-top:12px;font-size:var(--fs-sm);color:var(--color-text-secondary);">Nesta fase, o tempo de estudo (após revisões vencidas) se divide aproximadamente em <strong>${Math.round(fase.pesoConteudo * 100)}% conteúdo novo</strong> e <strong>${Math.round(fase.pesoQuestoes * 100)}% questões</strong>.</p>
    </div>

    <h3>As 4 fases da preparação</h3>
    <div class="plan-queue">
      ${FASES.slice()
        .reverse()
        .map(
          (f) => `
        <div class="card${f.id === fase.id ? " card--interactive" : ""}" style="${f.id === fase.id ? "border-color:var(--color-accent);" : ""}">
          <div class="list-card__top">
            <strong>${escapeHtml(f.nome)}</strong>
            ${f.id === fase.id ? '<span class="badge badge--accent">Você está aqui</span>' : ""}
          </div>
          <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:4px;">${escapeHtml(f.descricao)}</p>
        </div>`
        )
        .join("")}
    </div>
  `;
}
