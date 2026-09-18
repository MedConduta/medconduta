import { escapeHtml } from "../utils.js";
import { gerarDiagnostico, QUADRANTES } from "../prontidao.js";

export async function renderProntidao(container) {
  const { indicePreparo, porCategoria } = await gerarDiagnostico();

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Prontidão</div>
        <h1>Painel de prontidão</h1>
        <p class="page-header__desc">Cruza a incidência estimada de cada área na prova com o que você já estudou e seu desempenho real em questões. Ajuda a enxergar onde focar — não é uma previsão de nota nem de aprovação.</p>
      </div>

      ${renderIndice(indicePreparo)}

      <h3>Heatmap de fraquezas</h3>
      <p class="page-header__desc" style="margin-top:-8px;">Incidência × desempenho, em 5 níveis de prioridade — do que precisa de atenção agora ao que já está tranquilo.</p>
      ${renderHeatmap(porCategoria)}

      <h3 style="margin-top:32px;">Mapa de domínio</h3>
      <p class="page-header__desc" style="margin-top:-8px;">Detalhamento por área: quanto do conteúdo já foi concluído e qual seu desempenho em questões.</p>
      ${renderMapaDominio(porCategoria)}
    </div>
  `;
}

function renderIndice(indicePreparo) {
  return `
    <div class="card" style="margin-bottom:24px;text-align:center;">
      <div style="font-size:48px;font-weight:700;line-height:1;color:var(--color-accent);">${indicePreparo}</div>
      <div class="list-card__title" style="margin-top:4px;">Índice de Prontidão</div>
      <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;max-width:520px;margin-left:auto;margin-right:auto;">Equilíbrio entre conteúdo estudado e desempenho em questões, ponderado pelo peso estimado de cada área na prova. Sobe conforme você estuda E acerta mais questões nas áreas de maior incidência.</p>
    </div>
  `;
}

function renderHeatmap(porCategoria) {
  const grupos = new Map();
  for (const item of porCategoria) {
    const chave = item.quadrante.label;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(item);
  }

  return Object.values(QUADRANTES)
    .filter((q) => grupos.has(q.label))
    .map((quadrante) => {
      const itens = grupos.get(quadrante.label);
      return `
        <div class="card" style="margin-bottom:16px;">
          <div class="list-card__top">
            <strong>${quadrante.emoji} ${escapeHtml(quadrante.label)}</strong>
            <span style="color:var(--color-text-secondary);font-size:var(--fs-sm);">${itens.length} área${itens.length > 1 ? "s" : ""}</span>
          </div>
          <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin:4px 0 12px;">${escapeHtml(quadrante.descricao)}</p>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${itens
              .map(
                (item) => `
              <span class="badge" style="display:inline-flex;gap:6px;align-items:center;">
                ${escapeHtml(item.categoria)}
                <span style="color:var(--color-text-secondary);">${Math.round(item.desempenho * 100)}%</span>
              </span>`
              )
              .join("")}
          </div>
        </div>
      `;
    })
    .join("");
}

function renderMapaDominio(porCategoria) {
  return `
    <div class="plan-queue">
      ${porCategoria
        .map((item) => {
          const desempenhoLabel = item.semDados ? "sem questões respondidas" : `${Math.round(item.desempenho * 100)}% de acerto (${item.questoesRespondidas})`;
          return `
        <div class="card">
          <div class="list-card__top">
            <strong>${item.quadrante.emoji} ${escapeHtml(item.categoria)}</strong>
            <span class="badge">peso ${item.peso}/5</span>
          </div>
          <div style="margin-top:12px;">
            <div style="display:flex;justify-content:space-between;font-size:var(--fs-sm);color:var(--color-text-secondary);margin-bottom:4px;">
              <span>Conteúdo concluído</span>
              <span>${item.temasConcluidos}/${item.totalTemas} (${Math.round(item.completude * 100)}%)</span>
            </div>
            ${renderBarra(item.completude * 100, "var(--color-accent)")}
          </div>
          <div style="margin-top:10px;">
            <div style="display:flex;justify-content:space-between;font-size:var(--fs-sm);color:var(--color-text-secondary);margin-bottom:4px;">
              <span>Desempenho em questões</span>
              <span>${desempenhoLabel}</span>
            </div>
            ${renderBarra(item.desempenho * 100, item.semDados ? "var(--color-border-strong)" : "var(--color-success)")}
          </div>
        </div>`;
        })
        .join("")}
    </div>
  `;
}

function renderBarra(percentual, cor) {
  const pct = Math.max(0, Math.min(100, Math.round(percentual)));
  return `
    <div style="background:var(--color-border);border-radius:var(--radius-pill);height:6px;overflow:hidden;">
      <div style="width:${pct}%;height:100%;background:${cor};border-radius:var(--radius-pill);"></div>
    </div>
  `;
}
