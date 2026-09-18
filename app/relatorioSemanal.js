/**
 * MedConduta — Fase 15: Relatório Semanal automático.
 *
 * "Automático" aqui significa que o relatório está sempre pronto assim que
 * o usuário abre a tela — nenhum dado é digitado à mão, tudo vem do que a
 * plataforma já registra (mesma fonte da Fase 13, ver evolucao.js). O texto
 * narrativo é gerado localmente por template (zero custo de IA); só quando o
 * usuário pede explicitamente um comentário em texto livre é que se chama o
 * assistente (ver views/relatorioSemanal.js), reaproveitando o cache
 * anti-duplicação da Fase 10 — clicar de novo na mesma semana não gasta uma
 * chamada nova.
 */

import { getEvolucaoSemanal } from "./evolucao.js";
import { getConstancia } from "./constancia.js";
import { gerarDiagnostico, QUADRANTES } from "./prontidao.js";

/** Dados da semana atual + anterior, constância e maiores gargalos — tudo que o relatório precisa. */
export async function getRelatorioSemanal() {
  const [semanas, constancia, diagnostico] = await Promise.all([
    getEvolucaoSemanal(),
    getConstancia(),
    gerarDiagnostico(),
  ]);

  const semanaAtual = semanas[semanas.length - 1];
  const semanaAnterior = semanas.length >= 2 ? semanas[semanas.length - 2] : null;

  const maioresGargalos = diagnostico.porCategoria
    .filter((c) => c.quadrante === QUADRANTES.critico || c.quadrante === QUADRANTES.atencao)
    .slice(0, 3);

  return { semanaAtual, semanaAnterior, constancia, maioresGargalos, narrativa: gerarNarrativa({ semanaAtual, semanaAnterior, constancia, maioresGargalos }) };
}

function gerarNarrativa({ semanaAtual, semanaAnterior, constancia, maioresGargalos }) {
  const frases = [];

  frases.push(
    `Nos últimos 7 dias você respondeu ${semanaAtual.totalQuestoes} questão${semanaAtual.totalQuestoes === 1 ? "" : "ões"}${
      semanaAtual.percentualAcerto !== null ? ` (${semanaAtual.percentualAcerto}% de acerto)` : ""
    }, concluiu ${semanaAtual.temasConcluidos} tema${semanaAtual.temasConcluidos === 1 ? "" : "s"} novo${semanaAtual.temasConcluidos === 1 ? "" : "s"} e ficou ${semanaAtual.horasFoco}h em Modo Foco.`
  );

  if (semanaAtual.totalSimulados > 0) {
    frases.push(`Também fez ${semanaAtual.totalSimulados} simulado${semanaAtual.totalSimulados > 1 ? "s" : ""} (média de ${semanaAtual.mediaSimulados}%).`);
  }

  if (semanaAnterior) {
    const delta = semanaAtual.indicePreparo - semanaAnterior.indicePreparo;
    if (delta > 0) frases.push(`Seu Índice de Prontidão subiu ${delta} ponto${delta === 1 ? "" : "s"} em relação aos 7 dias anteriores — continue assim.`);
    else if (delta < 0) frases.push(`Seu Índice de Prontidão caiu ${Math.abs(delta)} ponto${Math.abs(delta) === 1 ? "" : "s"} em relação aos 7 dias anteriores — vale reforçar os pontos abaixo.`);
    else frases.push(`Seu Índice de Prontidão se manteve estável em relação aos 7 dias anteriores.`);
  }

  if (constancia.streakAtual > 0) {
    frases.push(`Você está com ${constancia.streakAtual} dia${constancia.streakAtual > 1 ? "s" : ""} seguido${constancia.streakAtual > 1 ? "s" : ""} de estudo.`);
  }

  if (maioresGargalos.length) {
    frases.push(`Seus maiores pontos de atenção agora: ${maioresGargalos.map((g) => g.categoria).join(", ")}.`);
  }

  return frases.join(" ");
}

/** Resumo compacto (texto puro) pra passar como contexto ao pedir um comentário à IA — ver views/relatorioSemanal.js. */
export function resumoParaIA({ semanaAtual, semanaAnterior, constancia, maioresGargalos }) {
  const linhas = [
    `Últimos 7 dias: ${semanaAtual.totalQuestoes} questões respondidas (${semanaAtual.percentualAcerto ?? "sem dado"}% de acerto), ${semanaAtual.temasConcluidos} temas novos concluídos, ${semanaAtual.horasFoco}h em Modo Foco, Índice de Prontidão em ${semanaAtual.indicePreparo}/100.`,
  ];
  if (semanaAnterior) linhas.push(`7 dias anteriores: Índice de Prontidão em ${semanaAnterior.indicePreparo}/100.`);
  linhas.push(`Sequência atual de dias estudando: ${constancia.streakAtual}.`);
  if (maioresGargalos.length) linhas.push(`Maiores pontos de atenção: ${maioresGargalos.map((g) => g.categoria).join(", ")}.`);
  return linhas.join("\n");
}
