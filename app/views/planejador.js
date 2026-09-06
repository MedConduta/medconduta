import { gerarPlanoDoDia } from "../planner.js";
import { escapeHtml } from "../utils.js";
import { getPref, setPref } from "../db.js";

const PREF_HORAS = "planejador_horas";

export async function renderPlanejador(container) {
  const horasSalvas = await getPref(PREF_HORAS, 2);

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Planejador de estudo do dia</div>
        <h1>Quanto tempo você tem hoje?</h1>
        <p class="page-header__desc">Informe as horas disponíveis. A plataforma prioriza revisões espaçadas vencidas, depois temas novos/pendentes, e preenche o restante com questões de reforço.</p>
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
      <div class="stat-row">
        <div class="stat-tile"><div class="stat-tile__value">${plano.totalRevisoesVencidas}</div><div class="stat-tile__label">Revisões vencidas</div></div>
        <div class="stat-tile"><div class="stat-tile__value">${plano.totalTemasPendentes}</div><div class="stat-tile__label">Temas pendentes</div></div>
        <div class="stat-tile"><div class="stat-tile__value">${Math.round((plano.minutosUsados / 60) * 10) / 10}h</div><div class="stat-tile__label">Tempo planejado</div></div>
      </div>
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
