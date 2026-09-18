/**
 * MedConduta — Fase 15b: edição manual de flashcards.
 *
 * Só o conteúdo que o PRÓPRIO usuário criou ou pediu à IA pode ser editado
 * ou excluído — os baralhos curados (data/flashcards.json) são conteúdo do
 * curso e continuam somente-leitura, igual a qualquer outro conteúdo
 * curado da plataforma. "Marcar difícil"/"marcar dominado" é uma exceção:
 * como só ajusta o estado de revisão espaçada (store "srs", já 100%
 * pessoal e mutável), funciona em QUALQUER baralho, curado incluso.
 */

import { fetchJsonCached } from "./utils.js";
import { getAll, getItem, setItem, removeItem } from "./db.js";

const STORE_MANUAL = "flashcards_custom";
const DIAS_DOMINADO = 30;

function idUnico(prefixo) {
  const sufixo = (crypto.randomUUID?.() || String(Math.random())).replace(/-/g, "").slice(0, 6);
  return `${prefixo}-${sufixo}`;
}

/** Todos os baralhos — curados + gerados por IA + criados manualmente. */
export async function todosOsDecks() {
  const [curados, gerados, manuais] = await Promise.all([
    fetchJsonCached("data/flashcards.json"),
    getAll("ia_flashcards"),
    getAll(STORE_MANUAL),
  ]);
  return [...curados, ...gerados, ...manuais];
}

/** Um baralho é editável (criar/editar/excluir cards) se não for conteúdo curado do curso. */
export function baralhoEditavel(deck) {
  return deck.origem === "ia" || deck.origem === "manual";
}

function storeDoBaralho(deck) {
  return deck.origem === "manual" ? STORE_MANUAL : "ia_flashcards";
}

export async function criarBaralhoManual(titulo) {
  const deck = { id: idUnico("deck-manual"), titulo: titulo.trim() || "Baralho sem título", origem: "manual", cards: [] };
  await setItem(STORE_MANUAL, deck);
  return deck;
}

export async function excluirBaralho(deck) {
  await removeItem(storeDoBaralho(deck), deck.id);
}

export async function adicionarCard(deck, { frente, verso }) {
  const novoCard = { id: idUnico("card"), frente: frente.trim(), verso: verso.trim() };
  const atualizado = { ...deck, cards: [...deck.cards, novoCard] };
  await setItem(storeDoBaralho(deck), atualizado);
  return atualizado;
}

export async function editarCard(deck, cardId, { frente, verso }) {
  const atualizado = {
    ...deck,
    cards: deck.cards.map((c) => (c.id === cardId ? { ...c, frente: frente.trim(), verso: verso.trim() } : c)),
  };
  await setItem(storeDoBaralho(deck), atualizado);
  return atualizado;
}

export async function excluirCard(deck, cardId) {
  const atualizado = { ...deck, cards: deck.cards.filter((c) => c.id !== cardId) };
  await setItem(storeDoBaralho(deck), atualizado);
  return atualizado;
}

/**
 * "Difícil"/"dominado" são sinalizações manuais e diretas — diferente de
 * responder uma revisão de verdade (ver sm2.js/revisar, usado no fluxo de
 * estudo), aqui o usuário está dizendo de cara "isso está difícil, quero
 * ver de novo logo" ou "isso eu já domino, pode demorar" — sem precisar
 * passar pelo card na tela de estudo.
 */
export async function marcarComoDificil(cardId) {
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const atual = await getItem("srs", cardId);
  await setItem("srs", {
    id: cardId,
    ease: atual?.ease ?? 2.5,
    interval: 1,
    repetitions: 0,
    dueDate: amanha.toISOString(),
    lastQuality: 1,
  });
}

export async function marcarComoDominado(cardId) {
  const dataAlvo = new Date();
  dataAlvo.setDate(dataAlvo.getDate() + DIAS_DOMINADO);
  const atual = await getItem("srs", cardId);
  await setItem("srs", {
    id: cardId,
    ease: Math.max(atual?.ease ?? 2.5, 2.5),
    interval: DIAS_DOMINADO,
    repetitions: Math.max(atual?.repetitions ?? 0, 3),
    dueDate: dataAlvo.toISOString(),
    lastQuality: 5,
  });
}
