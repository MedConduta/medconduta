/**
 * MedConduta — Flashcards (frente/verso), com repetição espaçada (SM-2, ver
 * sm2.js) — mesmo motor de app/erros.js, só que aqui a qualidade vem de uma
 * autoavaliação manual (3 botões), não de acerto/erro automático de questão.
 */

import { getAll, getItem, setItem } from "./db.js";
import { fetchJsonCached } from "./utils.js";
import { revisar, estaVencido, diasAteVencer } from "./sm2.js";

const STORE_SRS_FLASHCARDS = "srs_flashcards";

export const QUALIDADE = {
  naoLembrei: 1,
  lembrei: 4,
  facil: 5,
};

/** Cards que a pessoa gerou a partir de questões (por conta, no servidor). */
const STORE_CARDS_QUESTOES = "flashcards_questoes";

/** Baralho fixo (data/flashcards.json) + cards gerados a partir das questões. */
export async function todosOsFlashcards() {
  const [fixos, gerados] = await Promise.all([fetchJsonCached("data/flashcards.json"), getAll(STORE_CARDS_QUESTOES)]);
  return [...fixos, ...gerados];
}

const ENUNCIADO_NEGATIVO = /\b(incorreta|errada|falsa|exceto|n[ãa]o\s+(?:[ée]|est[áa]|corresponde|representa|se\s+aplica))\b/i;

/**
 * Card "de bolso" montado só com os dados da questão, sem IA: frente = enunciado
 * (avisando quando a pergunta pede a alternativa INCORRETA); verso = alternativa
 * correta + comentário original, quando ele diz algo além do gabarito.
 */
export function montarCardDeQuestao(q) {
  const letra = String.fromCharCode(65 + q.correta);
  const negativa = ENUNCIADO_NEGATIVO.test(q.enunciado.slice(-220));
  const comentario = (q.comentario || "").trim();
  const comentarioUtil = comentario && !/^gabarito:?\s*alternativa\s*[a-e]\.?$/i.test(comentario) && !/^quest[ãa]o anulada/i.test(comentario);
  return {
    id: `q:${q.id}`,
    questaoId: q.id,
    temaId: q.temaId,
    banca: q.banca && q.ano ? `${q.banca} ${q.ano}` : q.banca || undefined,
    frente: negativa ? `${q.enunciado}\n\n(Qual alternativa é a exceção/incorreta?)` : q.enunciado,
    verso: `${letra}) ${q.alternativas[q.correta]}${comentarioUtil ? `\n\n${comentario.slice(0, 600)}` : ""}`,
    origem: "questao",
    criadoEm: new Date().toISOString(),
  };
}

export async function salvarCardDeQuestao(card) {
  await setItem(STORE_CARDS_QUESTOES, card);
  return card;
}

/** Ids das questões que já viraram card — para não duplicar. */
export async function questoesComCard() {
  const gerados = await getAll(STORE_CARDS_QUESTOES);
  return new Set(gerados.map((c) => c.questaoId));
}

/** Gera (sem IA, para caber em lote) cards das questões que ainda não têm; devolve quantos criou. */
export async function gerarCardsDeQuestoes(questoes) {
  const jaTem = await questoesComCard();
  const novas = questoes.filter((q) => q && !jaTem.has(q.id) && Number.isInteger(q.correta));
  for (const q of novas) await salvarCardDeQuestao(montarCardDeQuestao(q));
  return novas.length;
}

export async function registrarRevisaoFlashcard(cardId, qualidade) {
  const estadoAtual = await getItem(STORE_SRS_FLASHCARDS, cardId);
  const novoEstado = { id: cardId, ...revisar(estadoAtual, qualidade) };
  await setItem(STORE_SRS_FLASHCARDS, novoEstado);
  return novoEstado;
}

