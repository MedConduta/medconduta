import { escapeHtml } from "../utils.js";
import { getAll, getPref } from "../db.js";
import { gerarPlanoDoDia } from "../planner.js";
import { gerarDiagnostico } from "../prontidao.js";
import { getConstancia } from "../constancia.js";
import { getMetaDiaria } from "../metaDiaria.js";
import { gerarGradeCurso, encontrarSemanaAtual } from "../curriculo.js";
import { hojeIso, getAgendaRevisoes } from "../revisaoCurso.js";

const PREF_HORAS = "planejador_horas";

// Quantas semanas do cronograma aparecem no gráfico "Progresso semana a
// semana" — uma janela em torno da semana atual, não as 50+ semanas
// inteiras do curso, que ficariam ilegíveis num gráfico de barras.
const JANELA_SEMANAS = 8;

/**
 * Fase 11 (reformulada) — "Minha Preparação": o dashboard analítico da
 * plataforma. Em vez de uma lista de atalhos, a tela junta os números que
 * respondem "como estou indo" — prontidão, constância, progresso do curso
 * — com foco específico na semana corrente do cronograma (Curso, ver
 * curriculo.js): o que já foi concluído nela e o que ainda falta. Reaproveita
 * 100% dos cálculos já existentes (nenhuma lógica de negócio nova).
 */
