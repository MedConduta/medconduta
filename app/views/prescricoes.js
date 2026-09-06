import { fetchJsonCached, escapeHtml, uniq } from "../utils.js";
import { renderClinicalWarning } from "../components/clinicalWarning.js";

function showCopyToast(msg) {
  let toast = document.querySelector(".copy-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "copy-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("is-visible");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function textoCopiavel(item) {
  return [
    item.titulo,
    "",
    "Posologia:",
    item.posologia,
    "",
    "Orientação ao paciente:",
    item.orientacao_paciente,
    "",
    "Contraindicações:",
    ...item.contraindicacoes.map((c) => `- ${c}`),
  ].join("\n");
}

export async function renderLista(container) {
  const itens = await fetchJsonCached("data/prescricoes.json");
  const categorias = uniq(itens.map((i) => i.categoria));

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Guia de bolso — Condutas rápidas</div>
        <h1>Modelos de prescrição</h1>
        <p class="page-header__desc">Posologia, orientação ao paciente e principais contraindicações, em formato copiável.</p>
      </div>
      <div class="tag-filter-bar" role="group" aria-label="Filtrar por categoria">
        <button class="tag-filter is-active" data-cat="todas">Todas</button>
        ${categorias.map((c) => `<button class="tag-filter" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("")}
      </div>
      <div class="card-grid" id="presc-grid">
        ${itens
          .map(
            (item) => `
          <a class="card card--interactive list-card" href="#/bolso/prescricoes/${item.id}" data-categoria="${escapeHtml(item.categoria)}">
            <div class="list-card__top">
              <span class="badge badge--accent">${escapeHtml(item.categoria)}</span>
              ${item.revisado ? '<span class="validation-flag validation-flag--ok">✓</span>' : '<span class="validation-flag validation-flag--pending">⚠</span>'}
            </div>
            <div class="list-card__title">${escapeHtml(item.titulo)}</div>
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
      const cat = btn.dataset.cat;
      container.querySelectorAll("#presc-grid > a").forEach((card) => {
        card.style.display = cat === "todas" || card.dataset.categoria === cat ? "" : "none";
      });
    });
  });
}

export async function renderDetalhe(container, { id }) {
  const itens = await fetchJsonCached("data/prescricoes.json");
  const item = itens.find((i) => i.id === id);

  if (!item) {
    container.innerHTML = `<div class="empty-state"><h2>Modelo não encontrado</h2><a class="btn btn--secondary" href="#/bolso/prescricoes">Voltar</a></div>`;
    return;
  }

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <a class="btn btn--ghost" href="#/bolso/prescricoes" style="padding-left:0;margin-bottom:8px;">← Condutas rápidas</a>
        <div class="page-header__eyebrow">${escapeHtml(item.categoria)}</div>
        <h1>${escapeHtml(item.titulo)}</h1>
      </div>
      ${renderClinicalWarning(item)}
      <div class="prescription">
        <div class="prescription__header">
          <strong>${escapeHtml(item.titulo)}</strong>
          <button class="btn btn--primary" id="btn-copiar">Copiar prescrição</button>
        </div>
        <div class="prescription__body">
          <div>
            <div class="prescription__field-label">Posologia</div>
            <div class="prescription__text">${escapeHtml(item.posologia)}</div>
          </div>
          <div>
            <div class="prescription__field-label">Orientação ao paciente</div>
            <div class="prescription__text">${escapeHtml(item.orientacao_paciente)}</div>
          </div>
          <div>
            <div class="prescription__field-label">Contraindicações</div>
            <ul class="prescription__contra">${item.contraindicacoes.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelector("#btn-copiar").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(textoCopiavel(item));
      showCopyToast("Prescrição copiada.");
    } catch {
      showCopyToast("Não foi possível copiar automaticamente.");
    }
  });
}
