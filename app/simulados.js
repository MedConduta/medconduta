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
import { carregarIndiceBanco, obterQuestoes } from "./bancoQuestoes.js";
import { getAll, setItem } from "./db.js";
import { pesoProva } from "./areas.js";
import { getConfiguracaoProva } from "./cronograma.js";
import { calcularDesempenhoPorCategoria, calcularScorePrioridade } from "./planner.js";

export const TAMANHOS_DISPONIVEIS = [20, 40, 60, 80, 100];
export const TAMANHO_PADRAO = 40;
export const MIN_POR_QUESTAO = 2.4; // 100 questões = 4h, proporcional para os demais tamanhos

// Fase 16 — Simulados estratégicos: em vez de puxar de toda a prova na
// proporção real (selecionarQuestoesSimulado), foca só nas categorias de
// maior prioridade AGORA (peso na prova × fragilidade do usuário — mesmo
// score de planner.js) — um simulado menor e mais afiado nos gargalos.
const TOP_K_CATEGORIAS_ESTRATEGICO = 4;

function embaralhar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Mínimo de questões numeradas para uma prova aparecer como "Prova completa". */
const MIN_QUESTOES_PROVA_COMPLETA = 30;

function chaveProva(r) {
  return `${r.instituicao}|${r.edicao || r.ano}|${r.prova || ""}`;
}

/**
 * Provas reais disponíveis para refazer como simulado (instituição + ano/edição),
 * a partir do índice: só questões com instituição e número da questão na prova.
 */
export async function listarProvasCompletas() {
  const { registrosProvas } = await carregarIndiceBanco();
  const grupos = new Map();
  for (const r of registrosProvas) {
    if (!r.instituicao || !r.numero) continue;
    const chave = chaveProva(r);
    const g = grupos.get(chave) || { chave, instituicao: r.instituicao, edicao: String(r.edicao || r.ano), ano: r.ano, prova: r.prova, total: 0, anuladas: 0 };
    g.total += 1;
    if (r.anulada) g.anuladas += 1;
    grupos.set(chave, g);
  }
  return [...grupos.values()]
    .filter((g) => g.total >= MIN_QUESTOES_PROVA_COMPLETA)
    .sort((a, b) => a.instituicao.localeCompare(b.instituicao, "pt-BR") || b.edicao.localeCompare(a.edicao));
}

/** Questões de uma prova completa, na ordem da prova. Anuladas ficam de fora (não contam na correção). */
export async function selecionarProvaCompleta(chave) {
  const { registrosProvas } = await carregarIndiceBanco();
  const daProva = registrosProvas.filter((r) => r.instituicao && r.numero && chaveProva(r) === chave).sort((a, b) => a.numero - b.numero);
  const validas = daProva.filter((r) => !r.anulada);
  const questoes = await completarConteudo(validas);
  return { questoes, anuladas: daProva.filter((r) => r.anulada).map((r) => r.numero) };
}

/** Troca os registros leves do índice pelas questões completas (as geradas por IA já vêm completas). */
async function completarConteudo(lista) {
  const completas = await obterQuestoes(lista.filter((q) => q.arquivo).map((q) => q.id));
  return lista.map((q) => (q.arquivo ? completas.get(q.id) : q)).filter(Boolean);
}

/** Monta as `tamanho` questões do simulado, distribuídas por peso de incidência das categorias. */
export async function selecionarQuestoesSimulado(tamanho) {
  const [banco, geradas, temas, { provaAlvo }] = await Promise.all([
    carregarIndiceBanco(),
    getAll("ia_questoes"),
    fetchJsonCached("data/temas.json"),
    getConfiguracaoProva(),
  ]);

  const categoriaPorTemaId = new Map(temas.map((t) => [t.id, t.categoria]));
  const todasQuestoes = [
    ...banco.registros.filter((r) => !r.anulada), // registros leves do índice: o conteúdo é baixado só para as sorteadas
    ...geradas.map((q) => ({ ...q, categoria: categoriaPorTemaId.get(q.temaId) ?? null })),
  ];

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

  return completarConteudo(embaralhar(selecionadas.slice(0, tamanho)));
}

