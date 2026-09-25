/**
 * MedConduta — Fase 16: Revisão de Alto Rendimento.
 *
 * Diferente de Meus Erros (questões específicas já erradas, ver erros.js),
 * esta fila é orientada só por PRIORIDADE: reaproveita o heatmap de
 * fraquezas (Fase 6, ver prontidao.js) pra reunir direto as categorias
 * críticas/atenção — pra estudar o que mais pesa na prova e ainda está
 * fraco, sem depender de nada estar "vencido" pra aparecer na fila.
 */

import { gerarDiagnostico, QUADRANTES } from "./prontidao.js";

const MAX_CATEGORIAS = 5;

export async function getRevisaoAltoRendimento() {
  const diagnostico = await gerarDiagnostico();

  const categorias = diagnostico.porCategoria
    .filter((c) => c.quadrante === QUADRANTES.critico || c.quadrante === QUADRANTES.atencao)
    .slice(0, MAX_CATEGORIAS);

  return { categorias };
}
