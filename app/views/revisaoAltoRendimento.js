import { escapeHtml } from "../utils.js";
import { getRevisaoAltoRendimento } from "../revisaoAltoRendimento.js";
import { QUADRANTES } from "../prontidao.js";

/**
 * Fase 16 — Revisão de Alto Rendimento: fila direto do heatmap de fraquezas
 * (alta incidência + baixo desempenho), sem depender de revisão vencida.
 */
export async function renderRevisaoAltoRendimento(container) {
  container.innerHTML = `<div class="main__container"><div class="empty-state">Calculando seus maiores gargalos...</div></div>`;

  const { categorias } = await getRevisaoAltoRendimento();

  if (!categorias.length) {
    container.innerHTML = `
      <div class="main__container">
        <div class="page-header">
          <div class="page-header__eyebrow">Residência — Revisão de Alto Rendimento</div>
          <h1>Revisão de Alto Rendimento</h1>
        </div>
        <div class="empty-state">
          <h2>Nenhum gargalo crítico agora 🎉</h2>
          <p>Nenhuma categoria de alta incidência está com desempenho abaixo do esperado no momento. Continue assim — ou responda mais questões pra essa análise ficar mais precisa.</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Revisão de Alto Rendimento</div>
        <h1>Revisão de Alto Rendimento</h1>
        <p class="page-header__desc">Cruza alta incidência na prova com seu desempenho real (mesmo heatmap da Prontidão) — o foco AGORA, sem depender de nada estar vencido.</p>
      </div>

      <div class="plan-queue" style="margin-bottom:24px;">
        ${categorias
          .map(
            (c) => `
          <div class="card">
            <div class="list-card__top">
              <strong>${escapeHtml(c.categoria)}</strong>
              <span class="badge badge--${c.quadrante === QUADRANTES.critico ? "danger" : "warning"}">${c.quadrante.emoji} ${escapeHtml(c.quadrante.label)}</span>
            </div>
            <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">${c.semDados ? "Ainda sem questões respondidas nessa categoria." : `${Math.round(c.desempenho * 100)}% de acerto`}</p>
            <a class="btn btn--secondary" style="margin-top:8px;" href="#/residencia/questoes?categoria=${encodeURIComponent(c.categoria)}">Praticar questões</a>
          </div>`
          )
          .join("")}
      </div>
    </div>
  `;
}
