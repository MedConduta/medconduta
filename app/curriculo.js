/**
 * MedConduta — Curso: gerenciador de estudos sobre o cronograma real de
 * residência (planilha "Estratégia MED - 2025", 50 semanas + semanas extras
 * pro que não está na planilha — ver data/curriculo.json).
 *
 * Camada de ORGANIZAÇÃO sobre o conteúdo que já existe — não duplica nada:
 * resumo/progresso vem de `progresso` (já gravado por marcarConcluido em
 * views/conteudo.js), questões feitas vem de `respostas`, flashcards
 * estudados vem de `srs` (SM-2). A semana de um tema nunca muda — é a
 * organização fixa do cronograma; o que muda com o tempo é só o progresso e
 * as revisões (ver revisaoCurso.js), calculadas à parte.
 */

import { fetchJsonCached } from "./utils.js";
import { getAll } from "./db.js";
import { getAgendaRevisoes, hojeIso } from "./revisaoCurso.js";

async function carregarDados() {
  const [curriculo, temas, questoes, flashcardsDecks, progresso, respostas, srsRecords] = await Promise.all([
    fetchJsonCached("data/curriculo.json"),
    fetchJsonCached("data/temas.json"),
    fetchJsonCached("data/questoes.json"),
    fetchJsonCached("data/flashcards.json"),
    getAll("progresso"),
    getAll("respostas"),
    getAll("srs"),
  ]);
  return { curriculo, temas, questoes, flashcardsDecks, progresso, respostas, srsRecords };
}

/** Monta o item de um tema (progresso das 3 etapas — resumo/questões/flashcards), cruzando só sinais que já existem, sem checkbox novo. */
function montarItem(linha, contexto) {
  const { temaPorId, progressoSet, temaIdsComQuestao, temaIdsComQuestaoRespondida, temaIdsComDeck, temaIdsComFlashcardEstudado } = contexto;
  const tema = temaPorId.get(linha.temaId);
  if (!tema) return null; // temaId ainda não criado (ver Fase A) — linha fica de fora até o tema existir

  const resumoConcluido = progressoSet.has(tema.id);
  const temQuestoes = temaIdsComQuestao.has(tema.id);
  const questoesFeitas = temaIdsComQuestaoRespondida.has(tema.id);
  const temFlashcards = temaIdsComDeck.has(tema.id);
  const flashcardsEstudados = temaIdsComFlashcardEstudado.has(tema.id);

  const etapasAplicaveis = [true, temQuestoes, temFlashcards].filter(Boolean).length;
  const etapasConcluidas = [resumoConcluido, temQuestoes && questoesFeitas, temFlashcards && flashcardsEstudados].filter(Boolean).length;

  return {
    temaId: tema.id,
    titulo: tema.titulo,
    categoria: tema.categoria,
    disciplina: linha.disciplina,
    dataProgramada: linha.dataProgramada,
    resumoConcluido,
    temQuestoes,
    questoesFeitas,
    temFlashcards,
    flashcardsEstudados,
    percentual: etapasAplicaveis ? Math.round((etapasConcluidas / etapasAplicaveis) * 100) : 0,
  };
}

function construirContexto({ temas, questoes, flashcardsDecks, progresso, respostas, srsRecords }) {
  const temaPorId = new Map(temas.map((t) => [t.id, t]));
  const progressoSet = new Set(progresso.filter((p) => p.concluido).map((p) => p.id));
  const temaIdsComQuestao = new Set(questoes.map((q) => q.temaId));
  const temaIdsComQuestaoRespondida = new Set(respostas.map((r) => r.temaId));
  const temaIdsComDeck = new Set(flashcardsDecks.map((d) => d.temaId));

  const srsIdsComRegistro = new Set(srsRecords.map((r) => r.id));
  const temaIdsComFlashcardEstudado = new Set(
    flashcardsDecks.filter((d) => d.cards.some((c) => srsIdsComRegistro.has(c.id))).map((d) => d.temaId)
  );

  return { temaPorId, progressoSet, temaIdsComQuestao, temaIdsComQuestaoRespondida, temaIdsComDeck, temaIdsComFlashcardEstudado };
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

/** Agregados pro topo da página (seção 19 do pedido original). */
export async function getDashboardCurso() {
  const [grade, agendaRevisoes, { respostas }] = await Promise.all([gerarGradeCurso(), getAgendaRevisoes(), carregarDados()]);
  const acertos = respostas.filter((r) => r.acertou).length;

  return {
    percentualGeral: grade.percentualGeral,
    totalConcluidos: grade.totalConcluidos,
    totalTemas: grade.totalTemas,
    revisoesHoje: agendaRevisoes.hoje.length,
    revisoesAtrasadas: agendaRevisoes.vencidas.length,
    totalQuestoesRespondidas: respostas.length,
    percentualAcerto: respostas.length ? Math.round((acertos / respostas.length) * 100) : null,
  };
}
