import { escapeHtml } from "../utils.js";
import { getPref } from "../db.js";
import { gerarPlanoDoDia } from "../planner.js";
import { gerarDiagnostico } from "../prontidao.js";
import { getConstancia } from "../constancia.js";
import { getMetaDiaria } from "../metaDiaria.js";
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
  const [plano, diagnostico, constancia, metaDiaria] = await Promise.all([
    gerarPlanoDoDia(horasSalvas),
    gerarDiagnostico(),
    getConstancia(),
    getMetaDiaria(),
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

      ${renderMetaDiaria(metaDiaria)}

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
        ${renderAtalho("/residencia/planejamento-semanal", "columns", "Planejamento Semanal", "Meta da semana × já feito, e o que vence nos próximos 7 dias.")}
        ${renderAtalho("/residencia/cronograma", "clipboard", "Cronograma", "Configurar a data e a prova-alvo e ver suas 5 fases.")}
        ${renderAtalho("/residencia/prontidao", "siren", "Prontidão", "Heatmap de fraquezas e mapa de domínio por área.")}
        ${renderAtalho("/residencia/desempenho", "flowchart", "Desempenho", "Como sua prontidão evoluiu nas últimas semanas.")}
        ${renderAtalho("/residencia/relatorio-semanal", "chart-bar", "Relatório Semanal", "Resumo automático dos últimos 7 dias.")}
        ${renderAtalho("/residencia/simulados", "clock", "Simulados", "Prova completa, cronometrada, na proporção real da prova.")}
        ${renderAtalho("/residencia/erros", "alert-circle", "Meus Erros", "Questões erradas em fila de revisão espaçada.")}
        ${renderAtalho("/residencia/revisao-alto-rendimento", "stethoscope", "Alto Rendimento", "Alta incidência + baixo desempenho, direto do heatmap.")}
        ${renderAtalho("/residencia/foco", "target", "Modo Foco", "Temporizador de estudo sem distração.")}
      </div>
    </div>
  `;
}

/**
 * Fase 16 — meta mínima diária: um piso bem menor que a agenda completa, só
 * pra não zerar o dia. Basta bater UM dos três sinais (não precisa dos três).
 */
function renderMetaDiaria(meta) {
  if (meta.bateuMeta) {
    return `
      <div class="card" style="margin-bottom:24px;border-left:4px solid var(--color-success);">
        <div class="list-card__top">
          <span class="badge" style="background:var(--color-success-soft);color:var(--color-success);">✅ Meta mínima de hoje batida</span>
        </div>
      </div>
    `;
  }
  return `
    <div class="card" style="margin-bottom:24px;">
      <div class="list-card__top">
        <strong>Meta mínima de hoje</strong>
        <span class="badge">ainda não batida</span>
      </div>
      <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">
        Basta UM destes: ${meta.questoesHoje}/${meta.metaQuestoes} questões, ${meta.minutosFocoHoje}/${meta.metaMinutos} min em Modo Foco, ou concluir 1 tema.
      </p>
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
  if (modo === "emergencia") {
    return `
      <div class="card" style="margin-bottom:24px;border-left:4px solid var(--color-danger);">
        <div class="list-card__top">
          <span class="badge badge--danger">🆘 Plano de Emergência</span>
        </div>
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">O atraso está bem maior que o normal pra essa altura da preparação. A agenda de hoje foca quase todo o tempo em conteúdo novo e só nos temas de maior prioridade — o resto fica de fora até você recuperar terreno.</p>
      </div>
    `;
  }
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
  if (modo === "consolidacao") {
    return `
      <div class="card" style="margin-bottom:24px;border-left:4px solid var(--color-accent);">
        <div class="list-card__top">
          <span class="badge badge--accent">🧘 Semana de Consolidação</span>
        </div>
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">Sem atraso no momento — essa é uma semana pra respirar e fixar o que você já viu. Quase sem conteúdo novo, só revisão e questões.</p>
      </div>
    `;
  }
  return "";
}
