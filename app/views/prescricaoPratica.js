import { fetchJsonCached, escapeHtml, slugify } from "../utils.js";
import { icon } from "../components/icons.js";

const CONTEXTOS_ORDEM = ["Ambulatorial", "Emergência/UTI", "Pediatria", "Ginecologia", "Obstetrícia"];

function badgeContexto(contexto) {
  const cls =
    contexto === "Emergência/UTI"
      ? "badge--danger"
      : contexto === "Pediatria"
      ? "badge--warning"
      : "badge--accent";
  return `<span class="badge ${cls}">${escapeHtml(contexto)}</span>`;
}

function cardHtml(item) {
  return `
    <a class="card card--interactive list-card" href="#/pratica/prescricao/${item.id}" data-categoria="${escapeHtml(
    item.categoria
  )}" data-contexto="${escapeHtml(item.contexto)}" data-titulo="${escapeHtml(item.categoria)} ${escapeHtml(item.titulo)}">
      <div class="list-card__top">
        <span class="badge badge--accent">${escapeHtml(item.categoria)}</span>
        ${badgeContexto(item.contexto)}
      </div>
      <div class="list-card__title">${escapeHtml(item.titulo)}</div>
      <p class="list-card__meta">${item.itens.length} medicamento${item.itens.length === 1 ? "" : "s"}</p>
    </a>`;
}

export async function renderLista(container) {
  const itens = await fetchJsonCached("data/prescricao_pratica.json");
  const contextos = CONTEXTOS_ORDEM.filter((c) => itens.some((i) => i.contexto === c));

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Guia de Prescrição (prática)</div>
        <h1>Modelos por doença</h1>
        <p class="page-header__desc">Consulta rápida à beira do leito, organizada exatamente como no documento de referência — ambulatorial, emergência/UTI, pediatria e gineco-obstetrícia. Não é material de estudo: revise sempre antes de aplicar.</p>
      </div>
      <div class="gp-toolbar">
        <div class="gp-search-bar">
          ${icon("search", { size: 18 })}
          <input type="search" id="gp-busca" placeholder="Buscar por doença/condição..." aria-label="Buscar por doença" />
        </div>
        <a class="btn btn--secondary btn--sm" href="#/pratica/prescricao/az">Medicamentos A-Z</a>
      </div>
      <div class="tag-filter-bar" role="group" aria-label="Filtrar por contexto">
        <button class="tag-filter is-active" data-ctx="todas">Todas</button>
        ${contextos.map((c) => `<button class="tag-filter" data-ctx="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("")}
      </div>
      <div class="list-toolbar">
        <button class="btn btn--secondary btn--sm" id="btn-ordenar-az" aria-pressed="false">Ordenar A-Z</button>
      </div>
      <div class="card-grid" id="gp-grid">
        ${itens.map(cardHtml).join("")}
      </div>
      <p class="empty-state__inline" id="gp-vazio" hidden>Nenhum resultado para essa busca.</p>
    </div>
  `;

  const grid = container.querySelector("#gp-grid");
  const busca = container.querySelector("#gp-busca");
  const vazio = container.querySelector("#gp-vazio");
  let ctxAtivo = "todas";

  function aplicarFiltros() {
    const termo = busca.value.trim().toLowerCase();
    let visiveis = 0;
    grid.querySelectorAll(":scope > a").forEach((card) => {
      const combinaCtx = ctxAtivo === "todas" || card.dataset.contexto === ctxAtivo;
      const combinaBusca = !termo || card.dataset.titulo.toLowerCase().includes(termo);
      const visivel = combinaCtx && combinaBusca;
      card.style.display = visivel ? "" : "none";
      if (visivel) visiveis++;
    });
    vazio.hidden = visiveis > 0;
  }

  container.querySelectorAll(".tag-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".tag-filter").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      ctxAtivo = btn.dataset.ctx;
      aplicarFiltros();
    });
  });
  busca.addEventListener("input", aplicarFiltros);

  const btnOrdenar = container.querySelector("#btn-ordenar-az");
  btnOrdenar.addEventListener("click", () => {
    const ativo = btnOrdenar.getAttribute("aria-pressed") !== "true";
    btnOrdenar.setAttribute("aria-pressed", String(ativo));
    btnOrdenar.classList.toggle("is-active", ativo);
    const cards = Array.from(grid.children);
    if (ativo) {
      cards.sort((a, b) => a.dataset.titulo.localeCompare(b.dataset.titulo, "pt-BR"));
    } else {
      cards.sort(
        (a, b) =>
          itens.findIndex((i) => i.id === a.getAttribute("href").split("/").pop()) -
          itens.findIndex((i) => i.id === b.getAttribute("href").split("/").pop())
      );
    }
    cards.forEach((card) => grid.appendChild(card));
  });
}

