import { fetchJsonCached, escapeHtml, renderMarkdown } from "../utils.js";
import { getItem, setItem, getAll } from "../db.js";
import { navigate } from "../router.js";
import { AREA_POR_CATEGORIA, ORDEM_AREAS, CATEGORIAS_VALIDAS } from "../areas.js";
import { gerarTemaComIA, gerarFlashcardsComIA, gerarFluxogramaComIA, gerarQuestaoComIA, avaliarTemaComIA } from "../iaConteudo.js";
import { askAI } from "../ai.js";
import { formatarTemaComoContexto } from "../rag.js";
import { renderFlowchart } from "../components/flowchart.js";
import { icon } from "../components/icons.js";
import { gerarDiagnostico } from "../prontidao.js";
import { gerarRevisoesParaTema, hojeIso } from "../revisaoCurso.js";

// Fase 12 — ordem de prioridade dos quadrantes (ver prontidao.js): categorias
// críticas primeiro, tranquilas por último. Curso reordenado pelo mesmo
// critério que já orienta "O que fazer agora" e o Heatmap de Fraquezas —
// evita que uma categoria de alta incidência fique perdida no meio de uma
// lista alfabética.
const ORDEM_QUADRANTE = ["Crítico", "Atenção", "Secundário fraco", "Dominado", "Tranquilo"];

// Ferramentas de IA da página de um tema, como abas — cada uma gera seu
// conteúdo sob demanda (1º clique) e depois só reabre o que já foi gerado
// (ver carregarAbasSalvas/salvarAbaIA), em vez de recalcular toda vez.
const IA_TABS = [
  { tipo: "explicar", titulo: "Explicar", icone: "sparkles" },
  { tipo: "avaliar", titulo: "Avaliar", icone: "checklist" },
  { tipo: "flashcards", titulo: "Flashcards", icone: "layers" },
  { tipo: "questao", titulo: "Questão", icone: "clipboard" },
  { tipo: "fluxograma", titulo: "Fluxograma", icone: "flowchart" },
  { tipo: "pegadinhas", titulo: "Pegadinhas", icone: "alert-circle" },
  { tipo: "memorizar", titulo: "Memorizar", icone: "brain" },
  { tipo: "testar", titulo: "Me testar", icone: "target" },
];

function chaveAbaIA(temaId, tipo) {
  return `${temaId}__${tipo}`;
}

/** Carrega os resultados de IA já gerados (e salvos) para este tema, por aba — reabrir a página não perde o que já foi gerado antes. */
async function carregarAbasSalvas(temaId) {
  const registros = await Promise.all(IA_TABS.map((t) => getItem("ia_abas", chaveAbaIA(temaId, t.tipo))));
  const mapa = new Map();
  IA_TABS.forEach((t, i) => {
    if (registros[i]) mapa.set(t.tipo, registros[i].dados);
  });
  return mapa;
}

async function salvarAbaIA(temaId, tipo, dados) {
  await setItem("ia_abas", { id: chaveAbaIA(temaId, tipo), temaId, tipo, dados, atualizadoEm: new Date().toISOString() });
}

async function marcarConcluido(temaId, concluido, categoria) {
  const atualizadoEm = new Date().toISOString();
  await setItem("progresso", { id: temaId, concluido, categoria, atualizadoEm });
  // Curso (Fase A): estudo concluído abre o ciclo de revisão espaçada do tema
  // (3/5/7/15/30 dias), ancorado nesta data real — nunca na data programada
  // do cronograma (ver app/revisaoCurso.js). Idempotente: marcar de novo no
  // mesmo dia só sobrescreve as mesmas 5 revisões, não duplica.
  if (concluido) await gerarRevisoesParaTema(temaId, hojeIso(new Date(atualizadoEm)));
}

async function todosOsTemas() {
  const [curados, gerados] = await Promise.all([fetchJsonCached("data/temas.json"), getAll("ia_temas")]);
  return [...curados, ...gerados];
}

async function encontrarTema(id) {
  const temas = await todosOsTemas();
  return temas.find((t) => t.id === id) || null;
}

