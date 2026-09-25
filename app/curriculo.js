/**
 * MedConduta — Curso: gerenciador de estudos sobre o cronograma real de
 * residência (planilha "Estratégia MED - 2025", 50 semanas + semanas extras
 * pro que não está na planilha — ver data/curriculo.json).
 *
 * Camada de ORGANIZAÇÃO sobre o conteúdo que já existe — não duplica nada:
 * resumo/progresso vem de `progresso` (já gravado por marcarConcluido em
 * views/conteudo.js), questões feitas vem de `respostas`. A semana de um
 * tema nunca muda — é a organização fixa do cronograma; o que muda com o
 * tempo é só o progresso e as revisões (ver revisaoCurso.js), calculadas
 * à parte.
 */

import { fetchJsonCached } from "./utils.js";
import { getAll, getPref, setPref } from "./db.js";
import { getAgendaRevisoes, hojeIso, somarDias, diffDias } from "./revisaoCurso.js";

const PREF_CURSO_INICIO = "curso_inicio_real";

/**
 * Data real de início do curso pro usuário (YYYY-MM-DD) — âncora do
 * cronograma. A planilha "Estratégia MED - 2025" tem datas absolutas fixas
 * (semana 1 = 05/01/2026 etc.), mas cada usuário começa a usar a plataforma
 * num dia diferente — sem isso, um usuário que abre o Curso meses depois da
 * data da semana 1 veria TUDO como atrasado no primeiro acesso, mesmo sem
 * nunca ter começado. Na primeira vez que o Curso é montado, fixa a data de
 * hoje como início (persistido); dali em diante todas as `dataProgramada`
 * são deslocadas por esse offset, preservando o espaçamento entre semanas
 * da planilha original — só a âncora muda, não a cadência.
 */
async function garantirInicioCurso() {
  const salvo = await getPref(PREF_CURSO_INICIO, null);
  if (salvo) return salvo;
  const hoje = hojeIso();
  await setPref(PREF_CURSO_INICIO, hoje);
  return hoje;
}

export async function getCursoInicio() {
  return garantirInicioCurso();
}

/**
 * Diz se o usuário já abriu o Curso alguma vez (âncora já gravada), sem o
 * efeito colateral de `garantirInicioCurso`/`getCursoInicio` de fixar a
 * âncora na primeira chamada. Usado por `planner.js` para só amarrar a
 * agenda de "Hoje" à semana do Curso quando o usuário já usa o Curso de
 * fato — chamar `getAgendaHoje()` incondicionalmente a partir de "Hoje"
 * (a página mais visitada do app) ancoraria o cronograma do Curso cedo
 * demais para quem nunca abriu essa aba, gerando atraso artificial depois.
 */
export async function cursoJaIniciado() {
  return (await getPref(PREF_CURSO_INICIO, null)) !== null;
}

/** Permite ao usuário ajustar manualmente a âncora (ex.: quer "recomeçar o relógio" do cronograma). */
export async function setCursoInicio(dataIso) {
  await setPref(PREF_CURSO_INICIO, dataIso);
}

async function carregarDados() {
  const [curriculoBruto, temas, questoes, progresso, respostas, inicioReal] = await Promise.all([
    fetchJsonCached("data/curriculo.json"),
    fetchJsonCached("data/temas.json"),
    fetchJsonCached("data/questoes.json"),
    getAll("progresso"),
    getAll("respostas"),
    garantirInicioCurso(),
  ]);

  const curriculo = deslocarParaInicioReal(curriculoBruto, inicioReal);
  return { curriculo, temas, questoes, progresso, respostas, inicioReal };
}

/** Desloca todas as `dataProgramada` da planilha pelo offset entre a data original da semana 1 e `inicioReal`. */
function deslocarParaInicioReal(curriculoBruto, inicioReal) {
  if (!curriculoBruto.length) return curriculoBruto;
  const primeiraData = curriculoBruto.reduce((min, r) => (r.dataProgramada < min ? r.dataProgramada : min), curriculoBruto[0].dataProgramada);
  const offsetDias = diffDias(primeiraData, inicioReal);
  if (offsetDias === 0) return curriculoBruto;
  return curriculoBruto.map((linha) => ({ ...linha, dataProgramada: somarDias(linha.dataProgramada, offsetDias) }));
}

/** Monta o item de um tema (progresso das 2 etapas — resumo/questões), cruzando só sinais que já existem, sem checkbox novo. */
function montarItem(linha, contexto) {
  const { temaPorId, progressoSet, temaIdsComQuestao, temaIdsComQuestaoRespondida } = contexto;
  const tema = temaPorId.get(linha.temaId);
  if (!tema) return null; // temaId ainda não criado (ver Fase A) — linha fica de fora até o tema existir

  const resumoConcluido = progressoSet.has(tema.id);
  const temQuestoes = temaIdsComQuestao.has(tema.id);
  const questoesFeitas = temaIdsComQuestaoRespondida.has(tema.id);

  const etapasAplicaveis = [true, temQuestoes].filter(Boolean).length;
  const etapasConcluidas = [resumoConcluido, temQuestoes && questoesFeitas].filter(Boolean).length;

  return {
    temaId: tema.id,
    titulo: tema.titulo,
    categoria: tema.categoria,
    disciplina: linha.disciplina,
    semana: linha.semana,
    dataProgramada: linha.dataProgramada,
    resumoConcluido,
    temQuestoes,
    questoesFeitas,
    percentual: etapasAplicaveis ? Math.round((etapasConcluidas / etapasAplicaveis) * 100) : 0,
  };
}

