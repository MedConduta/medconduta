/**
 * MedConduta — Planejamento Semanal: o que fazer NESTA semana, derivado
 * direto do cronograma real do Curso (app/curriculo.js) — não mais de uma
 * projeção horas/dia × peso da fase (ver histórico da Fase 15). A semana
 * atual é a mesma que "Hoje" e "Minha Preparação" usam (encontrarSemanaAtual):
 * aulas (temas) a ler/ver, questões a fazer nos temas da semana, e revisões
 * do ciclo do Curso (ver revisaoCurso.js) agendadas pra cair dentro dela.
 */

import { gerarGradeCurso, encontrarSemanaAtual } from "./curriculo.js";
import { getAgendaRevisoes, hojeIso, somarDias } from "./revisaoCurso.js";
import { getQuestoesEmRevisao } from "./erros.js";
import { diasAteVencer } from "./sm2.js";

const DIAS_JANELA_VENCENDO = 7;

export async function getPlanejamentoSemanal() {
  const [grade, agendaRevisoes, { vencidas: errosVencidos, proximas: errosProximos }] = await Promise.all([
    gerarGradeCurso(),
    getAgendaRevisoes(),
    getQuestoesEmRevisao(),
  ]);

  const hoje = hojeIso();
  const semana = encontrarSemanaAtual(grade.semanas, hoje);
  const semanaFim = semana?.dataInicio ? somarDias(semana.dataInicio, 6) : null;

  const itens = semana?.itens ?? [];
  const itensComQuestoes = itens.filter((i) => i.temQuestoes);

  const pendentesRevisaoCurso = [...agendaRevisoes.vencidas, ...agendaRevisoes.hoje, ...agendaRevisoes.futuras];
  const revisoesCursoSemana = semana?.dataInicio
    ? pendentesRevisaoCurso.filter((r) => r.dataAgendada >= semana.dataInicio && r.dataAgendada <= semanaFim).length
    : 0;

  const errosVencendoSemana = errosVencidos.length + errosProximos.filter((i) => diasAteVencer(i.estado) <= DIAS_JANELA_VENCENDO).length;

  return {
    semana,
    aulasTotal: itens.length,
    aulasConcluidas: itens.filter((i) => i.resumoConcluido).length,
    questoesMetaTemas: itensComQuestoes.length,
    questoesFeitasTemas: itensComQuestoes.filter((i) => i.questoesFeitas).length,
    revisoesCursoSemana,
    errosVencendoSemana,
  };
}
