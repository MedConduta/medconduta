import { fetchJsonCached, escapeHtml } from "../utils.js";
import { renderClinicalWarning } from "../components/clinicalWarning.js";
import { getItem, setItem } from "../db.js";

async function marcarConcluido(temaId, concluido) {
  await setItem("progresso", { id: temaId, concluido, atualizadoEm: new Date().toISOString() });
}

export async function renderLista(container) {
  const temas = await fetchJsonCached("data/temas.json");
  const categorias = [...new Set(temas.map((t) => t.categoria))];

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Conteúdo</div>
        <h1>Resumos por tema</h1>
        <p class="page-header__desc">Conteúdo estruturado para prática clínica e provas de residência R1, com mnemônicos destacados. Todo o conteúdo clínico é rascunho a validar — veja o aviso em cada tema.</p>
      </div>
      <div class="tag-filter-bar" role="group" aria-label="Filtrar por categoria">
        <button class="tag-filter is-active" data-cat="todas">Todas</button>
        ${categorias.map((c) => `<button class="tag-filter" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("")}
      </div>
      <div class="card-grid" id="temas-grid">
        ${temas.map(renderCardTema).join("")}
      </div>
    </div>
  `;

  container.querySelectorAll(".tag-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".tag-filter").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const cat = btn.dataset.cat;
      container.querySelectorAll("#temas-grid > a").forEach((card) => {
        card.style.display = cat === "todas" || card.dataset.categoria === cat ? "" : "none";
      });
    });
  });
}

function renderCardTema(tema) {
  return `
    <a class="card card--interactive list-card" href="#/residencia/conteudo/${tema.id}" data-categoria="${escapeHtml(tema.categoria)}">
      <div class="list-card__top">
        <span class="badge badge--accent">${escapeHtml(tema.categoria)}</span>
        ${tema.revisado ? '<span class="validation-flag validation-flag--ok">✓ revisado</span>' : '<span class="validation-flag validation-flag--pending">⚠ a validar</span>'}
      </div>
      <div class="list-card__title">${escapeHtml(tema.titulo)}</div>
      <p class="list-card__meta">${escapeHtml(tema.resumo)}</p>
    </a>
  `;
}

export async function renderDetalhe(container, { id }) {
  const temas = await fetchJsonCached("data/temas.json");
  const tema = temas.find((t) => t.id === id);

  if (!tema) {
    container.innerHTML = `<div class="empty-state"><h2>Tema não encontrado</h2><a class="btn btn--secondary" href="#/residencia/conteudo">Voltar</a></div>`;
    return;
  }

  const progresso = await getItem("progresso", tema.id);
  const concluido = !!progresso?.concluido;

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <a class="btn btn--ghost" href="#/residencia/conteudo" style="padding-left:0;margin-bottom:8px;">← Conteúdo</a>
        <div class="page-header__eyebrow">${escapeHtml(tema.categoria)}</div>
        <h1>${escapeHtml(tema.titulo)}</h1>
      </div>

      ${renderClinicalWarning(tema)}

      <div class="btn-row" style="margin-bottom:24px;">
        <button class="btn ${concluido ? "btn--secondary" : "btn--primary"}" id="btn-concluir">
          ${concluido ? "✓ Marcado como estudado" : "Marcar como estudado"}
        </button>
        <a class="btn btn--secondary" href="#/residencia/fluxogramas">Ver fluxogramas relacionados</a>
      </div>

      <div class="prose">
        ${tema.secoes
          .map(
            (s) => `
          <div class="section-block">
            <h3>${escapeHtml(s.titulo)}</h3>
            <p>${s.conteudo}</p>
          </div>`
          )
          .join("")}

        ${tema.mnemonicos
          .map(
            (m) => `
          <div class="mnemonic">
            <div class="mnemonic__label">Mnemônico</div>
            <div class="mnemonic__word">${escapeHtml(m.palavra)}</div>
            <p style="margin:0;color:var(--color-text-secondary);">${escapeHtml(m.explicacao)}</p>
          </div>`
          )
          .join("")}
      </div>
    </div>
  `;

  container.querySelector("#btn-concluir").addEventListener("click", async (e) => {
    const novoEstado = !concluido;
    await marcarConcluido(tema.id, novoEstado);
    renderDetalhe(container, { id });
  });
}
