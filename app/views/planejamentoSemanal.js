import { escapeHtml } from "../utils.js";
import { getPlanejamentoSemanal } from "../planejamentoSemanal.js";

/**
 * Fase 15 — Planejamento Semanal: visão intermediária entre "Hoje" (a fila
 * de um dia) e o Cronograma (as fases até a prova) — quanto dá pra avançar
 * nos próximos 7 dias, no ritmo já configurado em "Hoje", e o quanto já foi
 * feito.
 */
export async function renderPlanejamentoSemanal(container) {
  container.innerHTML = `<div class="main__container"><div class="empty-state">Montando seu planejamento da semana...</div></div>`;

  const p = await getPlanejamentoSemanal();
  const progressoTemas = p.metaTemasNovos ? Math.min(100, Math.round((p.temasConcluidosSemana / p.metaTemasNovos) * 100)) : null;
  const progressoQuestoes = p.metaBlocosQuestoes ? Math.min(100, Math.round((p.questoesRespondidasSemana / (p.metaBlocosQuestoes * 5)) * 100)) : null;

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Planejamento Semanal</div>
        <h1>Sua semana</h1>
        <p class="page-header__desc">
          ${p.fase.id ? `Fase atual: <strong>${escapeHtml(p.fase.nome)}</strong>. ` : ""}
          Meta projetada com base nas ${p.horasSalvas}h/dia configuradas em <a href="#/residencia/planejador">Hoje</a> — não é uma cobrança, é só um norte pra semana.
        </p>
      </div>

      <h3>Meta da semana × já feito</h3>
      <div class="plan-queue" style="margin-bottom:24px;">
        <div class="card">
          <div class="list-card__top">
            <strong>Temas novos</strong>
            <span class="badge badge--accent">${p.temasConcluidosSemana} / ${p.metaTemasNovos}</span>
          </div>
          ${renderBarraProgresso(progressoTemas)}
        </div>
        <div class="card">
          <div class="list-card__top">
            <strong>Questões</strong>
            <span class="badge badge--accent">${p.questoesRespondidasSemana} / ${p.metaBlocosQuestoes * 5}</span>
          </div>
          ${renderBarraProgresso(progressoQuestoes)}
        </div>
        <div class="card">
          <div class="list-card__top">
            <strong>Modo Foco</strong>
          </div>
          <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">${p.horasFocoSemana}h nos últimos 7 dias.</p>
        </div>
      </div>

      <h3>Vencendo esta semana</h3>
      <div class="plan-queue">
        <a class="card card--interactive" href="#/residencia/revisao" style="text-decoration:none;color:inherit;">
          <div class="list-card__top">
            <strong>Flashcards</strong>
            <span class="badge${p.flashcardsVencendoSemana > 0 ? " badge--warning" : ""}">${p.flashcardsVencendoSemana}</span>
          </div>
          <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:4px;">Já vencidos ou vencendo nos próximos 7 dias.</p>
        </a>
        <a class="card card--interactive" href="#/residencia/erros" style="text-decoration:none;color:inherit;">
          <div class="list-card__top">
            <strong>Questões erradas (revisão)</strong>
            <span class="badge${p.errosVencendoSemana > 0 ? " badge--warning" : ""}">${p.errosVencendoSemana}</span>
          </div>
          <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:4px;">Já vencidas ou vencendo nos próximos 7 dias.</p>
        </a>
      </div>

      <p class="page-header__desc" style="margin-top:24px;">
        Pra agenda de hoje, priorizada automaticamente, veja <a href="#/residencia/planejador">Hoje</a>.
        Pra visão completa até a prova, veja o <a href="#/residencia/cronograma">Cronograma</a>.
      </p>
    </div>
  `;
}

function renderBarraProgresso(percentual) {
  if (percentual === null) return `<p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">Sem meta nesta fase.</p>`;
  return `
    <div style="background:var(--color-border);border-radius:999px;height:8px;margin-top:12px;overflow:hidden;">
      <div style="background:var(--color-accent);height:100%;width:${percentual}%;border-radius:999px;"></div>
    </div>
  `;
}
