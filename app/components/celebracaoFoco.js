import { getAll } from "../db.js";
import { getConstancia } from "../constancia.js";
import { escapeHtml } from "../utils.js";

/**
 * Aviso de parabéns que cobre a tela quando uma sessão do Modo Foco chega ao
 * fim, em qualquer tela: confete, o tempo de foco e as figurinhas ganhas.
 */

const FIGURINHAS_SORTEIO = [
  ["🩺", "Plantonista"],
  ["🧠", "Neuro em dia"],
  ["🫀", "Coração forte"],
  ["💊", "Dose certa"],
  ["🧬", "DNA de aprovado"],
  ["🔬", "Olho clínico"],
  ["🦴", "Firme como osso"],
  ["🚑", "Pronto pra residência"],
  ["📚", "Rato de biblioteca"],
  ["🥇", "Rumo à nota máxima"],
];

const CORES_CONFETE = ["#2f6bff", "#0f7b45", "#f5a524", "#e5484d", "#8e4ec6", "#12a5b5"];

function figurinhasDaSessao({ minutos, streak, sessoesHoje }) {
  const lista = [];
  if (minutos >= 50) lista.push(["🏆", "Maratonista", `${minutos} min sem parar`]);
  else if (minutos >= 25) lista.push(["🔥", "Pomodoro completo", `${minutos} min de foco`]);
  else lista.push(["🌱", "Aquecimento", `${minutos} min de foco`]);

  if (sessoesHoje <= 1) lista.push(["☀️", "Primeira do dia", "abriu o dia estudando"]);
  else lista.push(["🎯", `${sessoesHoje}ª sessão hoje`, "constância é tudo"]);

  if (streak >= 7) lista.push(["📅", "Semana de ferro", `${streak} dias seguidos`]);
  else if (streak >= 3) lista.push(["⚡", "Embalado", `${streak} dias seguidos`]);

  const [emoji, nome] = FIGURINHAS_SORTEIO[Math.floor(Math.random() * FIGURINHAS_SORTEIO.length)];
  lista.push([emoji, nome, "figurinha da sessão"]);
  return lista;
}

function tocarSom() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      const t = ctx.currentTime + i * 0.12;
      osc.type = "sine";
      osc.frequency.value = freq;
      ganho.gain.setValueAtTime(0.0001, t);
      ganho.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      ganho.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.connect(ganho).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    /* sem áudio: o aviso visual basta */
  }
}

function confete() {
  return Array.from({ length: 48 }, (_, i) => {
    const cor = CORES_CONFETE[i % CORES_CONFETE.length];
    const esquerda = Math.random() * 100;
    const atraso = Math.random() * 0.8;
    const duracao = 2.2 + Math.random() * 1.6;
    const giro = Math.round(Math.random() * 720 - 360);
    return `<span class="celebracao__confete" style="left:${esquerda}%;background:${cor};animation-delay:${atraso}s;animation-duration:${duracao}s;--giro:${giro}deg;"></span>`;
  }).join("");
}

export async function mostrarCelebracaoFoco({ minutos }) {
  document.querySelector(".celebracao")?.remove();

  let streak = 0;
  let totalMinutos = 0;
  let sessoesHoje = 1;
  try {
    const [c, sessoes] = await Promise.all([getConstancia(), getAll("sessoes")]);
    streak = c.streakAtual;
    totalMinutos = c.totalMinutosFoco;
    const hoje = new Date().toISOString().slice(0, 10);
    sessoesHoje = Math.max(1, sessoes.filter((s) => (s.inicioEm || "").slice(0, 10) === hoje).length);
  } catch {
    /* sem rede: mostra só o tempo desta sessão */
  }

  const figurinhas = figurinhasDaSessao({ minutos, streak, sessoesHoje });
  const horasTotais = Math.round((totalMinutos / 60) * 10) / 10;

  const el = document.createElement("div");
  el.className = "celebracao";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-labelledby", "celebracao-titulo");
  el.innerHTML = `
    <div class="celebracao__chuva" aria-hidden="true">${confete()}</div>
    <div class="celebracao__painel">
      <div class="celebracao__trofeu" aria-hidden="true">🏆</div>
      <h2 id="celebracao-titulo" class="celebracao__titulo">Parabéns!</h2>
      <p class="celebracao__sub">Você concluiu sua sessão de foco.</p>
      <div class="celebracao__tempo"><span>${minutos}</span> min de foco</div>
      <div class="celebracao__stats">
        ${streak ? `<span>🔥 ${streak} dia${streak === 1 ? "" : "s"} seguido${streak === 1 ? "" : "s"}</span>` : ""}
        ${totalMinutos ? `<span>⏱️ ${horasTotais}h em Modo Foco no total</span>` : ""}
      </div>
      <div class="celebracao__figurinhas-titulo">Figurinhas ganhas</div>
      <ul class="celebracao__figurinhas">
        ${figurinhas
          .map(
            ([emoji, nome, detalhe], i) => `
          <li class="figurinha" style="animation-delay:${0.35 + i * 0.15}s;">
            <span class="figurinha__emoji" aria-hidden="true">${emoji}</span>
            <span class="figurinha__nome">${escapeHtml(nome)}</span>
            <span class="figurinha__detalhe">${escapeHtml(detalhe)}</span>
          </li>`,
          )
          .join("")}
      </ul>
      <div class="celebracao__acoes">
        <button type="button" class="btn btn--primary" data-acao="fechar">Continuar estudando</button>
        <a class="btn btn--secondary" href="#/residencia/foco" data-acao="nova">Nova sessão</a>
      </div>
    </div>
  `;

  function fechar() {
    el.remove();
    document.removeEventListener("keydown", aoTeclar);
  }
  function aoTeclar(e) {
    if (e.key === "Escape") fechar();
  }
  el.addEventListener("click", (e) => {
    if (e.target === el || e.target.closest("[data-acao]")) fechar();
  });
  document.addEventListener("keydown", aoTeclar);

  document.body.appendChild(el);
  el.querySelector("[data-acao=fechar]").focus();
  tocarSom();
}
