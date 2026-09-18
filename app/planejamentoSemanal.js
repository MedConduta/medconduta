/**
 * MedConduta — Fase 15: Planejamento Semanal.
 *
 * Visão intermediária entre "Hoje" (a fila de um único dia, ver planner.js)
 * e o Cronograma (as fases até a prova, ver cronograma.js): quanto dá pra
 * avançar NESTA semana, no ritmo que o usuário já configurou em "Hoje"
 * (horas/dia), e o quanto disso já foi feito. Não duplica lógica de
 * priorização — a meta é só a mesma proporção conteúdo×questões da fase
 * atual (ver cronograma.js/FASES) espalhada pelos 7 dias, e o progresso já
 * feito vem direto da Fase 13 (evolucao.js).
 */

import { fetchJsonCached } from "./utils.js";
import { getAll, getPref } from "./db.js";
import { diasAteVencer, estaVencido } from "./sm2.js";
import { getEstadoPreparo } from "./modo.js";
import { getEvolucaoSemanal } from "./evolucao.js";
import { getQuestoesEmRevisao } from "./erros.js";
import { MIN_POR_TEMA_NOVO, MIN_POR_QUESTOES_BLOCO } from "./planner.js";

const PREF_HORAS = "planejador_horas"; // mesma chave usada em views/planejador.js (Fase 3)
const DIAS_JANELA_VENCENDO = 7;

export async function getPlanejamentoSemanal() {
  const [horasSalvas, flashcardsDecks, srsRecords, estado, semanas, { vencidas: errosVencidos, proximas: errosProximos }] = await Promise.all([
    getPref(PREF_HORAS, 2),
    fetchJsonCached("data/flashcards.json"),
    getAll("srs"),
    getEstadoPreparo(),
    getEvolucaoSemanal(),
    getQuestoesEmRevisao(),
  ]);

  const { fase, diasRestantes } = estado;
  const semanaAtual = semanas[semanas.length - 1];

  const srsMap = new Map(srsRecords.map((r) => [r.id, r]));
  const todosCards = flashcardsDecks.flatMap((deck) => deck.cards.map((c) => c.id));
  const flashcardsVencendoSemana = todosCards.filter((id) => {
    const estadoSrs = srsMap.get(id);
    return estaVencido(estadoSrs) || diasAteVencer(estadoSrs) <= DIAS_JANELA_VENCENDO;
  }).length;

  const errosVencendoSemana = errosVencidos.length + errosProximos.filter((i) => diasAteVencer(i.estado) <= DIAS_JANELA_VENCENDO).length;

  // Meta da semana: assume o mesmo ritmo diário já configurado em "Hoje" (ver
  // planejador.js) todos os 7 dias — uma projeção simples, não uma promessa;
  // faltar um dia não "atrasa" nada aqui (quem cuida de atraso de verdade é o
  // Modo Recuperação, ver modo.js).
  const minutosSemana = Math.round(horasSalvas * 60 * 7);
  const metaTemasNovos = Math.round((minutosSemana * fase.pesoConteudo) / MIN_POR_TEMA_NOVO);
  const metaBlocosQuestoes = Math.round((minutosSemana * fase.pesoQuestoes) / MIN_POR_QUESTOES_BLOCO);

  return {
    fase,
    diasRestantes,
    horasSalvas,
    metaTemasNovos,
    metaBlocosQuestoes,
    temasConcluidosSemana: semanaAtual.temasConcluidos,
    questoesRespondidasSemana: semanaAtual.totalQuestoes,
    horasFocoSemana: semanaAtual.horasFoco,
    flashcardsVencendoSemana,
    errosVencendoSemana,
  };
}
