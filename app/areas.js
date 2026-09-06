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
  Neurologia: "Clínica Médica",
  Infectologia: "Clínica Médica",
  Hematologia: "Clínica Médica",
  Reumatologia: "Clínica Médica",
  "Medicina Intensiva": "Clínica Médica",
  Emergência: "Clínica Médica",
  Geriatria: "Clínica Médica",
  Oncologia: "Clínica Médica",
  "Cirurgia Geral": "Cirurgia Geral",
  Ginecologia: "Ginecologia e Obstetrícia",
  Obstetrícia: "Ginecologia e Obstetrícia",
  Pediatria: "Pediatria",
  "Medicina Preventiva": "Medicina Preventiva",
};

export const ORDEM_AREAS = [
  "Clínica Médica",
  "Cirurgia Geral",
  "Ginecologia e Obstetrícia",
  "Pediatria",
  "Medicina Preventiva",
  "Outros",
];

export const CATEGORIAS_VALIDAS = Object.keys(AREA_POR_CATEGORIA);
