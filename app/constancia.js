/**
 * MedConduta — Fase 8: gamificação leve ("constância").
 *
 * Nada de pontos, níveis ou moedas — só o essencial pra reforçar o hábito
 * de estudar todo dia: sequência de dias ativos (streak) e tempo total em
 * sessões de foco. "Dia ativo" conta qualquer estudo real (responder
 * questão, concluir tema, revisar erro, ou uma sessão de Modo
 * Foco) — não exige ter usado o temporizador.
 */

import { getAll } from "./db.js";

function paraDiaIso(isoDateTime) {
  return isoDateTime ? isoDateTime.slice(0, 10) : null;
}

function calcularStreak(diasAtivosSet, referencia = new Date()) {
  const hojeIso = referencia.toISOString().slice(0, 10);
  const cursor = new Date(referencia);
  // Ainda não estudou hoje não "quebra" a sequência — só passa a contar a
  // partir de ontem. Só zera de fato quando ontem também não teve atividade.
  if (!diasAtivosSet.has(hojeIso)) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (diasAtivosSet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Streak atual + estatísticas simples de constância, a partir de toda atividade já registrada. */
export async function getConstancia() {
  const [respostas, progresso, sessoes] = await Promise.all([getAll("respostas"), getAll("progresso"), getAll("sessoes")]);

  const diasAtivos = new Set();
  for (const r of respostas) {
    const dia = paraDiaIso(r.respondidoEm);
    if (dia) diasAtivos.add(dia);
  }
  for (const p of progresso) {
    if (!p.concluido) continue;
    const dia = paraDiaIso(p.atualizadoEm);
    if (dia) diasAtivos.add(dia);
  }
  for (const s of sessoes) {
    const dia = paraDiaIso(s.inicioEm);
    if (dia) diasAtivos.add(dia);
  }

  const totalMinutosFoco = sessoes.reduce((acc, s) => acc + (s.duracaoMin || 0), 0);

  return {
    streakAtual: calcularStreak(diasAtivos),
    totalDiasAtivos: diasAtivos.size,
    totalSessoesFoco: sessoes.length,
    totalMinutosFoco,
  };
}
