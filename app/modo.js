/**
 * MedConduta — Fase 7: Modo Recuperação ("Não Posso Atrasar Mais") + Modo Reta Final.
 * Fase 16: Plano de Emergência + Semana de Consolidação.
 *
 * Dá nome e visibilidade aos estados especiais da preparação que já emergem
 * dos dados existentes (cronograma.js, progresso de temas), em vez de
 * deixá-los só como números mudando nos bastidores:
 *
 * - Modo Reta Final: a fase "Reta Final"/"Pré-prova" do cronograma (Fase 4)
 *   já muda o equilíbrio conteúdo×questões sozinha; aqui isso vira um aviso
 *   explícito na interface, pra o usuário entender o porquê de quase não
 *   ver mais conteúdo novo.
 * - Modo Recuperação: cada fase tem um mínimo de conteúdo esperado até ali
 *   (`completudeEsperadaMin`, ver FASES em cronograma.js). Se o usuário está
 *   abaixo disso, a preparação está atrasada em relação ao tempo que resta —
 *   o app avisa e empurra o orçamento de tempo do dia mais pra conteúdo
 *   novo até o atraso ser recuperado.
 * - Plano de Emergência (Fase 16): quando o atraso não é só uma oscilação —
 *   é MUITO maior que o do Modo Recuperação — o ajuste de peso sozinho não
 *   basta; o motor também descarta os temas de menor prioridade da fila do
 *   dia (ver planner.js), pra não gastar tempo escasso em conteúdo de baixo
 *   retorno enquanto o essencial ainda falta.
 * - Semana de Consolidação (Fase 16): a cada 4 semanas (por número da
 *   semana ISO — não depende de saber quando o usuário começou a estudar),
 *   uma semana inteira vira só revisão/questões, sem conteúdo novo — um
 *   respiro programado pra fixar o que já foi visto. Nunca se sobrepõe a um
 *   modo mais urgente (Reta Final, Emergência ou Recuperação sempre vêm
 *   primeiro).
 */

import { fetchJsonCached } from "./utils.js";
import { getAll } from "./db.js";
import { getFaseAtual } from "./cronograma.js";

// Quantos pontos percentuais abaixo do checkpoint da fase já contam como
// atraso real (não só uma pequena oscilação normal).
const MARGEM_ATRASO = 0.15;

// Atraso "muito" maior que o de Modo Recuperação — o gatilho do Plano de
// Emergência. Emergência sempre implica também estar em Modo Recuperação
// (o gap é um superconjunto), mas pede uma resposta mais drástica.
const MARGEM_EMERGENCIA = 0.3;

// Piso de peso pro conteúdo novo quando o Modo Recuperação está ativo — não
// zera as questões, mas garante que boa parte do tempo volte a ser conteúdo
// até o atraso diminuir.
const PISO_PESO_CONTEUDO_RECUPERACAO = 0.5;

// No Plano de Emergência o piso é bem mais alto — quase todo o tempo vira
// conteúdo, e só o essencial (ver planner.js, que também corta temas de
// baixa prioridade da fila nesse modo).
const PISO_PESO_CONTEUDO_EMERGENCIA = 0.75;

// Na Semana de Consolidação o conteúdo novo quase desaparece — é uma
// semana de revisão/questões, não de avançar no curso.
const TETO_PESO_CONTEUDO_CONSOLIDACAO = 0.1;

// A cada quantas semanas ISO cai uma Semana de Consolidação.
const INTERVALO_SEMANAS_CONSOLIDACAO = 4;

/** Número da semana ISO-8601 (1-53) de uma data — usado só pra decidir semana de consolidação. */
function numeroSemanaISO(data = new Date()) {
  const d = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
  const diaSemanaISO = d.getUTCDay() || 7; // 1 (segunda) a 7 (domingo)
  d.setUTCDate(d.getUTCDate() + 4 - diaSemanaISO);
  const inicioAno = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - inicioAno) / 86400000 + 1) / 7);
}

/** Estado atual da preparação: fase, se está atrasada, e qual "modo especial" (se algum) está ativo. */
export async function getEstadoPreparo() {
  const [temas, progresso, { fase, diasRestantes, provaAlvo }] = await Promise.all([
    fetchJsonCached("data/temas.json"),
    getAll("progresso"),
    getFaseAtual(),
  ]);

  const concluidosSet = new Set(progresso.filter((p) => p.concluido).map((p) => p.id));
  const completude = temas.length ? temas.filter((t) => concluidosSet.has(t.id)).length / temas.length : 0;

  // Pré-prova é um estágio ainda mais extremo dentro da mesma lógica da
  // Reta Final (ver cronograma.js) — reaproveita o mesmo modo/banner, não
  // precisa de um terceiro estado especial.
  const retaFinal = fase.id === "reta-final" || fase.id === "pre-prova";

  // Na Reta Final não faz sentido tentar "recuperar" conteúdo — com tão
  // pouco tempo restante, forçar mais conteúdo novo é pior que aceitar as
  // lacunas e maximizar questões/revisão de erros. Por isso o Modo
  // Recuperação (e a Emergência, sua forma mais severa) só se aplicam antes
  // da Reta Final; ao entrar nela, o Modo Reta Final sempre prevalece.
  const gapCompletude =
    !retaFinal && diasRestantes !== null && typeof fase.completudeEsperadaMin === "number"
      ? fase.completudeEsperadaMin - completude
      : 0;
  const emAtraso = gapCompletude > MARGEM_ATRASO;
  const emEmergencia = gapCompletude > MARGEM_EMERGENCIA;

  const emSemanaConsolidacao = !retaFinal && !emAtraso && numeroSemanaISO() % INTERVALO_SEMANAS_CONSOLIDACAO === 0;

  return {
    fase,
    diasRestantes,
    completude,
    provaAlvo,
    modo: retaFinal
      ? "reta-final"
      : emEmergencia
        ? "emergencia"
        : emAtraso
          ? "recuperacao"
          : emSemanaConsolidacao
            ? "consolidacao"
            : null,
  };
}

/**
 * Ajusta o peso conteúdo×questões da fase conforme o modo especial ativo —
 * a fase original (cronograma.js) não é alterada, só o objeto usado nesta
 * geração de plano.
 */
export function aplicarModoNoPeso(fase, modo) {
  if (modo === "emergencia") {
    const pesoConteudo = Math.max(fase.pesoConteudo, PISO_PESO_CONTEUDO_EMERGENCIA);
    return { ...fase, pesoConteudo, pesoQuestoes: 1 - pesoConteudo };
  }
  if (modo === "recuperacao") {
    const pesoConteudo = Math.max(fase.pesoConteudo, PISO_PESO_CONTEUDO_RECUPERACAO);
    return { ...fase, pesoConteudo, pesoQuestoes: 1 - pesoConteudo };
  }
  if (modo === "consolidacao") {
    const pesoConteudo = Math.min(fase.pesoConteudo, TETO_PESO_CONTEUDO_CONSOLIDACAO);
    return { ...fase, pesoConteudo, pesoQuestoes: 1 - pesoConteudo };
  }
  return fase;
}
