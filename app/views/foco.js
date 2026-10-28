import {
  DURACAO_PADRAO_MIN,
  DURACAO_MIN_MIN,
  DURACAO_MAX_MIN,
  MIN_MINUTOS_PARA_REGISTRAR,
  getSessaoAtiva,
  onSessaoFoco,
  iniciarSessao,
  alternarPausaSessao,
  encerrarSessao,
  formatarMMSS,
} from "../foco.js";
import { getConstancia } from "../constancia.js";

// O cronômetro em si vive em foco.js e continua contando fora desta tela
// (a barra superior mostra o tempo). Aqui é só o painel de controle.
let duracaoMinEscolhida = DURACAO_PADRAO_MIN;

export async function renderFoco(container) {
  let concluidaMin = null; // minutos da sessão que acabou de terminar (tela "concluída")
  let ultimoEstado = getSessaoAtiva()?.estado || "ocioso";

  const desligar = onSessaoFoco((atual, fim) => {
    if (!container.querySelector("#foco-timer")) return desligar();
    if (fim) {
      concluidaMin = fim.minutos >= MIN_MINUTOS_PARA_REGISTRAR ? fim.minutos : null;
      ultimoEstado = "ocioso";
      montar();
      return;
    }
    const estado = atual?.estado || "ocioso";
    if (estado !== ultimoEstado) {
      ultimoEstado = estado;
      renderTimer();
      return;
    }
    const el = container.querySelector("#foco-relogio");
    if (el && atual) el.textContent = formatarMMSS(atual.segundosRestantes);
  });
  const aoSair = () => {
    desligar();
    window.removeEventListener("hashchange", aoSair);
  };
  window.addEventListener("hashchange", aoSair);

  async function montar() {
    const constancia = await getConstancia();
    container.innerHTML = `
      <div class="main__container">
        <div class="page-header">
          <div class="page-header__eyebrow">Residência — Modo Foco</div>
          <h1>Sessão de estudo com foco</h1>
          <p class="page-header__desc">Escolha um tempo e comece o cronômetro. Ele continua contando enquanto você estuda em outras telas — o tempo fica visível ao lado do relógio, no alto da página. Cada sessão concluída conta pra sua constância.</p>
        </div>

        <div id="foco-timer"></div>

        ${renderConstancia(constancia)}
      </div>
    `;
    renderTimer();
  }

  function renderTimer() {
    const el = container.querySelector("#foco-timer");
    if (!el) return;
    const atual = getSessaoAtiva();

    if (!atual && concluidaMin !== null) {
      el.innerHTML = `
        <div class="card" style="margin-bottom:24px;text-align:center;">
          <div class="list-card__title">Sessão concluída ✓</div>
          <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">${concluidaMin} min de foco registrados.</p>
          <button class="btn btn--primary" id="btn-nova" style="margin-top:12px;">Nova sessão</button>
        </div>
      `;
      el.querySelector("#btn-nova").addEventListener("click", () => {
        concluidaMin = null;
        renderTimer();
      });
      return;
    }

    if (!atual) {
      el.innerHTML = `
        <div class="card" style="margin-bottom:24px;">
          <div class="field">
            <label for="foco-range">Duração da sessão</label>
            <div class="range-row">
              <input type="range" id="foco-range" min="${DURACAO_MIN_MIN}" max="${DURACAO_MAX_MIN}" step="5" value="${duracaoMinEscolhida}" style="flex:1;" />
              <output id="foco-output">${duracaoMinEscolhida} min</output>
            </div>
          </div>
          <button class="btn btn--primary" id="btn-iniciar">Iniciar sessão</button>
        </div>
      `;
      const range = el.querySelector("#foco-range");
      const output = el.querySelector("#foco-output");
      range.addEventListener("input", () => {
        duracaoMinEscolhida = Number(range.value);
        output.textContent = `${duracaoMinEscolhida} min`;
      });
      el.querySelector("#btn-iniciar").addEventListener("click", () => iniciarSessao(duracaoMinEscolhida));
      return;
    }

    // rodando | pausado
    const pausado = atual.estado === "pausado";
    el.innerHTML = `
      <div class="card" style="margin-bottom:24px;text-align:center;">
        <div id="foco-relogio" style="font-size:56px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--color-accent);">${formatarMMSS(atual.segundosRestantes)}</div>
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:4px;">${pausado ? "Pausado" : "Em andamento — pode ir estudar em outras telas, o tempo continua contando."}</p>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:16px;flex-wrap:wrap;">
          <button class="btn btn--secondary" id="btn-pausar">${pausado ? "Retomar" : "Pausar"}</button>
          <button class="btn btn--secondary" id="btn-encerrar">Encerrar sessão</button>
        </div>
      </div>
    `;
    el.querySelector("#btn-pausar").addEventListener("click", alternarPausaSessao);
    el.querySelector("#btn-encerrar").addEventListener("click", () => encerrarSessao(false));
  }

  await montar();
}

function renderConstancia(c) {
  return `
    <h3>Sua constância</h3>
    <div class="stat-row">
      <div class="stat-tile"><div class="stat-tile__value">${c.streakAtual}${c.streakAtual > 0 ? " 🔥" : ""}</div><div class="stat-tile__label">Dias seguidos</div></div>
      <div class="stat-tile"><div class="stat-tile__value">${c.totalDiasAtivos}</div><div class="stat-tile__label">Dias ativos no total</div></div>
      <div class="stat-tile"><div class="stat-tile__value">${Math.round((c.totalMinutosFoco / 60) * 10) / 10}h</div><div class="stat-tile__label">Tempo em Modo Foco</div></div>
    </div>
  `;
}
