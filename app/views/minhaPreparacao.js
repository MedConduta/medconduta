import { escapeHtml } from "../utils.js";
import { getPref } from "../db.js";
import { gerarPlanoDoDia } from "../planner.js";
import { gerarDiagnostico } from "../prontidao.js";
import { getConstancia } from "../constancia.js";
import { icon } from "../components/icons.js";

const PREF_HORAS = "planejador_horas";

/**
 * Fase 11 — "Minha Preparação": o cockpit da plataforma. Em vez de o
 * usuário ter que visitar Hoje + Cronograma + Prontidão + Modo Foco pra
 * entender "como estou indo", esta tela junta o essencial de cada um numa
 * única visão, com atalhos pro resto — vira a nova página inicial.
 * Reaproveita 100% dos cálculos já existentes (nenhuma lógica nova).
 */
export async function renderMinhaPreparacao(container) {
  container.innerHTML = `<div class="main__container"><div class="empty-state">Carregando sua preparação...</div></div>`;

  const horasSalvas = await getPref(PREF_HORAS, 2);
  const [plano, diagnostico, constancia] = await Promise.all([
    gerarPlanoDoDia(horasSalvas),
    gerarDiagnostico(),
    getConstancia(),
  ]);

  const { fase, diasRestantes, modo, totalRevisoesVencidas } = plano;

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência</div>
        <h1>Minha Preparação</h1>
        <p class="page-header__desc">O retrato de onde você está agora — e o que fazer a seguir.</p>
      </div>

      ${renderModoEspecial(modo)}

      <div class="stat-row">
        <div class="stat-tile"><div class="stat-tile__value">${diagnostico.indicePreparo}</div><div class="stat-tile__label">Índice de Prontidão</div></div>
        <div class="stat-tile"><div class="stat-tile__value">${fase.id ? escapeHtml(fase.nome) : "—"}</div><div class="stat-tile__label">${diasRestantes !== null ? `${diasRestantes} dias até a prova` : "Prova não configurada"}</div></div>
        <div class="stat-tile"><div class="stat-tile__value">${constancia.streakAtual}${constancia.streakAtual > 0 ? " 🔥" : ""}</div><div class="stat-tile__label">Dias seguidos estudando</div></div>
      </div>

      <div class="card card--interactive" style="margin-bottom:24px;">
        <div class="list-card__top">
          <strong>Agenda de hoje</strong>
          ${totalRevisoesVencidas > 0 ? `<span class="badge badge--warning">${totalRevisoesVencidas} revisão${totalRevisoesVencidas > 1 ? "ões" : ""} vencida${totalRevisoesVencidas > 1 ? "s" : ""}</span>` : ""}
        </div>
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin:8px 0 16px;">Revisões espaçadas, conteúdo e questões, priorizados pra hoje segundo sua fase e seus gargalos.</p>
        <a class="btn btn--primary" href="#/residencia/planejador">Ver agenda de hoje</a>
      </div>

      <h3>Atalhos</h3>
      <div class="plan-queue">
        ${renderAtalho("/residencia/cronograma", "clipboard", "Cronograma", "Configurar a data da prova e ver suas 4 fases.")}
        ${renderAtalho("/residencia/prontidao", "siren", "Prontidão", "Heatmap de fraquezas e mapa de domínio por área.")}
        ${renderAtalho("/residencia/simulados", "clock", "Simulados", "Prova completa, cronometrada, na proporção real da prova.")}
        ${renderAtalho("/residencia/erros", "alert-circle", "Meus Erros", "Questões erradas em fila de revisão espaçada.")}
        ${renderAtalho("/residencia/foco", "target", "Modo Foco", "Temporizador de estudo sem distração.")}
      </div>
    </div>
  `;
}

function renderAtalho(path, iconeNome, titulo, descricao) {
  return `
    <a class="card card--interactive" href="#${path}" style="text-decoration:none;color:inherit;display:flex;gap:12px;align-items:flex-start;">
      <span style="color:var(--color-accent);flex-shrink:0;">${icon(iconeNome, { size: 22 })}</span>
      <span>
        <strong>${escapeHtml(titulo)}</strong>
        <br /><span style="color:var(--color-text-secondary);font-size:var(--fs-sm);">${escapeHtml(descricao)}</span>
      </span>
    </a>
  `;
}

function renderModoEspecial(modo) {
  if (modo === "recuperacao") {
    return `
      <div class="card" style="margin-bottom:24px;border-left:4px solid var(--color-warning);">
        <div class="list-card__top">
          <span class="badge badge--warning">⚠️ Modo Recuperação</span>
        </div>
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">Você está abaixo do conteúdo esperado pra essa altura da preparação. A agenda de hoje já está priorizando mais conteúdo novo.</p>
      </div>
    `;
  }
  if (modo === "reta-final") {
    return `
      <div class="card" style="margin-bottom:24px;border-left:4px solid var(--color-danger);">
        <div class="list-card__top">
          <span class="badge badge--danger">🔴 Modo Reta Final</span>
        </div>
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">Restam poucos dias até a prova. Foco quase total em questões e revisão de erros.</p>
      </div>
    `;
  }
  return "";
}
