import { escapeHtml } from "../utils.js";
import {
  TAMANHOS_DISPONIVEIS,
  TAMANHO_PADRAO,
  MIN_POR_QUESTAO,
  selecionarQuestoesSimulado,
  registrarResultadoSimulado,
  getHistoricoSimulados,
} from "../simulados.js";

export async function renderSimulados(container) {
  let estado = "config"; // config | rodando | resultado
  let tamanhoEscolhido = TAMANHO_PADRAO;
  let questoes = [];
  const respostasPorQuestaoId = new Map();
  let indiceAtual = 0;
  let segundosRestantes = 0;
  let iniciadoEm = null;
  let intervalId = null;
  let resultado = null;

  function limparTimer() {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    window.removeEventListener("hashchange", limparTimer);
  }

  async function montar() {
    if (estado === "config") {
      const historico = await getHistoricoSimulados();
      container.innerHTML = `
        <div class="main__container">
          <div class="page-header">
            <div class="page-header__eyebrow">Residência — Simulados</div>
            <h1>Prova simulada</h1>
            <p class="page-header__desc">Questões sorteadas na mesma proporção de incidência estimada das áreas na prova real, com tempo cronometrado e sem feedback imediato — só no final, como numa prova de verdade.</p>
          </div>

          <div class="card" style="margin-bottom:24px;">
            <div class="field">
              <label for="simulado-tamanho">Número de questões</label>
              <select id="simulado-tamanho">
                ${TAMANHOS_DISPONIVEIS.map((t) => `<option value="${t}" ${t === tamanhoEscolhido ? "selected" : ""}>${t} questões (~${Math.round(t * MIN_POR_QUESTAO)} min)</option>`).join("")}
              </select>
            </div>
            <button class="btn btn--primary" id="btn-iniciar">Iniciar simulado</button>
          </div>

          ${renderHistorico(historico)}
        </div>
      `;
      container.querySelector("#simulado-tamanho").addEventListener("change", (e) => {
        tamanhoEscolhido = Number(e.target.value);
      });
      container.querySelector("#btn-iniciar").addEventListener("click", iniciarSimulado);
      return;
    }

    if (estado === "rodando") {
      renderProva();
      return;
    }

    renderResultado();
  }

  async function iniciarSimulado() {
    container.innerHTML = `<div class="main__container"><div class="empty-state">Montando seu simulado...</div></div>`;
    questoes = await selecionarQuestoesSimulado(tamanhoEscolhido);
    respostasPorQuestaoId.clear();
    indiceAtual = 0;
    segundosRestantes = Math.round(tamanhoEscolhido * MIN_POR_QUESTAO * 60);
    iniciadoEm = new Date().toISOString();
    estado = "rodando";
    window.addEventListener("hashchange", limparTimer);
    intervalId = setInterval(tick, 1000);
    await montar();
  }

  function tick() {
    segundosRestantes -= 1;
    const timerEl = container.querySelector("#simulado-timer");
    if (timerEl) timerEl.textContent = formatarTempo(segundosRestantes);
    if (segundosRestantes <= 0) finalizar();
  }

  function renderProva() {
    const questao = questoes[indiceAtual];
    const respondida = respostasPorQuestaoId.get(questao.id);

    container.innerHTML = `
      <div class="main__container">
        <div class="page-header">
          <div class="page-header__eyebrow">Simulado — Questão ${indiceAtual + 1} de ${questoes.length}</div>
          <h1 id="simulado-timer" style="font-variant-numeric:tabular-nums;">${formatarTempo(segundosRestantes)}</h1>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">
          ${questoes
            .map((q, i) => {
              const marcada = respostasPorQuestaoId.has(q.id);
              const atual = i === indiceAtual;
              return `<button class="btn ${atual ? "btn--primary" : "btn--secondary"}" data-nav="${i}" style="min-width:36px;padding:6px;${marcada && !atual ? "border-color:var(--color-accent);" : ""}">${i + 1}</button>`;
            })
            .join("")}
        </div>

        <div class="card" style="margin-bottom:24px;">
          <div class="list-card__top">
            <span class="badge badge--accent">${escapeHtml(questao.tema)}</span>
            <span class="badge">${escapeHtml(questao.banca)} · ${questao.ano}</span>
          </div>
          <p style="font-weight:500;margin:12px 0;">${escapeHtml(questao.enunciado)}</p>
          <div class="opcoes">
            ${questao.alternativas
              .map(
                (alt, i) => `
              <button class="question-option${respondida === i ? " is-selected" : ""}" data-i="${i}" style="${respondida === i ? "border-color:var(--color-accent);background:var(--color-accent-soft);" : ""}">
                <span class="question-option__letter">${String.fromCharCode(65 + i)}</span>
                <span>${escapeHtml(alt)}</span>
              </button>`
              )
              .join("")}
          </div>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:space-between;">
          <div style="display:flex;gap:12px;">
            <button class="btn btn--secondary" id="btn-anterior" ${indiceAtual === 0 ? "disabled" : ""}>Anterior</button>
            <button class="btn btn--secondary" id="btn-proxima" ${indiceAtual === questoes.length - 1 ? "disabled" : ""}>Próxima</button>
          </div>
          <button class="btn btn--primary" id="btn-finalizar">Finalizar simulado</button>
        </div>
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:12px;">${respostasPorQuestaoId.size}/${questoes.length} respondidas até agora.</p>
      </div>
    `;

    container.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        indiceAtual = Number(btn.dataset.nav);
        renderProva();
      });
    });
    container.querySelectorAll(".question-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        respostasPorQuestaoId.set(questao.id, Number(btn.dataset.i));
        renderProva();
      });
    });
    container.querySelector("#btn-anterior")?.addEventListener("click", () => {
      indiceAtual -= 1;
      renderProva();
    });
    container.querySelector("#btn-proxima")?.addEventListener("click", () => {
      indiceAtual += 1;
      renderProva();
    });
    container.querySelector("#btn-finalizar").addEventListener("click", () => finalizar());
  }

  async function finalizar() {
    limparTimer();
    const duracaoUsadaMin = Math.round(tamanhoEscolhido * MIN_POR_QUESTAO - segundosRestantes / 60);
    resultado = await registrarResultadoSimulado({
      questoes,
      respostasPorQuestaoId,
      iniciadoEm,
      duracaoUsadaMin: Math.max(0, duracaoUsadaMin),
    });
    estado = "resultado";
    await montar();
  }

  function renderResultado() {
    container.innerHTML = `
      <div class="main__container">
        <div class="page-header">
          <div class="page-header__eyebrow">Residência — Simulados</div>
          <h1>Resultado do simulado</h1>
        </div>

        <div class="card" style="margin-bottom:24px;text-align:center;">
          <div style="font-size:48px;font-weight:700;line-height:1;color:var(--color-accent);">${resultado.percentual}%</div>
          <div class="list-card__title" style="margin-top:4px;">${resultado.acertos} de ${resultado.tamanho} questões</div>
          <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">${resultado.duracaoUsadaMin} min usados de ~${Math.round(resultado.tamanho * MIN_POR_QUESTAO)} min disponíveis.</p>
        </div>

        <h3>Desempenho por área</h3>
        <div class="plan-queue">
          ${resultado.porCategoria
            .sort((a, b) => b.total - a.total)
            .map(
              (c) => `
            <div class="plan-item">
              <span class="plan-item__duration">${Math.round((c.acertos / c.total) * 100)}%</span>
              <span>${escapeHtml(c.categoria)} — ${c.acertos}/${c.total}</span>
            </div>`
            )
            .join("")}
        </div>

        <h3 style="margin-top:24px;">Revisão questão a questão</h3>
        <div class="plan-queue">
          ${questoes
            .map((questao, i) => {
              const escolhida = respostasPorQuestaoId.get(questao.id);
              const acertou = escolhida === questao.correta;
              return `
            <div class="card">
              <div class="list-card__top">
                <span class="badge badge--accent">${escapeHtml(questao.tema)}</span>
                <strong style="color:${acertou ? "var(--color-success)" : "var(--color-danger)"};">${i + 1}. ${acertou ? "Correto" : escolhida === undefined ? "Não respondida" : "Incorreto"}</strong>
              </div>
              <p style="font-weight:500;margin:12px 0;">${escapeHtml(questao.enunciado)}</p>
              <div class="opcoes">
                ${questao.alternativas
                  .map((alt, ai) => {
                    let estilo = "";
                    if (ai === questao.correta) estilo = "border-color:var(--color-success);background:var(--color-success-soft);";
                    else if (ai === escolhida) estilo = "border-color:var(--color-danger);background:var(--color-danger-soft);";
                    return `<div class="question-option is-disabled" style="${estilo}"><span class="question-option__letter">${String.fromCharCode(65 + ai)}</span><span>${escapeHtml(alt)}</span></div>`;
                  })
                  .join("")}
              </div>
              <div class="explanation-box" style="margin-top:12px;">${escapeHtml(questao.comentario)}</div>
            </div>`;
            })
            .join("")}
        </div>

        <button class="btn btn--primary" id="btn-novo-simulado" style="margin-top:24px;">Novo simulado</button>
      </div>
    `;
    container.querySelector("#btn-novo-simulado").addEventListener("click", () => {
      estado = "config";
      montar();
    });
  }

  await montar();
}

function formatarTempo(segundosTotais) {
  const s = Math.max(0, segundosTotais);
  const horas = Math.floor(s / 3600);
  const min = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const mm = String(min).padStart(2, "0");
  const ss = String(seg).padStart(2, "0");
  return horas > 0 ? `${horas}:${mm}:${ss}` : `${mm}:${ss}`;
}

function renderHistorico(historico) {
  if (!historico.length) return "";
  return `
    <h3>Simulados anteriores</h3>
    <div class="plan-queue">
      ${historico
        .slice(0, 10)
        .map(
          (s) => `
        <div class="plan-item">
          <span class="plan-item__duration">${s.percentual}%</span>
          <span>${s.acertos}/${s.tamanho} questões — ${new Date(s.finalizadoEm).toLocaleDateString("pt-BR")}</span>
        </div>`
        )
        .join("")}
    </div>
  `;
}
