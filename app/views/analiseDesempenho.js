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

      <h3 style="margin-top:32px;">Índice de Prontidão por semana</h3>
      ${renderGraficoBarras(semanas)}

      <h3 style="margin-top:32px;">Detalhamento semanal</h3>
      <ul class="card semana-lista">
        ${semanas
          .slice()
          .reverse()
          .map(renderLinhaSemana)
          .join("")}
      </ul>
    </div>
  `;
}

function renderGraficoBarras(semanas) {
  const ultima = semanas.length - 1;
  return `
    <div class="card evolucao-grafico" role="img" aria-label="Índice de Prontidão nas últimas ${semanas.length} semanas, de 0 a 100">
      <div class="evolucao-grafico__barras">
        ${semanas
          .map((s, i) => {
            const altura = Math.max(3, Math.round(s.indicePreparo));
            return `
            <div class="evolucao-grafico__coluna${i === ultima ? " is-atual" : ""}" title="${escapeHtml(s.periodo)}: ${s.indicePreparo}/100">
              <span class="evolucao-grafico__valor">${s.indicePreparo}</span>
              <div class="evolucao-grafico__barra" style="height:${altura}%;"></div>
            </div>`;
          })
          .join("")}
      </div>
      <div class="evolucao-grafico__rotulos">
        ${semanas
          .map((s, i) => `<span class="${i === ultima ? "is-atual" : ""}">${i === ultima ? "Atual" : escapeHtml(s.periodo.split("–")[0])}</span>`)
          .join("")}
      </div>
      <p class="evolucao-grafico__legenda">Data de início de cada semana · índice de 0 a 100</p>
    </div>
  `;
}

function renderLinhaSemana(s, i) {
  const detalhes = [
    `${s.totalQuestoes} ${s.totalQuestoes === 1 ? "questão" : "questões"}${s.percentualAcerto !== null ? ` · ${s.percentualAcerto}% de acerto` : ""}`,
    s.horasFoco ? `${s.horasFoco}h de foco` : "",
    s.totalSimulados ? `${s.totalSimulados} simulado${s.totalSimulados > 1 ? "s" : ""} (média ${s.mediaSimulados}%)` : "",
  ].filter(Boolean);
  return `
    <li class="semana-linha">
      <div class="semana-linha__periodo">
        <strong>${escapeHtml(s.periodo)}</strong>
        ${i === 0 ? '<span class="semana-linha__atual">esta semana</span>' : ""}
      </div>
      <div class="semana-linha__detalhes">${detalhes.map((d) => `<span>${d}</span>`).join("")}</div>
      <span class="badge badge--accent semana-linha__indice">Prontidão ${s.indicePreparo}</span>
    </li>
  `;
}
