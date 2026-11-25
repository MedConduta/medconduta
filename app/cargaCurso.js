/**
 * MedConduta — carga real de estudo do Curso: quanto tempo cada aula e cada
 * tema pedem de verdade (videoaulas do MedEstudo, leitura do resumo,
 * questões no estudo e questões nas revisões) e como as aulas se espalham
 * pelas semanas conforme as horas que o usuário tem e a data da prova.
 *
 * As durações das videoaulas vêm de data/videoaulas.json (medidas com
 * ffprobe nos arquivos enviados ao canal; ver ferramentas/gerar_videoaulas.py).
 * A leitura sai do número de palavras do resumo, num ritmo de leitor médio
 * de texto técnico. As metas de questões seguem a prioridade do tema na prova
 * (ver METAS_PRIORIDADE): plano completo nos temas que mais caem.
 */

import { getPref, setPref } from "./db.js";

export const PALAVRAS_POR_MIN = 200;
export const MIN_POR_IMAGEM = 1;
export const MIN_POR_QUESTAO = 3; // ler o enunciado, resolver e ler o comentário
export const QUESTOES_POR_REVISAO = 10;
export const MIN_RELEITURA_REVISAO = 10; // reler pontos-chave / mapa do tema antes das questões

/**
 * Metas por prioridade do tema (prioridadeProva em data/temas.json):
 * questões na etapa de estudo e os dias das revisões (cada revisão = releitura
 * + 10 questões). Alta = plano completo; média e baixa ficam mais enxutas pra
 * caber no tempo sem tirar o foco do que mais cai.
 */
export const METAS_PRIORIDADE = {
  alta: { questoesEstudo: 30, revisoesDias: [3, 5, 7, 15, 30] },
  media: { questoesEstudo: 30, revisoesDias: [7, 15, 30] },
  baixa: { questoesEstudo: 20, revisoesDias: [7, 30] },
};

export function metasDoTema(prioridade) {
  return METAS_PRIORIDADE[prioridade] || METAS_PRIORIDADE.media;
}

// Últimas semanas antes da prova ficam livres de conteúdo novo: simulados,
// revisão de erros e dos temas de maior peso (fase Reta Final, ver cronograma.js).
export const SEMANAS_RESERVA_PROVA = 4;
// Sem data de prova, o Curso usa no máximo o número de semanas da planilha.
export const SEMANAS_PLANILHA = 45;

export const PREF_HORAS_DIA = "plano_horas_dia";
export const PREF_DIAS_SEMANA = "plano_dias_semana";
export const PREF_VELOCIDADE_VIDEO = "plano_velocidade_video";

export const PLANO_PADRAO = { horasDia: 4.5, diasSemana: 6, velocidadeVideo: 1.5 };

export async function getPlanoEstudo() {
  const [horasDia, diasSemana, velocidadeVideo] = await Promise.all([
    getPref(PREF_HORAS_DIA, PLANO_PADRAO.horasDia),
    getPref(PREF_DIAS_SEMANA, PLANO_PADRAO.diasSemana),
    getPref(PREF_VELOCIDADE_VIDEO, PLANO_PADRAO.velocidadeVideo),
  ]);
  return { horasDia: Number(horasDia), diasSemana: Number(diasSemana), velocidadeVideo: Number(velocidadeVideo) };
}

export async function setPlanoEstudo({ horasDia, diasSemana, velocidadeVideo }) {
  await Promise.all([
    setPref(PREF_HORAS_DIA, Number(horasDia)),
    setPref(PREF_DIAS_SEMANA, Number(diasSemana)),
    setPref(PREF_VELOCIDADE_VIDEO, Number(velocidadeVideo)),
  ]);
}

function contarPalavras(valor) {
  if (valor == null) return 0;
  if (Array.isArray(valor)) return valor.reduce((s, v) => s + contarPalavras(v), 0);
  if (typeof valor === "object") {
    return Object.entries(valor).reduce((s, [k, v]) => (k === "url" || k === "fonte" || k === "id" ? s : s + contarPalavras(v)), 0);
  }
  if (typeof valor !== "string") return 0;
  const texto = valor.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
  return (texto.match(/[\p{L}\p{N}]+/gu) || []).length;
}

/** Minutos de leitura do resumo de um tema (texto + 1 min por figura). */
export function minutosLeitura(tema) {
  const palavras = contarPalavras(tema.resumo) + contarPalavras(tema.secoes) + contarPalavras(tema.mnemonicos) + contarPalavras(tema.comoCai);
  const imagens = (tema.secoes || []).reduce((s, sec) => s + (sec.imagens?.length || 0), 0);
  return Math.round(palavras / PALAVRAS_POR_MIN + imagens * MIN_POR_IMAGEM);
}

