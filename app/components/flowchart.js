import { escapeHtml } from "../utils.js";

const NODE_CLASS = {
  start: "flow-node--start",
  action: "flow-node--action",
  alerta: "flow-node--alert",
  end: "flow-node--end",
};

function renderNode(node) {
  if (node.tipo === "decisao") {
    return `
      <div class="flow-connector" aria-hidden="true"></div>
      <div class="flow-node flow-node--decision">${escapeHtml(node.texto)}</div>
      <div class="flow-branches">
        ${node.ramos
          .map(
            (ramo) => `
          <div class="flow-branch">
            <span class="flow-branch__label">${escapeHtml(ramo.label)}</span>
            ${renderSequence(ramo.fluxo)}
          </div>`
          )
          .join("")}
      </div>
    `;
  }

  const cls = NODE_CLASS[node.tipo] || "flow-node--action";
  return `
    <div class="flow-connector" aria-hidden="true"></div>
    <div class="flow-node ${cls}">${escapeHtml(node.texto)}</div>
  `;
}

function renderSequence(fluxo) {
  return `<div class="flowchart">${fluxo.map(renderNode).join("")}</div>`;
}

/** Renderiza um fluxograma (JSON de diagnóstico ou tratamento) como HTML navegável. */
export function renderFlowchart(fluxo) {
  if (!fluxo || !fluxo.length) return `<p class="empty-state">Fluxograma indisponível.</p>`;
  // Remove o primeiro conector solto antes do nó inicial
  const html = renderSequence(fluxo);
  return html.replace('<div class="flow-connector" aria-hidden="true"></div>', "");
}
