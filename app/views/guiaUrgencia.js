import { renderListaGuia, renderDetalheGuia } from "./guiaClinico.js";

const OPTS = {
  dataPath: "data/guia_urgencia.json",
  basePath: "/bolso/urgencia",
  eyebrow: "Guia de bolso — Urgência e Emergência",
  titulo: "Urgência e Emergência hospitalar",
  descricao: "Fluxos e condutas claras e práticas para a sala de emergência.",
  voltarLabel: "Urgência e Emergência",
};

export function renderLista(container) {
  return renderListaGuia(container, OPTS);
}

export function renderDetalhe(container, params) {
  return renderDetalheGuia(container, params, OPTS);
}
