import { DURACAO_PADRAO_MIN, DURACAO_MIN_MIN, DURACAO_MAX_MIN, MIN_MINUTOS_PARA_REGISTRAR, registrarSessao } from "../foco.js";
import { getConstancia } from "../constancia.js";

export async function renderFoco(container) {
  let estado = "ocioso"; // ocioso | rodando | pausado | concluido
  let duracaoMinEscolhida = DURACAO_PADRAO_MIN;
  let segundosRestantes = 0;
  let inicioEm = null;
  let intervalId = null;

  function limpar() {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    window.removeEventListener("hashchange", aoSairDaTela);
  }

  // Se o usuário navegar pra outra tela no meio de uma sessão, ainda
  // registra o tempo já estudado (se passou do mínimo) em vez de descartar.
  function aoSairDaTela() {
    if (estado === "rodando" || estado === "pausado") {
      const minutosDecorridos = duracaoMinEscolhida - Math.ceil(segundosRestantes / 60);
      registrarSessao({ inicioEm, duracaoMin: minutosDecorridos, concluida: false });
    }
    limpar();
  }

  async function montar() {
    const constancia = await getConstancia();
    container.innerHTML = `
      <div class="main__container">
        <div class="page-header">
          <div class="page-header__eyebrow">Residência — Modo Foco</div>
          <h1>Sessão de estudo com foco</h1>
          <p class="page-header__desc">Escolha um tempo, comece o cronômetro e estude sem distração até ele zerar. Cada sessão concluída conta pra sua constância.</p>
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

    if (estado === "ocioso") {
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
      el.querySelector("#btn-iniciar").addEventListener("click", iniciar);
      return;
    }

    if (estado === "concluido") {
      el.innerHTML = `
        <div class="card" style="margin-bottom:24px;text-align:center;">
          <div class="list-card__title">Sessão concluída ✓</div>
          <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">${duracaoMinEscolhida} min de foco registrados.</p>
          <button class="btn btn--primary" id="btn-nova" style="margin-top:12px;">Nova sessão</button>
        </div>
      `;
      el.querySelector("#btn-nova").addEventListener("click", () => {
        estado = "ocioso";
        renderTimer();
      });
      return;
    }

    // rodando | pausado
    const min = String(Math.floor(segundosRestantes / 60)).padStart(2, "0");
    const seg = String(segundosRestantes % 60).padStart(2, "0");
    el.innerHTML = `
      <div class="card" style="margin-bottom:24px;text-align:center;">
        <div style="font-size:56px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--color-accent);">${min}:${seg}</div>
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:4px;">${estado === "pausado" ? "Pausado" : "Em andamento — foco total."}</p>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:16px;flex-wrap:wrap;">
          <button class="btn btn--secondary" id="btn-pausar">${estado === "pausado" ? "Retomar" : "Pausar"}</button>
          <button class="btn btn--secondary" id="btn-encerrar">Encerrar sessão</button>
        </div>
      </div>
    `;
    el.querySelector("#btn-pausar").addEventListener("click", alternarPausa);
    el.querySelector("#btn-encerrar").addEventListener("click", () => encerrar(false));
  }

  function iniciar() {
    estado = "rodando";
    segundosRestantes = duracaoMinEscolhida * 60;
    inicioEm = new Date().toISOString();
    window.addEventListener("hashchange", aoSairDaTela);
    renderTimer();
    intervalId = setInterval(tick, 1000);
  }

  function tick() {
    if (estado !== "rodando") return;
    segundosRestantes -= 1;
    if (segundosRestantes <= 0) {
      encerrar(true);
      return;
    }
    const el = container.querySelector("#foco-timer div[style*='font-size:56px']");
    if (el) {
      const min = String(Math.floor(segundosRestantes / 60)).padStart(2, "0");
      const seg = String(segundosRestantes % 60).padStart(2, "0");
      el.textContent = `${min}:${seg}`;
    }
  }

  function alternarPausa() {
    estado = estado === "pausado" ? "rodando" : "pausado";
    renderTimer();
  }

  async function encerrar(concluidaNaturalmente) {
    clearInterval(intervalId);
    intervalId = null;
    window.removeEventListener("hashchange", aoSairDaTela);
    const minutosDecorridos = concluidaNaturalmente ? duracaoMinEscolhida : duracaoMinEscolhida - Math.ceil(segundosRestantes / 60);
    await registrarSessao({ inicioEm, duracaoMin: minutosDecorridos, concluida: concluidaNaturalmente });
    if (minutosDecorridos >= MIN_MINUTOS_PARA_REGISTRAR) {
      duracaoMinEscolhida = minutosDecorridos;
      estado = "concluido";
    } else {
      estado = "ocioso";
    }
    await montar();
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
