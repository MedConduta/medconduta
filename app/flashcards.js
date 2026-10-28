/**
 * MedConduta — Flashcards (frente/verso), com repetição espaçada (SM-2, ver
 * sm2.js) — mesmo motor de app/erros.js, só que aqui a qualidade vem de uma
 * autoavaliação manual (3 botões), não de acerto/erro automático de questão.
 *
 * Formatos de card (data/flashcards.json):
 * - comum: { id, temaId, frente, verso, banca? }
 * - lacuna (`tipo: "lacuna"`): a frente traz o número/termo entre {{chaves}},
 *   que fica oculto até mostrar a resposta; o verso é opcional.
 * - imagem: `imagem: { url, legenda?, fonte? }` aparece na frente.
 * `provas` (ex.: ["ENAMED", "SES-PE"]) e `fonteQuestao` ("SES-PE 2024") dizem
 * de onde o card saiu, quando ele foi escrito a partir de uma questão.
 */

import { getAll, getItem, setItem } from "./db.js";
import { fetchJsonCached } from "./utils.js";
import { revisar, estaVencido, diasAteVencer } from "./sm2.js";
import { carregarIndiceBanco } from "./bancoQuestoes.js";

const STORE_SRS_FLASHCARDS = "srs_flashcards";

export const QUALIDADE = {
  naoLembrei: 1,
  lembrei: 4,
  facil: 5,
};

/** Intervalo (dias) a partir do qual um card conta como dominado. */
export const INTERVALO_DOMINADO = 21;

/**
 * Cards antigos gerados a partir das questões (enunciado inteiro na frente).
 * O gerador saiu porque os cards ficavam ruins; os já criados continuam
 * revisáveis no baralho "Das minhas questões".
 */
const STORE_CARDS_QUESTOES = "flashcards_questoes";

/** Baralho fixo (data/flashcards.json) + cards antigos gerados a partir das questões. */
export async function todosOsFlashcards() {
  const [fixos, gerados] = await Promise.all([fetchJsonCached("data/flashcards.json"), getAll(STORE_CARDS_QUESTOES)]);
  return [...fixos, ...gerados];
}

/** Registra a autoavaliação; guarda também quantas vezes o card já foi esquecido (`erros`). */
export async function registrarRevisaoFlashcard(cardId, qualidade) {
  const estadoAtual = await getItem(STORE_SRS_FLASHCARDS, cardId);
  const erros = (estadoAtual?.erros || 0) + (qualidade < 3 ? 1 : 0);
  const novoEstado = { id: cardId, ...revisar(estadoAtual, qualidade), erros };
  await setItem(STORE_SRS_FLASHCARDS, novoEstado);
  return novoEstado;
}

/** Baralho do Curso: temas da semana atual + temas do Curso já estudados (ver focoCurso.js). */
export const BARALHO_CURSO = "curso";
/** Cards escritos a partir das questões IAUPE/SES-PE (campo `banca` ou `provas`). */
export const BARALHO_SESPE = "sespe";
/** Cards dos temas mais cobrados no ENAMED e no ENARE (mesma matriz). */
export const BARALHO_ENAMED = "enamed";
/** Cards dos temas das questões que a pessoa errou, do tema com mais erros para o menos. */
export const BARALHO_ERROS = "erros";
/** Cards que a pessoa já esqueceu duas vezes ou mais. */
export const BARALHO_DIFICEIS = "dificeis";
/** Cards antigos gerados a partir das questões. */
export const BARALHO_QUESTOES = "questoes";

const PROVAS_ENAMED = new Set(["ENAMED", "ENARE"]);
const PROVAS_SESPE = new Set(["SES-PE"]);
/** Mínimo de questões ENAMED/ENARE no tema para os cards dele entrarem no baralho ENAMED. */
const MIN_QUESTOES_ENAMED = 10;

function ehCardSesPe(card) {
  return card.banca === "IAUPE/SES-PE" || card.provas?.includes("SES-PE");
}

/** Quantas questões (sem repetidas nem anuladas) cada tema tem nas provas dadas. */
async function incidenciaPorTema(provas) {
  const { registros } = await carregarIndiceBanco();
  const contagem = new Map();
  for (const r of registros) if (!r.anulada && provas.has(r.instituicao)) contagem.set(r.temaId, (contagem.get(r.temaId) || 0) + 1);
  return contagem;
}

/** Temas das questões erradas (respostas), com o número de erros, do mais errado para o menos. */
export async function temasDosMeusErros() {
  const respostas = await getAll("respostas");
  const contagem = new Map();
  for (const r of respostas) if (!r.acertou && r.temaId) contagem.set(r.temaId, (contagem.get(r.temaId) || 0) + 1);
  return contagem;
}

/** Ranking a partir de uma contagem por tema (maior primeiro). */
function rankingPorContagem(contagem) {
  return new Map([...contagem.entries()].sort((a, b) => b[1] - a[1]).map(([temaId], i) => [temaId, i]));
}

/**
 * Prioridade de cada tema para apresentar cards novos: os cards SES-PE foram
 * gravados em ordem decrescente de incidência do tema na banca, então a
 * primeira aparição de cada tema nesse bloco já é o ranking. Temas sem cards
 * SES-PE ficam depois, na ordem do arquivo.
 */
function rankingDeTemas(cards) {
  const ranking = new Map();
  for (const c of cards) if (ehCardSesPe(c) && !ranking.has(c.temaId)) ranking.set(c.temaId, ranking.size);
  for (const c of cards) if (!ranking.has(c.temaId)) ranking.set(c.temaId, ranking.size);
  return ranking;
}