async function decksDoTema(temaId) {
  const [curados, gerados] = await Promise.all([fetchJsonCached("data/flashcards.json"), getAll("ia_flashcards")]);
  return [...curados, ...gerados].filter((d) => d.temaId === temaId);
}

async function fluxogramasDoTema(temaId) {
  const [curados, gerados] = await Promise.all([fetchJsonCached("data/fluxogramas.json"), getAll("ia_fluxogramas")]);
  return [...curados, ...gerados].filter((f) => f.temaId === temaId);
}

/**
 * Agrupa temas por área → categoria e ordena por prioridade: dentro de cada
 * área, categorias na ordem crítico → tranquilo (ver prontidao.js); dentro
 * de cada categoria, temas ainda não estudados primeiro. A ordem das ÁREAS
 * em si (ORDEM_AREAS) não muda — é uma estrutura pedagógica fixa, só o que
 * está DENTRO de cada área é reordenado por prioridade real.
 */
function agruparPorAreaECategoria(temas, infoPorCategoria, concluidosSet) {
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
        .map(([categoria, itens]) => ({
          categoria,
          info: infoPorCategoria.get(categoria) || null,
          temas: itens.sort((a, b) => {
            const aPendente = concluidosSet.has(a.id) ? 1 : 0;
            const bPendente = concluidosSet.has(b.id) ? 1 : 0;
            if (aPendente !== bPendente) return aPendente - bPendente;
            return a.titulo.localeCompare(b.titulo, "pt-BR");
          }),
        }))
        .sort((a, b) => {
          const oa = ORDEM_QUADRANTE.indexOf(a.info?.quadrante?.label);
          const ob = ORDEM_QUADRANTE.indexOf(b.info?.quadrante?.label);
          if (oa !== ob) return (oa === -1 ? 99 : oa) - (ob === -1 ? 99 : ob);
          return a.categoria.localeCompare(b.categoria, "pt-BR");
        }),
    }));
}

