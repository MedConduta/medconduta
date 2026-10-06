import { escapeHtml } from "../utils.js";
import { getAll, getPref } from "../db.js";
import { gerarPlanoDoDia } from "../planner.js";
import { gerarDiagnostico } from "../prontidao.js";
import { getConstancia } from "../constancia.js";
import { getMetaDiaria } from "../metaDiaria.js";
import { gerarGradeCurso, encontrarSemanaAtual } from "../curriculo.js";
import { hojeIso } from "../revisaoCurso.js";
import { getRevisarHoje } from "../revisarHoje.js";
import { getUltimaAtividade } from "../ultimaAtividade.js";
import { getHistoricoSimulados } from "../simulados.js";
import { definirContador } from "../components/sidebar.js";
import { atualizarStreakTopbar } from "../components/topbar.js";
import { AREA_POR_CATEGORIA, ORDEM_AREAS } from "../areas.js";
import { renderStreak } from "../components/streak.js";
import { statTile } from "../components/statTile.js";

const PREF_HORAS = "planejador_horas";

// Quantas semanas do cronograma aparecem no gráfico "Progresso semana a
// semana" — uma janela em torno da semana atual, não as 50+ semanas
// inteiras do curso, que ficariam ilegíveis num gráfico de barras.
const JANELA_SEMANAS = 8;

/**
 * Início: uma ação principal no topo ("Continue de onde parou"), as tarefas
 * de hoje logo abaixo e, no computador, uma coluna lateral com sequência,
 * meta do dia, revisões e simulados. Para quem acabou de chegar (ex.: amigo
 * convidado), um passo a passo substitui a tela cheia de zeros.
 */
export async function renderInicio(container) {
  container.innerHTML = `
    <div class="main__container main__container--largo">
      <div class="page-header">
        <div class="skeleton skeleton-line skeleton-line--short" style="height:12px;width:200px;"></div>
        <div class="skeleton skeleton-line" style="height:28px;width:50%;margin-top:8px;"></div>
      </div>
      <div class="inicio-grid">
        <div>
          <div class="skeleton" style="height:150px;margin-bottom:24px;border-radius:var(--radius-lg);"></div>
          ${Array.from({ length: 2 }, () => `<div class="skeleton-card"><div class="skeleton skeleton-line skeleton-line--short"></div><div class="skeleton skeleton-line skeleton-line--tall"></div></div>`).join("")}
        </div>
        <div class="inicio-lateral"><div class="skeleton" style="height:220px;border-radius:var(--radius-lg);"></div></div>
      </div>
    </div>
  `;

  const horasSalvas = await getPref(PREF_HORAS, 2);
  const [plano, diagnostico, constancia, metaDiaria, grade, respostas, progresso, ultima, revisar, simulados] = await Promise.all([
    gerarPlanoDoDia(horasSalvas),
    gerarDiagnostico(),
    getConstancia(),
    getMetaDiaria(),
    gerarGradeCurso(),
    getAll("respostas"),
    getAll("progresso"),
    getUltimaAtividade(),
    getRevisarHoje(),
    getHistoricoSimulados(),
  ]);
  definirContador("revisar", revisar.total);
  atualizarStreakTopbar(constancia.streakAtual);

  const { fase, diasRestantes, modo } = plano;
  const hoje = hojeIso();
  const semanaAtual = encontrarSemanaAtual(grade.semanas, hoje);
  const acertos = respostas.filter((r) => r.acertou).length;
  const dashboardCurso = {
    percentualGeral: grade.percentualGeral,
    totalConcluidos: grade.totalConcluidos,
    totalTemas: grade.totalTemas,
    revisoesHoje: revisar.revisoesCurso.filter((r) => r.dataAgendada === hoje).length,
    revisoesAtrasadas: revisar.revisoesCurso.filter((r) => r.dataAgendada < hoje).length,
    totalQuestoesRespondidas: respostas.length,
    percentualAcerto: respostas.length ? Math.round((acertos / respostas.length) * 100) : null,
  };

  const primeiroTemaPendente = semanaAtual?.itens.find((i) => i.percentual < 100);
  const passos = [
    {
      feito: diasRestantes !== null,
      titulo: "Configure sua prova e a data",
      desc: "Com a data, o cronograma e a agenda do dia se ajustam sozinhos.",
      link: "#/residencia/cronograma",
      acao: "Configurar",
    },
    {
      feito: respostas.length >= 20,
      titulo: "Faça 20 questões de diagnóstico",
      desc: "Um simulado curto mostra seus pontos fracos desde o primeiro dia.",
      link: "#/residencia/simulados",
      acao: "Fazer diagnóstico",
    },
    {
      feito: progresso.some((p) => p.concluido),
      titulo: "Estude seu primeiro tema",
      desc: primeiroTemaPendente ? `Sugestão: ${primeiroTemaPendente.titulo}.` : "Comece pela primeira semana do Curso.",
      link: primeiroTemaPendente ? `#/residencia/conteudo/${primeiroTemaPendente.temaId}` : "#/residencia/curso",
      acao: "Estudar",
    },
  ];
  const mostrarPassos = passos.some((p) => !p.feito);

  container.innerHTML = `
    <div class="main__container main__container--largo">
      <div class="page-header">
        <div class="page-header__eyebrow">${escapeHtml(dataPorExtenso())}</div>
        <h1>${saudacao()}</h1>
        <p class="page-header__desc">${
          fase.id && diasRestantes !== null
            ? `${diasRestantes >= 0 ? `Faltam ${diasRestantes} dias para a prova` : "A prova já passou"} · ${escapeHtml(fase.nome)}.`
            : "Seu resumo do dia e o próximo passo do estudo."
        }</p>
      </div>

      <div class="inicio-grid">
        <div class="inicio-topo">
          ${mostrarPassos ? renderPrimeirosPassos(passos) : ""}
          ${renderContinue(ultima, plano.fila[0])}
          ${renderModoEspecial(modo)}
          ${renderTarefasHoje(plano)}
        </div>

        <div class="inicio-resto">
          ${renderSemanaAtual(semanaAtual, hoje)}
          ${renderCardCurso(dashboardCurso)}
          ${renderGraficoSemanas(grade.semanas, semanaAtual?.numero, hoje)}
          ${respostas.length ? renderDesempenhoPorArea(agruparDesempenhoPorArea(respostas)) : ""}
          ${renderGargalos(plano.principaisGargalos)}
        </div>

        <aside class="inicio-lateral">
          ${renderStreak(constancia.streakAtual)}
          ${renderMetaDiaria(metaDiaria)}
          ${renderRevisarLateral(revisar)}
          ${renderSimuladoLateral(simulados)}
          <div class="card lateral-card">
            <div class="lateral-card__titulo">Prontidão</div>
            <div class="lateral-card__numero">${diagnostico.indicePreparo}</div>
            <p class="lateral-card__desc">Índice de 0 a 100 que combina cobertura de temas e acerto. <a href="#/residencia/prontidao">Ver detalhes</a></p>
          </div>
        </aside>
      </div>
    </div>
  `;
}

function saudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia! Bora estudar?";
  if (hora < 18) return "Boa tarde! Bora estudar?";
  return "Boa noite! Bora estudar?";
}

function dataPorExtenso() {
  const texto = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function tempoRelativo(iso) {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 2) return "agora há pouco";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "ontem" : `há ${dias} dias`;
}

function renderPrimeirosPassos(passos) {
  const feitos = passos.filter((p) => p.feito).length;
  return `
    <section class="card primeiros-passos">
      <div class="list-card__top">
        <strong>Primeiros passos</strong>
        <span class="badge badge--accent">${feitos} de ${passos.length}</span>
      </div>
      <ol class="primeiros-passos__lista">
        ${passos
          .map(
            (p, i) => `
          <li class="primeiros-passos__item${p.feito ? " is-feito" : ""}">
            <span class="primeiros-passos__marca">${p.feito ? "✓" : i + 1}</span>
            <div class="primeiros-passos__texto">
              <strong>${escapeHtml(p.titulo)}</strong>
              <span>${escapeHtml(p.desc)}</span>
            </div>
            ${p.feito ? "" : `<a class="btn btn--secondary btn--sm" href="${p.link}">${p.acao}</a>`}
          </li>`
          )
          .join("")}
      </ol>
    </section>`;
}

function renderContinue(ultima, proximaTarefa) {
  if (ultima) {
    return `
      <a class="continue-card" href="${escapeHtml(ultima.link)}">
        <span class="continue-card__eyebrow">Continue de onde parou</span>
        <span class="continue-card__titulo">${escapeHtml(ultima.titulo)}</span>
        <span class="continue-card__meta">${escapeHtml(ultima.tipo)} · ${tempoRelativo(ultima.em)}</span>
        <span class="continue-card__botao">Continuar →</span>
      </a>`;
  }
  if (proximaTarefa) {
    return `
      <a class="continue-card" href="${escapeHtml(proximaTarefa.link)}">
        <span class="continue-card__eyebrow">Comece por aqui</span>
        <span class="continue-card__titulo">${escapeHtml(proximaTarefa.titulo)}</span>
        <span class="continue-card__meta">${escapeHtml(proximaTarefa.detalhe)} · ${proximaTarefa.duracaoMin} min</span>
        <span class="continue-card__botao">Começar →</span>
      </a>`;
  }
  return "";
}

