import { fetchJsonCached } from "./utils.js";
import { getAll } from "./db.js";
import { estaVencido } from "./sm2.js";

const MIN_POR_REVISAO_VENCIDA = 8; // flashcard/revisão pontual
const MIN_POR_TEMA_NOVO = 25; // leitura de um tema completo
const MIN_POR_QUESTOES_BLOCO = 15; // bloco de ~5 questões

/**
 * Monta a fila de estudo do dia priorizando:
 * 1) Revisões espaçadas vencidas (flashcards)
 * 2) Temas novos/pendentes (ainda não marcados como estudados)
 * 3) Bloco de questões de reforço
 * dimensionando a carga ao tempo disponível informado pelo usuário (em horas).
 */
export async function gerarPlanoDoDia(horasDisponiveis) {
  const minutosDisponiveis = Math.max(0, Math.round(horasDisponiveis * 60));
  let minutosRestantes = minutosDisponiveis;
  const fila = [];

  const [temas, flashcardsDecks, srsRecords, progresso] = await Promise.all([
    fetchJsonCached("data/temas.json"),
    fetchJsonCached("data/flashcards.json"),
    getAll("srs"),
    getAll("progresso"),
  ]);

  const srsMap = new Map(srsRecords.map((r) => [r.id, r]));
  const progressoSet = new Set(progresso.filter((p) => p.concluido).map((p) => p.id));

  // 1) Revisões vencidas — junta todos os cards de todos os decks e filtra vencidos
  const todosCards = flashcardsDecks.flatMap((deck) =>
    deck.cards.map((c) => ({ ...c, deckId: deck.id, deckTitulo: deck.titulo }))
  );
  const vencidos = todosCards.filter((c) => estaVencido(srsMap.get(c.id)));

  for (const card of vencidos) {
    if (minutosRestantes < MIN_POR_REVISAO_VENCIDA / 2) break;
    fila.push({
      tipo: "revisao",
      titulo: `Revisar: ${card.deckTitulo}`,
      detalhe: card.frente,
      duracaoMin: MIN_POR_REVISAO_VENCIDA,
      link: `#/residencia/flashcards/${card.deckId}`,
    });
    minutosRestantes -= MIN_POR_REVISAO_VENCIDA;
  }

  // 2) Temas novos/pendentes — ainda não marcados como concluídos
  const temasPendentes = temas.filter((t) => !progressoSet.has(t.id));
  for (const tema of temasPendentes) {
    if (minutosRestantes < MIN_POR_TEMA_NOVO / 2) break;
    fila.push({
      tipo: "conteudo",
      titulo: `Estudar: ${tema.titulo}`,
      detalhe: tema.resumo,
      duracaoMin: MIN_POR_TEMA_NOVO,
      link: `#/residencia/conteudo/${tema.id}`,
    });
    minutosRestantes -= MIN_POR_TEMA_NOVO;
  }

  // 3) Bloco de questões — preenche o tempo restante
  while (minutosRestantes >= MIN_POR_QUESTOES_BLOCO) {
    fila.push({
      tipo: "questoes",
      titulo: "Bloco de questões de reforço",
      detalhe: "Resolva um bloco de questões comentadas para fixar os temas do dia.",
      duracaoMin: MIN_POR_QUESTOES_BLOCO,
      link: "#/residencia/questoes",
    });
    minutosRestantes -= MIN_POR_QUESTOES_BLOCO;
    if (fila.filter((f) => f.tipo === "questoes").length >= 3) break; // evita loop excessivo
  }

  const minutosUsados = minutosDisponiveis - minutosRestantes;

  return {
    minutosDisponiveis,
    minutosUsados,
    minutosOciosos: minutosRestantes,
    totalRevisoesVencidas: vencidos.length,
    totalTemasPendentes: temasPendentes.length,
    fila,
  };
}