/** Baralho dos cards feitos a partir das questões IAUPE/SES-PE (campo `banca` no JSON). */
export const BARALHO_SESPE = "sespe";
/** Baralho do Curso: temas da semana atual + temas do Curso já estudados (ver focoCurso.js). */
export const BARALHO_CURSO = "curso";
/** Baralho dos cards gerados a partir das questões que a pessoa escolheu ou errou. */
export const BARALHO_QUESTOES = "questoes";

function ehDoBaralhoSesPe(card) {
  return card.banca === "IAUPE/SES-PE";
}

/**
 * Prioridade de cada tema para apresentar cards novos: os cards SES-PE foram
 * gravados em ordem decrescente de incidência do tema na banca, então a
 * primeira aparição de cada tema nesse bloco já é o ranking. Temas sem cards
 * SES-PE ficam depois, na ordem do arquivo.
 */
function rankingDeTemas(cards) {
  const ranking = new Map();
  for (const c of cards) if (ehDoBaralhoSesPe(c) && !ranking.has(c.temaId)) ranking.set(c.temaId, ranking.size);
  for (const c of cards) if (!ranking.has(c.temaId)) ranking.set(c.temaId, ranking.size);
  return ranking;
}

/**
 * Fila de revisão: `vencidos` primeiro (nunca vistos ou com dueDate no
 * passado), `futuros` ordenados pelo mais próximo de vencer. Se `temaId` for
 * passado, restringe a fila só aos cards daquele tema; `baralho: "sespe"`
 * restringe aos cards das questões IAUPE/SES-PE. `novos` traz só os nunca
 * vistos, do tema mais cobrado para o menos.
 */
export async function getFilaRevisao({ temaId, baralho, temaIdsCurso, temaIdsPrioritarios } = {}) {
  const [cards, srsRecords] = await Promise.all([todosOsFlashcards(), getAll(STORE_SRS_FLASHCARDS)]);
  const srsMap = new Map(srsRecords.map((r) => [r.id, r]));
  let filtrados = temaId ? cards.filter((c) => c.temaId === temaId) : cards;
  if (baralho === BARALHO_SESPE) filtrados = filtrados.filter(ehDoBaralhoSesPe);
  if (baralho === BARALHO_CURSO && temaIdsCurso) filtrados = filtrados.filter((c) => temaIdsCurso.has(c.temaId));
  if (baralho === BARALHO_QUESTOES) filtrados = filtrados.filter((c) => c.origem === "questao");

  const itens = filtrados.map((card) => ({ card, estado: srsMap.get(card.id) ?? null }));
  const vencidos = itens.filter((i) => estaVencido(i.estado));
  const futuros = itens.filter((i) => !estaVencido(i.estado)).sort((a, b) => diasAteVencer(a.estado) - diasAteVencer(b.estado));

  // Rodízio entre temas: 1º card de cada tema (do mais cobrado ao menos),
  // depois o 2º de cada um... — uma sessão de novos não vira um tema só.
  const ranking = rankingDeTemas(cards);
  const posicaoNoTema = new Map();
  const novos = vencidos
    .filter((i) => !i.estado)
    .map((i) => {
      const k = posicaoNoTema.get(i.card.temaId) || 0;
      posicaoNoTema.set(i.card.temaId, k + 1);
      return { ...i, k };
    })
    // Temas prioritários (semana atual do Curso) entram antes de qualquer outro.
    .sort((a, b) => {
      const pa = temaIdsPrioritarios?.has(a.card.temaId) ? 0 : 1;
      const pb = temaIdsPrioritarios?.has(b.card.temaId) ? 0 : 1;
      return pa - pb || a.k - b.k || ranking.get(a.card.temaId) - ranking.get(b.card.temaId);
    })
    .map(({ k, ...i }) => i);
  const revisoes = vencidos.filter((i) => i.estado);

  return { vencidos, revisoes, novos, futuros, total: itens.length };
}

/** Quantos cards de um tema específico existem — usado pra decidir se mostra o link em Conteúdo. */
export async function contarFlashcardsDoTema(temaId) {
  const cards = await todosOsFlashcards();
  return cards.filter((c) => c.temaId === temaId).length;
}
