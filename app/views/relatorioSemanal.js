import { escapeHtml, renderMarkdown } from "../utils.js";
import { getRelatorioSemanal, resumoParaIA } from "../relatorioSemanal.js";
import { askAI } from "../ai.js";
import { QUADRANTES } from "../prontidao.js";

/**
 * Fase 15 — Relatório Semanal: um resumo automático dos últimos 7 dias,
 * pronto assim que a tela abre (nada digitado à mão). O comentário em texto
 * livre da IA é opt-in (botão), não automático — mantém o custo de IA em
 * zero a menos que o usuário peça (ver relatorioSemanal.js).
 */
export async function renderRelatorioSemanal(container) {
  container.innerHTML = `<div class="main__container"><div class="empty-state">Montando seu relatório...</div></div>`;

  const relatorio = await getRelatorioSemanal();
  const { semanaAtual, semanaAnterior, maioresGargalos } = relatorio;
  const delta = semanaAnterior ? semanaAtual.indicePreparo - semanaAnterior.indicePreparo : null;

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Relatório Semanal</div>
        <h1>Sua semana em resumo</h1>
        <p class="page-header__desc">Automático — reúne tudo que você fez nos últimos 7 dias, sem precisar preencher nada.</p>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <p style="font-size:var(--fs-md);line-height:1.6;">${escapeHtml(relatorio.narrativa)}</p>
      </div>

      <div class="stat-row">
        <div class="stat-tile"><div class="stat-tile__value">${semanaAtual.temasConcluidos}</div><div class="stat-tile__label">Temas concluídos</div></div>
        <div class="stat-tile"><div class="stat-tile__value">${semanaAtual.totalQuestoes}</div><div class="stat-tile__label">Questões${semanaAtual.percentualAcerto !== null ? ` (${semanaAtual.percentualAcerto}% acerto)` : ""}</div></div>
        <div class="stat-tile"><div class="stat-tile__value">${semanaAtual.horasFoco}h</div><div class="stat-tile__label">Modo Foco</div></div>
        <div class="stat-tile">
          <div class="stat-tile__value" style="color:${delta === null ? "inherit" : delta > 0 ? "var(--color-success)" : delta < 0 ? "var(--color-danger)" : "inherit"};">${delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}`}</div>
          <div class="stat-tile__label">Variação da Prontidão</div>
        </div>
      </div>

      ${
        maioresGargalos.length
          ? `
        <h3>Pontos de atenção da semana</h3>
        <div class="plan-queue" style="margin-bottom:24px;">
          ${maioresGargalos
            .map(
              (g) => `
            <div class="card">
              <div class="list-card__top">
                <strong>${escapeHtml(g.categoria)}</strong>
                <span class="badge badge--${g.quadrante === QUADRANTES.critico ? "danger" : "warning"}">${g.quadrante.emoji} ${escapeHtml(g.quadrante.label)}</span>
              </div>
            </div>`
            )
            .join("")}
        </div>`
          : ""
      }

      <div class="card" id="card-ia-comentario">
        <div class="list-card__top">
          <strong>Comentário em texto da IA</strong>
        </div>
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin:8px 0 16px;">Opcional — pede ao assistente um comentário personalizado sobre sua semana, com base nos mesmos números acima.</p>
        <button class="btn btn--secondary" id="btn-comentario-ia">Pedir comentário à IA</button>
        <div id="comentario-ia-resultado" style="margin-top:16px;"></div>
      </div>
    </div>
  `;

  container.querySelector("#btn-comentario-ia").addEventListener("click", async () => {
    const btn = container.querySelector("#btn-comentario-ia");
    const resultadoEl = container.querySelector("#comentario-ia-resultado");
    btn.disabled = true;
    resultadoEl.innerHTML = `<p style="color:var(--color-text-secondary);">Pensando...</p>`;
    try {
      const resposta = await askAI({
        pergunta: "Comente minha semana de estudo em 2-3 frases curtas, direto ao ponto, com um tom encorajador mas honesto sobre os pontos de atenção.",
        contexto: resumoParaIA(relatorio),
        tarefa: "comentar o relatório semanal de estudo do usuário",
      });
      resultadoEl.innerHTML = renderMarkdown(resposta || "Não obtive resposta do modelo.");
    } catch (err) {
      resultadoEl.innerHTML = `<p style="color:var(--color-danger);">⚠ ${escapeHtml(err.message)}</p>`;
    } finally {
      btn.disabled = false;
    }
  });
}
