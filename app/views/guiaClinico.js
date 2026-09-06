import { fetchJsonCached, escapeHtml } from "../utils.js";
import { renderClinicalWarning } from "../components/clinicalWarning.js";

/**
 * Renderização compartilhada para os guias de bolso baseados em
 * { titulo, categoria, resumo, pontos[], red_flags[] } — usado por
 * Atenção Básica e Urgência/Emergência.
 */

export async function renderListaGuia(container, { dataPath, basePath, eyebrow, titulo, descricao }) {
  const itens = await fetchJsonCached(dataPath);

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">${escapeHtml(eyebrow)}</div>
        <h1>${escapeHtml(titulo)}</h1>
        <p class="page-header__desc">${escapeHtml(descricao)}</p>
      </div>
      <div class="card-grid">
        ${itens
          .map(
            (item) => `
          <a class="card card--interactive list-card" href="#${basePath}/${item.id}">
            <div class="list-card__top">
              <span class="badge badge--accent">${escapeHtml(item.categoria)}</span>
              ${item.revisado ? '<span class="validation-flag validation-flag--ok">✓</span>' : '<span class="validation-flag validation-flag--pending">⚠</span>'}
            </div>
            <div class="list-card__title">${escapeHtml(item.titulo)}</div>
            <p class="list-card__meta">${escapeHtml(item.resumo)}</p>
          </a>`
          )
          .join("")}
      </div>
    </div>
  `;
}

export async function renderDetalheGuia(container, { id }, { dataPath, basePath, voltarLabel }) {
  const itens = await fetchJsonCached(dataPath);
  const item = itens.find((i) => i.id === id);

  if (!item) {
    container.innerHTML = `<div class="empty-state"><h2>Conteúdo não encontrado</h2><a class="btn btn--secondary" href="#${basePath}">Voltar</a></div>`;
    return;
  }

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <a class="btn btn--ghost" href="#${basePath}" style="padding-left:0;margin-bottom:8px;">← ${escapeHtml(voltarLabel)}</a>
        <div class="page-header__eyebrow">${escapeHtml(item.categoria)}</div>
        <h1>${escapeHtml(item.titulo)}</h1>
      </div>
      ${renderClinicalWarning(item)}
      <div class="card">
        <h3>Pontos-chave</h3>
        <ul>${item.pontos.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
      </div>
      ${
        item.red_flags?.length
          ? `<div class="card" style="margin-top:16px;border-color:var(--color-danger-border);">
              <h3 style="color:var(--color-danger);">⚠ Sinais de alerta (red flags)</h3>
              <ul>${item.red_flags.map((r) => `<li><span class="red-flag">${escapeHtml(r)}</span></li>`).join("")}</ul>
            </div>`
          : ""
      }
    </div>
  `;
}
