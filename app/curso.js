/**
 * MedConduta — Curso completo: todos os temas do currículo curado, em uma
 * ORDEM FIXA (área → categoria por peso na prova → tema), divididos em
 * semanas de estudo, com progresso por semana e do curso inteiro.
 *
 * Diferente de Conteúdo (app/views/conteudo.js), que reordena categorias
 * pelo quadrante de prioridade (crítico/dominado) em tempo real conforme o
 * desempenho do usuário muda, aqui a ordem é fixa — é a grade curricular
 * ("o que ver, em que ordem, em qual semana"), não uma priorização dinâmica
 * do que estudar agora (isso já existe em Hoje/planner.js).
 *
 * As semanas têm LARGURA VARIÁVEL: cada tema pesa pelo tamanho do seu
 * próprio conteúdo (nº de caracteres nas seções), então um tema bem mais
 * denso que a média ocupa uma fatia maior do orçamento da semana — podendo
 * ficar sozinho — enquanto temas mais curtos se agrupam mais numa mesma
 * semana. O Curso só distribui o CONTEÚDO NOVO; o tempo de revisão
 * espaçada e de questões de cada semana já é coberto à parte em
 * Hoje/Planejamento Semanal, então a largura da semana aqui deixa folga de
 * propósito pra esse tempo, em vez de tentar contabilizá-lo.
 */

import { fetchJsonCached } from "./utils.js";
import { getAll } from "./db.js";
import { AREA_POR_CATEGORIA, ORDEM_AREAS, pesoProva } from "./areas.js";

// Nº de semanas-alvo do curso inteiro (a busca de orçamento abaixo converge
// pra esse número, ou o mais próximo possível dele).
export const NUM_SEMANAS_ALVO = 41;

/**
 * Ordena todo o currículo curado numa sequência fixa: áreas na ordem
 * pedagógica de ORDEM_AREAS; dentro de cada área, categorias da maior para a
 * menor incidência estimada na prova-alvo padrão (SES-PE); dentro de cada
 * categoria, temas em ordem alfabética estável.
 */
function ordenarCurriculo(temas) {
  const porArea = new Map();
  for (const tema of temas) {
    const area = AREA_POR_CATEGORIA[tema.categoria] || "Outros";
    if (!porArea.has(area)) porArea.set(area, new Map());
    const porCategoria = porArea.get(area);
    if (!porCategoria.has(tema.categoria)) porCategoria.set(tema.categoria, []);
    porCategoria.get(tema.categoria).push(tema);
  }

  const areasOrdenadas = [...porArea.keys()].sort((a, b) => ORDEM_AREAS.indexOf(a) - ORDEM_AREAS.indexOf(b));

  const ordenados = [];
  for (const area of areasOrdenadas) {
    const porCategoria = porArea.get(area);
    const categoriasOrdenadas = [...porCategoria.keys()].sort(
      (a, b) => pesoProva(b) - pesoProva(a) || a.localeCompare(b, "pt-BR")
    );
    for (const categoria of categoriasOrdenadas) {
      const temasDaCategoria = porCategoria.get(categoria).sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
      ordenados.push(...temasDaCategoria);
    }
  }
  return ordenados;
}

/** Densidade de um tema = tamanho do conteúdo (soma de caracteres das seções) — proxy de quanto tempo/esforço ele exige pra estudar. */
function calcularDensidade(tema) {
  return tema.secoes.reduce((soma, s) => soma + (s.conteudo?.length || 0), 0);
}

/**
 * Distribui os temas (já na ordem fixa do currículo) em semanas de largura
 * variável: acumula densidade tema a tema até estourar o orçamento da
 * semana, aí abre a próxima — um tema sozinho já mais denso que o
 * orçamento inteiro vira uma semana só dele, isolado, em vez de espremido
 * junto de outro. Busca binária no valor do orçamento até o nº de semanas
 * resultante bater com NUM_SEMANAS_ALVO (ou chegar o mais perto possível).
 */
function distribuirEmSemanas(temasOrdenados) {
  const densidades = temasOrdenados.map(calcularDensidade);
  const totalDensidade = densidades.reduce((a, b) => a + b, 0);

  function empacotar(orcamento) {
    const semanas = [];
    let atual = [];
    let soma = 0;
    for (let i = 0; i < temasOrdenados.length; i++) {
      const d = densidades[i];
      if (atual.length && soma + d > orcamento) {
        semanas.push(atual);
        atual = [];
        soma = 0;
      }
      atual.push(temasOrdenados[i]);
      soma += d;
    }
    if (atual.length) semanas.push(atual);
    return semanas;
  }

  let lo = 1;
  let hi = totalDensidade || 1;
  let melhor = empacotar(hi);
  for (let i = 0; i < 40; i++) {
    const meio = (lo + hi) / 2;
    const semanas = empacotar(meio);
    if (Math.abs(semanas.length - NUM_SEMANAS_ALVO) < Math.abs(melhor.length - NUM_SEMANAS_ALVO)) melhor = semanas;
    if (semanas.length > NUM_SEMANAS_ALVO) lo = meio;
    else hi = meio;
  }
  return melhor;
}

/**
 * Monta o curso completo: currículo em ordem fixa, dividido em semanas de
 * largura variável (ver distribuirEmSemanas), com o progresso (marcado em
 * Conteúdo) já cruzado.
 */
export async function gerarCurso() {
  const [temas, progresso] = await Promise.all([fetchJsonCached("data/temas.json"), getAll("progresso")]);
  const concluidosSet = new Set(progresso.filter((p) => p.concluido).map((p) => p.id));

  const ordenados = ordenarCurriculo(temas);
  const gruposSemana = distribuirEmSemanas(ordenados);

  const semanas = gruposSemana.map((itens, i) => {
    const itensComProgresso = itens.map((tema) => ({ ...tema, concluido: concluidosSet.has(tema.id) }));
    const concluidos = itensComProgresso.filter((t) => t.concluido).length;
    return {
      numero: i + 1,
      temas: itensComProgresso,
      concluidos,
      total: itensComProgresso.length,
      percentual: Math.round((concluidos / itensComProgresso.length) * 100),
    };
  });

  const totalConcluidos = ordenados.filter((t) => concluidosSet.has(t.id)).length;

  return {
    semanas,
    totalTemas: ordenados.length,
    totalConcluidos,
    percentualGeral: ordenados.length ? Math.round((totalConcluidos / ordenados.length) * 100) : 0,
  };
}
