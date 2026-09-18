import { gerarPlanoDoDia } from "../planner.js";
import { escapeHtml } from "../utils.js";
import { getPref, setPref } from "../db.js";
import { getConstancia } from "../constancia.js";

const PREF_HORAS = "planejador_horas";

export async function renderPlanejador(container) {
  const [horasSalvas, constancia] = await Promise.all([getPref(PREF_HORAS, 2), getConstancia()]);

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Hoje</div>
        <h1>Quanto tempo você tem hoje?</h1>
        <p class="page-header__desc">Informe as horas disponíveis. A plataforma monta a sequência de maior impacto: revisões espaçadas vencidas primeiro, depois os temas de maior prioridade (peso na prova × seu desempenho), e questões direcionadas ao seu maior gargalo atual.</p>
        ${constancia.streakAtual > 0 ? `<p style="margin-top:8px;font-size:var(--fs-sm);color:var(--color-text-secondary);">🔥 ${constancia.streakAtual} dia${constancia.streakAtual > 1 ? "s" : ""} seguido${constancia.streakAtual > 1 ? "s" : ""} estudando</p>` : ""}
      </div>

      <div class="card" style="margin-bottom:24px;">
        <div class="field">
          <label for="horas-range">Horas disponíveis hoje</label>
          <div class="range-row">
            <input type="range" id="horas-range" min="0.5" max="8" step="0.5" value="${horasSalvas}" style="flex:1;" />
            <output id="horas-output">${horasSalvas}h</output>
          </div>
        </div>
        <button class="btn btn--primary" id="btn-gerar">Gerar agenda do dia</button>
      </div>

      <div id="plano-resultado"></div>
    </div>
  `;

  const range = container.querySelector("#horas-range");
  const output = container.querySelector("#horas-output");
  const resultadoEl = container.querySelector("#plano-resultado");

  range.addEventListener("input", () => {
    output.textContent = `${range.value}h`;
  });

  async function gerar() {
    const horas = Number(range.value);
    await setPref(PREF_HORAS, horas);
    resultadoEl.innerHTML = `<div class="empty-state">Montando sua agenda...</div>`;
    const plano = await gerarPlanoDoDia(horas);
    renderResultado(plano);
  }

  function renderResultado(plano) {
    if (!plano.fila.length) {
      resultadoEl.innerHTML = `
        <div class="empty-state">
          <h2>Nada agendado</h2>
          <p>Aumente o tempo disponível ou volte mais tarde — tudo já está em dia.</p>
        </div>
      `;
      return;
    }

    resultadoEl.innerHTML = `
      ${renderFaixaFase(plano.fase, plano.diasRestantes)}
      ${renderModoEspecial(plano.modo)}
      <div class="stat-row">
        <div class="stat-tile"><div class="stat-tile__value">${plano.totalRevisoesVencidas}</div><div class="stat-tile__label">Revisões vencidas</div></div>
        <div class="stat-tile"><div class="stat-tile__value">${plano.totalTemasPendentes}</div><div class="stat-tile__label">Temas pendentes</div></div>
        <div class="stat-tile"><div class="stat-tile__value">${Math.round((plano.minutosUsados / 60) * 10) / 10}h</div><div class="stat-tile__label">Tempo planejado</div></div>
      </div>
      ${renderGargalos(plano.principaisGargalos)}
      <h3>Agenda de hoje</h3>
      <div class="plan-queue">
        ${plano.fila
          .map(
            (item, i) => `
          <a class="plan-item card--interactive" href="${item.link}" style="text-decoration:none;color:inherit;">
            <span class="plan-item__duration">${i + 1}. ${item.duracaoMin} min</span>
            <span>
              <strong>${escapeHtml(item.titulo)}</strong>
              <br /><span style="color:var(--color-text-secondary);font-size:var(--fs-sm);">${escapeHtml(item.detalhe)}</span>
            </span>
          </a>`
          )
          .join("")}
      </div>
      ${
        plano.minutosOciosos >= 10
          ? `<p class="page-header__desc" style="margin-top:16px;">Sobraram ~${plano.minutosOciosos} min no seu tempo disponível — aproveite para revisar flashcards já estudados ou ler um fluxograma.</p>`
          : ""
      }
    `;
  }

  container.querySelector("#btn-gerar").addEventListener("click", gerar);
  gerar();
}

function renderFaixaFase(fase, diasRestantes) {
  if (!fase.id) {
    return `
      <div class="card" style="margin-bottom:24px;">
        <div class="list-card__top">
          <strong>Fase da preparação não definida</strong>
        </div>
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:4px;">Configure a data da sua prova no <a href="#/residencia/cronograma">Cronograma</a> para a agenda de hoje se ajustar automaticamente conforme a proximidade da prova.</p>
      </div>
    `;
  }
  return `
    <div class="card" style="margin-bottom:24px;">
      <div class="list-card__top">
        <span class="badge badge--accent">${escapeHtml(fase.nome)}</span>
        <span style="color:var(--color-text-secondary);font-size:var(--fs-sm);">${diasRestantes >= 0 ? `${diasRestantes} dias até a prova` : "prova já passou"}</span>
      </div>
      <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">${escapeHtml(fase.descricao)} <a href="#/residencia/cronograma">Ver cronograma</a></p>
    </div>
  `;
}

function renderModoEspecial(modo) {
  if (modo === "recuperacao") {
    return `
      <div class="card" style="margin-bottom:24px;border-left:4px solid var(--color-warning);">
        <div class="list-card__top">
          <span class="badge badge--warning">⚠️ Modo Recuperação</span>
        </div>
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">Você está abaixo do conteúdo esperado pra essa altura da preparação. A agenda de hoje priorizou mais conteúdo novo pra ajudar a recuperar o atraso — sem deixar de lado revisões e questões.</p>
      </div>
    `;
  }
  if (modo === "reta-final") {
    return `
      <div class="card" style="margin-bottom:24px;border-left:4px solid var(--color-danger);">
        <div class="list-card__top">
          <span class="badge badge--danger">🔴 Modo Reta Final</span>
        </div>
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">Restam poucos dias até a prova. A agenda agora é quase só questões e revisão de erros — conteúdo novo só aparece se for um gargalo crítico.</p>
      </div>
    `;
  }
  return "";
}

function renderGargalos(gargalos) {
  if (!gargalos || !gargalos.length) return "";
  return `
    <div class="card" style="margin-bottom:24px;">
      <div class="list-card__title" style="margin-bottom:8px;">Seus maiores gargalos agora</div>
      <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-bottom:12px;">Cruza o peso estimado de cada área na prova com seu desempenho real em questões — por isso o conteúdo e as questões de hoje priorizam essas áreas.</p>
      <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;">
        ${gargalos
          .map(
            (g, i) => `
          <li style="display:flex;justify-content:space-between;gap:12px;">
            <span>${i + 1}. ${escapeHtml(g.categoria)}</span>
            <span style="color:var(--color-text-secondary);">${
              g.desempenho
                ? `${Math.round(g.desempenho.taxa * 100)}% de acerto (${g.desempenho.total} ${g.desempenho.total > 1 ? "questões" : "questão"})`
                : "sem questões respondidas ainda"
            }</span>
          </li>`
          )
          .join("")}
      </ul>
    </div>
  `;
}
