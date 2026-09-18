/**
 * MedConduta — Fase 7: Modo Recuperação ("Não Posso Atrasar Mais") + Modo Reta Final.
 *
 * Dá nome e visibilidade a dois estados especiais da preparação que já
 * emergem dos dados existentes (cronograma.js, progresso de temas), em vez
 * de deixá-los só como números mudando nos bastidores:
 *
 * - Modo Reta Final: a fase "Reta Final" do cronograma (Fase 4) já muda o
 *   equilíbrio conteúdo×questões sozinha; aqui isso vira um aviso explícito
 *   na interface, pra o usuário entender o porquê de quase não ver mais
 *   conteúdo novo.
 * - Modo Recuperação: cada fase tem um mínimo de conteúdo esperado até ali
 *   (`completudeEsperadaMin`, ver FASES em cronograma.js). Se o usuário está
 *   muito abaixo disso, a preparação está atrasada em relação ao tempo que
 *   resta — o app avisa e empurra o orçamento de tempo do dia mais pra
 *   conteúdo novo até o atraso ser recuperado.
 */

import { fetchJsonCached } from "./utils.js";
import { getAll } from "./db.js";
import { getFaseAtual } from "./cronograma.js";

// Quantos pontos percentuais abaixo do checkpoint da fase já contam como
// atraso real (não só uma pequena oscilação normal).
const MARGEM_ATRASO = 0.15;

// Piso de peso pro conteúdo novo quando o Modo Recuperação está ativo — não
// zera as questões, mas garante que boa parte do tempo volte a ser conteúdo
// até o atraso diminuir.
const PISO_PESO_CONTEUDO_RECUPERACAO = 0.5;

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
  // Recuperação só se aplica antes da Reta Final; ao entrar nela, o Modo
  // Reta Final sempre prevalece, mesmo que o atraso continue existindo.
  const emAtraso =
    !retaFinal &&
    diasRestantes !== null &&
    typeof fase.completudeEsperadaMin === "number" &&
    completude < fase.completudeEsperadaMin - MARGEM_ATRASO;

  return {
    fase,
    diasRestantes,
    completude,
    provaAlvo,
    modo: retaFinal ? "reta-final" : emAtraso ? "recuperacao" : null,
  };
}

/**
 * Quando o Modo Recuperação está ativo, garante um piso mínimo de peso pro
 * conteúdo novo (sem baixar o das questões a zero) — a fase original
 * (cronograma.js) não é alterada, só o objeto usado nesta geração de plano.
 */
export function aplicarModoNoPeso(fase, modo) {
  if (modo !== "recuperacao") return fase;
  const pesoConteudo = Math.max(fase.pesoConteudo, PISO_PESO_CONTEUDO_RECUPERACAO);
  return { ...fase, pesoConteudo, pesoQuestoes: 1 - pesoConteudo };
}