/** Carga de um tema: leitura, questões do estudo e as revisões (já limitadas pelo que o banco tem). */
export function cargaTema(tema, questoesDisponiveis) {
  const metas = metasDoTema(tema.prioridadeProva);
  const questoesEstudo = Math.min(metas.questoesEstudo, questoesDisponiveis);
  const questoesRevisao = Math.min(QUESTOES_POR_REVISAO, questoesDisponiveis);
  const minRevisao = MIN_RELEITURA_REVISAO + questoesRevisao * MIN_POR_QUESTAO;
  return {
    leituraMin: minutosLeitura(tema),
    questoesEstudo,
    questoesEstudoMin: questoesEstudo * MIN_POR_QUESTAO,
    questoesRevisao,
    revisoesDias: metas.revisoesDias,
    minPorRevisao: minRevisao,
    revisoesMin: metas.revisoesDias.length * minRevisao,
  };
}

const TIPOS_ESTUDO = new Set(["aula", "atualizacao"]);

/** Vídeos de uma aula: os de estudo (aula + atualização) contam na semana; miniaula/podcast são material de revisão. */
export function cargaVideosAula(videos = [], velocidade = 1) {
  const estudo = videos.filter((v) => TIPOS_ESTUDO.has(v.tipo));
  const revisao = videos.filter((v) => v.tipo === "miniaula" || v.tipo === "podcast");
  const soma = (lista) => lista.reduce((s, v) => s + v.min, 0);
  return {
    videoMin: Math.round(soma(estudo) / velocidade),
    videoRevisaoMin: Math.round(soma(revisao) / velocidade),
    videos,
  };
}

/** Semana (contando a partir da do estudo) em que cai uma revisão de +`dias`, supondo o estudo no meio da semana. */
export function semanasAteRevisao(dias) {
  return Math.floor((2 + dias) / 7);
}

/**
 * Enche as semanas em ordem: cada semana recebe aulas (na ordem fixa do
 * cronograma) até o tempo dela — estudo das aulas novas + revisões que
 * vencem nela — chegar perto de `orcamentoMin`. Uma semana nunca fica sem aula nova
 * enquanto houver aula. Devolve a semana de cada aula e quantas semanas o
 * conteúdo novo ocupou.
 */
export function encherSemanas(aulas, orcamentoMin) {
  const revisoesPorSemana = new Map();
  const semanaDaAula = [];
  let semana = 1;
  let cargaSemana = 0;
  let aulasNaSemana = 0;
  for (const aula of aulas) {
    const revisoesMesmaSemana = aula.revisoes.filter((r) => semanasAteRevisao(r.dias) === 0).reduce((s, r) => s + r.min, 0);
    const custo = aula.estudoMin + revisoesMesmaSemana;
    // Entra na semana se ao menos metade dela couber no tempo que falta (assim
    // a média semanal fica perto do orçamento, sem sobra sistemática).
    if (aulasNaSemana > 0 && cargaSemana + custo / 2 > orcamentoMin) {
      semana += 1;
      cargaSemana = revisoesPorSemana.get(semana) || 0;
      aulasNaSemana = 0;
    } else if (aulasNaSemana === 0) {
      cargaSemana = revisoesPorSemana.get(semana) || 0;
    }
    semanaDaAula.push(semana);
    cargaSemana += aula.estudoMin;
    aulasNaSemana += 1;
    for (const r of aula.revisoes) {
      const alvo = semana + semanasAteRevisao(r.dias);
      revisoesPorSemana.set(alvo, (revisoesPorSemana.get(alvo) || 0) + r.min);
      if (alvo === semana) cargaSemana += r.min;
    }
  }
  return { semanaDaAula, semanas: semana };
}

/**
 * Distribui as aulas pelas semanas: no ritmo do usuário (horas por semana)
 * quando isso termina antes do limite (data da prova menos as semanas de
 * reserva; sem prova, as 45 da planilha). Se não couber, aumenta o tempo por
 * semana o mínimo necessário para caber no limite e avisa.
 */
export function planejarSemanas(aulas, { horasSemana, semanasAteProva }) {
  const limite = semanasAteProva != null ? Math.max(1, semanasAteProva - SEMANAS_RESERVA_PROVA) : SEMANAS_PLANILHA;
  const noRitmo = encherSemanas(aulas, horasSemana * 60);
  if (noRitmo.semanas <= limite) {
    return { ...noRitmo, limite, necessarias: noRitmo.semanas, cabe: true, orcamentoMin: horasSemana * 60 };
  }
  let baixo = horasSemana * 60;
  let alto = aulas.reduce((s, a) => s + a.estudoMin + a.revisoes.reduce((x, r) => x + r.min, 0), 0);
  let melhor = encherSemanas(aulas, alto);
  for (let i = 0; i < 30 && alto - baixo > 5; i++) {
    const meio = (baixo + alto) / 2;
    const tentativa = encherSemanas(aulas, meio);
    if (tentativa.semanas <= limite) {
      alto = meio;
      melhor = tentativa;
    } else baixo = meio;
  }
  return { ...melhor, limite, necessarias: noRitmo.semanas, cabe: false, orcamentoMin: alto };
}
