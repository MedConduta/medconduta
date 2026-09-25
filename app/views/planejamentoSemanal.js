import { getPlanejamentoSemanal } from "../planejamentoSemanal.js";

/**
 * Planejamento Semanal: o que fazer NESTA semana, direto do cronograma real
 * do Curso — aulas a ler/ver, questões dos temas da semana e revisões do
 * ciclo do Curso agendadas pra cair dentro dela (ver planejamentoSemanal.js).
 */
export async function renderPlanejamentoSemanal(container) {
  container.innerHTML = `<div class="main__container"><div class="empty-state">Montando seu planejamento da semana...</div></div>`;

  const p = await getPlanejamentoSemanal();
  const progressoAulas = p.aulasTotal ? Math.round((p.aulasConcluidas / p.aulasTotal) * 100) : null;
  const progressoQuestoes = p.questoesMetaTemas ? Math.round((p.questoesFeitasTemas / p.questoesMetaTemas) * 100) : null;

  const periodo = p.semana?.dataInicio ? formatarPeriodo(p.semana.dataInicio) : null;

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Planejamento Semanal</div>
        <h1>Sua semana</h1>
        <p class="page-header__desc">
          ${
            p.semana
              ? `Semana ${p.semana.numero} do <a href="#/residencia/curso">Curso</a>${periodo ? ` (${periodo})` : ""} — o que falta ler, praticar e revisar até ela fechar.`
              : `Ainda sem cronograma do Curso disponível — veja o <a href="#/residencia/curso">Curso</a> pra começar.`
          }
        </p>
      </div>

      <h3>Sua semana × já feito</h3>
      <div class="plan-queue" style="margin-bottom:24px;">
        <div class="card">
          <div class="list-card__top">
            <strong>Aulas</strong>
            <span class="badge badge--accent">${p.aulasConcluidas} / ${p.aulasTotal}</span>
          </div>
          <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:4px;">Temas programados pra esta semana no Curso.</p>
          ${renderBarraProgresso(progressoAulas)}
        </div>
        <div class="card">
          <div class="list-card__top">
            <strong>Questões</strong>
            <span class="badge badge--accent">${p.questoesFeitasTemas} / ${p.questoesMetaTemas}</span>
          </div>
          <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:4px;">Temas da semana com questões já praticadas.</p>
          ${renderBarraProgresso(progressoQuestoes)}
        </div>
        <a class="card card--interactive" href="#/residencia/curso" style="text-decoration:none;color:inherit;">
          <div class="list-card__top">
            <strong>Revisões</strong>
            <span class="badge${p.revisoesCursoSemana > 0 ? " badge--warning" : ""}">${p.revisoesCursoSemana}</span>
          </div>
          <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:4px;">Ciclo de revisão do Curso (3/5/7/15/30 dias) agendado pra cair nesta semana.</p>
        </a>
      </div>

      <h3>Vencendo esta semana</h3>
      <div class="plan-queue">
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
  if (percentual === null) return `<p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">Nada programado nesta semana.</p>`;
  return `
    <div style="background:var(--color-border);border-radius:999px;height:8px;margin-top:12px;overflow:hidden;">
      <div style="background:var(--color-accent);height:100%;width:${Math.min(100, percentual)}%;border-radius:999px;"></div>
    </div>
  `;
}

function formatarPeriodo(dataInicioIso) {
  const [ano, mes, dia] = dataInicioIso.split("-").map(Number);
  const inicio = new Date(ano, mes - 1, dia);
  const fim = new Date(ano, mes - 1, dia + 6);
  const fmt = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `${fmt(inicio)} – ${fmt(fim)}`;
}
