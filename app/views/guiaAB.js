import { renderListaGuia, renderDetalheGuia } from "./guiaClinico.js";

const OPTS = {
  dataPath: "data/guia_ab.json",
  basePath: "/bolso/atencao-basica",
  eyebrow: "Guia de bolso — Atenção Básica",
  titulo: "Saúde da Família",
  descricao: "Condutas e fluxos de acompanhamento ambulatorial, para consulta rápida na UBS.",
  voltarLabel: "Atenção Básica",
};

export function renderLista(container) {
  return renderListaGuia(container, OPTS);
}

export function renderDetalhe(container, params) {
  return renderDetalheGuia(container, params, OPTS);
}
