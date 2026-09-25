import { escapeHtml } from "../utils.js";
import { setItem, getAll, removeItem } from "../db.js";
import { registrarResultadoQuestao } from "../erros.js";
import {
  carregarIndice,
  filtrar,
  contarPorNivel,
  contadores,
  especialidadesDe,
  temasDe,
  registrarRespostaNoIndice,
  ORDENACAO,
  STATUS,
} from "../questoesIndex.js";

function skeletonCard() {
  return `
    <div class="skeleton-card">
      <div class="skeleton skeleton-line skeleton-line--short"></div>
      <div class="skeleton skeleton-line skeleton-line--tall"></div>
      <div class="skeleton skeleton-line"></div>
      <div class="skeleton skeleton-line"></div>
    </div>`;
}

export async function renderLista(container, _params, query = {}) {
  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Questões</div>
        <h1>Banco de questões</h1>
        <p class="page-header__desc">Carregando banco de questões...</p>
      </div>
      <div class="skeleton skeleton-line" style="height:80px;margin-bottom:16px;"></div>
      ${Array.from({ length: 3 }, skeletonCard).join("")}
    </div>
  `;

  let indice;
  try {
    indice = await carregarIndice();
  } catch (err) {
    container.innerHTML = `
      <div class="main__container">
        <div class="empty-state">
          <h2>Não foi possível carregar o banco de questões</h2>
          <p>Verifique sua conexão e tente novamente.</p>
          <button type="button" class="btn btn--primary" id="questoes-tentar-novamente" style="margin-top:16px;">Tentar novamente</button>
        </div>
      </div>
    `;
    container.querySelector("#questoes-tentar-novamente").addEventListener("click", () => renderLista(container, _params, query));
    return;
  }

  // Fase 16 (Revisão de Alto Rendimento) — ?categoria=X restringe a página inteira
  // a essa especialidade antes de qualquer outro filtro, como já funcionava (agora
  // via hierarquia real: a especialidade já vem selecionada/expandida).
  // Fase 6 (reformulação de Questões) — o restante dos filtros (?area=, ?temaId=,
  // ?banca=, ?ano=, ?status=, ?busca=, ?ordenacao=, ?qtd=) também é restaurado da
  // URL, para o estado sobreviver a um refresh/voltar sem precisar re-clicar tudo.
  let filtroGrandeArea;
  let filtroEspecialidade;
  let filtroTemaId;
  let filtroStatus = STATUS.TODAS;
  let bancaInicial = "todas";
  let anoInicial = "todos";
  let buscaInicial = "";
  let ordenacaoInicial = ORDENACAO.RECENTES;
  let qtdInicial = "20";

  if (query.categoria && especialidadesDe(indice).includes(query.categoria)) {
    filtroEspecialidade = query.categoria;
    filtroGrandeArea = [...indice.questoesPorId.values()].find((q) => q.especialidade === query.categoria)?.grandeArea;
    if (query.tema) {
      const match = temasDe(indice, filtroEspecialidade).find(([, titulo]) => titulo === query.tema);
      if (match) filtroTemaId = match[0];
    }
  }
  if (query.temaId) {
    const q = [...indice.questoesPorId.values()].find((qq) => qq.temaId === query.temaId);
    if (q) {
      filtroTemaId = query.temaId;
      filtroEspecialidade = q.especialidade;
      filtroGrandeArea = q.grandeArea;
    }
  }
  if (!filtroGrandeArea && query.area && indice.grandeAreas.includes(query.area)) {
    filtroGrandeArea = query.area;
  }
  if (query.banca && indice.bancas.includes(query.banca)) bancaInicial = query.banca;
  if (query.ano && indice.anos.includes(Number(query.ano))) anoInicial = query.ano;
  if (query.status && Object.values(STATUS).includes(query.status)) filtroStatus = query.status;
  if (query.busca) buscaInicial = query.busca;
  if (query.ordenacao && Object.values(ORDENACAO).includes(query.ordenacao)) ordenacaoInicial = query.ordenacao;
  if (query.qtd && ["10", "20", "30", "40", "50", "100", "todas"].includes(query.qtd)) qtdInicial = query.qtd;
  let paginaInicial = 1;
  if (query.pagina && /^\d+$/.test(query.pagina) && Number(query.pagina) > 0) paginaInicial = Number(query.pagina);

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Questões</div>
        <h1>Banco de questões</h1>
        <p class="page-header__desc">Navegue por Grande Área › Especialidade › Tema, ou combine com a busca por banca. Enunciados e comentários são material de estudo próprio, não de provas reais.</p>
        <p id="questoes-breadcrumb" style="margin-top:8px;font-size:var(--fs-sm);display:none;"></p>
      </div>
      <div id="questoes-stats" class="stat-row"></div>
      <button type="button" id="questoes-filtros-toggle" class="btn btn--secondary filtros-toggle">Filtros</button>
      <div id="questoes-filtros-overlay" class="filtros-overlay"></div>
      <div id="questoes-filtros-painel" class="filtros-painel">
        <div class="atalhos-estudo">
          <button type="button" class="btn btn--secondary atalho-estudo" data-atalho="novas">Fazer questões novas</button>
          <button type="button" class="btn btn--secondary atalho-estudo" data-atalho="erros">Revisar erros</button>
          <button type="button" class="btn btn--secondary atalho-estudo" data-atalho="recentes">Questões recentes</button>
        </div>
        <div class="field">
          <label for="filtro-busca">Buscar por tema ou enunciado</label>
          <input type="search" id="filtro-busca" placeholder="Ex.: hipertensão, IAM, dengue..." value="${escapeHtml(buscaInicial)}" />
        </div>
        <div class="filtros-grid">
          <div class="field">
            <label for="filtro-grande-area">Área</label>
            <select id="filtro-grande-area">
              <option value="">Todas as áreas</option>
            </select>
          </div>
          <div class="field">
            <label for="filtro-especialidade">Especialidade</label>
            <select id="filtro-especialidade" disabled>
              <option value="">Todas as especialidades</option>
            </select>
          </div>
          <div class="field">
            <label for="filtro-tema">Tema</label>
            <select id="filtro-tema" disabled>
              <option value="">Todos os temas</option>
            </select>
          </div>
          <div class="field">
            <label for="filtro-banca">Banca</label>
            <select id="filtro-banca">
              <option value="todas" ${bancaInicial === "todas" ? "selected" : ""}>Todas as bancas</option>
              ${indice.bancas.map((b) => `<option value="${escapeHtml(b)}" ${b === bancaInicial ? "selected" : ""}>${escapeHtml(b)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="filtro-ano">Ano</label>
            <select id="filtro-ano">
              <option value="todos" ${anoInicial === "todos" ? "selected" : ""}>Todos os anos</option>
              ${indice.anos.map((a) => `<option value="${a}" ${String(a) === anoInicial ? "selected" : ""}>${a}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="filtro-ordenacao">Ordenar por</label>
            <select id="filtro-ordenacao">
              <option value="${ORDENACAO.RECENTES}" ${ordenacaoInicial === ORDENACAO.RECENTES ? "selected" : ""}>Mais recentes</option>
              <option value="${ORDENACAO.ANTIGAS}" ${ordenacaoInicial === ORDENACAO.ANTIGAS ? "selected" : ""}>Mais antigas</option>
              <option value="${ORDENACAO.ACERTO_ASC}" ${ordenacaoInicial === ORDENACAO.ACERTO_ASC ? "selected" : ""}>Meu % de acerto (menor primeiro)</option>
              <option value="${ORDENACAO.ACERTO_DESC}" ${ordenacaoInicial === ORDENACAO.ACERTO_DESC ? "selected" : ""}>Meu % de acerto (maior primeiro)</option>
              <option value="${ORDENACAO.ALEATORIO}" ${ordenacaoInicial === ORDENACAO.ALEATORIO ? "selected" : ""}>Aleatório</option>
            </select>
          </div>
          <div class="field">
            <label for="filtro-quantidade">Por página</label>
            <select id="filtro-quantidade">
              ${[10, 20, 30, 40, 50, 100].map((n) => `<option value="${n}" ${String(n) === qtdInicial ? "selected" : ""}>${n}</option>`).join("")}
              <option value="todas" ${qtdInicial === "todas" ? "selected" : ""}>Todas</option>
            </select>
          </div>
        </div>
        <div id="questoes-chips" class="tag-filter-bar" style="margin-top:12px;display:none;"></div>
        <div class="filtros-salvos">
          <div class="field" style="flex:1;min-width:180px;margin-bottom:0;">
            <label for="filtros-salvos-select">Filtros salvos</label>
            <select id="filtros-salvos-select">
              <option value="">Selecionar um filtro salvo...</option>
            </select>
          </div>
          <button type="button" class="btn btn--secondary" id="filtros-salvos-remover" style="display:none;" title="Remover filtro salvo selecionado">Remover</button>
          <div class="filtros-salvos__novo">
            <div class="field" style="flex:1;min-width:220px;margin-bottom:0;">
              <label for="filtros-salvos-nome">Salvar filtro atual</label>
              <input type="text" id="filtros-salvos-nome" placeholder="Nome para o filtro" maxlength="60" />
            </div>
            <button type="button" class="btn btn--secondary" id="filtros-salvos-criar">Salvar</button>
          </div>
        </div>
        <button type="button" class="btn btn--secondary filtros-painel__fechar" id="questoes-filtros-fechar">Fechar</button>
      </div>
      <p id="questoes-contagem" class="page-header__desc" style="margin-top:16px;"></p>
      <div id="questoes-lista" class="plan-queue"></div>
      <div id="questoes-paginacao" class="paginacao"></div>
    </div>
  `;

  const statsEl = container.querySelector("#questoes-stats");
  const breadcrumbEl = container.querySelector("#questoes-breadcrumb");
  const chipsEl = container.querySelector("#questoes-chips");
  const listaEl = container.querySelector("#questoes-lista");
  const contagemEl = container.querySelector("#questoes-contagem");
  const paginacaoEl = container.querySelector("#questoes-paginacao");
  const selectGrandeArea = container.querySelector("#filtro-grande-area");
  const selectEspecialidade = container.querySelector("#filtro-especialidade");
  const selectTema = container.querySelector("#filtro-tema");
  const filtroBanca = container.querySelector("#filtro-banca");
  const filtroAno = container.querySelector("#filtro-ano");
  const filtroBusca = container.querySelector("#filtro-busca");
  const filtroOrdenacao = container.querySelector("#filtro-ordenacao");
  const filtroQuantidade = container.querySelector("#filtro-quantidade");
  const filtrosToggleEl = container.querySelector("#questoes-filtros-toggle");
  const filtrosOverlayEl = container.querySelector("#questoes-filtros-overlay");
  const filtrosPainelEl = container.querySelector("#questoes-filtros-painel");
  const filtrosFecharEl = container.querySelector("#questoes-filtros-fechar");
  const atalhosEstudoEl = container.querySelector(".atalhos-estudo");
  const filtrosSalvosSelect = container.querySelector("#filtros-salvos-select");
  const filtrosSalvosRemoverBtn = container.querySelector("#filtros-salvos-remover");
  const filtrosSalvosNomeInput = container.querySelector("#filtros-salvos-nome");
  const filtrosSalvosCriarBtn = container.querySelector("#filtros-salvos-criar");

  const ROTULOS_STATUS = {
    [STATUS.NAO_RESPONDIDAS]: "Não respondidas",
    [STATUS.RESPONDIDAS]: "Respondidas",
    [STATUS.CORRETAS]: "Acertos",
    [STATUS.INCORRETAS]: "Erros",
  };

  let idsFiltrados = [];
  let paginaAtual = paginaInicial;
  let tamanhoLote = qtdInicial === "todas" ? 100 : Number(qtdInicial);

  function fecharPainelFiltros() {
    filtrosPainelEl.classList.remove("is-open");
    filtrosOverlayEl.classList.remove("is-open");
  }
  filtrosToggleEl.addEventListener("click", () => {
    filtrosPainelEl.classList.add("is-open");
    filtrosOverlayEl.classList.add("is-open");
  });
  filtrosOverlayEl.addEventListener("click", fecharPainelFiltros);
  filtrosFecharEl.addEventListener("click", fecharPainelFiltros);

  // Fase 7 — atalhos de estudo: só aplicam os filtros já existentes (status/
  // ordenação), sem nenhuma lógica paralela de seleção de questões.
  atalhosEstudoEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-atalho]");
    if (!btn) return;
    const atalho = btn.dataset.atalho;
    if (atalho === "novas") filtroStatus = STATUS.NAO_RESPONDIDAS;
    else if (atalho === "erros") filtroStatus = STATUS.INCORRETAS;
    else if (atalho === "recentes") filtroOrdenacao.value = ORDENACAO.RECENTES;
    renderHierarquia();
    refazerFiltro();
  });

  // Fase 7 — filtros salvos: store genérico "filtros_salvos" (mesmo padrão
  // getItem/setItem/getAll/removeItem já usado por respostas/progresso/prefs).
  function estadoFiltrosAtual() {
    return {
      grandeArea: filtroGrandeArea,
      especialidade: filtroEspecialidade,
      temaId: filtroTemaId,
      banca: filtroBanca.value,
      ano: filtroAno.value,
      status: filtroStatus,
      busca: filtroBusca.value.trim(),
      ordenacao: filtroOrdenacao.value,
      qtd: filtroQuantidade.value,
    };
  }

  function aplicarEstadoFiltros(estado) {
    filtroGrandeArea = estado.grandeArea || undefined;
    filtroEspecialidade = estado.especialidade || undefined;
    filtroTemaId = estado.temaId || undefined;
    filtroBanca.value = estado.banca || "todas";
    filtroAno.value = estado.ano || "todos";
    filtroStatus = estado.status || STATUS.TODAS;
    filtroBusca.value = estado.busca || "";
    filtroOrdenacao.value = estado.ordenacao || ORDENACAO.RECENTES;
    filtroQuantidade.value = estado.qtd || "20";
    tamanhoLote = filtroQuantidade.value === "todas" ? 100 : Number(filtroQuantidade.value);
    renderHierarquia();
    refazerFiltro();
  }

  let filtrosSalvos = [];
  async function carregarFiltrosSalvos() {
    filtrosSalvos = await getAll("filtros_salvos");
    filtrosSalvosSelect.innerHTML =
      `<option value="">Selecionar um filtro salvo...</option>` +
      filtrosSalvos.map((f) => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.nome)}</option>`).join("");
  }

  filtrosSalvosSelect.addEventListener("change", () => {
    const escolhido = filtrosSalvos.find((f) => f.id === filtrosSalvosSelect.value);
    filtrosSalvosRemoverBtn.style.display = escolhido ? "inline-flex" : "none";
    if (escolhido) aplicarEstadoFiltros(escolhido.filtros);
  });

  filtrosSalvosRemoverBtn.addEventListener("click", async () => {
    const id = filtrosSalvosSelect.value;
    if (!id) return;
    await removeItem("filtros_salvos", id);
    await carregarFiltrosSalvos();
    filtrosSalvosRemoverBtn.style.display = "none";
  });

  filtrosSalvosCriarBtn.addEventListener("click", async () => {
    const nome = filtrosSalvosNomeInput.value.trim();
    if (!nome) return;
    await setItem("filtros_salvos", {
      id: `fs-${Date.now()}`,
      nome,
      criadoEm: new Date().toISOString(),
      filtros: estadoFiltrosAtual(),
    });
    filtrosSalvosNomeInput.value = "";
    await carregarFiltrosSalvos();
  });

  carregarFiltrosSalvos();

  function filtrosBase() {
    return {
      banca: filtroBanca.value === "todas" ? undefined : filtroBanca.value,
      ano: filtroAno.value === "todos" ? undefined : Number(filtroAno.value),
      status: filtroStatus,
      busca: filtroBusca.value.trim() || undefined,
    };
  }

  function limparTudo() {
    filtroGrandeArea = filtroEspecialidade = filtroTemaId = undefined;
    filtroStatus = STATUS.TODAS;
    filtroBanca.value = "todas";
    filtroAno.value = "todos";
    filtroBusca.value = "";
  }

  function renderChips() {
    const chips = [];
    if (filtroGrandeArea) {
      chips.push({
        label: `Área: ${filtroGrandeArea}`,
        remover: () => {
          filtroGrandeArea = filtroEspecialidade = filtroTemaId = undefined;
        },
      });
    }
    if (filtroEspecialidade) {
      chips.push({
        label: `Especialidade: ${filtroEspecialidade}`,
        remover: () => {
          filtroEspecialidade = filtroTemaId = undefined;
        },
      });
    }
    if (filtroTemaId) {
      const titulo = temasDe(indice, filtroEspecialidade).find(([id]) => id === filtroTemaId)?.[1] || filtroTemaId;
      chips.push({ label: `Tema: ${titulo}`, remover: () => { filtroTemaId = undefined; } });
    }
    if (filtroBanca.value !== "todas") {
      chips.push({ label: `Banca: ${filtroBanca.value}`, remover: () => { filtroBanca.value = "todas"; } });
    }
    if (filtroAno.value !== "todos") {
      chips.push({ label: `Ano: ${filtroAno.value}`, remover: () => { filtroAno.value = "todos"; } });
    }
    if (filtroBusca.value.trim()) {
      chips.push({ label: `Busca: "${filtroBusca.value.trim()}"`, remover: () => { filtroBusca.value = ""; } });
    }
    if (filtroStatus !== STATUS.TODAS) {
      chips.push({ label: ROTULOS_STATUS[filtroStatus], remover: () => { filtroStatus = STATUS.TODAS; } });
    }

    filtrosToggleEl.textContent = chips.length ? `Filtros (${chips.length})` : "Filtros";

    if (!chips.length) {
      chipsEl.style.display = "none";
      chipsEl.innerHTML = "";
      return;
    }
    chipsEl.style.display = "flex";
    chipsEl.innerHTML =
      chips.map((c, i) => `<button type="button" class="tag-filter is-active" data-chip-index="${i}">${escapeHtml(c.label)} ✕</button>`).join("") +
      `<button type="button" class="tag-filter" id="questoes-limpar-filtros">Limpar filtros</button>`;

    chipsEl.querySelectorAll("[data-chip-index]").forEach((btn) => {
      btn.addEventListener("click", () => {
        chips[Number(btn.dataset.chipIndex)].remover();
        renderHierarquia();
        refazerFiltro();
      });
    });
    container.querySelector("#questoes-limpar-filtros").addEventListener("click", () => {
      limparTudo();
      renderHierarquia();
      refazerFiltro();
    });
  }

  function renderStats() {
    const c = contadores(indice, filtrosAtuais());
    const tile = (status, valor, rotulo) => `
      <button type="button" class="stat-tile ${filtroStatus === status ? "is-active" : ""}" data-status="${status}">
        <span class="stat-tile__value">${valor}</span>
        <span class="stat-tile__label">${rotulo}</span>
      </button>`;
    statsEl.innerHTML = `
      ${tile(STATUS.TODAS, c.total, "Total")}
      ${tile(STATUS.NAO_RESPONDIDAS, c.naoRespondidas, "Não respondidas")}
      ${tile(STATUS.RESPONDIDAS, c.respondidas, "Respondidas")}
      ${tile(STATUS.CORRETAS, c.acertos, "Acertos")}
      ${tile(STATUS.INCORRETAS, c.erros, "Erros")}
      <div class="stat-tile">
        <span class="stat-tile__value">${c.percentualAcerto.toFixed(1)}%</span>
        <span class="stat-tile__label">Aproveitamento</span>
      </div>`;
  }

  statsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-status]");
    if (!btn) return;
    const status = btn.dataset.status;
    filtroStatus = filtroStatus === status ? STATUS.TODAS : status;
    renderHierarquia();
    refazerFiltro();
  });

  function filtrosAtuais() {
    return {
      ...filtrosBase(),
      grandeArea: filtroGrandeArea,
      especialidade: filtroEspecialidade,
      temaId: filtroTemaId,
      ordenacao: filtroOrdenacao.value,
    };
  }

  function renderHierarquia() {
    renderStats();
    renderChips();

    const contagemAreas = contarPorNivel(indice, filtrosBase(), "grandeArea");
    selectGrandeArea.innerHTML =
      `<option value="">Todas as áreas</option>` +
      indice.grandeAreas
        .filter((area) => contagemAreas.get(area) > 0)
        .map((area) => `<option value="${escapeHtml(area)}">${escapeHtml(area)} (${contagemAreas.get(area)})</option>`)
        .join("");
    selectGrandeArea.value = filtroGrandeArea || "";

    if (filtroGrandeArea) {
      const contagemEsp = contarPorNivel(indice, { ...filtrosBase(), grandeArea: filtroGrandeArea }, "especialidade");
      const itensEsp = especialidadesDe(indice, filtroGrandeArea).filter((esp) => contagemEsp.get(esp) > 0);
      selectEspecialidade.disabled = false;
      selectEspecialidade.innerHTML =
        `<option value="">Todas as especialidades</option>` +
        itensEsp.map((esp) => `<option value="${escapeHtml(esp)}">${escapeHtml(esp)} (${contagemEsp.get(esp)})</option>`).join("");
      selectEspecialidade.value = filtroEspecialidade || "";
    } else {
      selectEspecialidade.disabled = true;
      selectEspecialidade.innerHTML = `<option value="">Todas as especialidades</option>`;
    }

    if (filtroGrandeArea && filtroEspecialidade) {
      const contagemTema = contarPorNivel(indice, { ...filtrosBase(), grandeArea: filtroGrandeArea, especialidade: filtroEspecialidade }, "temaId");
      const itensTema = temasDe(indice, filtroEspecialidade).filter(([id]) => contagemTema.get(id) > 0);
      selectTema.disabled = false;
      selectTema.innerHTML =
        `<option value="">Todos os temas</option>` +
        itensTema.map(([id, titulo]) => `<option value="${escapeHtml(id)}">${escapeHtml(titulo)} (${contagemTema.get(id)})</option>`).join("");
      selectTema.value = filtroTemaId || "";
    } else {
      selectTema.disabled = true;
      selectTema.innerHTML = `<option value="">Todos os temas</option>`;
    }

    const partes = [filtroGrandeArea, filtroEspecialidade, filtroTemaId ? temasDe(indice, filtroEspecialidade).find(([id]) => id === filtroTemaId)?.[1] : null].filter(Boolean);
    if (partes.length) {
      breadcrumbEl.style.display = "block";
      breadcrumbEl.innerHTML = `<span class="badge badge--warning">${partes.map(escapeHtml).join(" › ")}</span> <a href="#" id="questoes-limpar-hierarquia">Ver todas as questões</a>`;
      container.querySelector("#questoes-limpar-hierarquia").addEventListener("click", (e) => {
        e.preventDefault();
        filtroGrandeArea = filtroEspecialidade = filtroTemaId = undefined;
        renderHierarquia();
        refazerFiltro();
      });
    } else {
      breadcrumbEl.style.display = "none";
    }
  }

  selectGrandeArea.addEventListener("change", () => {
    filtroGrandeArea = selectGrandeArea.value || undefined;
    filtroEspecialidade = undefined;
    filtroTemaId = undefined;
    renderHierarquia();
    refazerFiltro();
  });

  selectEspecialidade.addEventListener("change", () => {
    filtroEspecialidade = selectEspecialidade.value || undefined;
    filtroTemaId = undefined;
    renderHierarquia();
    refazerFiltro();
  });

  selectTema.addEventListener("change", () => {
    filtroTemaId = selectTema.value || undefined;
    renderHierarquia();
    refazerFiltro();
  });

  function breadcrumbCard(q) {
    return `${escapeHtml(q.grandeArea)} › ${escapeHtml(q.especialidade)}`;
  }

  function renderCard(id) {
    const q = indice.questoesPorId.get(id);
    const status = indice.statusPorQuestao.get(id);
    const badgeStatus = !status?.respondida
      ? ""
      : status.acertouUltima
        ? '<span class="badge" style="color:var(--color-success);border-color:var(--color-success-soft);">✓ Já acertou</span>'
        : '<span class="badge" style="color:var(--color-danger);border-color:var(--color-danger-border);">✕ Já errou</span>';
    return `
      <div class="card">
        <p style="font-size:var(--fs-xs);color:var(--color-text-muted);margin-bottom:6px;">${breadcrumbCard(q)}</p>
        <div class="list-card__top">
          <span class="badge badge--accent">${escapeHtml(q.tema)}</span>
          <span class="badge">${escapeHtml(q.banca)} · ${q.ano}</span>
          ${q.origem === "ia" ? '<span class="badge badge--ia">✨ IA</span>' : ""}
          ${badgeStatus}
        </div>
        <p style="font-weight:500;margin:12px 0;">${escapeHtml(q.enunciado)}</p>
        <div class="opcoes" data-qid="${q.id}">
          ${q.alternativas
            .map(
              (alt, i) => `
            <button class="question-option" data-i="${i}">
              <span class="question-option__letter">${String.fromCharCode(65 + i)}</span>
              <span>${escapeHtml(alt)}</span>
            </button>`
            )
            .join("")}
        </div>
        <div class="resultado" data-qid="${q.id}"></div>
      </div>`;
  }

  function ligarEventosCard(id) {
    const q = indice.questoesPorId.get(id);
    const opcoesEl = listaEl.querySelector(`.opcoes[data-qid="${CSS.escape(id)}"]`);
    if (!opcoesEl) return;
    const exibidoEm = Date.now();

    opcoesEl.querySelectorAll(".question-option").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const escolhida = Number(btn.dataset.i);
        const acertou = escolhida === q.correta;
        opcoesEl.querySelectorAll(".question-option").forEach((b, i) => {
          b.classList.add("is-disabled");
          if (i === q.correta) b.classList.add("is-correct");
          if (i === escolhida && !acertou) b.classList.add("is-incorrect");
        });
        const resultadoEl = listaEl.querySelector(`.resultado[data-qid="${CSS.escape(id)}"]`);
        resultadoEl.innerHTML = `
          <div class="explanation-box">
            <strong style="color:${acertou ? "var(--color-success)" : "var(--color-danger)"}">${acertou ? "Correto!" : "Incorreto."}</strong>
            <p style="margin-top:8px;">${escapeHtml(q.comentario)}</p>
          </div>
        `;
        const respondidoEm = new Date().toISOString();
        await setItem("respostas", {
          id: `${q.id}-${Date.now()}`,
          questaoId: q.id,
          temaId: q.temaId,
          tema: q.tema,
          categoria: q.especialidade,
          banca: q.banca,
          ano: q.ano,
          acertou,
          tempoMs: Date.now() - exibidoEm,
          tentativa: (indice.statusPorQuestao.get(q.id)?.tentativas || 0) + 1,
          respondidoEm,
        });
        await registrarResultadoQuestao(q.id, acertou);
        registrarRespostaNoIndice(indice, q.id, acertou, respondidoEm);
        atualizarContagem();
        renderStats();
      });
    });
  }

  function atualizarContagem() {
    if (!idsFiltrados.length) {
      contagemEl.textContent = "0 questões encontradas";
      return;
    }
    const totalPaginas = Math.max(1, Math.ceil(idsFiltrados.length / tamanhoLote));
    const inicio = (paginaAtual - 1) * tamanhoLote + 1;
    const fim = Math.min(idsFiltrados.length, paginaAtual * tamanhoLote);
    contagemEl.textContent = `${idsFiltrados.length} quest${idsFiltrados.length === 1 ? "ão" : "ões"} encontrada${idsFiltrados.length === 1 ? "" : "s"} · exibindo ${inicio}–${fim} (página ${paginaAtual} de ${totalPaginas})`;
  }

  function numerosPagina(atual, total) {
    const paginas = [];
    for (let p = 1; p <= total; p++) {
      if (p === 1 || p === total || (p >= atual - 1 && p <= atual + 1)) paginas.push(p);
      else if (paginas[paginas.length - 1] !== "...") paginas.push("...");
    }
    return paginas;
  }

  function renderPaginacao(totalPaginas) {
    if (totalPaginas <= 1) {
      paginacaoEl.innerHTML = "";
      return;
    }
    paginacaoEl.innerHTML = `
      <button type="button" class="pag-btn" data-pagina="${paginaAtual - 1}" ${paginaAtual <= 1 ? "disabled" : ""}>‹ Anterior</button>
      ${numerosPagina(paginaAtual, totalPaginas)
        .map((p) =>
          p === "..."
            ? `<span class="pag-reticencias">…</span>`
            : `<button type="button" class="pag-btn ${p === paginaAtual ? "is-active" : ""}" data-pagina="${p}">${p}</button>`
        )
        .join("")}
      <button type="button" class="pag-btn" data-pagina="${paginaAtual + 1}" ${paginaAtual >= totalPaginas ? "disabled" : ""}>Próxima ›</button>
    `;
  }

  function renderPagina() {
    const totalPaginas = Math.max(1, Math.ceil(idsFiltrados.length / tamanhoLote));
    if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
    if (paginaAtual < 1) paginaAtual = 1;
    const inicio = (paginaAtual - 1) * tamanhoLote;
    const lote = idsFiltrados.slice(inicio, inicio + tamanhoLote);
    listaEl.innerHTML = lote.map(renderCard).join("");
    lote.forEach(ligarEventosCard);
    atualizarContagem();
    renderPaginacao(totalPaginas);
    atualizarURL();
  }

  paginacaoEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-pagina]");
    if (!btn || btn.disabled) return;
    const p = Number(btn.dataset.pagina);
    if (!p || p < 1) return;
    paginaAtual = p;
    renderPagina();
    listaEl.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // Fase 6 — reflete os filtros ativos na URL via history.replaceState direto
  // (sem passar pelo router/navigate(), que forçaria um re-render completo da
  // view a cada mudança de filtro). Permite refresh/voltar sem perder o filtro.
  function atualizarURL() {
    const params = new URLSearchParams();
    if (filtroGrandeArea) params.set("area", filtroGrandeArea);
    if (filtroEspecialidade) params.set("categoria", filtroEspecialidade);
    if (filtroTemaId) params.set("temaId", filtroTemaId);
    if (filtroBanca.value !== "todas") params.set("banca", filtroBanca.value);
    if (filtroAno.value !== "todos") params.set("ano", filtroAno.value);
    if (filtroStatus !== STATUS.TODAS) params.set("status", filtroStatus);
    if (filtroBusca.value.trim()) params.set("busca", filtroBusca.value.trim());
    if (filtroOrdenacao.value !== ORDENACAO.RECENTES) params.set("ordenacao", filtroOrdenacao.value);
    if (filtroQuantidade.value !== "20") params.set("qtd", filtroQuantidade.value);
    if (paginaAtual > 1) params.set("pagina", String(paginaAtual));
    const caminho = window.location.hash.split("?")[0] || "#/residencia/questoes";
    const queryStr = params.toString();
    const novaURL = `${caminho}${queryStr ? `?${queryStr}` : ""}`;
    if (novaURL !== window.location.hash) history.replaceState(null, "", novaURL);
  }

  function refazerFiltro(resetarPagina = true) {
    idsFiltrados = filtrar(indice, filtrosAtuais());
    if (resetarPagina) paginaAtual = 1;
    if (!idsFiltrados.length) {
      listaEl.innerHTML = `
        <div class="empty-state">
          <p>Nenhuma questão encontrada com esses filtros.</p>
          <button type="button" class="btn btn--secondary" id="questoes-limpar-vazio" style="margin-top:12px;">Limpar filtros</button>
        </div>`;
      container.querySelector("#questoes-limpar-vazio").addEventListener("click", () => {
        limparTudo();
        renderHierarquia();
        refazerFiltro();
      });
      contagemEl.textContent = "0 questões encontradas";
      paginacaoEl.innerHTML = "";
      atualizarURL();
      return;
    }
    renderPagina();
  }

  filtroBanca.addEventListener("change", () => {
    renderHierarquia();
    refazerFiltro();
  });

  filtroAno.addEventListener("change", () => {
    renderHierarquia();
    refazerFiltro();
  });

  filtroOrdenacao.addEventListener("change", () => {
    refazerFiltro();
  });

  filtroQuantidade.addEventListener("change", () => {
    tamanhoLote = filtroQuantidade.value === "todas" ? 100 : Number(filtroQuantidade.value);
    refazerFiltro();
  });

  let temporizadorBusca = null;
  filtroBusca.addEventListener("input", () => {
    clearTimeout(temporizadorBusca);
    temporizadorBusca = setTimeout(() => {
      renderHierarquia();
      refazerFiltro();
    }, 300);
  });

  renderHierarquia();
  refazerFiltro(false);
}
