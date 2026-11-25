/**
 * MedConduta — Curso: gerenciador de estudos sobre o cronograma do MEDCURSO
 * 2026 (45 semanas, 91 aulas; cada aula agrupa os temas/resumos que cobrem o
 * seu conteúdo — ver data/curriculo.json, campos `aula` e `aulaOrdem`).
 *
 * Camada de ORGANIZAÇÃO sobre o conteúdo que já existe — não duplica nada:
 * resumo/progresso vem de `progresso` (já gravado por marcarConcluido em
 * views/conteudo.js), questões feitas vem de `respostas`. A semana de um
 * tema nunca muda — é a organização fixa do cronograma; o que muda com o
 * tempo é só o progresso e as revisões (ver revisaoCurso.js), calculadas
 * à parte.
 */

import { fetchJsonCached } from "./utils.js";
import { getAll, getPref, setPref, removeItem } from "./db.js";
import { getAgendaRevisoes, hojeIso, somarDias, diffDias } from "./revisaoCurso.js";


import { carregarIndiceBanco } from "./bancoQuestoes.js";
import { getPlanoEstudo, cargaTema, cargaVideosAula, planejarSemanas, semanasAteRevisao } from "./cargaCurso.js";
import { PREF_PROVA_DATA } from "./cronograma.js";
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

/**
 * Stores que guardam o andamento do Curso: temas marcados como estudados
 * (`progresso`, de onde saem as semanas/aulas concluídas) e o ciclo de
 * revisões espaçadas por tema (`revisoes_curso`). Questões (`respostas`,
 * `srs_questoes`) e flashcards (`srs_flashcards`) ficam de fora de propósito:
 * são progresso do banco de questões/baralho, não do cronograma.
 */
const STORES_PROGRESSO_CURSO = ["progresso", "revisoes_curso"];

/**
 * Nova data de início = recomeçar o Curso do zero: grava a nova âncora e apaga
 * todo o andamento do cronograma, mantendo questões e flashcards. O Worker só
 * apaga registro por registro, então vai em lotes pequenos pra não abrir
 * centenas de requisições de uma vez.
 */
export async function recomecarCurso(novaDataIso) {
  for (const store of STORES_PROGRESSO_CURSO) {
    const ids = (await getAll(store)).map((r) => r.id);
    for (let i = 0; i < ids.length; i += 10) {
      await Promise.all(ids.slice(i, i + 10).map((id) => removeItem(store, id)));
    }
  }
  await setCursoInicio(novaDataIso);
}

/**
 * `ancorar: false` monta a grade sem gravar a âncora — para telas que só
 * mostram o Curso de passagem (Início, Planejamento Semanal). Sem isso, abrir
 * o Início no primeiro acesso já "ligava" o Curso e todo o foco de revisão
 * (ver focoCurso.js) mudava sem o usuário ter começado o Curso de fato.
 */
async function carregarDados({ ancorar = true } = {}) {
  const [curriculoBruto, temas, questoes, progresso, respostas, inicioReal, videoaulas, plano, dataProva] = await Promise.all([
    fetchJsonCached("data/curriculo.json"),
    fetchJsonCached("data/temas.json"),
    carregarIndiceBanco().then((banco) => banco.registros), // índice leve: aqui só importa o temaId
    getAll("progresso"),
    getAll("respostas"),
    ancorar ? garantirInicioCurso() : getPref(PREF_CURSO_INICIO, null).then((salvo) => salvo || hojeIso()),
    fetchJsonCached("data/videoaulas.json").catch(() => ({ aulas: {} })),
    getPlanoEstudo(),
    getPref(PREF_PROVA_DATA, null),
  ]);

  const { curriculo, distribuicao } = distribuirCurriculo({ curriculoBruto, temas, questoes, inicioReal, videoaulas, plano, dataProva });
  return { curriculo, distribuicao, temas, questoes, progresso, respostas, inicioReal, plano, dataProva };
}

/**
 * Redistribui as aulas da planilha pelas semanas que cabem no tempo do
 * usuário (horas por dia × dias por semana) e até a data da prova — ver
 * cargaCurso.js. A ORDEM das aulas nunca muda; só quantas cabem em cada
 * semana. `dataProgramada` passa a ser a segunda-feira (ou o dia de início)
 * de cada semana a partir de `inicioReal`.
 */