const MOSTRAR_TAREFAS = 6;

function renderTarefasHoje(plano) {
  if (!plano.fila.length) {
    return `
      <section class="card" style="margin-bottom:24px;">
        <strong>Tarefas de hoje</strong>
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">Nada pendente para hoje — tudo em dia. <a href="#/residencia/planejador">Ajustar agenda</a></p>
      </section>`;
  }
  const restantes = plano.fila.length - MOSTRAR_TAREFAS;
  return `
    <section class="card" style="margin-bottom:24px;">
      <div class="list-card__top">
        <strong>Tarefas de hoje</strong>
        <span class="badge">${Math.round((plano.minutosUsados / 60) * 10) / 10}h planejadas</span>
      </div>
      <ol class="tarefas-hoje">
        ${plano.fila
          .slice(0, MOSTRAR_TAREFAS)
          .map(
            (item) => `
          <li>
            <a class="tarefas-hoje__item" href="${escapeHtml(item.link)}">
              <span class="tarefas-hoje__tempo">${item.duracaoMin} min</span>
              <span class="tarefas-hoje__texto">
                <strong>${escapeHtml(item.titulo)}</strong>
                <span>${escapeHtml(item.detalhe)}</span>
              </span>
            </a>
          </li>`
          )
          .join("")}
      </ol>
      <a class="btn btn--ghost btn--sm" href="#/residencia/planejador" style="padding-left:0;margin-top:8px;">${
        restantes > 0 ? `Ver agenda completa (+${restantes})` : "Ajustar horas e agenda"
      } →</a>
    </section>`;
}

function renderRevisarLateral(revisar) {
  return `
    <div class="card lateral-card">
      <div class="lateral-card__titulo">Revisar hoje</div>
      <div class="lateral-card__numero">${revisar.total}</div>
      <p class="lateral-card__desc">${revisar.revisoesCurso.length} temas · ${revisar.erros.length} questões · ${revisar.flashcards.length} flashcards</p>
      <a class="btn ${revisar.total ? "btn--primary" : "btn--secondary"} btn--sm" href="#/residencia/revisar">${revisar.total ? "Revisar agora" : "Ver revisões"}</a>
    </div>`;
}

const DIAS_ENTRE_SIMULADOS = 7;

