/**
 * Prioridade de prova (SES-PE + ENAMED) — classificação estática por tema,
 * calculada uma vez com base em relatórios estatísticos de incidência das
 * duas bancas (ver `tema.prioridadeProva` em data/temas.json) e não no
 * desempenho do usuário — é diferente do quadrante de Prontidão
 * (app/prontidao.js), que mede fraqueza pessoal. As duas coisas convivem:
 * aqui é "isso cai muito na prova", lá é "você vai mal nisso".
 */
export const PRIORIDADE_INFO = {
  alta: {
    label: "Prioritário",
    descricao: "Tema de incidência crítica no SES-PE e no ENAMED — concentra boa parte dos pontos da prova.",
    badgeClasse: "badge--danger",
    fundoClasse: "bg-prioridade-alta",
    bordaClasse: "borda-prioridade-alta",
    emoji: "🔴",
  },
  media: {
    label: "Chance de cair",
    descricao: "Tema de relevância média — cobrança moderada nas duas bancas.",
    badgeClasse: "badge--warning",
    fundoClasse: "bg-prioridade-media",
    bordaClasse: "borda-prioridade-media",
    emoji: "🟡",
  },
  baixa: {
    label: "Secundário",
    descricao: "Subespecialidade ou tema de baixo peso percentual nas duas bancas.",
    badgeClasse: "badge--tratamento",
    fundoClasse: "bg-prioridade-baixa",
    bordaClasse: "borda-prioridade-baixa",
    emoji: "🟢",
  },
};

/** Sempre "media" para temas sem classificação (ex.: gerados por IA) — mesma regra de exclusão consciente do relatório original. */
export function infoPrioridade(prioridadeProva) {
  return PRIORIDADE_INFO[prioridadeProva] || PRIORIDADE_INFO.media;
}

export function badgePrioridade(prioridadeProva) {
  const info = infoPrioridade(prioridadeProva);
  return `<span class="badge ${info.badgeClasse}" title="${info.descricao}">${info.emoji} ${info.label}</span>`;
}
