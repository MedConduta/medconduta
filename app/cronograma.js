/**
 * MedConduta — Fase 4: cronograma até a prova + sistema de fases automático.
 *
 * O usuário informa a data da prova-alvo; a partir da contagem de dias
 * restantes, a plataforma classifica automaticamente a preparação em uma
 * de 4 fases (Construção → Consolidação → Intensificação → Reta Final),
 * cada uma com uma proporção diferente de conteúdo novo x questões — usada
 * pelo motor "O que fazer agora" (app/planner.js) para inclinar a agenda do
 * dia. Sem data de prova configurada, a plataforma continua funcionando
 * normalmente (modo "sem fase definida").
 */

import { getPref, setPref, getAll } from "./db.js";
import { fetchJsonCached } from "./utils.js";

export const PREF_PROVA_DATA = "prova_data";
export const PREF_PROVA_ALVO = "prova_alvo";

export const PROVAS_ALVO = ["SES-PE", "ENAMED"];

// Da mais próxima da prova para a mais distante — a primeira cujo `ateDias`
// cobre os dias restantes é a fase vigente. `pesoConteudo`/`pesoQuestoes`
// somam 1 e definem como o orçamento de tempo (após as revisões vencidas,
// que têm prioridade sempre) se divide entre conteúdo novo e questões.
export const FASES = [
  {
    id: "reta-final",
    nome: "Reta Final",
    ateDias: 30,
    pesoConteudo: 0.05,
    pesoQuestoes: 0.95,
    descricao: "Foco quase exclusivo em questões, revisão de erros e pontos de maior prioridade. Praticamente sem conteúdo novo.",
  },
  {
    id: "intensificacao",
    nome: "Intensificação",
    ateDias: 90,
    pesoConteudo: 0.2,
    pesoQuestoes: 0.8,
    descricao: "Questões ganham peso forte. Conteúdo novo só nos assuntos de maior prioridade (alta incidência + baixo domínio).",
  },
  {
    id: "consolidacao",
    nome: "Consolidação",
    ateDias: 180,
    pesoConteudo: 0.4,
    pesoQuestoes: 0.6,
    descricao: "Equilíbrio entre fechar o conteúdo restante e já praticar bastante em questões.",
  },
  {
    id: "construcao",
    nome: "Construção",
    ateDias: Infinity,
    pesoConteudo: 0.7,
    pesoQuestoes: 0.3,
    descricao: "Prioridade em avançar no conteúdo, construindo a base antes de intensificar questões.",
  },
];

// Pesos usados quando não há data de prova configurada — próximos da fase
// de Construção, mas levemente mais equilibrados (já que não sabemos a
// distância real até a prova).
const FASE_PADRAO_SEM_DATA = { id: null, nome: null, pesoConteudo: 0.6, pesoQuestoes: 0.4, descricao: null };

/** Dias restantes até `dataProvaIso` (YYYY-MM-DD); null se não configurada. */
export function calcularDiasRestantes(dataProvaIso, referencia = new Date()) {
  if (!dataProvaIso) return null;
  const prova = new Date(`${dataProvaIso}T00:00:00`);
  if (Number.isNaN(prova.getTime())) return null;
  const hojeIso = referencia.toISOString().slice(0, 10);
  const hoje = new Date(`${hojeIso}T00:00:00`);
  return Math.round((prova.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

/** Fase da preparação para um nº de dias restantes; null se não houver data configurada. */
export function calcularFase(diasRestantes) {
  if (diasRestantes === null) return FASE_PADRAO_SEM_DATA;
  const restantes = Math.max(0, diasRestantes); // prova já passada conta como reta final
  return FASES.find((f) => restantes <= f.ateDias) ?? FASES[FASES.length - 1];
}

export async function getConfiguracaoProva() {
  const [dataProva, provaAlvo] = await Promise.all([
    getPref(PREF_PROVA_DATA, null),
    getPref(PREF_PROVA_ALVO, "SES-PE"),
  ]);
  return { dataProva, provaAlvo };
}

export async function setConfiguracaoProva({ dataProva, provaAlvo }) {
  await Promise.all([setPref(PREF_PROVA_DATA, dataProva || null), setPref(PREF_PROVA_ALVO, provaAlvo)]);
}

/** Fase vigente já resolvida a partir da configuração salva (uso direto pelo planner). */
export async function getFaseAtual() {
  const { dataProva } = await getConfiguracaoProva();
  const diasRestantes = calcularDiasRestantes(dataProva);
  return { diasRestantes, fase: calcularFase(diasRestantes) };
}

/** Resumo completo para a tela de Cronograma: config da prova + fase + progresso agregado. */
export async function gerarResumoCronograma() {
  const [{ dataProva, provaAlvo }, temas, progresso, respostas] = await Promise.all([
    getConfiguracaoProva(),
    fetchJsonCached("data/temas.json"),
    getAll("progresso"),
    getAll("respostas"),
  ]);

  const diasRestantes = calcularDiasRestantes(dataProva);
  const fase = calcularFase(diasRestantes);
  const concluidosSet = new Set(progresso.filter((p) => p.concluido).map((p) => p.id));
  const totalTemas = temas.length;
  const temasConcluidos = temas.filter((t) => concluidosSet.has(t.id)).length;
  const totalQuestoesRespondidas = respostas.length;
  const acertos = respostas.filter((r) => r.acertou).length;

  return {
    dataProva,
    provaAlvo,
    diasRestantes,
    fase,
    totalTemas,
    temasConcluidos,
    percentualConteudo: totalTemas ? Math.round((temasConcluidos / totalTemas) * 100) : 0,
    totalQuestoesRespondidas,
    percentualAcerto: totalQuestoesRespondidas ? Math.round((acertos / totalQuestoesRespondidas) * 100) : null,
  };
}
