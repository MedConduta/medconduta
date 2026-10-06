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

export async function todosOsFlashcards() {
  return fetchJsonCached("data/flashcards.json");
}

export async function registrarRevisaoFlashcard(cardId, qualidade) {
  const estadoAtual = await getItem(STORE_SRS_FLASHCARDS, cardId);
  const novoEstado = { id: cardId, ...revisar(estadoAtual, qualidade) };
  await setItem(STORE_SRS_FLASHCARDS, novoEstado);
  return novoEstado;
}

/** Baralho dos cards feitos a partir das questões IAUPE/SES-PE (campo `banca` no JSON). */
export const BARALHO_SESPE = "sespe";

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
export async function getFilaRevisao({ temaId, baralho } = {}) {
  const [cards, srsRecords] = await Promise.all([todosOsFlashcards(), getAll(STORE_SRS_FLASHCARDS)]);
  const srsMap = new Map(srsRecords.map((r) => [r.id, r]));
  let filtrados = temaId ? cards.filter((c) => c.temaId === temaId) : cards;
  if (baralho === BARALHO_SESPE) filtrados = filtrados.filter(ehDoBaralhoSesPe);

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
    .sort((a, b) => a.k - b.k || ranking.get(a.card.temaId) - ranking.get(b.card.temaId))
    .map(({ k, ...i }) => i);
  const revisoes = vencidos.filter((i) => i.estado);

  return { vencidos, revisoes, novos, futuros, total: itens.length };
}

/** Quantos cards de um tema específico existem — usado pra decidir se mostra o link em Conteúdo. */
export async function contarFlashcardsDoTema(temaId) {
  const cards = await todosOsFlashcards();
  return cards.filter((c) => c.temaId === temaId).length;
}
