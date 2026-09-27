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

/**
 * Fila de revisão: `vencidos` primeiro (nunca vistos ou com dueDate no
 * passado), `futuros` ordenados pelo mais próximo de vencer. Se `temaId` for
 * passado, restringe a fila só aos cards daquele tema.
 */
export async function getFilaRevisao({ temaId } = {}) {
  const [cards, srsRecords] = await Promise.all([todosOsFlashcards(), getAll(STORE_SRS_FLASHCARDS)]);
  const srsMap = new Map(srsRecords.map((r) => [r.id, r]));
  const filtrados = temaId ? cards.filter((c) => c.temaId === temaId) : cards;

  const itens = filtrados.map((card) => ({ card, estado: srsMap.get(card.id) ?? null }));
  const vencidos = itens.filter((i) => estaVencido(i.estado));
  const futuros = itens.filter((i) => !estaVencido(i.estado)).sort((a, b) => diasAteVencer(a.estado) - diasAteVencer(b.estado));

  return { vencidos, futuros, total: itens.length };
}

/** Quantos cards de um tema específico existem — usado pra decidir se mostra o link em Conteúdo. */
export async function contarFlashcardsDoTema(temaId) {
  const cards = await todosOsFlashcards();
  return cards.filter((c) => c.temaId === temaId).length;
}
