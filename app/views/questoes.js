import { escapeHtml } from "../utils.js";
import { setItem } from "../db.js";
import { registrarResultadoQuestao } from "../erros.js";
import { carregarIndice, filtrar, registrarRespostaNoIndice, ORDENACAO } from "../questoesIndex.js";

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
  // a essa especialidade antes de qualquer outro filtro, como já funcionava.
  const especialidadeInicial = query.categoria || "todas";
  const temas = [...new Set([...indice.questoesPorId.values()].filter((q) => especialidadeInicial === "todas" || q.especialidade === especialidadeInicial).map((q) => q.tema))].sort(
    (a, b) => a.localeCompare(b, "pt-BR")
  );
  const temaInicial = query.tema && temas.includes(query.tema) ? query.tema : "todos";

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Questões</div>
        <h1>Banco de questões</h1>
        <p class="page-header__desc">Questões com resolução comentada, filtráveis por tema e banca. Enunciados e comentários são material de estudo próprio, não de provas reais.</p>
        ${especialidadeInicial !== "todas" ? `<p style="margin-top:8px;font-size:var(--fs-sm);"><span class="badge badge--warning">Filtrado: ${escapeHtml(especialidadeInicial)}</span> <a href="#/residencia/questoes">Ver todas as questões</a></p>` : ""}
      </div>
      <div class="field" style="display:flex;gap:16px;flex-wrap:wrap;">
        <div style="flex:1;min-width:180px;">
          <label for="filtro-tema">Tema</label>
          <select id="filtro-tema">
            <option value="todos" ${temaInicial === "todos" ? "selected" : ""}>Todos os temas</option>
            ${temas.map((t) => `<option value="${escapeHtml(t)}" ${t === temaInicial ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}
          </select>
        </div>
        <div style="flex:1;min-width:180px;">
          <label for="filtro-banca">Banca</label>
          <select id="filtro-banca">
            <option value="todas">Todas as bancas</option>
            ${indice.bancas.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("")}
          </select>
        </div>
      </div>
      <p id="questoes-contagem" class="page-header__desc" style="margin-top:4px;"></p>
      <div id="questoes-lista" class="plan-queue"></div>
      <div id="questoes-sentinela" style="height:1px;"></div>
      <p id="questoes-carregando-mais" class="empty-state" style="display:none;">Carregando mais questões...</p>
    </div>
  `;

  const listaEl = container.querySelector("#questoes-lista");
  const contagemEl = container.querySelector("#questoes-contagem");
  const carregandoMaisEl = container.querySelector("#questoes-carregando-mais");
  const sentinelaEl = container.querySelector("#questoes-sentinela");
  const filtroTema = container.querySelector("#filtro-tema");
  const filtroBanca = container.querySelector("#filtro-banca");

  let idsFiltrados = [];
  let renderizados = 0;
  let observer = null;

  function filtrosAtuais() {
    return {
      especialidade: especialidadeInicial === "todas" ? undefined : especialidadeInicial,
      temaId: undefined, // filtramos por título de tema (compat com o select atual), não por id
      banca: filtroBanca.value === "todas" ? undefined : filtroBanca.value,
      ordenacao: ORDENACAO.RECENTES,
    };
  }

  function questaoPorTemaSelecionado(q) {
    return filtroTema.value === "todos" || q.tema === filtroTema.value;
  }

  function renderCard(id) {
    const q = indice.questoesPorId.get(id);
    return `
      <div class="card">
        <div class="list-card__top">
          <span class="badge badge--accent">${escapeHtml(q.tema)}</span>
          <span class="badge">${escapeHtml(q.banca)} · ${q.ano}</span>
          ${q.origem === "ia" ? '<span class="badge badge--ia">✨ IA</span>' : ""}
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
      });
    });
  }

  function atualizarContagem() {
    contagemEl.textContent = `${idsFiltrados.length} questão${idsFiltrados.length === 1 ? "" : "ões"} encontrada${idsFiltrados.length === 1 ? "" : "s"}${idsFiltrados.length ? ` · ${renderizados} exibida${renderizados === 1 ? "" : "s"}` : ""}`;
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
    // Reaplica os filtros combinando o índice (especialidade/banca) com o filtro por
    // título de tema, que ainda não está no shape de `filtrar()` (chega na Fase 2 da
    // reformulação, quando o filtro de tema passa a usar temaId via hierarquia real).
    idsFiltrados = filtrar(indice, filtrosAtuais()).filter((id) => questaoPorTemaSelecionado(indice.questoesPorId.get(id)));
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

  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) carregarProximoLote();
    },
    { rootMargin: "600px" }
  );
  observer.observe(sentinelaEl);

  filtroTema.addEventListener("change", refazerFiltro);
  filtroBanca.addEventListener("change", refazerFiltro);
  refazerFiltro();
}
