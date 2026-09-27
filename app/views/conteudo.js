import { fetchJsonCached, escapeHtml, renderMarkdown, renderImagemEstudo } from "../utils.js";
import { getItem, setItem, getAll } from "../db.js";
import { navigate } from "../router.js";
import { AREA_POR_CATEGORIA, ORDEM_AREAS, CATEGORIAS_VALIDAS } from "../areas.js";
import { gerarTemaComIA, gerarFluxogramaComIA, gerarQuestaoComIA, avaliarTemaComIA } from "../iaConteudo.js";
import { askAI } from "../ai.js";
import { formatarTemaComoContexto } from "../rag.js";
import { renderFlowchart } from "../components/flowchart.js";
import { icon } from "../components/icons.js";
import { gerarDiagnostico } from "../prontidao.js";
import { gerarRevisoesParaTema, hojeIso } from "../revisaoCurso.js";
import { infoPrioridade, badgePrioridade } from "../prioridadeProva.js";
import { contarFlashcardsDoTema } from "../flashcards.js";
import { getAnotacao, salvarAnotacao } from "../anotacoes.js";

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
  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="skeleton skeleton-line skeleton-line--short" style="height:12px;width:200px;"></div>
        <div class="skeleton skeleton-line" style="height:28px;width:50%;margin-top:8px;"></div>
      </div>
      ${Array.from(
        { length: 4 },
        () => `
        <div class="skeleton-card">
          <div class="skeleton skeleton-line skeleton-line--short"></div>
          <div class="skeleton skeleton-line"></div>
        </div>`
      ).join("")}
    </div>
  `;

  const [temas, progresso, diagnostico] = await Promise.all([todosOsTemas(), getAll("progresso"), gerarDiagnostico()]);
  const concluidosSet = new Set(progresso.filter((p) => p.concluido).map((p) => p.id));
  const infoPorCategoria = new Map(diagnostico.porCategoria.map((c) => [c.categoria, c]));
  const grupos = agruparPorAreaECategoria(temas, infoPorCategoria, concluidosSet);

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Conteúdo</div>
        <h1>Resumos por tema</h1>
        <p class="page-header__desc">Categorias ordenadas por prioridade (🔴 crítico → 🟢 tranquilo, igual ao Heatmap de <a href="#/residencia/prontidao">Prontidão</a>) — temas ainda não estudados aparecem primeiro.</p>
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
  const prioridade = infoPrioridade(tema.prioridadeProva);
  return `
    <li class="${prioridade.bordaClasse}">
      <a class="content-list__item" href="#/residencia/conteudo/${tema.id}" data-busca="${escapeHtml(busca)}">
        <span class="content-list__title">${escapeHtml(tema.titulo)}</span>
        <span style="display:flex;gap:8px;align-items:center;">
          ${badgeIA}
          ${badgePrioridade(tema.prioridadeProva)}
        </span>
      </a>
    </li>
  `;
}

function renderRelacionados({ fluxos }) {
  return `
    <div class="section-block" style="margin-top:24px;">
      <h3>Fluxogramas relacionados</h3>
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
  const [fluxos, respostas, questoesCuradas, questoesGeradas, diagnostico, adjacentes, abasSalvas, anotacaoSalva] = await Promise.all([
    fluxogramasDoTema(tema.id),
    getAll("respostas"),
    fetchJsonCached("data/questoes.json"),
    getAll("ia_questoes"),
    gerarDiagnostico(),
    temaAdjacentes(tema),
    carregarAbasSalvas(tema.id),
    getAnotacao(tema.id),
  ]);

  const infoCategoria = diagnostico.porCategoria.find((c) => c.categoria === tema.categoria) || null;
  const respostasDoTema = respostas.filter((r) => r.temaId === tema.id);
  const temQuestoes = [...questoesCuradas, ...questoesGeradas].some((q) => q.temaId === tema.id);
  const qtdFlashcards = await contarFlashcardsDoTema(tema.id);
  const prioridade = infoPrioridade(tema.prioridadeProva);

  container.innerHTML = `
    <div class="main__container ${prioridade.fundoClasse}">
      <div class="page-header">
        <a class="btn btn--ghost" href="#/residencia/conteudo" style="padding-left:0;margin-bottom:8px;">← Conteúdo</a>
        <div class="page-header__eyebrow">
          ${escapeHtml(tema.categoria)}
          ${infoCategoria?.quadrante ? `<span title="${escapeHtml(infoCategoria.quadrante.label)}">${infoCategoria.quadrante.emoji} ${escapeHtml(infoCategoria.quadrante.label)}</span>` : ""}
        </div>
        <h1>${escapeHtml(tema.titulo)} ${geradoPorIA ? '<span class="badge badge--ia">✨ IA</span>' : ""} ${badgePrioridade(tema.prioridadeProva)}</h1>
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
          ${qtdFlashcards ? `<a class="btn btn--secondary tema-toolbar__btn" href="#/residencia/flashcards?tema=${encodeURIComponent(tema.id)}">Flashcards deste tema (${qtdFlashcards})</a>` : ""}
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
        ${(tema.secoes || [])
          .map(
            (s) => `
          <div class="section-block">
            <h3>${escapeHtml(s.titulo)}</h3>
            <p>${s.conteudo}</p>
            ${renderImagemEstudo(s.imagem)}
          </div>`
          )
          .join("")}

        ${(tema.mnemonicos || [])
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

      <div class="card" style="margin-top:24px;">
        <h3 style="margin-top:0;">Suas anotações sobre ${escapeHtml(tema.titulo)}</h3>
        <p class="page-header__desc" style="margin-top:0;">Livre pra anotar o macete que você mesmo descobriu — só fica salvo aqui, não é usado pela IA.</p>
        <div class="field" style="margin-bottom:0;">
          <textarea id="anotacao-tema" rows="5" placeholder="Ex.: lembrar de sempre pensar em X antes de Y...">${escapeHtml(anotacaoSalva)}</textarea>
        </div>
        <p id="anotacao-status" style="font-size:var(--fs-xs);color:var(--color-text-muted);margin-top:6px;min-height:1em;"></p>
      </div>

      ${fluxos.length ? renderRelacionados({ fluxos }) : ""}

      ${renderNavegacaoAdjacente(adjacentes)}
    </div>
  `;

  container.querySelector("#btn-concluir").addEventListener("click", async () => {
    await marcarConcluido(tema.id, !concluido, tema.categoria);
    renderDetalhe(container, { id });
  });

  const anotacaoEl = container.querySelector("#anotacao-tema");
  const anotacaoStatusEl = container.querySelector("#anotacao-status");
  let temporizadorAnotacao = null;
  anotacaoEl.addEventListener("input", () => {
    anotacaoStatusEl.textContent = "Salvando...";
    clearTimeout(temporizadorAnotacao);
    temporizadorAnotacao = setTimeout(async () => {
      await salvarAnotacao(tema.id, anotacaoEl.value);
      anotacaoStatusEl.textContent = "Salvo ✓";
    }, 600);
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
      tipo === "questao" ? "↻ Gerar outra questão" : tipo === "fluxograma" ? "↻ Gerar outro fluxograma" : "↻ Gerar de novo";
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
