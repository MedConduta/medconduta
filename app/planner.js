import { fetchJsonCached } from "./utils.js";
import { getAll } from "./db.js";
import { estaVencido } from "./sm2.js";
import { pesoProva } from "./areas.js";
import { getEstadoPreparo, aplicarModoNoPeso } from "./modo.js";
import { getQuestoesEmRevisao } from "./erros.js";

const MIN_POR_REVISAO_VENCIDA = 8; // flashcard/revisão pontual
const MIN_POR_REVISAO_ERRO = 6; // reler + resolver de novo uma questão já errada
const MIN_POR_TEMA_NOVO = 25; // leitura de um tema completo
const MIN_POR_QUESTOES_BLOCO = 15; // bloco de ~5 questões

// Teto de tempo pro conjunto de revisões vencidas (flashcards + erros) sobre
// o orçamento do DIA (não o que sobra depois delas) — sem isso, um backlog
// grande de revisões vencidas podia consumir 100% do tempo disponível e
// nunca sobrar nada pra conteúdo novo ou questões. 40% é o teto superior da
// faixa razoável pro tipo de revisão pontual que este motor gera (o
// suficiente pra zerar backlogs grandes em poucos dias, sem dominar a
// agenda todo dia). O que não cabe no teto continua vencido e reaparece nos
// próximos dias — nada se perde, só se espalha no tempo.
const TETO_REVISOES_PCT = 0.4;

// Desempenho (0-1) assumido para uma categoria sem nenhuma questão respondida
// ainda — nem "dominado" nem "fraco", só sem dado. Assim que o usuário
// responde questões daquela categoria, o valor real substitui esse padrão.
// Exportado porque prontidao.js reaproveita o mesmo padrão ao montar o
// heatmap de fraquezas (ver Fase 6).
export const DESEMPENHO_PADRAO_SEM_DADO = 0.6;

/**
 * Calcula, por categoria (ex.: "Cardiologia"), a taxa de acerto nas questões
 * já respondidas pelo usuário (histórico salvo em `respostas`, ver Fase 2).
 * Retorna um Map categoria -> { taxa: 0-1, total: nº de tentativas }.
 */
export function calcularDesempenhoPorCategoria(respostas) {
  const agregados = new Map();
  for (const r of respostas) {
    if (!r.categoria) continue;
    const atual = agregados.get(r.categoria) || { acertos: 0, total: 0 };
    atual.total += 1;
    if (r.acertou) atual.acertos += 1;
    agregados.set(r.categoria, atual);
  }
  const resultado = new Map();
  for (const [categoria, { acertos, total }] of agregados) {
    resultado.set(categoria, { taxa: acertos / total, total });
  }
  return resultado;
}

/**
 * Score de prioridade de uma categoria: cresce com o peso da categoria na
 * prova (incidência estimada, ver areas.js) e com o quanto o desempenho do
 * usuário nela está abaixo do ideal. Uma categoria de alta incidência com
 * baixo desempenho fica no topo; uma de baixa incidência já dominada fica
 * no fim — mesma lógica do "80/20" (alta incidência + baixo domínio =
 * prioridade máxima).
 */
export function calcularScorePrioridade(categoria, desempenhoPorCategoria, provaAlvo = "SES-PE") {
  const info = desempenhoPorCategoria.get(categoria);
  const taxa = info ? info.taxa : DESEMPENHO_PADRAO_SEM_DADO;
  return pesoProva(categoria, provaAlvo) * (1 + (1 - taxa));
}

/**
 * Monta a fila de estudo do dia priorizando:
 * 1) Revisões espaçadas vencidas — flashcards (SM-2) e questões já erradas
 *    antes (ver erros.js) — sempre primeiro, nunca somem, independente da
 *    fase da preparação (ver Fase 4/cronograma.js).
 * 2) Temas novos/pendentes, ordenados pelo score de prioridade da categoria
 *    (incidência × fragilidade), não pela ordem em que aparecem no arquivo.
 * 3) Bloco de questões, direcionado para a categoria de maior prioridade que
 *    ainda tem questões cadastradas.
 * O tempo que sobra após as revisões (2+3) é dividido entre conteúdo novo e
 * questões segundo o peso da fase atual da preparação: perto da prova,
 * quase tudo vira questões; longe da prova, o conteúdo novo pesa mais. Sem
 * data de prova configurada, usa um peso padrão razoável (ver cronograma.js).
 * Se o usuário está atrasado em relação ao cronograma, o Modo Recuperação
 * (ver modo.js, Fase 7) sobrepõe esse peso pra puxar mais conteúdo até o
 * atraso ser recuperado.
 */