function renderSimuladoLateral(simulados) {
  const ultimo = simulados[0];
  let proximo = "Recomendado hoje";
  if (ultimo) {
    const dias = DIAS_ENTRE_SIMULADOS - Math.floor((Date.now() - new Date(ultimo.finalizadoEm).getTime()) / 86400000);
    if (dias > 0) proximo = dias === 1 ? "Próximo recomendado amanhã" : `Próximo recomendado em ${dias} dias`;
  }
  return `
    <div class="card lateral-card">
      <div class="lateral-card__titulo">Simulados</div>
      ${
        ultimo
          ? `<div class="lateral-card__numero">${ultimo.percentual}%</div>
             <p class="lateral-card__desc">Último: ${ultimo.acertos}/${ultimo.tamanho} acertos · ${tempoRelativo(ultimo.finalizadoEm)}</p>`
          : `<p class="lateral-card__desc">Você ainda não fez nenhum simulado.</p>`
      }
      <p class="lateral-card__desc"><strong>${proximo}</strong></p>
      <a class="btn btn--secondary btn--sm" href="#/residencia/simulados">Novo simulado</a>
    </div>`;
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
          ${statTile({ value: d.revisoesHoje, label: "Revisões hoje", icone: "clock", tom: "accent" })}
          ${statTile({ value: d.revisoesAtrasadas, label: "Revisões atrasadas", icone: "alert-circle", tom: "danger" })}
          ${statTile({ value: d.totalQuestoesRespondidas, label: "Questões feitas", icone: "checklist", tom: "accent" })}
          ${statTile({ value: `${d.percentualAcerto ?? "—"}${d.percentualAcerto !== null ? "%" : ""}`, label: "Taxa de acerto", icone: "chart-bar", tom: "success" })}
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

/**
 * Desempenho agregado por GRANDE área (Clínica Médica, Cirurgia Geral,
 * Ginecologia e Obstetrícia, Pediatria, Saúde Mental, Medicina Preventiva,
 * Especialidades) — rollup de `respostas.categoria` (subespecialidade) via
 * AREA_POR_CATEGORIA (mesmo mapa usado em Conteúdo/IA), na ordem fixa de
 * ORDEM_AREAS. Visão mais macro que "Seus maiores gargalos agora" (que é
 * por subespecialidade) — responde "como estou indo em cada grande área da
 * prova", não só "qual categoria específica está mais fraca".
 */
function agruparDesempenhoPorArea(respostas) {
  const porArea = new Map();
  for (const r of respostas) {
    if (!r.categoria) continue;
    const area = AREA_POR_CATEGORIA[r.categoria] || "Outros";
    const atual = porArea.get(area) || { acertos: 0, total: 0 };
    atual.total += 1;
    if (r.acertou) atual.acertos += 1;
    porArea.set(area, atual);
  }
  return ORDEM_AREAS.filter((area) => porArea.has(area)).map((area) => {
    const { acertos, total } = porArea.get(area);
    return { area, total, acertos, taxa: Math.round((acertos / total) * 100) };
  });
}

function renderDesempenhoPorArea(dados) {
  if (!dados.length) {
    return `
      <div class="card" style="margin-bottom:24px;">
        <div class="list-card__title" style="margin-bottom:4px;">Desempenho por grande área</div>
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">Responda questões pra essa análise aparecer — taxa de acerto por Clínica Médica, Cirurgia Geral, GO, Pediatria etc.</p>
      </div>
    `;
  }
  return `
    <div class="card" style="margin-bottom:24px;">
      <div class="list-card__title" style="margin-bottom:4px;">Desempenho por grande área</div>
      <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-bottom:16px;">Taxa de acerto agregada por grande área da prova (Clínica Médica, Cirurgia Geral, GO, Pediatria, Saúde Mental, Medicina Preventiva, Especialidades).</p>
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${dados
          .map(
            (d) => `
          <div>
            <div style="display:flex;justify-content:space-between;font-size:var(--fs-sm);margin-bottom:6px;">
              <span>${escapeHtml(d.area)}</span>
              <span style="color:var(--color-text-secondary);">${d.taxa}% de acerto (${d.total} ${d.total > 1 ? "questões" : "questão"})</span>
            </div>
            <div style="height:8px;border-radius:999px;background:var(--color-bg-subtle);overflow:hidden;">
              <div style="height:100%;width:${d.taxa}%;background:${corPorTaxaAcerto(d.taxa)};border-radius:999px;"></div>
            </div>
          </div>`
          )
          .join("")}
      </div>
    </div>
  `;
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
 * Meta mínima do dia: basta bater UM dos três sinais (questões, minutos de
 * Modo Foco ou um tema concluído) — um piso para não zerar o dia.
 */
function renderMetaDiaria(meta) {
  const barra = (atual, alvo) => {
    const pct = Math.min(100, Math.round((atual / alvo) * 100));
    return `<div class="meta-barra"><div style="width:${pct}%"></div></div>`;
  };
  return `
    <div class="card lateral-card${meta.bateuMeta ? " is-concluida" : ""}">
      <div class="lateral-card__titulo">Meta do dia</div>
      ${meta.bateuMeta ? `<p class="lateral-card__desc"><strong>✅ Meta mínima batida!</strong></p>` : `<p class="lateral-card__desc">Basta cumprir UM destes:</p>`}
      <div class="meta-item"><span>Questões</span><span>${meta.questoesHoje}/${meta.metaQuestoes}</span></div>
      ${barra(meta.questoesHoje, meta.metaQuestoes)}
      <div class="meta-item"><span>Modo Foco</span><span>${meta.minutosFocoHoje}/${meta.metaMinutos} min</span></div>
      ${barra(meta.minutosFocoHoje, meta.metaMinutos)}
      <div class="meta-item"><span>Temas concluídos</span><span>${meta.temasHoje}/1</span></div>
      ${barra(meta.temasHoje, 1)}
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
