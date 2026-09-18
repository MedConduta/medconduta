/**
 * MedConduta — Fase 9: Simulados.
 *
 * Monta uma prova simulada puxando questões do banco (curadas + geradas por
 * IA) na MESMA proporção de incidência estimada por área que já orienta o
 * resto da plataforma (pesoProva, ver areas.js) — assim o simulado se
 * aproxima da distribuição real da prova, em vez de sortear uniformemente.
 * Categorias sem questão cadastrada são só puladas (o peso delas se
 * redistribui pro resto); categorias com menos questões que o alvo entram
 * com tudo que têm, e a diferença sobra pro resto do banco.
 */

import { fetchJsonCached } from "./utils.js";
import { getAll, setItem } from "./db.js";
import { pesoProva } from "./areas.js";
import { getConfiguracaoProva } from "./cronograma.js";

export const TAMANHOS_DISPONIVEIS = [20, 40, 60, 80];
export const TAMANHO_PADRAO = 40;
export const MIN_POR_QUESTAO = 1.5; // ritmo de prova real (~90s/questão)

function embaralhar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Monta as `tamanho` questões do simulado, distribuídas por peso de incidência das categorias. */
export async function selecionarQuestoesSimulado(tamanho) {
  const [curadas, geradas, temas, { provaAlvo }] = await Promise.all([
    fetchJsonCached("data/questoes.json"),
    getAll("ia_questoes"),
    fetchJsonCached("data/temas.json"),
    getConfiguracaoProva(),
  ]);

  const categoriaPorTemaId = new Map(temas.map((t) => [t.id, t.categoria]));
  const todasQuestoes = [...curadas, ...geradas].map((q) => ({ ...q, categoria: categoriaPorTemaId.get(q.temaId) ?? null }));

  const porCategoria = new Map();
  for (const q of todasQuestoes) {
    if (!q.categoria) continue;
    if (!porCategoria.has(q.categoria)) porCategoria.set(q.categoria, []);
    porCategoria.get(q.categoria).push(q);
  }

  const categorias = [...porCategoria.keys()];
  const somaPesos = categorias.reduce((acc, c) => acc + pesoProva(c, provaAlvo), 0);

  const selecionadas = [];
  const idsUsados = new Set();

  for (const categoria of categorias) {
    const disponiveis = embaralhar(porCategoria.get(categoria));
    const alvo = somaPesos ? Math.round((tamanho * pesoProva(categoria, provaAlvo)) / somaPesos) : 0;
    for (const q of disponiveis.slice(0, alvo)) {
      selecionadas.push(q);
      idsUsados.add(q.id);
    }
  }

  // Sobra de vagas (categorias com poucas questões não bateram sua cota) —
  // preenche com o que faltar, sorteado do restante do banco inteiro.
  if (selecionadas.length < tamanho) {
    const restante = embaralhar(todasQuestoes.filter((q) => !idsUsados.has(q.id)));
    for (const q of restante) {
      if (selecionadas.length >= tamanho) break;
      selecionadas.push(q);
      idsUsados.add(q.id);
    }
  }

  return embaralhar(selecionadas.slice(0, tamanho));
}

/**
 * Registra o resultado final de um simulado (resumo + cada resposta
 * individual em `respostas`, pra alimentar desempenho/gargalos/erros como
 * qualquer outra questão respondida).
 */
export async function registrarResultadoSimulado({ questoes, respostasPorQuestaoId, iniciadoEm, duracaoUsadaMin }) {
  const agregadoPorCategoria = new Map();
  let acertos = 0;

  for (const questao of questoes) {
    const escolhida = respostasPorQuestaoId.get(questao.id);
    const acertou = escolhida === questao.correta;
    if (acertou) acertos += 1;

    if (questao.categoria) {
      const atual = agregadoPorCategoria.get(questao.categoria) || { total: 0, acertos: 0 };
      atual.total += 1;
      if (acertou) atual.acertos += 1;
      agregadoPorCategoria.set(questao.categoria, atual);
    }

    await setItem("respostas", {
      id: `${questao.id}-simulado-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      questaoId: questao.id,
      temaId: questao.temaId,
      tema: questao.tema,
      categoria: questao.categoria,
      banca: questao.banca,
      ano: questao.ano,
      acertou,
      origemSimulado: true,
      respondidoEm: new Date().toISOString(),
    });
  }

  const resumo = {
    id: `simulado-${Date.now()}`,
    iniciadoEm,
    finalizadoEm: new Date().toISOString(),
    tamanho: questoes.length,
    acertos,
    percentual: questoes.length ? Math.round((acertos / questoes.length) * 100) : 0,
    duracaoUsadaMin,
    porCategoria: [...agregadoPorCategoria.entries()].map(([categoria, v]) => ({ categoria, ...v })),
  };
  await setItem("simulados", resumo);
  return resumo;
}

/** Histórico de simulados já feitos, mais recente primeiro. */
export async function getHistoricoSimulados() {
  const simulados = await getAll("simulados");
  return simulados.sort((a, b) => new Date(b.finalizadoEm) - new Date(a.finalizadoEm));
}
