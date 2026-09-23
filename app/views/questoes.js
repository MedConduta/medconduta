import { escapeHtml } from "../utils.js";
import { setItem } from "../db.js";
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

const TAMANHO_LOTE = 20;

export async function renderLista(container, _params, query = {}) {
  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Questões</div>
        <h1>Banco de questões</h1>
        <p class="page-header__desc">Carregando banco de questões...</p>
      </div>
    </div>
  `;

  const indice = await carregarIndice();

  // Fase 16 (Revisão de Alto Rendimento) — ?categoria=X restringe a página inteira
  // a essa especialidade antes de qualquer outro filtro, como já funcionava (agora
  // via hierarquia real: a especialidade já vem selecionada/expandida).
  let filtroGrandeArea;
  let filtroEspecialidade;
  let filtroTemaId;
  let filtroStatus = STATUS.TODAS;
  let grandeAreaAberta = null;
  let especialidadeAberta = null;

  if (query.categoria && especialidadesDe(indice).includes(query.categoria)) {
    filtroEspecialidade = query.categoria;
    filtroGrandeArea = [...indice.questoesPorId.values()].find((q) => q.especialidade === query.categoria)?.grandeArea;
    grandeAreaAberta = filtroGrandeArea;
    especialidadeAberta = filtroEspecialidade;
    if (query.tema) {
      const match = temasDe(indice, filtroEspecialidade).find(([, titulo]) => titulo === query.tema);
      if (match) filtroTemaId = match[0];
    }
  }

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Questões</div>
        <h1>Banco de questões</h1>
        <p class="page-header__desc">Navegue por Grande Área › Especialidade › Tema, ou combine com a busca por banca. Enunciados e comentários são material de estudo próprio, não de provas reais.</p>
        <p id="questoes-breadcrumb" style="margin-top:8px;font-size:var(--fs-sm);display:none;"></p>
      </div>
      <div id="questoes-stats" class="stat-row"></div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <div class="field" style="max-width:280px;">
          <label for="filtro-banca">Banca</label>
          <select id="filtro-banca">
            <option value="todas">Todas as bancas</option>
            ${indice.bancas.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("")}
          </select>
        </div>
        <div class="field" style="max-width:200px;">
          <label for="filtro-ano">Ano</label>
          <select id="filtro-ano">
            <option value="todos">Todos os anos</option>
            ${indice.anos.map((a) => `<option value="${a}">${a}</option>`).join("")}
          </select>
        </div>
      </div>
      <div id="questoes-chips" class="tag-filter-bar" style="margin-top:12px;display:none;"></div>
      <div id="questoes-hierarquia" class="content-tree" style="margin-top:16px;"></div>
      <p id="questoes-contagem" class="page-header__desc" style="margin-top:16px;"></p>
      <div id="questoes-lista" class="plan-queue"></div>
      <div id="questoes-sentinela" style="height:1px;"></div>
      <p id="questoes-carregando-mais" class="empty-state" style="display:none;">Carregando mais questões...</p>
    </div>
  `;

  const statsEl = container.querySelector("#questoes-stats");
  const hierarquiaEl = container.querySelector("#questoes-hierarquia");
  const breadcrumbEl = container.querySelector("#questoes-breadcrumb");
  const chipsEl = container.querySelector("#questoes-chips");
  const listaEl = container.querySelector("#questoes-lista");
  const contagemEl = container.querySelector("#questoes-contagem");
  const carregandoMaisEl = container.querySelector("#questoes-carregando-mais");
  const sentinelaEl = container.querySelector("#questoes-sentinela");
  const filtroBanca = container.querySelector("#filtro-banca");
  const filtroAno = container.querySelector("#filtro-ano");

  const ROTULOS_STATUS = {
    [STATUS.NAO_RESPONDIDAS]: "Não respondidas",
    [STATUS.RESPONDIDAS]: "Respondidas",
    [STATUS.CORRETAS]: "Acertos",
    [STATUS.INCORRETAS]: "Erros",
  };

  let idsFiltrados = [];
  let renderizados = 0;

  function filtrosBase() {
    return {
      banca: filtroBanca.value === "todas" ? undefined : filtroBanca.value,
      ano: filtroAno.value === "todos" ? undefined : Number(filtroAno.value),
      status: filtroStatus,
    };
  }

  function limparTudo() {
    filtroGrandeArea = filtroEspecialidade = filtroTemaId = undefined;
    grandeAreaAberta = especialidadeAberta = null;
    filtroStatus = STATUS.TODAS;
    filtroBanca.value = "todas";
    filtroAno.value = "todos";
  }

  function renderChips() {
    const chips = [];
    if (filtroGrandeArea) {
      chips.push({
        label: `Área: ${filtroGrandeArea}`,
        remover: () => {
          filtroGrandeArea = filtroEspecialidade = filtroTemaId = undefined;
          grandeAreaAberta = especialidadeAberta = null;
        },
      });
    }
    if (filtroEspecialidade) {
      chips.push({
        label: `Especialidade: ${filtroEspecialidade}`,
        remover: () => {
          filtroEspecialidade = filtroTemaId = undefined;
          especialidadeAberta = null;
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
    if (filtroStatus !== STATUS.TODAS) {
      chips.push({ label: ROTULOS_STATUS[filtroStatus], remover: () => { filtroStatus = STATUS.TODAS; } });
    }

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
      ordenacao: ORDENACAO.RECENTES,
    };
  }

  function renderTemas(area, esp) {
    const filtros = { ...filtrosBase(), grandeArea: area, especialidade: esp };
    const contagem = contarPorNivel(indice, filtros, "temaId");
    const itens = temasDe(indice, esp).filter(([id]) => contagem.get(id) > 0);
    if (!itens.length) return `<p class="empty-state" style="margin:8px 0 0 16px;">Nenhuma questão nesse recorte.</p>`;
    return `
      <div class="content-list" style="margin-left:16px;">
        ${itens
          .map(
            ([id, titulo]) => `
          <button type="button" class="content-list__item" data-tema-id="${escapeHtml(id)}">
            <span>${id === filtroTemaId ? "✓ " : ""}${escapeHtml(titulo)}</span>
            <span class="badge">${contagem.get(id)}</span>
          </button>`
          )
          .join("")}
      </div>`;
  }

  function renderEspecialidades(area) {
    const filtros = { ...filtrosBase(), grandeArea: area };
    const contagem = contarPorNivel(indice, filtros, "especialidade");
    const itens = especialidadesDe(indice, area).filter((esp) => contagem.get(esp) > 0);
    if (!itens.length) return `<p class="empty-state" style="margin:8px 0 0 16px;">Nenhuma questão nesse recorte.</p>`;
    return itens
      .map((esp) => {
        const aberta = esp === especialidadeAberta;
        return `
        <div class="content-group">
          <button type="button" class="content-list__item" data-especialidade="${escapeHtml(esp)}">
            <span>${esp === filtroEspecialidade ? "✓ " : ""}${escapeHtml(esp)}</span>
            <span class="badge">${contagem.get(esp)}</span>
          </button>
          ${aberta ? renderTemas(area, esp) : ""}
        </div>`;
      })
      .join("");
  }

  function renderHierarquia() {
    renderStats();
    renderChips();
    const contagemAreas = contarPorNivel(indice, filtrosBase(), "grandeArea");
    hierarquiaEl.innerHTML = indice.grandeAreas
      .filter((area) => contagemAreas.get(area) > 0)
      .map((area) => {
        const aberta = area === grandeAreaAberta;
        return `
        <details class="card content-area" data-grande-area="${escapeHtml(area)}" ${aberta ? "open" : ""}>
          <summary class="content-area__title">
            <span>${area === filtroGrandeArea ? "✓ " : ""}${escapeHtml(area)}</span>
            <span class="badge content-area__count">${contagemAreas.get(area)}</span>
          </summary>
          <div data-especialidades>${aberta ? renderEspecialidades(area) : ""}</div>
        </details>`;
      })
      .join("");

    const partes = [filtroGrandeArea, filtroEspecialidade, filtroTemaId ? temasDe(indice, filtroEspecialidade).find(([id]) => id === filtroTemaId)?.[1] : null].filter(Boolean);
    if (partes.length) {
      breadcrumbEl.style.display = "block";
      breadcrumbEl.innerHTML = `<span class="badge badge--warning">${partes.map(escapeHtml).join(" › ")}</span> <a href="#" id="questoes-limpar-hierarquia">Ver todas as questões</a>`;
      container.querySelector("#questoes-limpar-hierarquia").addEventListener("click", (e) => {
        e.preventDefault();
        filtroGrandeArea = filtroEspecialidade = filtroTemaId = undefined;
        grandeAreaAberta = especialidadeAberta = null;
        renderHierarquia();
        refazerFiltro();
      });
    } else {
      breadcrumbEl.style.display = "none";
    }
  }

  hierarquiaEl.addEventListener("click", (e) => {
    const summaryEl = e.target.closest(".content-area__title");
    if (summaryEl) {
      e.preventDefault();
      const area = summaryEl.closest("[data-grande-area]").dataset.grandeArea;
      const reabrir = grandeAreaAberta !== area;
      grandeAreaAberta = reabrir ? area : null;
      filtroGrandeArea = reabrir ? area : undefined;
      especialidadeAberta = null;
      filtroEspecialidade = undefined;
      filtroTemaId = undefined;
      renderHierarquia();
      refazerFiltro();
      return;
    }
    const espBtn = e.target.closest("[data-especialidade]");
    if (espBtn) {
      const esp = espBtn.dataset.especialidade;
      const reabrir = especialidadeAberta !== esp;
      especialidadeAberta = reabrir ? esp : null;
      filtroEspecialidade = reabrir ? esp : undefined;
      filtroTemaId = undefined;
      renderHierarquia();
      refazerFiltro();
      return;
    }
    const temaBtn = e.target.closest("[data-tema-id]");
    if (temaBtn) {
      const id = temaBtn.dataset.temaId;
      filtroTemaId = filtroTemaId === id ? undefined : id;
      renderHierarquia();
      refazerFiltro();
    }
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
    contagemEl.textContent = `${idsFiltrados.length} quest${idsFiltrados.length === 1 ? "ão" : "ões"} encontrada${idsFiltrados.length === 1 ? "" : "s"}${idsFiltrados.length ? ` · ${renderizados} exibida${renderizados === 1 ? "" : "s"}` : ""}`;
  }

  function carregarProximoLote() {
    if (renderizados >= idsFiltrados.length) {
      carregandoMaisEl.style.display = "none";
      return;
    }
    const lote = idsFiltrados.slice(renderizados, renderizados + TAMANHO_LOTE);
    listaEl.insertAdjacentHTML("beforeend", lote.map(renderCard).join(""));
    lote.forEach(ligarEventosCard);
    renderizados += lote.length;
    atualizarContagem();
    carregandoMaisEl.style.display = renderizados < idsFiltrados.length ? "block" : "none";
  }

  function refazerFiltro() {
    idsFiltrados = filtrar(indice, filtrosAtuais());
    listaEl.innerHTML = "";
    renderizados = 0;
    if (!idsFiltrados.length) {
      listaEl.innerHTML = `<div class="empty-state">Nenhuma questão encontrada com esses filtros.</div>`;
      contagemEl.textContent = "0 questões encontradas";
      carregandoMaisEl.style.display = "none";
      return;
    }
    carregarProximoLote();
  }

  new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) carregarProximoLote();
    },
    { rootMargin: "600px" }
  ).observe(sentinelaEl);

  filtroBanca.addEventListener("change", () => {
    renderHierarquia();
    refazerFiltro();
  });

  filtroAno.addEventListener("change", () => {
    renderHierarquia();
    refazerFiltro();
  });

  renderHierarquia();
  refazerFiltro();
}
