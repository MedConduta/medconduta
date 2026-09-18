import { escapeHtml } from "../utils.js";
import { getEvolucaoSemanal } from "../evolucao.js";

/**
 * Fase 13 — Análise de Desempenho: responde "como meu desempenho está
 * evoluindo?" reconstruindo as últimas 8 semanas a partir dos dados que a
 * plataforma já registra (nenhum gráfico externo — barras simples em CSS,
 * consistente com o princípio de leveza do resto do app).
 */
export async function renderAnaliseDesempenho(container) {
  container.innerHTML = `<div class="main__container"><div class="empty-state">Calculando sua evolução...</div></div>`;

  const semanas = await getEvolucaoSemanal();
  const atual = semanas[semanas.length - 1];
  const referencia = semanas[0];
  const variacao = atual.indicePreparo - referencia.indicePreparo;

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Desempenho</div>
        <h1>Análise de desempenho</h1>
        <p class="page-header__desc">Como sua preparação evoluiu nas últimas ${semanas.length} semanas — índice de prontidão, acerto em questões, tempo de foco e simulados.</p>
      </div>

      <div class="stat-row">
        <div class="stat-tile"><div class="stat-tile__value">${atual.indicePreparo}</div><div class="stat-tile__label">Prontidão agora</div></div>
        <div class="stat-tile">
          <div class="stat-tile__value" style="color:${variacao > 0 ? "var(--color-success)" : variacao < 0 ? "var(--color-danger)" : "inherit"};">${variacao > 0 ? "+" : ""}${variacao}</div>
          <div class="stat-tile__label">Variação em ${semanas.length} semanas</div>
        </div>
        <div class="stat-tile"><div class="stat-tile__value">${atual.percentualAcerto !== null ? `${atual.percentualAcerto}%` : "—"}</div><div class="stat-tile__label">Acerto nesta semana</div></div>
      </div>

      <h3>Índice de Prontidão por semana</h3>
      ${renderGraficoBarras(semanas)}

      <h3 style="margin-top:32px;">Detalhamento semanal</h3>
      <div class="plan-queue">
        ${semanas
          .slice()
          .reverse()
          .map(renderLinhaSemana)
          .join("")}
      </div>
    </div>
  `;
}

function renderGraficoBarras(semanas) {
  const alturaMax = 120;
  return `
    <div class="card" style="margin-bottom:24px;">
      <div style="display:flex;align-items:flex-end;gap:8px;height:${alturaMax}px;">
        ${semanas
          .map((s) => {
            const altura = Math.max(4, Math.round((s.indicePreparo / 100) * alturaMax));
            return `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;" title="${escapeHtml(s.periodo)}: ${s.indicePreparo}/100">
              <div style="width:100%;max-width:32px;height:${altura}px;background:var(--color-accent);border-radius:4px 4px 0 0;"></div>
            </div>`;
          })
          .join("")}
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        ${semanas
          .map(
            (s) => `<div style="flex:1;text-align:center;font-size:var(--fs-sm);color:var(--color-text-secondary);">${escapeHtml(s.periodo)}</div>`
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderLinhaSemana(s) {
  return `
    <div class="card">
      <div class="list-card__top">
        <strong>${escapeHtml(s.periodo)}</strong>
        <span class="badge badge--accent">Prontidão ${s.indicePreparo}</span>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:8px;font-size:var(--fs-sm);color:var(--color-text-secondary);">
        <span>${s.totalQuestoes} questão${s.totalQuestoes === 1 ? "" : "ões"}${s.percentualAcerto !== null ? ` (${s.percentualAcerto}% de acerto)` : ""}</span>
        <span>${s.horasFoco}h em Modo Foco</span>
        ${s.totalSimulados ? `<span>${s.totalSimulados} simulado${s.totalSimulados > 1 ? "s" : ""} (média ${s.mediaSimulados}%)</span>` : ""}
      </div>
    </div>
  `;
}
