/**
 * MedConduta — Fase 16: Meta mínima diária.
 *
 * Um piso simples pra "não zerar o dia" — bem menor que qualquer plano
 * completo, só o suficiente pra manter o hábito ativo mesmo num dia corrido.
 * "Bate a meta" quem responder um punhado de questões, OU ficar um pouco em
 * Modo Foco, OU concluir 1 tema — não precisa dos três, um já conta.
 * Reaproveita os mesmos stores (`respostas`, `sessoes`, `progresso`) que
 * constancia.js já usa pro streak — nenhum dado novo é gravado.
 */

import { getAll } from "./db.js";

export const META_QUESTOES_PADRAO = 10;
export const META_MINUTOS_FOCO_PADRAO = 20;

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function getMetaDiaria() {
  const [respostas, sessoes, progresso] = await Promise.all([getAll("respostas"), getAll("sessoes"), getAll("progresso")]);
  const hoje = hojeIso();

  const questoesHoje = respostas.filter((r) => r.respondidoEm?.slice(0, 10) === hoje).length;
  const minutosFocoHoje = sessoes
    .filter((s) => s.inicioEm?.slice(0, 10) === hoje)
    .reduce((acc, s) => acc + (s.duracaoMin || 0), 0);
  const temasHoje = progresso.filter((p) => p.concluido && p.atualizadoEm?.slice(0, 10) === hoje).length;

  const bateuMeta = questoesHoje >= META_QUESTOES_PADRAO || minutosFocoHoje >= META_MINUTOS_FOCO_PADRAO || temasHoje >= 1;

  return {
    metaQuestoes: META_QUESTOES_PADRAO,
    metaMinutos: META_MINUTOS_FOCO_PADRAO,
    questoesHoje,
    minutosFocoHoje,
    temasHoje,
    bateuMeta,
  };
}