export async function gerarPlanoDoDia(horasDisponiveis) {
  const minutosDisponiveis = Math.max(0, Math.round(horasDisponiveis * 60));
  let minutosRestantes = minutosDisponiveis;
  const fila = [];

  const [
    temas,
    flashcardsDecks,
    questoes,
    srsRecords,
    progresso,
    respostas,
    { fase: faseBase, diasRestantes, modo, provaAlvo },
    { vencidas: errosVencidos },
  ] = await Promise.all([
    fetchJsonCached("data/temas.json"),
    fetchJsonCached("data/flashcards.json"),
    fetchJsonCached("data/questoes.json"),
    getAll("srs"),
    getAll("progresso"),
    getAll("respostas"),
    getEstadoPreparo(),
    getQuestoesEmRevisao(),
  ]);

  // Modo Recuperação (ver modo.js, Fase 7) empurra o peso de volta pra
  // conteúdo até o atraso em relação ao cronograma ser recuperado — sem
  // alterar a fase original usada em Cronograma/Prontidão.
  const fase = aplicarModoNoPeso(faseBase, modo);

  const srsMap = new Map(srsRecords.map((r) => [r.id, r]));
  const progressoSet = new Set(progresso.filter((p) => p.concluido).map((p) => p.id));
  const desempenhoPorCategoria = calcularDesempenhoPorCategoria(respostas);

  // Ranking de categorias por prioridade (maior score primeiro) — usado para
  // ordenar temas pendentes e para escolher o foco do bloco de questões.
  const categorias = [...new Set(temas.map((t) => t.categoria))];
  const rankingCategorias = categorias
    .map((categoria) => ({ categoria, score: calcularScorePrioridade(categoria, desempenhoPorCategoria, provaAlvo) }))
    .sort((a, b) => b.score - a.score);
  const scorePorCategoria = new Map(rankingCategorias.map((r) => [r.categoria, r.score]));

  // 1) Revisões vencidas — junta todos os cards de todos os decks e filtra vencidos
  const todosCards = flashcardsDecks.flatMap((deck) =>
    deck.cards.map((c) => ({ ...c, deckId: deck.id, deckTitulo: deck.titulo }))
  );
  const vencidos = todosCards.filter((c) => estaVencido(srsMap.get(c.id)));

  // Teto de tempo compartilhado pelas duas filas de revisão (1 e 1b) — ver
  // TETO_REVISOES_PCT. O que ultrapassar o teto continua vencido e some da
  // fila de hoje, sem sumir de verdade: volta a aparecer amanhã.
  const orcamentoRevisoes = Math.round(minutosDisponiveis * TETO_REVISOES_PCT);
  let minutosGastosRevisoes = 0;

  for (const card of vencidos) {
    if (minutosRestantes < MIN_POR_REVISAO_VENCIDA / 2) break;
    if (minutosGastosRevisoes + MIN_POR_REVISAO_VENCIDA > orcamentoRevisoes) break;
    fila.push({
      tipo: "revisao",
      titulo: `Revisar: ${card.deckTitulo}`,
      detalhe: card.frente,
      duracaoMin: MIN_POR_REVISAO_VENCIDA,
      link: `#/residencia/flashcards/${card.deckId}`,
    });
    minutosRestantes -= MIN_POR_REVISAO_VENCIDA;
    minutosGastosRevisoes += MIN_POR_REVISAO_VENCIDA;
  }

  // 1b) Questões já erradas antes, vencidas para revisão espaçada (ver erros.js) —
  // mesma prioridade incondicional das revisões de flashcard, sujeita ao mesmo teto.
  for (const { questao } of errosVencidos) {
    if (minutosRestantes < MIN_POR_REVISAO_ERRO / 2) break;
    if (minutosGastosRevisoes + MIN_POR_REVISAO_ERRO > orcamentoRevisoes) break;
    const resumo = questao.enunciado.length > 100 ? `${questao.enunciado.slice(0, 100)}…` : questao.enunciado;
    fila.push({
      tipo: "revisao-erro",
      titulo: `Revisar erro: ${questao.tema}`,
      detalhe: resumo,
      duracaoMin: MIN_POR_REVISAO_ERRO,
      link: "#/residencia/erros",
    });
    minutosRestantes -= MIN_POR_REVISAO_ERRO;
    minutosGastosRevisoes += MIN_POR_REVISAO_ERRO;
  }

  // 2) e 3) — o tempo que sobra após revisões se divide entre conteúdo novo
  // e questões segundo o peso da fase atual (ver cronograma.js). Se o
  // conteúdo novo acabar antes de gastar sua fatia (ou a fatia for pequena
  // demais para um tema inteiro), o restante rola para o bloco de questões
  // em vez de ficar ocioso.
  const orcamentoPosRevisao = minutosRestantes;
  let orcamentoConteudo = Math.round(orcamentoPosRevisao * fase.pesoConteudo);
  let orcamentoQuestoes = orcamentoPosRevisao - orcamentoConteudo;

  const temasPendentes = temas
    .filter((t) => !progressoSet.has(t.id))
    .sort((a, b) => (scorePorCategoria.get(b.categoria) ?? 0) - (scorePorCategoria.get(a.categoria) ?? 0));

  for (const tema of temasPendentes) {
    if (orcamentoConteudo < MIN_POR_TEMA_NOVO / 2) break;
    fila.push({
      tipo: "conteudo",
      titulo: `Estudar: ${tema.titulo}`,
      detalhe: tema.resumo,
      duracaoMin: MIN_POR_TEMA_NOVO,
      link: `#/residencia/conteudo/${tema.id}`,
    });
    orcamentoConteudo -= MIN_POR_TEMA_NOVO;
    minutosRestantes -= MIN_POR_TEMA_NOVO;
  }
  if (orcamentoConteudo > 0) orcamentoQuestoes += orcamentoConteudo; // fatia de conteúdo não usada vira questões

  // Bloco de questões — direcionado à categoria de maior prioridade que
  // ainda tenha questões cadastradas (evita recomendar uma categoria vazia).
  const temaIdParaCategoria = new Map(temas.map((t) => [t.id, t.categoria]));
  const categoriasComQuestao = new Set(
    questoes.map((q) => temaIdParaCategoria.get(q.temaId)).filter(Boolean)
  );
  const categoriaFoco = rankingCategorias.find((r) => categoriasComQuestao.has(r.categoria))?.categoria ?? null;

  let blocosQuestoes = 0;
  while (orcamentoQuestoes >= MIN_POR_QUESTOES_BLOCO && minutosRestantes >= MIN_POR_QUESTOES_BLOCO && blocosQuestoes < 24) {
    fila.push({
      tipo: "questoes",
      titulo: "Bloco de questões de reforço",
      detalhe: categoriaFoco
        ? `Foque em ${categoriaFoco} — é seu maior gargalo agora (alta incidência na prova + desempenho a melhorar).`
        : "Resolva um bloco de questões comentadas para fixar os temas do dia.",
      duracaoMin: MIN_POR_QUESTOES_BLOCO,
      link: "#/residencia/questoes",
    });
    orcamentoQuestoes -= MIN_POR_QUESTOES_BLOCO;
    minutosRestantes -= MIN_POR_QUESTOES_BLOCO;
    blocosQuestoes += 1;
  }

  const minutosUsados = minutosDisponiveis - minutosRestantes;

  return {
    minutosDisponiveis,
    minutosUsados,
    minutosOciosos: minutosRestantes,
    totalRevisoesVencidas: vencidos.length + errosVencidos.length,
    totalTemasPendentes: temasPendentes.length,
    fase,
    diasRestantes,
    modo,
    // Top 3 categorias de maior prioridade agora, com o "porquê" (peso na
    // prova × desempenho atual) — não é um dashboard completo (isso é uma
    // fase futura), só o suficiente para responder "por que isso primeiro?".
    principaisGargalos: rankingCategorias.slice(0, 3).map((r) => ({
      categoria: r.categoria,
      desempenho: desempenhoPorCategoria.get(r.categoria) ?? null,
    })),
    fila,
  };
}