function distribuirCurriculo({ curriculoBruto, temas, questoes, inicioReal, videoaulas, plano, dataProva }) {
  const temaPorId = new Map(temas.map((t) => [t.id, t]));
  const disponiveisPorTema = new Map();
  for (const q of questoes) {
    if (q.anulada || q.repetida) continue;
    disponiveisPorTema.set(q.temaId, (disponiveisPorTema.get(q.temaId) || 0) + 1);
  }

  const ordens = [...new Set(curriculoBruto.map((l) => l.aulaOrdem))].sort((a, b) => a - b);
  const aulas = ordens.map((ordem) => {
    const linhas = curriculoBruto.filter((l) => l.aulaOrdem === ordem);
    const video = cargaVideosAula(videoaulas.aulas?.[String(ordem)] || [], plano.velocidadeVideo);
    const temasCarga = linhas
      .filter((l) => temaPorId.has(l.temaId))
      .map((l) => ({ temaId: l.temaId, ...cargaTema(temaPorId.get(l.temaId), disponiveisPorTema.get(l.temaId) || 0) }));
    const estudoMin = video.videoMin + temasCarga.reduce((s, t) => s + t.leituraMin + t.questoesEstudoMin, 0);
    const revisoesMin = temasCarga.reduce((s, t) => s + t.revisoesMin, 0);
    const revisoes = temasCarga.flatMap((t) => t.revisoesDias.map((dias) => ({ dias, min: t.minPorRevisao })));
    return { ordem, video, temasCarga, estudoMin, revisoes, revisoesMin, totalMin: estudoMin + revisoesMin };
  });

  const totalMin = aulas.reduce((s, a) => s + a.totalMin, 0);
  const horasSemana = plano.horasDia * plano.diasSemana;
  const semanasAteProva = dataProva ? Math.floor(diffDias(inicioReal, dataProva) / 7) : null;
  const calc = planejarSemanas(aulas, { horasSemana, semanasAteProva });
  const semanaDaAula = new Map(calc.semanaDaAula.map((s, i) => [aulas[i].ordem, s]));

  // Carga por semana: estudo da própria semana + revisões que vencem nela
  // (estudo suposto no meio da semana; revisão em +dias depois).
  const porSemana = new Map();
  const semanaCarga = (n) => {
    if (!porSemana.has(n)) porSemana.set(n, { numero: n, videoMin: 0, leituraMin: 0, questoesMin: 0, revisoesMin: 0, questoesEstudo: 0, revisoes: 0 });
    return porSemana.get(n);
  };
  for (const aula of aulas) {
    const n = semanaDaAula.get(aula.ordem);
    const c = semanaCarga(n);
    c.videoMin += aula.video.videoMin;
    for (const t of aula.temasCarga) {
      c.leituraMin += t.leituraMin;
      c.questoesMin += t.questoesEstudoMin;
      c.questoesEstudo += t.questoesEstudo;
      for (const dias of t.revisoesDias) {
        const r = semanaCarga(n + semanasAteRevisao(dias));
        r.revisoesMin += t.minPorRevisao;
        r.revisoes += 1;
      }
    }
  }
  for (const c of porSemana.values()) c.totalMin = c.videoMin + c.leituraMin + c.questoesMin + c.revisoesMin;

  const aulaPorOrdem = new Map(aulas.map((a) => [a.ordem, a]));
  const curriculo = curriculoBruto.map((linha) => {
    const semana = semanaDaAula.get(linha.aulaOrdem) ?? linha.semana;
    const aula = aulaPorOrdem.get(linha.aulaOrdem);
    return {
      ...linha,
      semanaPlanilha: linha.semana,
      semana,
      dataProgramada: somarDias(inicioReal, (semana - 1) * 7),
      carga: aula?.temasCarga.find((t) => t.temaId === linha.temaId) || null,
      videosAula: aula?.video || null,
    };
  });

  return {
    curriculo,
    distribuicao: {
      semanas: calc.semanas,
      limite: calc.limite,
      necessarias: calc.necessarias,
      cabe: calc.cabe,
      orcamentoMin: calc.orcamentoMin,
      totalMin,
      horasSemana,
      semanasAteProva,
      dataProva,
      fimPrevisto: somarDias(inicioReal, calc.semanas * 7 - 1),
      cargaPorSemana: [...porSemana.values()].sort((a, b) => a.numero - b.numero),
    },
  };
}

