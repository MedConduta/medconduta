import { gerarPlanoDoDia } from "../planner.js";
import { escapeHtml } from "../utils.js";
import { getPref, setPref } from "../db.js";
import { getConstancia } from "../constancia.js";

const PREF_HORAS = "planejador_horas";

// Fase 16 — Modo dia ruim: um atalho pra quando o usuário não tem tempo/
// energia nenhuma, mas ainda quer fazer o mínimo. Gera a agenda com um
// orçamento de tempo minúsculo, sem sobrescrever as horas configuradas —
// é um "só por hoje", não uma mudança de rotina. 20 min é o menor valor que
// garante pelo menos 1 item na fila mesmo com o teto de revisões de 40%
// (ver TETO_REVISOES_PCT em planner.js) — com menos que isso, o teto por si
// só já bloqueia até a menor revisão possível, e "dia ruim" viraria "nada".
const MINUTOS_DIA_RUIM = 20;

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
        <div class="btn-row">
          <button class="btn btn--primary" id="btn-gerar">Gerar agenda do dia</button>
          <button class="btn btn--secondary" id="btn-dia-ruim">😩 Dia ruim — só ${MINUTOS_DIA_RUIM} min</button>
        </div>
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

  async function gerarDiaRuim() {
    resultadoEl.innerHTML = `<div class="empty-state">Montando o mínimo que vale a pena hoje...</div>`;
    const plano = await gerarPlanoDoDia(MINUTOS_DIA_RUIM / 60);
    renderResultado(plano, { diaRuim: true });
  }

  function renderResultado(plano, { diaRuim = false } = {}) {
    const avisoDiaRuim = diaRuim
      ? `<div class="card" style="margin-bottom:24px;border-left:4px solid var(--color-accent);">
          <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);">Tudo bem ter dias ruins — o importante é não zerar. Isso aqui é só o essencial pra manter o ritmo hoje; amanhã a agenda volta ao normal.</p>
        </div>`
      : "";

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
      ${avisoDiaRuim}
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
              ${item.semanaCurso ? `<span class="badge badge--accent" style="margin-left:6px;">📘 Semana ${item.semanaCurso} do Curso</span>` : ""}
              <br /><span style="color:var(--color-text-secondary);font-size:var(--fs-sm);">${escapeHtml(item.detalhe)}</span>
            </span>
          </a>`
          )
          .join("")}
      </div>
      ${
        plano.minutosOciosos >= 10
          ? `<p class="page-header__desc" style="margin-top:16px;">Sobraram ~${plano.minutosOciosos} min no seu tempo disponível — aproveite para revisar um tema do Curso ou ler um fluxograma.</p>`
          : ""
      }
    `;
  }

  container.querySelector("#btn-gerar").addEventListener("click", gerar);
  container.querySelector("#btn-dia-ruim").addEventListener("click", gerarDiaRuim);
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
  if (modo === "emergencia") {
    return `
      <div class="card" style="margin-bottom:24px;border-left:4px solid var(--color-danger);">
        <div class="list-card__top">
          <span class="badge badge--danger">🆘 Plano de Emergência</span>
        </div>
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">O atraso está bem maior que o normal. A agenda de hoje foca quase todo o tempo em conteúdo novo e só nos temas de maior prioridade — os de menor prioridade ficam de fora até você recuperar terreno.</p>
      </div>
    `;
  }
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
  if (modo === "consolidacao") {
    return `
      <div class="card" style="margin-bottom:24px;border-left:4px solid var(--color-accent);">
        <div class="list-card__top">
          <span class="badge badge--accent">🧘 Semana de Consolidação</span>
        </div>
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">Sem atraso no momento — a cada 4 semanas entra uma semana pra respirar e fixar o que já foi visto, quase sem conteúdo novo hoje.</p>
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
