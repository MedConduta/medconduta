/**
 * MedConduta — mapa de subespecialidade (campo `categoria`) → grande área.
 * Compartilhado entre a tela de Conteúdo (agrupamento da lista) e o gerador
 * de conteúdo por IA (para escolher uma categoria válida).
 */

export const AREA_POR_CATEGORIA = {
  Cardiologia: "Clínica Médica",
  Endocrinologia: "Clínica Médica",
  Pneumologia: "Clínica Médica",
  Nefrologia: "Clínica Médica",
  Gastroenterologia: "Clínica Médica",
  Hepatologia: "Clínica Médica",
  Neurologia: "Clínica Médica",
  Infectologia: "Clínica Médica",
  Hematologia: "Clínica Médica",
  Reumatologia: "Clínica Médica",
  "Medicina Intensiva": "Clínica Médica",
  Emergência: "Clínica Médica",
  Geriatria: "Clínica Médica",
  Oncologia: "Clínica Médica",
  "Cirurgia Geral": "Cirurgia Geral",
  Urologia: "Cirurgia Geral",
  Ginecologia: "Ginecologia e Obstetrícia",
  Obstetrícia: "Ginecologia e Obstetrícia",
  Pediatria: "Pediatria",
  "Medicina Preventiva": "Medicina Preventiva",
  Psiquiatria: "Saúde Mental",
  Otorrinolaringologia: "Especialidades",
  Oftalmologia: "Especialidades",
  "Ortopedia e Traumatologia": "Especialidades",
  Dermatologia: "Especialidades",
  Anestesiologia: "Especialidades",
};

export const ORDEM_AREAS = [
  "Clínica Médica",
  "Cirurgia Geral",
  "Ginecologia e Obstetrícia",
  "Pediatria",
  "Saúde Mental",
  "Medicina Preventiva",
  "Especialidades",
  "Outros",
];

export const CATEGORIAS_VALIDAS = Object.keys(AREA_POR_CATEGORIA);

/**
 * Peso estimado (1-5) de cada categoria em provas de residência R1 no Brasil,
 * com foco em SES-PE. É uma ESTIMATIVA por área (não um dado oficial da banca)
 * — baseada em proporções conhecidas desse tipo de prova (Clínica Médica e
 * Medicina Preventiva/SUS costumam pesar mais; subespecialidades cirúrgicas
 * restritas costumam pesar menos). Serve de ponto de partida para as fases
 * futuras (mapa de pontos fracos, priorização) e pode ser ajustada depois —
 * não substitui um edital real.
 */
export const PESO_PROVA_POR_CATEGORIA = {
  Cardiologia: 5,
  Infectologia: 5,
  Obstetrícia: 5,
  Endocrinologia: 4,
  Pneumologia: 4,
  Nefrologia: 4,
  Gastroenterologia: 4,
  Neurologia: 4,
  Emergência: 4,
  "Cirurgia Geral": 4,
  Ginecologia: 4,
  Pediatria: 4,
  "Medicina Preventiva": 4,
  Hematologia: 3,
  Reumatologia: 3,
  "Medicina Intensiva": 3,
  Psiquiatria: 3,
  "Ortopedia e Traumatologia": 3,
  Urologia: 2,
  Geriatria: 2,
  Oncologia: 2,
  Otorrinolaringologia: 2,
  Oftalmologia: 2,
  Dermatologia: 2,
  Anestesiologia: 2,
};

/**
 * Peso estimado (1-5) por categoria para o ENAMED — usa a mesma escala e a
 * mesma ordem relativa dentro de cada grande área da tabela acima (SES-PE),
 * mas redistribuída porque o ENAMED pondera as 5 grandes áreas da Matriz de
 * Referência Comum (Clínica Médica, Cirurgia, GO, Pediatria, Medicina
 * Preventiva/Saúde Coletiva) de forma bem mais equilibrada entre si — SES-PE
 * é uma prova de Acesso Direto sem edital de conteúdo item a item (ver
 * CURRICULO.md), então a tabela acima, mais concentrada em Clínica Médica,
 * é a estimativa razoável pra ela. No ENAMED, áreas com poucas categorias
 * mapeadas (Cirurgia Geral, GO, Pediatria, Medicina Preventiva) têm peso
 * puxado pra cima pra carregar sua fatia igual de ~20% da prova; Clínica
 * Médica, que concentra muitas categorias, tem os pesos um pouco mais
 * distribuídos entre elas. Assim como a tabela SES-PE, é uma ESTIMATIVA, não
 * um dado oficial da banca.
 */
export const PESO_PROVA_ENAMED_POR_CATEGORIA = {
  Cardiologia: 5,
  Infectologia: 5,
  Obstetrícia: 5,
  Ginecologia: 5,
  "Cirurgia Geral": 5,
  Pediatria: 5,
  "Medicina Preventiva": 5,
  Endocrinologia: 4,
  Pneumologia: 4,
  Gastroenterologia: 4,
  Neurologia: 4,
  Emergência: 4,
  Urologia: 3,
  Nefrologia: 3,
  Hematologia: 3,
  "Medicina Intensiva": 3,
  Psiquiatria: 3,
  "Ortopedia e Traumatologia": 3,
  Reumatologia: 2,
  Geriatria: 2,
  Oncologia: 2,
  Otorrinolaringologia: 2,
  Oftalmologia: 2,
  Dermatologia: 2,
  Anestesiologia: 2,
};

/**
 * Peso estimado (1-5) de uma categoria na prova-alvo; 3 (médio) se a
 * categoria não estiver mapeada. `provaAlvo` segue PROVAS_ALVO (ver
 * cronograma.js) — "SES-PE" (padrão) ou "ENAMED".
 */
export function pesoProva(categoria, provaAlvo = "SES-PE") {
  const tabela = provaAlvo === "ENAMED" ? PESO_PROVA_ENAMED_POR_CATEGORIA : PESO_PROVA_POR_CATEGORIA;
  return tabela[categoria] ?? 3;
}