/** Monta o item de um tema (progresso das 2 etapas — resumo/questões), cruzando só sinais que já existem, sem checkbox novo. */
function montarItem(linha, contexto) {
  const { temaPorId, progressoSet, questoesRespondidasPorTema } = contexto;
  const tema = temaPorId.get(linha.temaId);
  if (!tema) return null; // temaId ainda não criado (ver Fase A) — linha fica de fora até o tema existir

  const resumoConcluido = progressoSet.has(tema.id);
  const questoesMeta = linha.carga?.questoesEstudo ?? 0;
  const questoesRespondidas = questoesRespondidasPorTema.get(tema.id)?.size || 0;
  const temQuestoes = questoesMeta > 0;
  const questoesFeitas = temQuestoes && questoesRespondidas >= questoesMeta;

  const etapasAplicaveis = [true, temQuestoes].filter(Boolean).length;
  const etapasConcluidas = [resumoConcluido, questoesFeitas].filter(Boolean).length;

  return {
    temaId: tema.id,
    titulo: tema.titulo,
    categoria: tema.categoria,
    disciplina: linha.disciplina,
    aula: linha.aula || null,
    aulaOrdem: linha.aulaOrdem ?? null,
    aulaTopicos: linha.aulaTopicos || [],
    videosAula: linha.videosAula,
    carga: linha.carga,
    semana: linha.semana,
    dataProgramada: linha.dataProgramada,
    resumoConcluido,
    temQuestoes,
    questoesMeta,
    questoesRespondidas: Math.min(questoesRespondidas, questoesMeta || questoesRespondidas),
    questoesFeitas,
    percentual: etapasAplicaveis ? Math.round((etapasConcluidas / etapasAplicaveis) * 100) : 0,
    prioridadeProva: tema.prioridadeProva || "media",
  };
}

function construirContexto({ temas, progresso, respostas }) {
  const temaPorId = new Map(temas.map((t) => [t.id, t]));
  const progressoSet = new Set(progresso.filter((p) => p.concluido).map((p) => p.id));
  // Questões DIFERENTES respondidas por tema (refazer a mesma não conta duas vezes pra meta).
  const questoesRespondidasPorTema = new Map();
  for (const r of respostas) {
    if (!r.temaId) continue;
    if (!questoesRespondidasPorTema.has(r.temaId)) questoesRespondidasPorTema.set(r.temaId, new Set());
    questoesRespondidasPorTema.get(r.temaId).add(r.questaoId || r.id);
  }

  return { temaPorId, progressoSet, questoesRespondidasPorTema };
}

/** Grade completa do curso: semanas na ordem fixa do cronograma, cada uma com seus temas e progresso. */
export async function gerarGradeCurso(opcoes) {
  const dados = await carregarDados(opcoes);
  const contexto = construirContexto(dados);

  const porSemana = new Map();
  for (const linha of dados.curriculo) {
    const item = montarItem(linha, contexto);
    if (!item) continue;
    if (!porSemana.has(linha.semana)) porSemana.set(linha.semana, []);
    porSemana.get(linha.semana).push(item);
  }

  const cargaPorNumero = new Map(dados.distribuicao.cargaPorSemana.map((c) => [c.numero, c]));
  const semanas = [...porSemana.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([numero, itens]) => {
      const concluidos = itens.filter((i) => i.percentual === 100).length;
      return {
        numero,
        carga: cargaPorNumero.get(numero) || null,
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
    distribuicao: dados.distribuicao,
    plano: dados.plano,
    respostas: dados.respostas,
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
  // Toda a semana do cronograma tem a mesma `dataProgramada` (a segunda da
  // semana) — o conteúdo vale pra semana inteira e só fica atrasado depois que
  // ela termina; antes disso aparece como "para hoje".
  const conteudoAtrasado = conteudoPendente.filter((i) => somarDias(i.dataProgramada, 6) < hoje);
  const conteudoHoje = conteudoPendente.filter((i) => somarDias(i.dataProgramada, 6) >= hoje);

  const temaPorId = new Map(grade.todosOsItens.map((i) => [i.temaId, i]));
  // Cada revisão pede 10 questões do tema: contam as questões diferentes
  // respondidas a partir do dia em que a revisão venceu.
  const enriquecerRevisao = (r) => {
    const tema = temaPorId.get(r.temaId) ?? null;
    const feitas = new Set(
      grade.respostas.filter((x) => x.temaId === r.temaId && (x.respondidoEm || "").slice(0, 10) >= r.dataAgendada).map((x) => x.questaoId || x.id)
    ).size;
    const meta = tema?.carga?.questoesRevisao ?? 0;
    return { ...r, tema, questoesMeta: meta, questoesFeitas: Math.min(feitas, meta) };
  };

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
