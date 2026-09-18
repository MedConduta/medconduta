/**
 * MedConduta — Fase 6: Índice de Prontidão + Heatmap de Fraquezas + Mapa de Domínio.
 *
 * Cruza, por categoria (ex.: "Cardiologia"), o peso estimado na prova
 * (incidência, ver areas.js) com o quanto já foi estudado (% de temas
 * concluídos) e o desempenho real em questões — a mesma lógica de
 * priorização do motor "O que fazer agora" (ver planner.js), só que aqui
 * virada em painel de diagnóstico em vez de fila de tarefas.
 *
 * O Índice de Prontidão é uma bússola de equilíbrio entre estudo e
 * desempenho, ponderada pela incidência — NÃO é uma previsão de nota nem de
 * probabilidade de aprovação (a prova real tem fatores que este app não
 * pode medir).
 */

import { fetchJsonCached } from "./utils.js";
import { getAll } from "./db.js";
import { pesoProva } from "./areas.js";
import { calcularDesempenhoPorCategoria, DESEMPENHO_PADRAO_SEM_DADO } from "./planner.js";

const PESO_INCIDENCIA_ALTA = 4; // escala 1-5 (ver areas.js)
const DESEMPENHO_BAIXO = 0.6;
const DESEMPENHO_ALTO = 0.8;

// Peso de cada componente no Índice de Prontidão de uma categoria: quanto já
// foi estudado conta, mas o desempenho real em questões conta mais (é o
// sinal mais forte de domínio de fato, não só de "ter lido").
const PESO_COMPLETUDE_NO_INDICE = 0.4;
const PESO_DESEMPENHO_NO_INDICE = 0.6;

export const QUADRANTES = {
  critico: { emoji: "🔴", label: "Crítico", descricao: "Alta incidência na prova, desempenho abaixo do esperado — prioridade máxima." },
  atencao: { emoji: "🟠", label: "Atenção", descricao: "Alta incidência, desempenho mediano — vale reforçar." },
  dominado: { emoji: "🟢", label: "Dominado", descricao: "Alta incidência e bom desempenho — manter com revisões espaçadas." },
  secundarioFraco: { emoji: "🟡", label: "Secundário fraco", descricao: "Baixa incidência e desempenho a melhorar — atenção só depois dos críticos." },
  tranquilo: { emoji: "⚪", label: "Tranquilo", descricao: "Baixa incidência — baixa prioridade." },
};

function classificarQuadrante(peso, desempenho) {
  const incidenciaAlta = peso >= PESO_INCIDENCIA_ALTA;
  if (incidenciaAlta && desempenho < DESEMPENHO_BAIXO) return QUADRANTES.critico;
  if (incidenciaAlta && desempenho < DESEMPENHO_ALTO) return QUADRANTES.atencao;
  if (incidenciaAlta) return QUADRANTES.dominado;
  if (desempenho < DESEMPENHO_BAIXO) return QUADRANTES.secundarioFraco;
  return QUADRANTES.tranquilo;
}

/**
 * Diagnóstico completo: Índice de Prontidão (0-100) + o detalhamento por
 * categoria (heatmap de fraquezas / mapa de domínio) que o alimenta.
 */
export async function gerarDiagnostico() {
  const [temas, progresso, respostas] = await Promise.all([
    fetchJsonCached("data/temas.json"),
    getAll("progresso"),
    getAll("respostas"),
  ]);

  const concluidosSet = new Set(progresso.filter((p) => p.concluido).map((p) => p.id));
  const desempenhoPorCategoria = calcularDesempenhoPorCategoria(respostas);

  const categorias = [...new Set(temas.map((t) => t.categoria))];
  const porCategoria = categorias.map((categoria) => {
    const temasCategoria = temas.filter((t) => t.categoria === categoria);
    const concluidos = temasCategoria.filter((t) => concluidosSet.has(t.id)).length;
    const completude = temasCategoria.length ? concluidos / temasCategoria.length : 0;
    const info = desempenhoPorCategoria.get(categoria) ?? null;
    const desempenho = info ? info.taxa : DESEMPENHO_PADRAO_SEM_DADO;
    const peso = pesoProva(categoria);

    return {
      categoria,
      peso,
      completude,
      desempenho,
      semDados: !info,
      totalTemas: temasCategoria.length,
      temasConcluidos: concluidos,
      questoesRespondidas: info?.total ?? 0,
      quadrante: classificarQuadrante(peso, desempenho),
    };
  });

  const somaPesos = porCategoria.reduce((acc, c) => acc + c.peso, 0);
  const indicePreparo = somaPesos
    ? Math.round(
        (100 *
          porCategoria.reduce(
            (acc, c) => acc + c.peso * (c.completude * PESO_COMPLETUDE_NO_INDICE + c.desempenho * PESO_DESEMPENHO_NO_INDICE),
            0
          )) /
          somaPesos
      )
    : 0;

  // Ordem de prioridade visual do heatmap: crítico primeiro, tranquilo por último.
  const ordemQuadrante = [QUADRANTES.critico, QUADRANTES.atencao, QUADRANTES.secundarioFraco, QUADRANTES.dominado, QUADRANTES.tranquilo];
  porCategoria.sort((a, b) => {
    const diffQuadrante = ordemQuadrante.indexOf(a.quadrante) - ordemQuadrante.indexOf(b.quadrante);
    if (diffQuadrante !== 0) return diffQuadrante;
    return b.peso - a.peso || a.desempenho - b.desempenho;
  });

  return { indicePreparo, porCategoria };
}
