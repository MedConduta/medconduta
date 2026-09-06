import { fetchJsonCached, escapeHtml, renderMarkdown } from "../utils.js";
import { getItem, setItem, getAll } from "../db.js";
import { navigate } from "../router.js";
import { AREA_POR_CATEGORIA, ORDEM_AREAS, CATEGORIAS_VALIDAS } from "../areas.js";
import { gerarTemaComIA, gerarFlashcardsComIA, gerarQuestaoComIA, avaliarTemaComIA } from "../iaConteudo.js";
import { askAI } from "../ai.js";
import { formatarTemaComoContexto } from "../rag.js";

async function marcarConcluido(temaId, concluido) {
  await setItem("progresso", { id: temaId, concluido, atualizadoEm: new Date().toISOString() });
}

async function todosOsTemas() {
  const [curados, gerados] = await Promise.all([fetchJsonCached("data/temas.json"), getAll("ia_temas")]);
  return [...curados, ...gerados];
}

async function encontrarTema(id) {
  const temas = await todosOsTemas();
  return temas.find((t) => t.id === id) || null;
}

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
  const temas = await todosOsTemas();
  const grupos = agruparPorAreaECategoria(temas);

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Conteúdo</div>
        <h1>Resumos por tema</h1>
        <p class="page-header__desc">Conteúdo estruturado para prática clínica e provas de residência R1, com mnemônicos destacados.</p>
      </div>

      <details class="card" id="criar-tema-box" style="margin-bottom:20px;">
        <summary style="cursor:pointer;font-weight:600;">+ Criar tema novo com IA</summary>
        <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
          <div class="field" style="flex:2;min-width:220px;margin-bottom:0;">
            <label for="ia-topico">Tópico</label>
            <input type="text" id="ia-topico" placeholder="Ex.: Doença de Kawasaki" />
          </div>
          <div class="field" style="flex:1;min-width:180px;margin-bottom:0;">
            <label for="ia-categoria">Categoria</label>
            <select id="ia-categoria">
              ${CATEGORIAS_VALIDAS.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("")}
            </select>
          </div>
          <button class="btn btn--primary" id="btn-criar-tema" style="height:44px;">Gerar tema</button>
        </div>
        <div id="criar-tema-status" style="margin-top:12px;"></div>
      </details>

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

  const btnCriarTema = container.querySelector("#btn-criar-tema");
  const statusCriarTema = container.querySelector("#criar-tema-status");

  btnCriarTema.addEventListener("click", async () => {
    const topico = container.querySelector("#ia-topico").value.trim();
    const categoria = container.querySelector("#ia-categoria").value;
    if (!topico) {
      statusCriarTema.innerHTML = `<div class="explanation-box">Digite um tópico primeiro.</div>`;
      return;
    }
    btnCriarTema.disabled = true;
    statusCriarTema.innerHTML = `<div class="explanation-box">Gerando tema com IA (rascunho + autocrítica)...</div>`;
    try {
      const tema = await gerarTemaComIA({ topico, categoria });
      navigate(`/residencia/conteudo/${tema.id}`);
    } catch (err) {
      statusCriarTema.innerHTML = `<div class="explanation-box">⚠ ${escapeHtml(err.message)}</div>`;
    } finally {
      btnCriarTema.disabled = false;
    }
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
  const badgeIA = tema.origem === "ia" ? '<span class="badge badge--ia">✨ IA</span>' : "";
  return `
    <li>
      <a class="content-list__item" href="#/residencia/conteudo/${tema.id}" data-busca="${escapeHtml(busca)}">
        <span class="content-list__title">${escapeHtml(tema.titulo)}</span>
        ${badgeIA}
      </a>
    </li>
  `;
}

export async function renderDetalhe(container, { id }) {
  const tema = await encontrarTema(id);

  if (!tema) {
    container.innerHTML = `<div class="empty-state"><h2>Tema não encontrado</h2><a class="btn btn--secondary" href="#/residencia/conteudo">Voltar</a></div>`;
    return;
  }

  const progresso = await getItem("progresso", tema.id);
  const concluido = !!progresso?.concluido;
  const geradoPorIA = tema.origem === "ia";

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <a class="btn btn--ghost" href="#/residencia/conteudo" style="padding-left:0;margin-bottom:8px;">← Conteúdo</a>
        <div class="page-header__eyebrow">${escapeHtml(tema.categoria)}</div>
        <h1>${escapeHtml(tema.titulo)} ${geradoPorIA ? '<span class="badge badge--ia">✨ IA</span>' : ""}</h1>
        ${geradoPorIA && tema.notaRevisaoIA ? `<p class="page-header__desc"><em>Nota da autocrítica da IA: ${escapeHtml(tema.notaRevisaoIA)}</em></p>` : ""}
      </div>

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

      <div class="card ia-card" style="margin-top:24px;">
        <h3 style="margin-top:0;">Assistente de IA</h3>
        <div class="btn-row">
          <button class="btn btn--secondary" id="btn-ia-explicar">Explicar mais / dar exemplo clínico</button>
          <button class="btn btn--secondary" id="btn-ia-avaliar">Avaliar tema com IA</button>
          <button class="btn btn--secondary" id="btn-ia-flashcards">Gerar flashcards com IA</button>
          <button class="btn btn--secondary" id="btn-ia-questao">Gerar questão de treino</button>
        </div>
        <div id="ia-resultado"></div>
      </div>
    </div>
  `;

  container.querySelector("#btn-concluir").addEventListener("click", async () => {
    await marcarConcluido(tema.id, !concluido);
    renderDetalhe(container, { id });
  });

  const iaResultado = container.querySelector("#ia-resultado");
  const botoesIA = [
    container.querySelector("#btn-ia-explicar"),
    container.querySelector("#btn-ia-avaliar"),
    container.querySelector("#btn-ia-flashcards"),
    container.querySelector("#btn-ia-questao"),
  ];

  container.querySelector("#btn-ia-explicar").addEventListener("click", () =>
    executarChamadaLivre(iaResultado, botoesIA, () =>
      askAI({
        pergunta: `Explique o tema "${tema.titulo}" com mais profundidade e traga um breve exemplo de caso clínico ilustrativo.`,
        tarefa: "explicar o tema em mais profundidade, com um exemplo de caso clínico curto ao final",
        contexto: formatarTemaComoContexto(tema),
      })
    )
  );

  container.querySelector("#btn-ia-avaliar").addEventListener("click", () =>
    executarChamadaLivre(iaResultado, botoesIA, () => avaliarTemaComIA(tema))
  );

  container.querySelector("#btn-ia-flashcards").addEventListener("click", async () => {
    botoesIA.forEach((b) => (b.disabled = true));
    iaResultado.innerHTML = `<div class="explanation-box">Gerando flashcards com IA (rascunho + autocrítica)...</div>`;
    try {
      const deck = await gerarFlashcardsComIA(tema);
      iaResultado.innerHTML = `
        <div class="explanation-box">
          <strong>${deck.cards.length} flashcards criados:</strong> "${escapeHtml(deck.titulo)}"
          <br><a href="#/residencia/flashcards/${deck.id}">Estudar esse baralho agora</a>
        </div>
      `;
    } catch (err) {
      iaResultado.innerHTML = `<div class="explanation-box">⚠ ${escapeHtml(err.message)}</div>`;
    } finally {
      botoesIA.forEach((b) => (b.disabled = false));
    }
  });

  container.querySelector("#btn-ia-questao").addEventListener("click", async () => {
    botoesIA.forEach((b) => (b.disabled = true));
    iaResultado.innerHTML = `<div class="explanation-box">Gerando questão com IA (rascunho + autocrítica)...</div>`;
    try {
      await gerarQuestaoComIA(tema);
      iaResultado.innerHTML = `
        <div class="explanation-box">
          Questão criada e adicionada ao banco. <a href="#/residencia/questoes">Ver em Questões</a>
        </div>
      `;
    } catch (err) {
      iaResultado.innerHTML = `<div class="explanation-box">⚠ ${escapeHtml(err.message)}</div>`;
    } finally {
      botoesIA.forEach((b) => (b.disabled = false));
    }
  });
}

async function executarChamadaLivre(resultadoEl, botoes, chamada) {
  botoes.forEach((b) => (b.disabled = true));
  resultadoEl.innerHTML = `<div class="explanation-box">Gerando resposta...</div>`;
  try {
    const resposta = await chamada();
    resultadoEl.innerHTML = `
      <div class="explanation-box">
        <div class="ia-resposta">${renderMarkdown(resposta)}</div>
        <div class="chat-msg__aviso">Gerado por IA — confira em fonte oficial antes de usar.</div>
      </div>
    `;
  } catch (err) {
    resultadoEl.innerHTML = `<div class="explanation-box">⚠ ${escapeHtml(err.message)}</div>`;
  } finally {
    botoes.forEach((b) => (b.disabled = false));
  }
}
