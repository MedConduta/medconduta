/**
 * Foco no Curso: quando o usuário já começou o Curso, a revisão inteira
 * (agenda do dia, questões, flashcards) se volta para o que ele está
 * estudando lá — os temas da semana atual do cronograma, mais os temas do
 * Curso já estudados (que seguem nas revisões espaçadas).
 *
 * Antes do Curso começar (ver cursoJaIniciado) devolve null e cada tela
 * mantém o comportamento geral (prioridade por incidência na prova).
 */

import { cursoJaIniciado, gerarGradeCurso, encontrarSemanaAtual } from "./curriculo.js";
import { hojeIso } from "./revisaoCurso.js";

export async function getFocoCurso() {
  if (!(await cursoJaIniciado())) return null;

  const grade = await gerarGradeCurso();
  const semana = encontrarSemanaAtual(grade.semanas, hojeIso());
  if (!semana) return null;

  const temasSemana = semana.itens.map((i) => ({ temaId: i.temaId, titulo: i.titulo, categoria: i.categoria, resumoConcluido: i.resumoConcluido }));
  const temaIdsSemana = new Set(temasSemana.map((t) => t.temaId));
  const temaIdsEstudados = new Set(grade.todosOsItens.filter((i) => i.resumoConcluido).map((i) => i.temaId));

  return {
    semana: semana.numero,
    temasSemana,
    temaIdsSemana,
    // Semana atual + tudo do Curso já estudado: é o conjunto que as revisões
    // (flashcards, questões) devem cobrir enquanto o Curso estiver ativo.
    temaIdsCurso: new Set([...temaIdsSemana, ...temaIdsEstudados]),
  };
}
