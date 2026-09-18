/**
 * MedConduta — Fase 5: revisão adaptativa de questões erradas ("Meus Erros").
 *
 * Toda questão que o usuário já errou pelo menos uma vez entra numa fila de
 * revisão espaçada própria (reaproveitando o mesmo algoritmo SM-2 usado nos
 * flashcards, ver sm2.js, mas com estado guardado à parte por questão). A
 * cada acerto o intervalo até a próxima revisão cresce; a cada erro, volta a
 * ser curto — a questão só "sai" da fila por muito tempo depois de vários
 * acertos seguidos, nunca é esquecida de vez.
 */

import { getAll, getItem, setItem } from "./db.js";
import { fetchJsonCached } from "./utils.js";
import { revisar, estaVencido, diasAteVencer } from "./sm2.js";

const STORE_SRS_QUESTOES = "srs_questoes";

// Qualidade (escala SM-2, 0-5) atribuída automaticamente conforme o
// resultado da tentativa — sem pedir ao usuário uma autoavaliação extra
// (a resposta certa/errada já é o sinal).
const QUALIDADE_ACERTO = 4;
const QUALIDADE_ERRO = 1;

/** Registra o resultado de uma tentativa e atualiza o estado de revisão espaçada da questão. */
export async function registrarResultadoQuestao(questaoId, acertou) {
  const estadoAtual = await getItem(STORE_SRS_QUESTOES, questaoId);
  const novoEstado = { id: questaoId, ...revisar(estadoAtual, acertou ? QUALIDADE_ACERTO : QUALIDADE_ERRO) };
  await setItem(STORE_SRS_QUESTOES, novoEstado);
}

/**
 * Todas as questões que o usuário já errou ao menos uma vez, com o estado de
 * revisão adaptativa associado. `vencidas` são as que devem ser revisadas
 * agora; `proximas` as que ainda não venceram, ordenadas pela mais próxima.
 */
export async function getQuestoesEmRevisao() {
  const [curadas, geradas, temas, srsRecords, respostas] = await Promise.all([
    fetchJsonCached("data/questoes.json"),
    getAll("ia_questoes"),
    fetchJsonCached("data/temas.json"),
    getAll(STORE_SRS_QUESTOES),
    getAll("respostas"),
  ]);

  const categoriaPorTemaId = new Map(temas.map((t) => [t.id, t.categoria]));
  const questaoPorId = new Map(
    [...curadas, ...geradas].map((q) => [q.id, { ...q, categoria: categoriaPorTemaId.get(q.temaId) ?? null }])
  );
  const srsMap = new Map(srsRecords.map((r) => [r.id, r]));

  const jaErrouAlgumaVez = new Set(respostas.filter((r) => !r.acertou).map((r) => r.questaoId));

  const itens = [...jaErrouAlgumaVez]
    .map((questaoId) => questaoPorId.get(questaoId))
    .filter(Boolean)
    .map((questao) => ({ questao, estado: srsMap.get(questao.id) ?? null }));

  // Uma questão "em relearning" (a tentativa mais recente foi errada, então
  // o SM-2 zerou `repetitions`) fica disponível para revisão imediatamente,
  // mesmo que o `dueDate` calculado seja só amanhã — errar de novo não pode
  // esperar 1 dia pra voltar à fila. Só passa a seguir o intervalo normal do
  // SM-2 (1 dia, 6 dias, crescendo...) depois de pelo menos um acerto.
  const emRelearning = (estado) => estado && estado.repetitions === 0;
  const vencidas = itens.filter((i) => estaVencido(i.estado) || emRelearning(i.estado));
  const proximas = itens
    .filter((i) => !estaVencido(i.estado) && !emRelearning(i.estado))
    .sort((a, b) => diasAteVencer(a.estado) - diasAteVencer(b.estado));

  return { vencidas, proximas, total: itens.length };
}