/**
 * Monta um simulado "estratégico": só com as `TOP_K_CATEGORIAS_ESTRATEGICO`
 * categorias de maior score de prioridade (peso na prova × fragilidade,
 * mesma conta do motor "O que fazer agora" — ver calcularScorePrioridade em
 * planner.js), distribuídas entre si proporcionalmente ao score. Categorias
 * fora do top-K nunca entram — é um simulado deliberadamente mais estreito,
 * não uma amostra da prova inteira.
 */
export async function selecionarQuestoesSimuladoEstrategico(tamanho) {
  const [banco, geradas, temas, respostas, { provaAlvo }] = await Promise.all([
    carregarIndiceBanco(),
    getAll("ia_questoes"),
    fetchJsonCached("data/temas.json"),
    getAll("respostas"),
    getConfiguracaoProva(),
  ]);

  const categoriaPorTemaId = new Map(temas.map((t) => [t.id, t.categoria]));
  const todasQuestoes = [
    ...banco.registros.filter((r) => !r.anulada), // registros leves do índice: o conteúdo é baixado só para as sorteadas
    ...geradas.map((q) => ({ ...q, categoria: categoriaPorTemaId.get(q.temaId) ?? null })),
  ];

  const desempenhoPorCategoria = calcularDesempenhoPorCategoria(respostas);
  const categorias = [...new Set(temas.map((t) => t.categoria))];
  const ranking = categorias
    .map((categoria) => ({ categoria, score: calcularScorePrioridade(categoria, desempenhoPorCategoria, provaAlvo) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K_CATEGORIAS_ESTRATEGICO);

  const categoriasAlvo = new Set(ranking.map((r) => r.categoria));
  const somaScores = ranking.reduce((acc, r) => acc + r.score, 0);

  const porCategoria = new Map();
  for (const q of todasQuestoes) {
    if (!q.categoria || !categoriasAlvo.has(q.categoria)) continue;
    if (!porCategoria.has(q.categoria)) porCategoria.set(q.categoria, []);
    porCategoria.get(q.categoria).push(q);
  }

  const selecionadas = [];
  const idsUsados = new Set();
  for (const { categoria, score } of ranking) {
    const disponiveis = embaralhar(porCategoria.get(categoria) || []);
    const alvo = somaScores ? Math.round((tamanho * score) / somaScores) : 0;
    for (const q of disponiveis.slice(0, alvo)) {
      selecionadas.push(q);
      idsUsados.add(q.id);
    }
  }

  // Sobra de vagas: preenche só dentro das categorias-alvo (nunca foge do
  // escopo estratégico pra completar a cota, ao contrário do simulado completo).
  if (selecionadas.length < tamanho) {
    const restanteAlvo = embaralhar(todasQuestoes.filter((q) => categoriasAlvo.has(q.categoria) && !idsUsados.has(q.id)));
    for (const q of restanteAlvo) {
      if (selecionadas.length >= tamanho) break;
      selecionadas.push(q);
      idsUsados.add(q.id);
    }
  }

  return { questoes: await completarConteudo(embaralhar(selecionadas.slice(0, tamanho))), categorias: ranking.map((r) => r.categoria) };
}

/**
 * Registra o resultado final de um simulado (resumo + cada resposta
 * individual em `respostas`, pra alimentar desempenho/gargalos/erros como
 * qualquer outra questão respondida).
 */
export async function registrarResultadoSimulado({ questoes, respostasPorQuestaoId, iniciadoEm, duracaoUsadaMin }) {
  const agregadoPorCategoria = new Map();
  const respostaIdPorQuestaoId = new Map();
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

    const respostaId = `${questao.id}-simulado-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    respostaIdPorQuestaoId.set(questao.id, respostaId);
    await setItem("respostas", {
      id: respostaId,
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
  return { ...resumo, respostaIdPorQuestaoId };
}

/** Histórico de simulados já feitos, mais recente primeiro. */
export async function getHistoricoSimulados() {
  const simulados = await getAll("simulados");
  return simulados.sort((a, b) => new Date(b.finalizadoEm) - new Date(a.finalizadoEm));
}
