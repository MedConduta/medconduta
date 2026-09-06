import { fetchJsonCached, escapeHtml } from "../utils.js";
import { renderClinicalWarning } from "../components/clinicalWarning.js";
import { renderFlowchart } from "../components/flowchart.js";

export async function renderLista(container) {
  const fluxos = await fetchJsonCached("data/fluxogramas.json");

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Fluxogramas</div>
        <h1>Fluxogramas de diagnóstico e tratamento</h1>
        <p class="page-header__desc">Cada fluxograma é identificado como <strong>diagnóstico</strong> ou <strong>tratamento</strong>. Navegue pelas decisões clínicas de forma visual.</p>
      </div>
      <div class="tag-filter-bar" role="group" aria-label="Filtrar por tipo">
        <button class="tag-filter is-active" data-tipo="todos">Todos</button>
        <button class="tag-filter" data-tipo="diagnostico">Diagnóstico</button>
        <button class="tag-filter" data-tipo="tratamento">Tratamento</button>
      </div>
      <div class="card-grid" id="fluxos-grid">
        ${fluxos
          .map(
            (f) => `
          <a class="card card--interactive list-card" href="#/residencia/fluxogramas/${f.id}" data-tipo="${f.tipo}">
            <div class="list-card__top">
              <span class="badge badge--${f.tipo}">${f.tipo === "diagnostico" ? "Diagnóstico" : "Tratamento"}</span>
              ${f.revisado ? '<span class="validation-flag validation-flag--ok">✓</span>' : '<span class="validation-flag validation-flag--pending">⚠</span>'}
            </div>
            <div class="list-card__title">${escapeHtml(f.titulo)}</div>
          </a>`
          )
          .join("")}
      </div>
    </div>
  `;

  container.querySelectorAll(".tag-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".tag-filter").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const tipo = btn.dataset.tipo;
      container.querySelectorAll("#fluxos-grid > a").forEach((card) => {
        card.style.display = tipo === "todos" || card.dataset.tipo === tipo ? "" : "none";
      });
    });
  });
}

export async function renderDetalhe(container, { id }) {
  const fluxos = await fetchJsonCached("data/fluxogramas.json");
  const fluxo = fluxos.find((f) => f.id === id);

  if (!fluxo) {
    container.innerHTML = `<div class="empty-state"><h2>Fluxograma não encontrado</h2><a class="btn btn--secondary" href="#/residencia/fluxogramas">Voltar</a></div>`;
    return;
  }

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <a class="btn btn--ghost" href="#/residencia/fluxogramas" style="padding-left:0;margin-bottom:8px;">← Fluxogramas</a>
        <div class="page-header__eyebrow">
          <span class="badge badge--${fluxo.tipo}">${fluxo.tipo === "diagnostico" ? "Fluxo de DIAGNÓSTICO" : "Fluxo de TRATAMENTO"}</span>
        </div>
        <h1>${escapeHtml(fluxo.titulo)}</h1>
      </div>
      ${renderClinicalWarning(fluxo)}
      <div class="card">
        ${renderFlowchart(fluxo.fluxo)}
      </div>
    </div>
  `;
}
