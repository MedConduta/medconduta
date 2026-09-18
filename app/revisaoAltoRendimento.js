/**
 * MedConduta — Fase 16: Revisão de Alto Rendimento.
 *
 * Diferente da revisão espaçada (SM-2, orientada por data de vencimento, ver
 * revisao.js) e de Meus Erros (questões específicas já erradas, ver
 * erros.js), esta fila é orientada só por PRIORIDADE: reaproveita o heatmap
 * de fraquezas (Fase 6, ver prontidao.js) pra reunir direto os flashcards e
 * o link de questões das categorias críticas/atenção — pra estudar o que
 * mais pesa na prova e ainda está fraco, sem depender de nada estar
 * "vencido" pra aparecer na fila.
 */

import { fetchJsonCached } from "./utils.js";
import { gerarDiagnostico, QUADRANTES } from "./prontidao.js";
import { todosOsDecks } from "./flashcardsGerenciar.js";

const MAX_CATEGORIAS = 5;

export async function getRevisaoAltoRendimento() {
  const [diagnostico, temas, decks] = await Promise.all([
    gerarDiagnostico(),
    fetchJsonCached("data/temas.json"),
    todosOsDecks(),
  ]);

  const categorias = diagnostico.porCategoria
    .filter((c) => c.quadrante === QUADRANTES.critico || c.quadrante === QUADRANTES.atencao)
    .slice(0, MAX_CATEGORIAS);

  const temaIdParaCategoria = new Map(temas.map((t) => [t.id, t.categoria]));
  const categoriasSet = new Set(categorias.map((c) => c.categoria));

  // Baralhos manuais (sem temaId) ficam de fora — "alto rendimento" é sobre
  // prioridade da prova, não sobre baralhos avulsos que o usuário criou.
  const decksRelevantes = decks.filter((d) => categoriasSet.has(temaIdParaCategoria.get(d.temaId)));
  const totalCards = decksRelevantes.reduce((acc, d) => acc + d.cards.length, 0);

  return { categorias, decks: decksRelevantes, totalCards };
}
