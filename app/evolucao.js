/**
 * MedConduta — Fase 13: Análise de Desempenho (evolução ao longo do tempo).
 *
 * Até aqui, o Índice de Prontidão (Fase 6) e o Cronograma (Fase 4) mostravam
 * uma FOTO do momento — "onde você está agora". Faltava responder "como meu
 * desempenho está evoluindo?" (um dos 12 itens que o prompt mestre pede pra
 * responder logo ao abrir a plataforma). Este módulo reconstrói a evolução
 * semana a semana a partir dos timestamps que a plataforma já grava em
 * `respostas`, `progresso`, `sessoes` (Modo Foco) e `simulados` — sem
 * precisar guardar nenhum snapshot novo: o histórico já está nos dados.
 */

import { fetchJsonCached } from "./utils.js";
import { getAll } from "./db.js";
import { calcularDiagnostico } from "./prontidao.js";
import { getConfiguracaoProva } from "./cronograma.js";

export const SEMANAS_HISTORICO = 8;

function dentroDoIntervalo(isoDate, inicio, fim) {
  if (!isoDate) return false;
  const t = new Date(isoDate).getTime();
  return t >= inicio.getTime() && t <= fim.getTime();
}

/** Início (domingo) e fim (sábado) da semana que termina em `fimSemana`, formatados curtos. */
function formatarPeriodo(inicio, fim) {
  const fmt = (d) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${fmt(inicio)}–${fmt(fim)}`;
}

/**
 * Evolução das últimas `SEMANAS_HISTORICO` semanas: Índice de Prontidão (na
 * data de corte de cada semana), % de acerto em questões, questões
 * respondidas, horas em Modo Foco e simulados feitos. Uma única leitura de
 * cada store — o corte por semana é feito em memória.
 */
export async function getEvolucaoSemanal() {
  const [temas, progresso, respostas, sessoes, simulados, { provaAlvo }] = await Promise.all([
    fetchJsonCached("data/temas.json"),
    getAll("progresso"),
    getAll("respostas"),
    getAll("sessoes"),
    getAll("simulados"),
    getConfiguracaoProva(),
  ]);

  const hoje = new Date();
  const semanas = [];

  for (let i = SEMANAS_HISTORICO - 1; i >= 0; i--) {
    const fimSemana = new Date(hoje);
    fimSemana.setDate(fimSemana.getDate() - i * 7);
    fimSemana.setHours(23, 59, 59, 999);
    const inicioSemana = new Date(fimSemana);
    inicioSemana.setDate(inicioSemana.getDate() - 6);
    inicioSemana.setHours(0, 0, 0, 0);

    const { indicePreparo } = calcularDiagnostico({ temas, progresso, respostas, referencia: fimSemana, provaAlvo });

    const respostasSemana = respostas.filter((r) => dentroDoIntervalo(r.respondidoEm, inicioSemana, fimSemana));
    const acertosSemana = respostasSemana.filter((r) => r.acertou).length;
    const percentualAcerto = respostasSemana.length ? Math.round((acertosSemana / respostasSemana.length) * 100) : null;

    const minutosFoco = sessoes
      .filter((s) => dentroDoIntervalo(s.inicioEm, inicioSemana, fimSemana))
      .reduce((acc, s) => acc + (s.duracaoMin || 0), 0);

    const simuladosSemana = simulados.filter((s) => dentroDoIntervalo(s.finalizadoEm, inicioSemana, fimSemana));
    const temasConcluidosSemana = progresso.filter(
      (p) => p.concluido && dentroDoIntervalo(p.atualizadoEm, inicioSemana, fimSemana)
    ).length;

    semanas.push({
      periodo: formatarPeriodo(inicioSemana, fimSemana),
      fimSemana: fimSemana.toISOString().slice(0, 10),
      indicePreparo,
      percentualAcerto,
      totalQuestoes: respostasSemana.length,
      temasConcluidos: temasConcluidosSemana,
      horasFoco: Math.round((minutosFoco / 60) * 10) / 10,
      totalSimulados: simuladosSemana.length,
      mediaSimulados: simuladosSemana.length
        ? Math.round(simuladosSemana.reduce((acc, s) => acc + s.percentual, 0) / simuladosSemana.length)
        : null,
    });
  }

  return semanas;
}