function construirContexto({ temas, questoes, progresso, respostas }) {
  const temaPorId = new Map(temas.map((t) => [t.id, t]));
  const progressoSet = new Set(progresso.filter((p) => p.concluido).map((p) => p.id));
  const temaIdsComQuestao = new Set(questoes.map((q) => q.temaId));
  const temaIdsComQuestaoRespondida = new Set(respostas.map((r) => r.temaId));

  return { temaPorId, progressoSet, temaIdsComQuestao, temaIdsComQuestaoRespondida };
}

/** Grade completa do curso: semanas na ordem fixa do cronograma, cada uma com seus temas e progresso. */
export async function gerarGradeCurso() {
  const dados = await carregarDados();
  const contexto = construirContexto(dados);

  const porSemana = new Map();
  for (const linha of dados.curriculo) {
    const item = montarItem(linha, contexto);
    if (!item) continue;
    if (!porSemana.has(linha.semana)) porSemana.set(linha.semana, []);
    porSemana.get(linha.semana).push(item);
  }

  const semanas = [...porSemana.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([numero, itens]) => {
      const concluidos = itens.filter((i) => i.percentual === 100).length;
      return {
        numero,
        extra: numero > 50,
        dataInicio: itens.map((i) => i.dataProgramada).sort()[0] ?? null,
        itens,
        concluidos,
        total: itens.length,
        percentual: itens.length ? Math.round((concluidos / itens.length) * 100) : 0,
      };
    });

  const todosOsItens = semanas.flatMap((s) => s.itens);
  const totalConcluidos = todosOsItens.filter((i) => i.percentual === 100).length;

  return {
    semanas,
    todosOsItens,
    totalTemas: todosOsItens.length,
    totalConcluidos,
    percentualGeral: todosOsItens.length ? Math.round((totalConcluidos / todosOsItens.length) * 100) : 0,
  };
}

/**
 * Agenda do dia: conteúdo novo (programado pra hoje ou atrasado, ainda não
 * concluído) + revisões (vencidas/hoje), priorizando atrasadas > hoje > novo
 * (ver revisaoCurso.js — seção 27 do pedido original).
 */
export async function getAgendaHoje() {
  const [grade, agendaRevisoes] = await Promise.all([gerarGradeCurso(), getAgendaRevisoes()]);
  const hoje = hojeIso();

  const conteudoPendente = grade.todosOsItens.filter((i) => i.dataProgramada && i.dataProgramada <= hoje && i.percentual < 100);
  const conteudoAtrasado = conteudoPendente.filter((i) => i.dataProgramada < hoje);
  const conteudoHoje = conteudoPendente.filter((i) => i.dataProgramada === hoje);

  const temaPorId = new Map(grade.todosOsItens.map((i) => [i.temaId, i]));
  const enriquecerRevisao = (r) => ({ ...r, tema: temaPorId.get(r.temaId) ?? null });

  return {
    atrasadas: { conteudo: conteudoAtrasado, revisoes: agendaRevisoes.vencidas.map(enriquecerRevisao) },
    hoje: { conteudo: conteudoHoje, revisoes: agendaRevisoes.hoje.map(enriquecerRevisao) },
    totalPendenteHoje: conteudoAtrasado.length + conteudoHoje.length + agendaRevisoes.vencidas.length + agendaRevisoes.hoje.length,
  };
}

/**
 * A última semana do cronograma cuja data de início já chegou — usada por
 * "Minha Preparação" e "Planejamento Semanal" pra saber em que semana do
 * Curso o usuário está agora. Mesmo critério de `getAgendaHoje` (uma linha
 * é "de hoje/atrasada" quando `dataProgramada <= hoje`).
 */
export function encontrarSemanaAtual(semanas, hoje) {
  const jaComecaram = semanas.filter((s) => s.dataInicio && s.dataInicio <= hoje);
  if (!jaComecaram.length) return semanas[0] ?? null;
  return jaComecaram.reduce((maisRecente, s) => (s.dataInicio > maisRecente.dataInicio ? s : maisRecente));
}

/** Agregados pro topo da página (seção 19 do pedido original). */
export async function getDashboardCurso() {
  const [grade, agendaRevisoes, { respostas, inicioReal }] = await Promise.all([gerarGradeCurso(), getAgendaRevisoes(), carregarDados()]);
  const acertos = respostas.filter((r) => r.acertou).length;

  return {
    percentualGeral: grade.percentualGeral,
    totalConcluidos: grade.totalConcluidos,
    totalTemas: grade.totalTemas,
    revisoesHoje: agendaRevisoes.hoje.length,
    revisoesAtrasadas: agendaRevisoes.vencidas.length,
    totalQuestoesRespondidas: respostas.length,
    percentualAcerto: respostas.length ? Math.round((acertos / respostas.length) * 100) : null,
    inicioReal,
  };
}