/**
 * Filtra os cards do baralho escolhido. Devolve { cards, ranking }: o ranking
 * ordena os temas na hora de apresentar cards novos (o tema mais cobrado na
 * prova do baralho, ou o mais errado, vem primeiro).
 */
async function cardsDoBaralho(cards, srsMap, { baralho, temaIdsCurso }) {
  const padrao = rankingDeTemas(cards);
  if (baralho === BARALHO_CURSO && temaIdsCurso) return { cards: cards.filter((c) => temaIdsCurso.has(c.temaId)), ranking: padrao };
  if (baralho === BARALHO_QUESTOES) return { cards: cards.filter((c) => c.origem === "questao"), ranking: padrao };
  if (baralho === BARALHO_DIFICEIS) return { cards: cards.filter((c) => (srsMap.get(c.id)?.erros || 0) >= 2), ranking: padrao };
  if (baralho === BARALHO_ERROS) {
    const contagem = await temasDosMeusErros();
    return { cards: cards.filter((c) => contagem.has(c.temaId) && c.origem !== "questao"), ranking: rankingPorContagem(contagem) };
  }
  if (baralho === BARALHO_SESPE || baralho === BARALHO_ENAMED) {
    const sespe = baralho === BARALHO_SESPE;
    const contagem = await incidenciaPorTema(sespe ? PROVAS_SESPE : PROVAS_ENAMED);
    const doBaralho = sespe
      ? ehCardSesPe
      : (c) => c.origem !== "questao" && (c.provas?.some((p) => PROVAS_ENAMED.has(p)) || (contagem.get(c.temaId) || 0) >= MIN_QUESTOES_ENAMED);
    return { cards: cards.filter(doBaralho), ranking: rankingPorContagem(contagem) };
  }
  return { cards, ranking: padrao };
}

/**
 * Fila de revisão: `vencidos` primeiro (nunca vistos ou com dueDate no
 * passado), `futuros` ordenados pelo mais próximo de vencer. `temaId` restringe
 * a um tema, `categorias` (Set) a uma ou mais especialidades e `baralho` a um
 * dos baralhos acima. `novos` traz só os nunca vistos, do tema mais
 * importante para o baralho ao menos importante, em rodízio entre temas.
 */
export async function getFilaRevisao({ temaId, baralho, categorias, temaIdsCurso, temaIdsPrioritarios } = {}) {
  const [cards, srsRecords, temas] = await Promise.all([todosOsFlashcards(), getAll(STORE_SRS_FLASHCARDS), fetchJsonCached("data/temas.json")]);
  const srsMap = new Map(srsRecords.map((r) => [r.id, r]));
  const { cards: doBaralho, ranking } = await cardsDoBaralho(cards, srsMap, { baralho, temaIdsCurso });
  let filtrados = temaId ? doBaralho.filter((c) => c.temaId === temaId) : doBaralho;
  if (categorias?.size) {
    const categoriaPorTema = new Map(temas.map((t) => [t.id, t.categoria]));
    filtrados = filtrados.filter((c) => categorias.has(categoriaPorTema.get(c.temaId)));
  }

  const itens = filtrados.map((card) => ({ card, estado: srsMap.get(card.id) ?? null }));
  const vencidos = itens.filter((i) => estaVencido(i.estado));
  const futuros = itens.filter((i) => !estaVencido(i.estado)).sort((a, b) => diasAteVencer(a.estado) - diasAteVencer(b.estado));

  // Rodízio entre temas: 1º card de cada tema (do mais importante ao menos),
  // depois o 2º de cada um... — uma sessão de novos não vira um tema só.
  const posTema = (t) => (ranking.has(t) ? ranking.get(t) : ranking.size);
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
      return pa - pb || a.k - b.k || posTema(a.card.temaId) - posTema(b.card.temaId);
    })
    .map(({ k, ...i }) => i);
  // Os que a pessoa mais esquece vêm primeiro entre as revisões.
  const revisoes = vencidos.filter((i) => i.estado).sort((a, b) => (b.estado.erros || 0) - (a.estado.erros || 0));

  return { vencidos, revisoes, novos, futuros, total: itens.length, itens };
}

/**
 * Domínio por tema dos itens de uma fila: quantos cards, quantos já vistos e
 * quantos dominados (intervalo ≥ 21 dias). Ordem: o tema menos dominado primeiro.
 */
export function dominioPorTema(itens) {
  const porTema = new Map();
  for (const { card, estado } of itens) {
    const t = porTema.get(card.temaId) || { temaId: card.temaId, total: 0, vistos: 0, dominados: 0, erros: 0 };
    t.total += 1;
    if (estado) t.vistos += 1;
    if (estado && estado.interval >= INTERVALO_DOMINADO) t.dominados += 1;
    t.erros += estado?.erros || 0;
    porTema.set(card.temaId, t);
  }
  return [...porTema.values()].sort((a, b) => a.dominados / a.total - b.dominados / b.total || b.erros - a.erros);
}

/** Cards que a pessoa mais esquece (2 vezes ou mais), do mais esquecido para o menos. */
export function cardsDificeis(itens, limite = 10) {
  return itens
    .filter((i) => (i.estado?.erros || 0) >= 2)
    .sort((a, b) => b.estado.erros - a.estado.erros)
    .slice(0, limite);
}

/** Quantos cards de um tema específico existem — usado pra decidir se mostra o link em Conteúdo. */
export async function contarFlashcardsDoTema(temaId) {
  const cards = await todosOsFlashcards();
  return cards.filter((c) => c.temaId === temaId).length;
}
