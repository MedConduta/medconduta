import { fetchJsonCached, escapeHtml } from "../utils.js";
import { renderClinicalWarning } from "../components/clinicalWarning.js";
import { getItem, setItem } from "../db.js";

async function marcarConcluido(temaId, concluido) {
  await setItem("progresso", { id: temaId, concluido, atualizadoEm: new Date().toISOString() });
}

/**
 * Mapa subespecialidade (campo `categoria` em temas.json) → grande área.
 * Novas categorias não listadas aqui caem em "Outros", visível assim que
 * o primeiro tema daquela categoria for adicionado.
 */
const AREA_POR_CATEGORIA = {
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
  "Cirurgia Geral": "Cirurgia Geral",
  Ginecologia: "Ginecologia e Obstetrícia",
  Obstetrícia: "Ginecologia e Obstetrícia",
  Pediatria: "Pediatria",
  "Medicina Preventiva": "Medicina Preventiva",
};

const ORDEM_AREAS = [
  "Clínica Médica",
  "Cirurgia Geral",
  "Ginecologia e Obstetrícia",
  "Pediatria",
  "Medicina Preventiva",
  "Outros",
];

function agruparPorAreaECategoria(temas) {
  const areas = new Map();
  for (const tema of temas) {
    const area = AREA_POR_CATEGORIA[tema.categoria] || "Outros";
    if (!areas.has(area)) areas.set(area, new Map());
    const categorias = areas.get(area);
    if (!categorias.has(tema.categoria)) categorias.set(tema.categoria, []);
    categorias.get(tema.categoria).push(tema);
  }
  return [...areas.entries()]
    .sort((a, b) => ORDEM_AREAS.indexOf(a[0]) - ORDEM_AREAS.indexOf(b[0]))
    .map(([area, categorias]) => ({
      area,
      categorias: [...categorias.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
        .map(([categoria, itens]) => ({
          categoria,
          temas: itens.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR")),
        })),
    }));
}

export async function renderLista(container) {
  const temas = await fetchJsonCached("data/temas.json");
  const grupos = agruparPorAreaECategoria(temas);

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Conteúdo</div>
        <h1>Resumos por tema</h1>
        <p class="page-header__desc">Conteúdo estruturado para prática clínica e provas de residência R1, com mnemônicos destacados. Todo o conteúdo clínico é rascunho a validar — veja o aviso em cada tema.</p>
      </div>
      <div class="field" style="max-width:360px;">
        <label for="busca-temas" class="visually-hidden">Buscar tema</label>
        <input type="text" id="busca-temas" placeholder="Buscar tema (ex.: anemia, HAS, sepse...)" autocomplete="off" />
      </div>
      <div class="content-tree" id="content-tree">
        ${grupos.map(renderAreaBox).join("")}
      </div>
      <p class="empty-state" id="busca-vazio" hidden>Nenhum tema encontrado para essa busca.</p>
    </div>
  `;

  const input = container.querySelector("#busca-temas");
  const tree = container.querySelector("#content-tree");
  const vazio = container.querySelector("#busca-vazio");

  input.addEventListener("input", () => {
    const termo = input.value.trim().toLowerCase();
    let algumVisivel = false;

    tree.querySelectorAll(".content-area").forEach((areaEl) => {
      let areaTemAlgo = false;
      areaEl.querySelectorAll(".content-group").forEach((groupEl) => {
        let grupoTemAlgo = false;
        groupEl.querySelectorAll(".content-list__item").forEach((itemEl) => {
          const bate = !termo || itemEl.dataset.busca.includes(termo);
          itemEl.hidden = !bate;
          if (bate) grupoTemAlgo = true;
        });
        groupEl.hidden = !grupoTemAlgo;
        if (grupoTemAlgo) areaTemAlgo = true;
      });
      areaEl.hidden = !areaTemAlgo;
      if (areaTemAlgo) {
        algumVisivel = true;
        if (termo) areaEl.open = true;
      }
    });

    vazio.hidden = algumVisivel;
  });
}

function renderAreaBox({ area, categorias }) {
  const total = categorias.reduce((acc, c) => acc + c.temas.length, 0);
  return `
    <details class="card content-area" open>
      <summary class="content-area__title">${escapeHtml(area)} <span class="content-area__count">${total}</span></summary>
      ${categorias.map(renderCategoriaGroup).join("")}
    </details>
  `;
}

function renderCategoriaGroup({ categoria, temas }) {
  return `
    <div class="content-group">
      <h3 class="content-group__title">${escapeHtml(categoria)}</h3>
      <ul class="content-list">
        ${temas.map(renderTemaListItem).join("")}
      </ul>
    </div>
  `;
}

function renderTemaListItem(tema) {
  const busca = `${tema.titulo} ${tema.categoria} ${tema.resumo}`.toLowerCase();
  return `
    <li>
      <a class="content-list__item" href="#/residencia/conteudo/${tema.id}" data-busca="${escapeHtml(busca)}">
        <span class="content-list__title">${escapeHtml(tema.titulo)}</span>
        ${tema.revisado ? '<span class="validation-flag validation-flag--ok">✓</span>' : '<span class="validation-flag validation-flag--pending">⚠</span>'}
      </a>
    </li>
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