export async function renderLista(container) {
  const [temas, progresso, diagnostico] = await Promise.all([todosOsTemas(), getAll("progresso"), gerarDiagnostico()]);
  const concluidosSet = new Set(progresso.filter((p) => p.concluido).map((p) => p.id));
  const infoPorCategoria = new Map(diagnostico.porCategoria.map((c) => [c.categoria, c]));
  const grupos = agruparPorAreaECategoria(temas, infoPorCategoria, concluidosSet);

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Conteúdo</div>
        <h1>Resumos por tema</h1>
        <p class="page-header__desc">Conteúdo estruturado para prática clínica e provas de residência R1, com mnemônicos destacados. Categorias ordenadas por prioridade (🔴 crítico → ⚪ tranquilo, igual ao Heatmap de <a href="#/residencia/prontidao">Prontidão</a>) — dentro de cada uma, temas ainda não estudados aparecem primeiro.</p>
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
    <details class="card content-area">
      <summary class="content-area__title">${escapeHtml(area)} <span class="content-area__count">${total}</span></summary>
      ${categorias.map(renderCategoriaGroup).join("")}
    </details>
  `;
}

function renderCategoriaGroup({ categoria, temas, info }) {
  const selo = info?.quadrante
    ? `<span title="${escapeHtml(info.quadrante.label)} — ${escapeHtml(info.quadrante.descricao)}">${info.quadrante.emoji}</span>`
    : "";
  return `
    <div class="content-group">
      <h3 class="content-group__title">${selo} ${escapeHtml(categoria)}</h3>
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

function renderRelacionados({ decks, fluxos }) {
  return `
    <div class="section-block" style="margin-top:24px;">
      <h3>Flashcards e fluxogramas relacionados</h3>
      ${decks
        .map(
          (deck) => `
        <a class="card card--interactive list-card" href="#/residencia/flashcards/${deck.id}" style="margin-bottom:12px;">
          <div class="list-card__top">
            <span class="badge badge--accent">${deck.cards.length} cards</span>
            ${deck.origem === "ia" ? '<span class="badge badge--ia">✨ IA</span>' : ""}
          </div>
          <div class="list-card__title">${escapeHtml(deck.titulo)}</div>
        </a>`
        )
        .join("")}
      ${fluxos
        .map(
          (fluxo) => `
        <details class="card" style="margin-bottom:12px;">
          <summary style="cursor:pointer;font-weight:600;">
            <span class="badge badge--${fluxo.tipo}">${fluxo.tipo === "diagnostico" ? "Diagnóstico" : "Tratamento"}</span>
            ${fluxo.origem === "ia" ? '<span class="badge badge--ia">✨ IA</span>' : ""}
            ${escapeHtml(fluxo.titulo)}
          </summary>
          <div style="margin-top:16px;">
            ${renderFlowchart(fluxo.fluxo)}
          </div>
        </details>`
        )
        .join("")}
    </div>
  `;
}

function renderNavegacaoAdjacente({ anterior, proximo }) {
  if (!anterior && !proximo) return "";
  return `
    <div class="btn-row" style="margin-top:24px;justify-content:space-between;">
      ${
        anterior
          ? `<a class="btn btn--secondary" href="#/residencia/conteudo/${anterior.id}">← ${escapeHtml(anterior.titulo)}</a>`
          : "<span></span>"
      }
      ${proximo ? `<a class="btn btn--secondary" href="#/residencia/conteudo/${proximo.id}">${escapeHtml(proximo.titulo)} →</a>` : ""}
    </div>
  `;
}

/** Temas da mesma categoria, em ordem alfabética estável — usado pra navegação anterior/próximo. */
async function temaAdjacentes(tema) {
  const temas = await todosOsTemas();
  const daCategoria = temas.filter((t) => t.categoria === tema.categoria).sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
  const indice = daCategoria.findIndex((t) => t.id === tema.id);
  return { anterior: indice > 0 ? daCategoria[indice - 1] : null, proximo: indice >= 0 && indice < daCategoria.length - 1 ? daCategoria[indice + 1] : null };
}

function renderPainelTexto(dados) {
  return `
    <div class="ia-resposta">${renderMarkdown(dados.texto)}</div>
    <div class="chat-msg__aviso">Gerado por IA — confira em fonte oficial antes de usar.</div>
  `;
}

function renderPainelFlashcards(dados) {
  return `
    <p>${dados.totalCards} flashcards criados: <strong>${escapeHtml(dados.deckTitulo)}</strong></p>
    <a class="btn btn--secondary" href="#/residencia/flashcards/${dados.deckId}">Estudar esse baralho agora</a>
  `;
}

function renderPainelQuestao() {
  return `
    <p>Questão criada e adicionada ao banco.</p>
    <a class="btn btn--secondary" href="#/residencia/questoes">Ver em Questões</a>
  `;
}

function renderPainelFluxograma(dados) {
  return `
    <p><strong>${escapeHtml(dados.titulo)}</strong></p>
    <div style="margin-top:12px;">${renderFlowchart(dados.fluxo)}</div>
  `;
}

const RENDER_PAINEL_IA = {
  explicar: renderPainelTexto,
  avaliar: renderPainelTexto,
  pegadinhas: renderPainelTexto,
  memorizar: renderPainelTexto,
  flashcards: renderPainelFlashcards,
  questao: renderPainelQuestao,
  fluxograma: renderPainelFluxograma,
};

export async function renderDetalhe(container, { id }) {
  const tema = await encontrarTema(id);

  if (!tema) {
    container.innerHTML = `<div class="empty-state"><h2>Tema não encontrado</h2><a class="btn btn--secondary" href="#/residencia/conteudo">Voltar</a></div>`;
    return;
  }

  const progresso = await getItem("progresso", tema.id);
  const concluido = !!progresso?.concluido;
  const geradoPorIA = tema.origem === "ia";
  const [decks, fluxos, respostas, questoesCuradas, questoesGeradas, diagnostico, adjacentes, abasSalvas] = await Promise.all([
    decksDoTema(tema.id),
    fluxogramasDoTema(tema.id),
    getAll("respostas"),
    fetchJsonCached("data/questoes.json"),
    getAll("ia_questoes"),
    gerarDiagnostico(),
    temaAdjacentes(tema),
    carregarAbasSalvas(tema.id),
  ]);

  const infoCategoria = diagnostico.porCategoria.find((c) => c.categoria === tema.categoria) || null;
  const respostasDoTema = respostas.filter((r) => r.temaId === tema.id);
  const temQuestoes = [...questoesCuradas, ...questoesGeradas].some((q) => q.temaId === tema.id);

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <a class="btn btn--ghost" href="#/residencia/conteudo" style="padding-left:0;margin-bottom:8px;">← Conteúdo</a>
        <div class="page-header__eyebrow">
          ${escapeHtml(tema.categoria)}
          ${infoCategoria?.quadrante ? `<span title="${escapeHtml(infoCategoria.quadrante.label)}">${infoCategoria.quadrante.emoji} ${escapeHtml(infoCategoria.quadrante.label)}</span>` : ""}
        </div>
        <h1>${escapeHtml(tema.titulo)} ${geradoPorIA ? '<span class="badge badge--ia">✨ IA</span>' : ""}</h1>
        ${geradoPorIA && tema.notaRevisaoIA ? `<p class="page-header__desc"><em>Nota da autocrítica da IA: ${escapeHtml(tema.notaRevisaoIA)}</em></p>` : ""}
        ${
          tema.comoCai
            ? `<div class="exam-focus"><div class="exam-focus__label">Como cai no SES-PE e no ENAMED</div><p>${tema.comoCai}</p></div>`
            : ""
        }
      </div>

      ${
        respostasDoTema.length
          ? `<p class="page-header__desc">Seu desempenho neste tema: <strong>${Math.round((respostasDoTema.filter((r) => r.acertou).length / respostasDoTema.length) * 100)}% de acerto</strong> (${respostasDoTema.length} questão${respostasDoTema.length > 1 ? "ões" : ""}).</p>`
          : ""
      }

      <div class="tema-toolbar">
        <div class="tema-toolbar__acoes">
          <button class="btn ${concluido ? "btn--secondary" : "btn--primary"} tema-toolbar__btn" id="btn-concluir">
            ${concluido ? "✓ Marcado como estudado" : "Marcar como estudado"}
          </button>
          ${temQuestoes ? `<a class="btn btn--secondary tema-toolbar__btn" href="#/residencia/questoes?tema=${encodeURIComponent(tema.titulo)}">Praticar questões deste tema</a>` : ""}
        </div>

        <div class="ia-tabbar" id="ia-tabbar" role="tablist" aria-label="Ferramentas de IA para este tema">
          ${IA_TABS.map(
            (t) => `
            <button type="button" class="ia-tab${abasSalvas.has(t.tipo) ? " has-content" : ""}" data-tipo="${t.tipo}" role="tab" aria-selected="false">
              ${icon(t.icone, { size: 15 })}<span>${t.titulo}</span>
            </button>`
          ).join("")}
        </div>
      </div>
      <div class="ia-tab-panel" id="ia-tab-panel" hidden></div>

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

      ${decks.length || fluxos.length ? renderRelacionados({ decks, fluxos }) : ""}

      ${renderNavegacaoAdjacente(adjacentes)}
    </div>
  `;

  container.querySelector("#btn-concluir").addEventListener("click", async () => {
    await marcarConcluido(tema.id, !concluido, tema.categoria);
    renderDetalhe(container, { id });
  });

  // ---------- Abas de IA (Fase 17: movidas pro topo, minimalistas, com resultado salvo por tema) ----------
  const tabbarEl = container.querySelector("#ia-tabbar");
  const painelEl = container.querySelector("#ia-tab-panel");
  const abasEmMemoria = new Map(abasSalvas);

  function marcarTabAtiva(tipo) {
    tabbarEl.querySelectorAll(".ia-tab").forEach((btn) => {
      const ativo = btn.dataset.tipo === tipo;
      btn.classList.toggle("is-active", ativo);
      btn.setAttribute("aria-selected", ativo ? "true" : "false");
    });
    painelEl.hidden = false;
  }

  function marcarTabComConteudo(tipo) {
    tabbarEl.querySelector(`.ia-tab[data-tipo="${tipo}"]`)?.classList.add("has-content");
  }

  function travarTabs(trava) {
    tabbarEl.querySelectorAll(".ia-tab").forEach((b) => (b.disabled = trava));
  }

  function renderizarPainel(tipo, dados) {
    if (tipo === "testar") {
      montarPainelTestar(dados);
      return;
    }
    const rotuloRegerar =
      tipo === "questao" ? "↻ Gerar outra questão" : tipo === "flashcards" ? "↻ Gerar outro baralho" : tipo === "fluxograma" ? "↻ Gerar outro fluxograma" : "↻ Gerar de novo";
    painelEl.innerHTML = `
      <div class="ia-tab-panel__body">${RENDER_PAINEL_IA[tipo](dados)}</div>
      <button type="button" class="btn btn--ghost ia-tab-panel__regerar" style="margin-top:12px;padding-left:0;">${rotuloRegerar}</button>
    `;
    painelEl.querySelector(".ia-tab-panel__regerar").addEventListener("click", () => gerarAba(tipo));
  }

  async function gerarAba(tipo) {
    if (tipo === "testar") {
      await gerarPerguntaTestar();
      return;
    }
    travarTabs(true);
    painelEl.hidden = false;
    painelEl.innerHTML = `<div class="ia-tab-panel__body"><div class="explanation-box">Gerando...</div></div>`;
    try {
      let dados;
      if (tipo === "explicar") {
        dados = {
          texto: await askAI({
            pergunta: `Explique o tema "${tema.titulo}" com mais profundidade e traga um breve exemplo de caso clínico ilustrativo.`,
            tarefa: "explicar o tema em mais profundidade, com um exemplo de caso clínico curto ao final",
            contexto: formatarTemaComoContexto(tema),
          }),
        };
      } else if (tipo === "avaliar") {
        dados = { texto: await avaliarTemaComIA(tema) };
      } else if (tipo === "pegadinhas") {
        dados = {
          texto: await askAI({
            pergunta: `Quais são as pegadinhas mais comuns de prova sobre "${tema.titulo}"? O que os examinadores costumam usar pra confundir o candidato?`,
            tarefa: "listar as pegadinhas/armadilhas mais comuns de prova sobre este tema",
            contexto: formatarTemaComoContexto(tema),
          }),
        };
      } else if (tipo === "memorizar") {
        dados = {
          texto: await askAI({
            pergunta: `Resuma o que é mais importante memorizar de cor sobre "${tema.titulo}" pra prova — números, critérios diagnósticos, doses, classificações. Seja objetivo, em lista.`,
            tarefa: "listar os pontos que valem a pena memorizar de cor sobre este tema, de forma objetiva",
            contexto: formatarTemaComoContexto(tema),
          }),
        };
      } else if (tipo === "flashcards") {
        const deck = await gerarFlashcardsComIA(tema);
        dados = { deckId: deck.id, deckTitulo: deck.titulo, totalCards: deck.cards.length };
      } else if (tipo === "questao") {
        await gerarQuestaoComIA(tema);
        dados = { criadoEm: new Date().toISOString() };
      } else if (tipo === "fluxograma") {
        const fluxograma = await gerarFluxogramaComIA(tema);
        dados = { titulo: fluxograma.titulo, fluxo: fluxograma.fluxo };
      }
      abasEmMemoria.set(tipo, dados);
      await salvarAbaIA(tema.id, tipo, dados);
      marcarTabComConteudo(tipo);
      renderizarPainel(tipo, dados);
    } catch (err) {
      painelEl.innerHTML = `<div class="ia-tab-panel__body"><div class="explanation-box">⚠ ${escapeHtml(err.message)}</div></div>`;
    } finally {
      travarTabs(false);
    }
  }

  /**
   * "Me testar" — modo quiz simples: a IA faz uma pergunta (sem revelar a
   * resposta), o usuário responde em texto livre, a IA corrige. Cada pergunta
   * e cada correção são chamadas sem cache (semCache) — repetir "Me testar"
   * tem que poder trazer uma pergunta diferente, é treino, não FAQ. Só o que
   * já tem feedback é salvo (uma pergunta ainda sem resposta é estado
   * transitório, não "conteúdo gerado" pra consultar depois).
   */
  function montarPainelTestar(dados) {
    const corpo = dados.feedback
      ? `
        <div class="ia-resposta" style="margin-top:12px;">${renderMarkdown(dados.feedback)}</div>
        <div class="chat-msg__aviso">Gerado por IA — confira em fonte oficial antes de usar.</div>
        <button type="button" class="btn btn--secondary" id="btn-testar-nova" style="margin-top:12px;">Nova pergunta</button>
      `
      : `
        <form id="form-resposta-testar" style="margin-top:16px;display:flex;flex-direction:column;gap:12px;">
          <textarea id="resposta-testar" rows="3" placeholder="Sua resposta..." required></textarea>
          <button class="btn btn--primary" type="submit" style="align-self:flex-start;">Responder</button>
        </form>
      `;
    painelEl.hidden = false;
    painelEl.innerHTML = `
      <div class="ia-tab-panel__body">
        <div class="ia-resposta">${renderMarkdown(dados.pergunta)}</div>
        ${corpo}
      </div>
    `;

    painelEl.querySelector("#form-resposta-testar")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const resposta = painelEl.querySelector("#resposta-testar").value.trim();
      if (!resposta) return;
      travarTabs(true);
      painelEl.innerHTML = `<div class="ia-tab-panel__body"><div class="explanation-box">Corrigindo...</div></div>`;
      try {
        const feedback = await askAI({
          pergunta: `Pergunta feita: "${dados.pergunta}"\nResposta do usuário: "${resposta}"\n\nAvalie a resposta: diga se está correta, o que acertou e o que faltou ou precisa corrigir. Seja direto.`,
          tarefa: "corrigir a resposta do usuário a uma pergunta de treino, apontando acertos e o que falta",
          contexto: formatarTemaComoContexto(tema),
          semCache: true,
        });
        const novoDados = { ...dados, resposta, feedback };
        abasEmMemoria.set("testar", novoDados);
        await salvarAbaIA(tema.id, "testar", novoDados);
        marcarTabComConteudo("testar");
        montarPainelTestar(novoDados);
      } catch (err) {
        painelEl.innerHTML = `<div class="ia-tab-panel__body"><div class="explanation-box">⚠ ${escapeHtml(err.message)}</div></div>`;
      } finally {
        travarTabs(false);
      }
    });

    painelEl.querySelector("#btn-testar-nova")?.addEventListener("click", () => gerarPerguntaTestar());
  }

  async function gerarPerguntaTestar() {
    travarTabs(true);
    painelEl.hidden = false;
    painelEl.innerHTML = `<div class="ia-tab-panel__body"><div class="explanation-box">Preparando uma pergunta...</div></div>`;
    try {
      const pergunta = await askAI({
        pergunta: `Me faça UMA pergunta objetiva, estilo prova de residência, sobre "${tema.titulo}" — sem me dar a resposta, só a pergunta.`,
        tarefa: "elaborar uma pergunta de treino oral sobre o tema, sem revelar a resposta",
        contexto: formatarTemaComoContexto(tema),
        semCache: true,
      });
      const dados = { pergunta };
      abasEmMemoria.set("testar", dados);
      montarPainelTestar(dados);
    } catch (err) {
      painelEl.innerHTML = `<div class="ia-tab-panel__body"><div class="explanation-box">⚠ ${escapeHtml(err.message)}</div></div>`;
    } finally {
      travarTabs(false);
    }
  }

  tabbarEl.querySelectorAll(".ia-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tipo = btn.dataset.tipo;
      marcarTabAtiva(tipo);
      if (abasEmMemoria.has(tipo)) {
        renderizarPainel(tipo, abasEmMemoria.get(tipo));
      } else {
        gerarAba(tipo);
      }
    });
  });
}