export async function renderMinhaPreparacao(container) {
  container.innerHTML = `<div class="main__container"><div class="empty-state">Carregando sua preparação...</div></div>`;

  const horasSalvas = await getPref(PREF_HORAS, 2);
  // Note: não chama getDashboardCurso() aqui — ela recalcula gerarGradeCurso()
  // e carregarDados() de novo internamente, e essa página já busca a grade
  // (abaixo) e já dispara gerarPlanoDoDia (que também toca no cronograma do
  // Curso quando o usuário já o usa) — evita duplicar o fetch pesado de
  // temas/questões/curriculo numa única carga de página, o que
  // deixava "Minha Preparação" lenta o bastante pra sofrer da race condition
  // conhecida do roteador (navegar embora antes do render assíncrono
  // terminar deixa o render antigo sobrescrever a página seguinte).
  const [plano, diagnostico, constancia, metaDiaria, grade, agendaRevisoes, respostas] = await Promise.all([
    gerarPlanoDoDia(horasSalvas),
    gerarDiagnostico(),
    getConstancia(),
    getMetaDiaria(),
    gerarGradeCurso(),
    getAgendaRevisoes(),
    getAll("respostas"),
  ]);

  const { fase, diasRestantes, modo, totalRevisoesVencidas } = plano;
  const hoje = hojeIso();
  const semanaAtual = encontrarSemanaAtual(grade.semanas, hoje);
  const acertos = respostas.filter((r) => r.acertou).length;
  const dashboardCurso = {
    percentualGeral: grade.percentualGeral,
    totalConcluidos: grade.totalConcluidos,
    totalTemas: grade.totalTemas,
    revisoesHoje: agendaRevisoes.hoje.length,
    revisoesAtrasadas: agendaRevisoes.vencidas.length,
    totalQuestoesRespondidas: respostas.length,
    percentualAcerto: respostas.length ? Math.round((acertos / respostas.length) * 100) : null,
  };

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência</div>
        <h1>Minha Preparação</h1>
        <p class="page-header__desc">O retrato de onde você está agora, com foco na semana corrente do seu cronograma.</p>
      </div>

      ${renderModoEspecial(modo)}

      <div class="stat-row">
        <div class="stat-tile"><div class="stat-tile__value">${diagnostico.indicePreparo}</div><div class="stat-tile__label">Índice de Prontidão</div></div>
        <div class="stat-tile"><div class="stat-tile__value">${fase.id ? escapeHtml(fase.nome) : "—"}</div><div class="stat-tile__label">${diasRestantes !== null ? `${diasRestantes} dias até a prova` : "Prova não configurada"}</div></div>
        <div class="stat-tile"><div class="stat-tile__value">${constancia.streakAtual}${constancia.streakAtual > 0 ? " 🔥" : ""}</div><div class="stat-tile__label">Dias seguidos estudando</div></div>
      </div>

      ${renderMetaDiaria(metaDiaria)}

      ${renderCardCurso(dashboardCurso)}

      ${renderSemanaAtual(semanaAtual, hoje)}

      ${renderGraficoSemanas(grade.semanas, semanaAtual?.numero, hoje)}

      <div class="card card--interactive" style="margin-bottom:24px;">
        <div class="list-card__top">
          <strong>Agenda de hoje</strong>
          ${totalRevisoesVencidas > 0 ? `<span class="badge badge--warning">${totalRevisoesVencidas} revisão${totalRevisoesVencidas > 1 ? "ões" : ""} vencida${totalRevisoesVencidas > 1 ? "s" : ""}</span>` : ""}
        </div>
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin:8px 0 16px;">Revisões espaçadas, conteúdo e questões, priorizados pra hoje segundo sua fase, sua semana do Curso e seus gargalos.</p>
        <a class="btn btn--primary" href="#/residencia/planejador">Ver agenda de hoje</a>
      </div>

      ${renderGargalos(plano.principaisGargalos)}
    </div>
  `;
}

/** Mesmo critério de status por item usado em app/views/curso.js — mantém as duas telas consistentes. */
function statusDoItem(item) {
  if (item.percentual === 100) return "concluido";
  if (item.resumoConcluido || item.questoesFeitas) return "em-andamento";
  return "nao-iniciado";
}

function formatarDataBR(iso) {
  if (!iso) return "";
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

function somarDiasIso(iso, dias) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Fase 11 (reformulada) — anel de progresso (SVG): a leitura de magnitude
 * mais direta pra "quanto do curso já foi feito", como hero figure da
 * seção. Cor única (accent) sobre uma trilha mais clara do mesmo tom —
 * mesma lógica de um meter, só circular.
 */
function renderAnelProgresso(percentual, tamanho = 108) {
  const raio = 46;
  const circunferencia = 2 * Math.PI * raio;
  const offset = circunferencia * (1 - Math.max(0, Math.min(100, percentual)) / 100);
  return `
    <div style="position:relative;width:${tamanho}px;height:${tamanho}px;flex-shrink:0;">
      <svg width="${tamanho}" height="${tamanho}" viewBox="0 0 120 120" style="transform:rotate(-90deg);">
        <circle cx="60" cy="60" r="${raio}" fill="none" stroke="var(--color-accent-soft)" stroke-width="12" />
        <circle cx="60" cy="60" r="${raio}" fill="none" stroke="var(--color-accent)" stroke-width="12"
          stroke-linecap="round" stroke-dasharray="${circunferencia.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" />
      </svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <span style="font-size:var(--fs-xl);font-weight:var(--fw-bold);letter-spacing:-0.01em;">${percentual}%</span>
        <span style="font-size:var(--fs-xs);color:var(--color-text-secondary);">do curso</span>
      </div>
    </div>
  `;
}

function renderCardCurso(d) {
  return `
    <div class="card" style="margin-bottom:24px;">
      <div class="list-card__top" style="margin-bottom:16px;">
        <strong>Progresso do Curso</strong>
        <span class="badge badge--accent">${d.totalConcluidos} / ${d.totalTemas} temas</span>
      </div>
      <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:center;">
        ${renderAnelProgresso(d.percentualGeral)}
        <div class="stat-row" style="flex:1;min-width:220px;margin-bottom:0;">
          <div class="stat-tile"><div class="stat-tile__value">${d.revisoesHoje}</div><div class="stat-tile__label">Revisões hoje</div></div>
          <div class="stat-tile"><div class="stat-tile__value">${d.revisoesAtrasadas}</div><div class="stat-tile__label">Revisões atrasadas</div></div>
          <div class="stat-tile"><div class="stat-tile__value">${d.totalQuestoesRespondidas}</div><div class="stat-tile__label">Questões feitas</div></div>
          <div class="stat-tile"><div class="stat-tile__value">${d.percentualAcerto ?? "—"}${d.percentualAcerto !== null ? "%" : ""}</div><div class="stat-tile__label">Taxa de acerto</div></div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Card da semana corrente: meter de progresso, composição por status
 * (concluído/em andamento/não iniciado, com legenda) e a lista do que
 * ainda falta — a resposta direta a "o que já fiz / o que falta com
 * relação à semana corrente".
 */
function renderSemanaAtual(semana, hoje) {
  if (!semana) {
    return `
      <div class="card" style="margin-bottom:24px;">
        <strong>Semana corrente</strong>
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">Cronograma do Curso ainda não disponível. Abra o <a href="#/residencia/curso">Curso</a> para começar.</p>
      </div>
    `;
  }

  const porStatus = { concluido: 0, "em-andamento": 0, "nao-iniciado": 0 };
  semana.itens.forEach((item) => { porStatus[statusDoItem(item)] += 1; });
  const total = semana.itens.length || 1;
  const pctConcluido = Math.round((porStatus.concluido / total) * 100);
  const pctAndamento = Math.round((porStatus["em-andamento"] / total) * 100);

  const pendentes = semana.itens
    .filter((i) => i.percentual < 100)
    .sort((a, b) => a.percentual - b.percentual);
  const MOSTRAR = 5;
  const restantes = pendentes.length - MOSTRAR;

  const periodo = semana.dataInicio ? `${formatarDataBR(semana.dataInicio)}–${formatarDataBR(somarDiasIso(semana.dataInicio, 6))}` : "";

  return `
    <div class="card" style="margin-bottom:24px;">
      <div class="list-card__top" style="margin-bottom:4px;">
        <strong>Semana ${semana.numero}${semana.extra ? " (extra)" : ""} — sua semana atual</strong>
        <span class="badge badge--accent">${semana.concluidos} / ${semana.total} concluídos</span>
      </div>
      ${periodo ? `<p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-bottom:16px;">${periodo}</p>` : ""}

      <div style="height:10px;border-radius:999px;background:var(--color-border);overflow:hidden;display:flex;" title="${porStatus.concluido} concluídos, ${porStatus["em-andamento"]} em andamento, ${porStatus["nao-iniciado"]} não iniciados">
        <div style="width:${pctConcluido}%;background:var(--color-success);"></div>
        <div style="width:${pctAndamento}%;background:var(--color-accent);"></div>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:10px;font-size:var(--fs-xs);color:var(--color-text-secondary);">
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--color-success);margin-right:6px;"></span>Concluído (${porStatus.concluido})</span>
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--color-accent);margin-right:6px;"></span>Em andamento (${porStatus["em-andamento"]})</span>
        <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--color-border-strong);margin-right:6px;"></span>Não iniciado (${porStatus["nao-iniciado"]})</span>
      </div>

      ${
        pendentes.length
          ? `
        <div style="margin-top:20px;">
          <div style="font-size:var(--fs-sm);font-weight:var(--fw-medium);margin-bottom:8px;">O que falta nesta semana</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${pendentes
              .slice(0, MOSTRAR)
              .map(
                (item) => `
              <a href="#/residencia/conteudo/${item.temaId}" style="display:flex;justify-content:space-between;gap:12px;text-decoration:none;color:inherit;padding:6px 0;border-bottom:1px solid var(--color-border);font-size:var(--fs-sm);">
                <span>${escapeHtml(item.titulo)}</span>
                <span style="color:var(--color-text-secondary);flex-shrink:0;">${item.percentual}%</span>
              </a>`
              )
              .join("")}
          </div>
          ${restantes > 0 ? `<p style="font-size:var(--fs-xs);color:var(--color-text-muted);margin-top:8px;">+${restantes} outro${restantes > 1 ? "s" : ""} tema${restantes > 1 ? "s" : ""} pendente${restantes > 1 ? "s" : ""} nesta semana.</p>` : ""}
        </div>`
          : `<p style="color:var(--color-success);font-size:var(--fs-sm);margin-top:16px;">✓ Semana concluída — tudo em dia.</p>`
      }
    </div>
  `;
}

/**
 * Gráfico "Progresso semana a semana": uma janela de semanas em torno da
 * atual (não as 50+ semanas inteiras do curso, que ficariam ilegíveis).
 * Magnitude (altura da barra) = % concluído da semana; cor = status
 * (concluída/atual/atrasada/futura) — como toda semana anterior à atual já
 * teria data de início vencida, "atrasada" aqui é justamente "semana
 * passada ainda incompleta".
 */
function renderGraficoSemanas(semanas, numeroSemanaAtual, hoje) {
  if (!semanas.length) return "";
  const idxAtual = numeroSemanaAtual != null ? semanas.findIndex((s) => s.numero === numeroSemanaAtual) : -1;
  let inicio = Math.max(0, (idxAtual >= 0 ? idxAtual : 0) - 3);
  let fim = Math.min(semanas.length, inicio + JANELA_SEMANAS);
  inicio = Math.max(0, fim - JANELA_SEMANAS);
  const janela = semanas.slice(inicio, fim);

  const alturaMax = 96;
  const statusDaSemana = (s) => {
    if (s.numero === numeroSemanaAtual) return "atual";
    if (s.numero < numeroSemanaAtual) return s.percentual === 100 ? "concluida" : "atrasada";
    return "futura";
  };
  const corPorStatus = { concluida: "var(--color-success)", atual: "var(--color-accent)", atrasada: "var(--color-warning)", futura: "var(--color-border-strong)" };
  const rotuloPorStatus = { concluida: "Concluída", atual: "Semana atual", atrasada: "Atrasada", futura: "Futura" };

  return `
    <div class="card" style="margin-bottom:24px;">
      <div class="list-card__title" style="margin-bottom:16px;">Progresso semana a semana</div>
      <div style="display:flex;align-items:flex-end;gap:8px;height:${alturaMax}px;">
        ${janela
          .map((s) => {
            const status = statusDaSemana(s);
            const altura = Math.max(4, Math.round((s.percentual / 100) * alturaMax));
            return `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;" title="Semana ${s.numero}: ${s.percentual}% concluído (${s.concluidos}/${s.total})">
              <div style="width:100%;max-width:24px;height:${altura}px;background:${corPorStatus[status]};border-radius:4px 4px 0 0;"></div>
            </div>`;
          })
          .join("")}
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        ${janela
          .map(
            (s) => `<div style="flex:1;text-align:center;font-size:var(--fs-xs);${s.numero === numeroSemanaAtual ? "font-weight:var(--fw-bold);color:var(--color-accent);" : "color:var(--color-text-secondary);"}">${s.numero}</div>`
          )
          .join("")}
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:16px;font-size:var(--fs-xs);color:var(--color-text-secondary);">
        ${Object.entries(rotuloPorStatus)
          .map(([status, rotulo]) => `<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${corPorStatus[status]};margin-right:6px;"></span>${rotulo}</span>`)
          .join("")}
      </div>
    </div>
  `;
}

function corPorTaxaAcerto(pct) {
  if (pct === null) return "var(--color-border-strong)";
  if (pct < 50) return "var(--color-danger)";
  if (pct < 70) return "var(--color-warning)";
  return "var(--color-success)";
}

function renderGargalos(gargalos) {
  if (!gargalos || !gargalos.length) return "";
  return `
    <div class="card" style="margin-bottom:24px;">
      <div class="list-card__title" style="margin-bottom:4px;">Seus maiores gargalos agora</div>
      <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-bottom:16px;">Peso estimado na prova cruzado com seu desempenho real em questões.</p>
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${gargalos
          .map((g) => {
            const pct = g.desempenho ? Math.round(g.desempenho.taxa * 100) : null;
            return `
            <div>
              <div style="display:flex;justify-content:space-between;font-size:var(--fs-sm);margin-bottom:6px;">
                <span>${escapeHtml(g.categoria)}</span>
                <span style="color:var(--color-text-secondary);">${pct !== null ? `${pct}% de acerto (${g.desempenho.total} ${g.desempenho.total > 1 ? "questões" : "questão"})` : "sem questões respondidas ainda"}</span>
              </div>
              <div style="height:8px;border-radius:999px;background:var(--color-bg-subtle);overflow:hidden;">
                <div style="height:100%;width:${pct ?? 4}%;background:${corPorTaxaAcerto(pct)};border-radius:999px;"></div>
              </div>
            </div>`;
          })
          .join("")}
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
