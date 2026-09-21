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
 */

import { fetchJsonCached } from "./utils.js";
import { getAll } from "./db.js";
import { AREA_POR_CATEGORIA, ORDEM_AREAS, pesoProva } from "./areas.js";

// Temas novos por semana. Referência: MIN_POR_TEMA_NOVO (25min/tema, ver
// planner.js) e um ritmo sustentável de conteúdo novo ao longo da semana,
// deixando o restante do tempo para revisão espaçada e questões (que já são
// cobertos por Hoje/Planejamento Semanal). Com 6/semana, o currículo
// completo (~220 temas) cabe em pouco menos de 1 ano.
export const TEMAS_POR_SEMANA = 6;

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

/**
 * Monta o curso completo: currículo em ordem fixa, dividido em semanas de
 * TEMAS_POR_SEMANA itens, com o progresso (marcado em Conteúdo) já cruzado.
 */
export async function gerarCurso() {
  const [temas, progresso] = await Promise.all([fetchJsonCached("data/temas.json"), getAll("progresso")]);
  const concluidosSet = new Set(progresso.filter((p) => p.concluido).map((p) => p.id));

  const ordenados = ordenarCurriculo(temas);
  const semanas = [];
  for (let i = 0; i < ordenados.length; i += TEMAS_POR_SEMANA) {
    const itens = ordenados.slice(i, i + TEMAS_POR_SEMANA).map((tema) => ({ ...tema, concluido: concluidosSet.has(tema.id) }));
    const concluidos = itens.filter((t) => t.concluido).length;
    semanas.push({
      numero: semanas.length + 1,
      temas: itens,
      concluidos,
      total: itens.length,
      percentual: Math.round((concluidos / itens.length) * 100),
    });
  }

  const totalConcluidos = ordenados.filter((t) => concluidosSet.has(t.id)).length;

  return {
    semanas,
    totalTemas: ordenados.length,
    totalConcluidos,
    percentualGeral: ordenados.length ? Math.round((totalConcluidos / ordenados.length) * 100) : 0,
  };
}