export async function renderIndiceMedicamentos(container) {
  const itens = await fetchJsonCached("data/prescricao_pratica.json");

  const porMedicamento = new Map();
  for (const item of itens) {
    for (const med of item.itens) {
      const chave = med.medicamento.trim();
      const chaveNormalizada = chave.toLowerCase();
      if (!porMedicamento.has(chaveNormalizada)) {
        porMedicamento.set(chaveNormalizada, { nome: chave, refs: [] });
      }
      porMedicamento.get(chaveNormalizada).refs.push(item);
    }
  }

  const medicamentos = Array.from(porMedicamento.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const grupos = new Map();
  for (const med of medicamentos) {
    const letra = med.nome[0].toUpperCase();
    if (!grupos.has(letra)) grupos.set(letra, []);
    grupos.get(letra).push(med);
  }

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <a class="btn btn--ghost" href="#/pratica/prescricao" style="padding-left:0;margin-bottom:8px;">← Guia de Prescrição</a>
        <div class="page-header__eyebrow">Guia de Prescrição (prática)</div>
        <h1>Medicamentos A-Z</h1>
        <p class="page-header__desc">Índice de todos os medicamentos citados no guia — toque em um nome para ver em quais quadros/doenças ele aparece.</p>
      </div>
      <div class="gp-search-bar">
        ${icon("search", { size: 18 })}
        <input type="search" id="gp-busca-med" placeholder="Buscar medicamento..." aria-label="Buscar medicamento" />
      </div>
      <div class="gp-az-index">
        ${Array.from(grupos.keys())
          .sort((a, b) => a.localeCompare(b, "pt-BR"))
          .map(
            (letra) => `
          <div class="gp-az-group" data-letra="${escapeHtml(letra)}">
            <div class="gp-az-group__letra">${escapeHtml(letra)}</div>
            <div class="gp-az-group__itens">
              ${grupos
                .get(letra)
                .map((med) => {
                  const slug = slugify(med.nome);
                  return `
                <div class="gp-az-med" data-nome="${escapeHtml(med.nome.toLowerCase())}">
                  <button class="gp-az-med__toggle" aria-expanded="false" data-target="gp-refs-${slug}">
                    <strong>${escapeHtml(med.nome)}</strong>
                    <span class="gp-az-med__count">${med.refs.length}</span>
                  </button>
                  <ul class="gp-az-refs" id="gp-refs-${slug}" hidden>
                    ${med.refs
                      .map((r) => `<li><a href="#/pratica/prescricao/${r.id}">${escapeHtml(r.categoria)} — ${escapeHtml(r.titulo)}</a></li>`)
                      .join("")}
                  </ul>
                </div>`;
                })
                .join("")}
            </div>
          </div>`
          )
          .join("")}
      </div>
      <p class="empty-state__inline" id="gp-med-vazio" hidden>Nenhum medicamento encontrado.</p>
    </div>
  `;

  container.querySelectorAll(".gp-az-med__toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const alvo = container.querySelector(`#${btn.dataset.target}`);
      const aberto = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!aberto));
      alvo.hidden = aberto;
    });
  });

  const buscaMed = container.querySelector("#gp-busca-med");
  const vazio = container.querySelector("#gp-med-vazio");
  buscaMed.addEventListener("input", () => {
    const termo = buscaMed.value.trim().toLowerCase();
    let visiveis = 0;
    container.querySelectorAll(".gp-az-med").forEach((el) => {
      const visivel = !termo || el.dataset.nome.includes(termo);
      el.style.display = visivel ? "" : "none";
      if (visivel) visiveis++;
    });
    container.querySelectorAll(".gp-az-group").forEach((grupo) => {
      const algumVisivel = Array.from(grupo.querySelectorAll(".gp-az-med")).some((el) => el.style.display !== "none");
      grupo.style.display = algumVisivel ? "" : "none";
    });
    vazio.hidden = visiveis > 0;
  });
}

export async function renderDetalhe(container, { id }) {
  const itens = await fetchJsonCached("data/prescricao_pratica.json");
  const item = itens.find((i) => i.id === id);

  if (!item) {
    container.innerHTML = `<div class="empty-state"><h2>Quadro não encontrado</h2><a class="btn btn--secondary" href="#/pratica/prescricao">Voltar</a></div>`;
    return;
  }

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <a class="btn btn--ghost" href="#/pratica/prescricao" style="padding-left:0;margin-bottom:8px;">← Guia de Prescrição</a>
        <div class="page-header__eyebrow">${escapeHtml(item.categoria)} · ${badgeContexto(item.contexto)}</div>
        <h1>${escapeHtml(item.titulo)}</h1>
      </div>
      <div class="prescription">
        <div class="prescription__header">
          <strong><span class="prescription__rx">℞</span>${escapeHtml(item.categoria)}</strong>
        </div>
        <div class="prescription__body">
          <ul class="gp-itens">
            ${item.itens
              .map(
                (med) => `
              <li class="gp-item">
                <span class="gp-item__med">${escapeHtml(med.medicamento)}</span>
                <span class="gp-item__modo">${escapeHtml(med.modo_uso)}</span>
              </li>`
              )
              .join("")}
          </ul>
          ${
            item.observacoes
              ? `<div class="gp-observacoes">
            <div class="prescription__field-label">Observações</div>
            <p class="gp-item__modo">${escapeHtml(item.observacoes)}</p>
          </div>`
              : ""
          }
        </div>
      </div>
    </div>
  `;
}
