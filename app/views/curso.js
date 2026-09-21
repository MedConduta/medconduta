import { escapeHtml } from "../utils.js";
import { gerarCurso, TEMAS_POR_SEMANA } from "../curso.js";

/**
 * Curso completo — a grade curricular inteira (todos os temas), em ordem
 * fixa e dividida em semanas, como uma planilha de cronograma. Complementa
 * Cronograma (as 5 fases até a prova) e Planejamento Semanal (a meta da
 * semana atual): aqui é o mapa do curso inteiro, do início ao fim.
 */
export async function renderCurso(container) {
  container.innerHTML = `<div class="main__container"><div class="empty-state">Montando o curso completo...</div></div>`;

  const curso = await gerarCurso();
  const semanaAtual = curso.semanas.find((s) => s.percentual < 100) || null;

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Curso</div>
        <h1>Curso completo</h1>
        <p class="page-header__desc">Todos os temas do currículo, na ordem sugerida de estudo, divididos em ${curso.semanas.length} semanas (${TEMAS_POR_SEMANA} temas novos/semana). Marque os temas como estudados em <a href="#/residencia/conteudo">Conteúdo</a> — o progresso aparece aqui automaticamente.</p>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <div class="list-card__top" style="margin-bottom:8px;">
          <strong>Progresso do curso</strong>
          <span class="badge badge--accent">${curso.totalConcluidos} / ${curso.totalTemas} temas</span>
        </div>
        ${renderBarraProgresso(curso.percentualGeral)}
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:12px;">
          ${semanaAtual ? `Você está na <strong>semana ${semanaAtual.numero}</strong> de ${curso.semanas.length}.` : "Currículo completo! 🎉"}
        </p>
      </div>

      <div class="content-tree">
        ${curso.semanas.map((semana) => renderSemana(semana, semana === semanaAtual)).join("")}
      </div>
    </div>
  `;
}

function renderSemana(semana, ehAtual) {
  return `
    <details class="card content-area"${ehAtual ? " open" : ""}>
      <summary class="content-area__title">
        Semana ${semana.numero}
        ${ehAtual ? '<span class="badge badge--accent">Você está aqui</span>' : ""}
        <span class="content-area__count">${semana.concluidos}/${semana.total}</span>
      </summary>
      ${renderBarraProgresso(semana.percentual)}
      <ul class="content-list" style="margin-top:12px;">
        ${semana.temas.map(renderTemaItem).join("")}
      </ul>
    </details>
  `;
}

function renderTemaItem(tema) {
  return `
    <li>
      <a class="content-list__item" href="#/residencia/conteudo/${tema.id}">
        <span class="content-list__title">${tema.concluido ? "✓ " : ""}${escapeHtml(tema.titulo)}</span>
        <span style="color:var(--color-text-secondary);font-size:var(--fs-xs);white-space:nowrap;">${escapeHtml(tema.categoria)}</span>
      </a>
    </li>
  `;
}

function renderBarraProgresso(percentual) {
  return `
    <div style="background:var(--color-border);border-radius:999px;height:8px;overflow:hidden;">
      <div style="background:var(--color-accent);height:100%;width:${percentual}%;border-radius:999px;"></div>
    </div>
  `;
}
