import { escapeHtml } from "../utils.js";
import { gerarGradeCurso, getAgendaHoje, getDashboardCurso, recomecarCurso } from "../curriculo.js";
import { marcarRevisaoConcluida } from "../revisaoCurso.js";
import { infoPrioridade, badgePrioridade } from "../prioridadeProva.js";
import { statTile } from "../components/statTile.js";

/**
 * Curso — gerenciador de estudos sobre o cronograma real (ver app/curriculo.js
 * e app/revisaoCurso.js): dashboard, agenda de Hoje (atrasadas/hoje/conteúdo
 * novo) e a grade por semana, com busca/filtro. Cada tema aqui é só um link
 * pro conteúdo que já existe em Conteúdo/Questões — nada é
 * duplicado, só organizado.
 */
export async function renderCurso(container, _params = {}, query = {}) {
  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="skeleton skeleton-line skeleton-line--short" style="height:12px;width:200px;"></div>
        <div class="skeleton skeleton-line" style="height:28px;width:50%;margin-top:8px;"></div>
      </div>
      <div class="stat-row">
        ${Array.from({ length: 4 }, () => `<div class="skeleton" style="height:76px;"></div>`).join("")}
      </div>
      ${Array.from(
        { length: 3 },
        () => `
        <div class="skeleton-card">
          <div class="skeleton skeleton-line skeleton-line--short"></div>
          <div class="skeleton skeleton-line"></div>
        </div>`
      ).join("")}
    </div>
  `;

  const [grade, agenda, dashboard] = await Promise.all([gerarGradeCurso(), getAgendaHoje(), getDashboardCurso()]);

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Residência — Curso</div>
        <h1>Curso</h1>
        <p class="page-header__desc">Cronograma do MEDCURSO 2026 semana a semana (45 semanas, aulas com seus resumos), com revisão espaçada automática. Marque o tema como estudado em <a href="#/residencia/conteudo">Conteúdo</a> — progresso e revisões aparecem aqui sozinhos.</p>
      </div>

      ${renderDashboard(dashboard)}
      ${renderInicioCurso(dashboard.inicioReal)}
      ${renderHoje(agenda)}

      <div class="card" style="margin-bottom:24px;">
        <div class="field">
          <label for="curso-busca">Buscar tema</label>
          <input type="search" id="curso-busca" placeholder="Ex.: hipertensão, DRC..." />
        </div>
        <div class="curso-filtros">
          <div class="field">
            <label for="curso-filtro-categoria">Disciplina</label>
            <select id="curso-filtro-categoria"></select>
          </div>
          <div class="field">
            <label for="curso-filtro-status">Status</label>
            <select id="curso-filtro-status">
              <option value="todos">Todos os status</option>
              <option value="nao-iniciado">Não iniciado</option>
              <option value="em-andamento">Em andamento</option>
              <option value="concluido">Concluído</option>
            </select>
          </div>
        </div>
      </div>

      <div class="content-tree" id="curso-semanas">
        ${grade.semanas.map((semana) => renderSemana(semana)).join("")}
      </div>
    </div>
  `;

  // ---------- Busca + filtro (client-side sobre a grade já montada) ----------
  const categorias = [...new Set(grade.todosOsItens.map((i) => i.categoria))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const selectCategoria = container.querySelector("#curso-filtro-categoria");
  selectCategoria.innerHTML = `<option value="todas">Todas as disciplinas</option>${categorias
    .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
    .join("")}`;

  const buscaInput = container.querySelector("#curso-busca");
  const selectStatus = container.querySelector("#curso-filtro-status");
  const semanasEl = container.querySelector("#curso-semanas");

  function statusDoItem(item) {
    if (item.percentual === 100) return "concluido";
    if (item.resumoConcluido || item.questoesFeitas) return "em-andamento";
    return "nao-iniciado";
  }

  function aplicarFiltro() {
    const termo = buscaInput.value.trim().toLowerCase();
    const categoria = selectCategoria.value;
    const status = selectStatus.value;

    semanasEl.querySelectorAll("[data-semana-card]").forEach((card) => {
      let algumVisivel = false;
      card.querySelectorAll("[data-item]").forEach((li) => {
        const matchTexto = !termo || li.dataset.titulo.includes(termo);
        const matchCategoria = categoria === "todas" || li.dataset.categoria === categoria;
        const matchStatus = status === "todos" || li.dataset.status === status;
        const visivel = matchTexto && matchCategoria && matchStatus;
        li.hidden = !visivel;
        if (visivel) algumVisivel = true;
      });
      card.querySelectorAll("[data-aula-grupo]").forEach((grupo) => {
        grupo.hidden = ![...grupo.querySelectorAll("[data-item]")].some((li) => !li.hidden);
      });
      card.hidden = !algumVisivel;
    });
  }

  buscaInput.addEventListener("input", aplicarFiltro);
  selectCategoria.addEventListener("change", aplicarFiltro);
  selectStatus.addEventListener("change", aplicarFiltro);

  // Anota cada item com o status calculado (usado pelo filtro acima) — feito
  // aqui em vez de no template pra não duplicar a lógica de statusDoItem.
  container.querySelectorAll("[data-item]").forEach((li) => {
    li.dataset.status = statusDoItem(grade.todosOsItens.find((i) => i.temaId === li.dataset.temaId));
  });

  // ---------- Volta de um tema aberto pela grade: reabre e mostra a mesma semana ----------
  if (query.semana) {
    const card = semanasEl.querySelector(`[data-semana="${CSS.escape(query.semana)}"]`);
    if (card) {
      card.open = true;
      requestAnimationFrame(() => card.scrollIntoView({ block: "start" }));
    }
  }

  // ---------- Botão "Começar" — leva ao primeiro item pendente da agenda ----------
  const btnComecar = container.querySelector("#btn-curso-comecar");
  if (btnComecar) {
    btnComecar.addEventListener("click", () => {
      window.location.hash = btnComecar.dataset.href;
    });
  }

  // ---------- Concluir revisão direto da agenda de Hoje ----------
  container.querySelectorAll("[data-concluir-revisao]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await marcarRevisaoConcluida(btn.dataset.concluirRevisao);
      renderCurso(container);
    });
  });

  // ---------- Ajustar a data de início do cronograma ----------
  const formInicio = container.querySelector("#form-curso-inicio");
  if (formInicio) {
    formInicio.addEventListener("submit", async (e) => {
      e.preventDefault();
      const novaData = container.querySelector("#curso-inicio-data").value;
      if (!novaData) return;
      const confirmou = confirm(
        `Mudar o início do curso para ${formatarData(novaData)} recomeça o Curso do zero: apaga os temas marcados como estudados, as semanas concluídas e as revisões do cronograma.\n\nSeu progresso em questões e flashcards continua intacto.\n\nDeseja continuar?`
      );
      if (!confirmou) {
        container.querySelector("#curso-inicio-data").value = dashboard.inicioReal;
        return;
      }
      const botao = formInicio.querySelector("button[type=submit]");
      botao.disabled = true;
      botao.textContent = "Recomeçando...";
      await recomecarCurso(novaData);
      renderCurso(container);
    });
  }
}

function renderDashboard(d) {
  return `
    <div class="card" style="margin-bottom:24px;">
      <div class="list-card__top" style="margin-bottom:8px;">
        <strong>Progresso do curso</strong>
        <span class="badge badge--accent">${d.totalConcluidos} / ${d.totalTemas} temas</span>
      </div>
      ${renderBarraProgresso(d.percentualGeral)}
      <div class="stat-row" style="margin-top:16px;">
        ${statTile({ value: d.revisoesHoje, label: "Revisões hoje", icone: "clock", tom: "accent" })}
        ${statTile({ value: d.revisoesAtrasadas, label: "Revisões atrasadas", icone: "alert-circle", tom: "danger" })}
        ${statTile({ value: d.totalQuestoesRespondidas, label: "Questões feitas", icone: "checklist", tom: "accent" })}
        ${statTile({ value: `${d.percentualAcerto ?? "—"}${d.percentualAcerto !== null ? "%" : ""}`, label: "Taxa de acerto", icone: "chart-bar", tom: "success" })}
      </div>
    </div>
  `;
}

function renderInicioCurso(inicioReal) {
  return `
    <div class="card" style="margin-bottom:24px;">
      <form id="form-curso-inicio" style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;">
        <div class="field" style="width:220px;max-width:100%;">
          <label for="curso-inicio-data">Início do curso (Semana 1)</label>
          <input type="date" id="curso-inicio-data" value="${escapeHtml(inicioReal)}" />
        </div>
        <button class="btn btn--secondary" type="submit">Salvar</button>
      </form>
      <p style="color:var(--color-text-secondary);font-size:var(--fs-xs);margin-top:8px;">Mudar essa data recomeça o Curso do zero: zera temas estudados, semanas concluídas e revisões do cronograma. Questões e flashcards não são afetados.</p>
    </div>
  `;
}

function renderHoje(agenda) {
  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
  const totalAtrasadas = agenda.atrasadas.conteudo.length + agenda.atrasadas.revisoes.length;
  const totalHoje = agenda.hoje.conteudo.length + agenda.hoje.revisoes.length;

  const primeiroLink =
    agenda.atrasadas.revisoes[0]?.tema?.temaId ||
    agenda.atrasadas.conteudo[0]?.temaId ||
    agenda.hoje.revisoes[0]?.tema?.temaId ||
    agenda.hoje.conteudo[0]?.temaId ||
    null;

  if (!agenda.totalPendenteHoje) {
    return `
      <div class="card" style="margin-bottom:24px;border-left:4px solid var(--color-success);">
        <div class="list-card__top"><span class="badge badge--tratamento">📅 Hoje, ${hoje}</span></div>
        <p style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:8px;">Tudo em dia — nenhum conteúdo novo ou revisão pendente pra hoje.</p>
      </div>
    `;
  }

  return `
    <div class="card" style="margin-bottom:24px;border-left:4px solid var(--color-accent);">
      <div class="list-card__top">
        <span class="badge badge--accent">📅 Hoje, ${hoje}</span>
        ${primeiroLink ? `<button class="btn btn--primary" id="btn-curso-comecar" data-href="#/residencia/conteudo/${primeiroLink}?de=curso">Começar</button>` : ""}
      </div>
      <div class="stat-row" style="margin-top:12px;">
        <div class="stat-tile"><div class="stat-tile__value">${totalAtrasadas}</div><div class="stat-tile__label">🔴 Atrasadas</div></div>
        <div class="stat-tile"><div class="stat-tile__value">${totalHoje}</div><div class="stat-tile__label">🟠 Para hoje</div></div>
      </div>
      ${renderAgendaBloco("Atrasadas", agenda.atrasadas)}
      ${renderAgendaBloco("Hoje", agenda.hoje)}
    </div>
  `;
}

function renderAgendaBloco(titulo, bloco) {
  if (!bloco.conteudo.length && !bloco.revisoes.length) return "";
  return `
    <div style="margin-top:16px;">
      <div style="font-weight:var(--fw-semibold);font-size:var(--fs-sm);margin-bottom:8px;">${titulo}</div>
      <div class="plan-queue">
        ${bloco.conteudo
          .map(
            (item) => `
          <a class="plan-item card--interactive" href="#/residencia/conteudo/${item.temaId}?de=curso" style="text-decoration:none;color:inherit;">
            <span class="plan-item__duration">📚</span>
            <span><strong>${escapeHtml(item.titulo)}</strong><br /><span style="color:var(--color-text-secondary);font-size:var(--fs-sm);">${escapeHtml(item.categoria)} — conteúdo novo</span></span>
          </a>`
          )
          .join("")}
        ${bloco.revisoes
          .map((r) =>
            r.tema
              ? `
          <div class="plan-item" style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <a href="#/residencia/conteudo/${r.temaId}?de=curso" style="text-decoration:none;color:inherit;flex:1;">
              <span class="plan-item__duration">🔄 ${r.tipo}</span>
              <span><strong>${escapeHtml(r.tema.titulo)}</strong><br /><span style="color:var(--color-text-secondary);font-size:var(--fs-sm);">Revisão — estudado em ${formatarData(r.dataEstudo)}</span></span>
            </a>
            <button class="btn btn--secondary" data-concluir-revisao="${r.id}" style="white-space:nowrap;">✓ Concluir</button>
          </div>`
              : ""
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderSemana(semana) {
  // Agrupa os temas da semana pela aula do MEDCURSO (ordem do cronograma).
  const grupos = [];
  for (const item of semana.itens) {
    const chave = item.aula || "";
    let grupo = grupos.find((g) => g.aula === chave);
    if (!grupo) grupos.push((grupo = { aula: chave, topicos: item.aulaTopicos || [], itens: [] }));
    grupo.itens.push(item);
  }
  return `
    <details class="card content-area" data-semana-card data-semana="${semana.numero}" ${semana.numero <= 2 ? "open" : ""}>
      <summary class="content-area__title">
        ${semana.extra ? `Semana extra ${semana.numero - 50}` : `Semana ${semana.numero}`}
        <span class="content-area__count">${semana.concluidos}/${semana.total}</span>
      </summary>
      ${renderBarraProgresso(semana.percentual)}
      ${grupos
        .map(
          (g) => `
        <div class="curso-aula" data-aula-grupo>
          ${g.aula ? `<h3 class="curso-aula__titulo">${escapeHtml(g.aula)}</h3>` : ""}
          ${g.topicos.length ? `<p class="curso-aula__topicos">${g.topicos.map(escapeHtml).join(" · ")}</p>` : ""}
          <ul class="content-list">
            ${g.itens.map((item) => renderItem(item, semana.numero)).join("")}
          </ul>
        </div>`
        )
        .join("")}
    </details>
  `;
}

function renderItem(item, semanaNumero) {
  const etapa = (aplicavel, feito, label) => (aplicavel ? `<span style="opacity:${feito ? 1 : 0.45};">${feito ? "✓" : "○"} ${label}</span>` : "");
  const prioridade = infoPrioridade(item.prioridadeProva);
  return `
    <li data-item data-tema-id="${item.temaId}" data-titulo="${escapeHtml(item.titulo.toLowerCase())}" data-categoria="${escapeHtml(item.categoria)}" class="curso-item ${prioridade.bordaClasse}">
      <a class="content-list__item" href="#/residencia/conteudo/${item.temaId}?de=curso&semana=${semanaNumero}">
        <span class="content-list__title">${item.percentual === 100 ? "✓ " : ""}${escapeHtml(item.titulo)}</span>
        <span style="display:flex;gap:10px;align-items:center;font-size:var(--fs-xs);color:var(--color-text-secondary);white-space:nowrap;">
          ${etapa(true, item.resumoConcluido, "Resumo")}
          ${etapa(item.temQuestoes, item.questoesFeitas, "Questões")}
          ${badgePrioridade(item.prioridadeProva)}
        </span>
      </a>
      ${item.temQuestoes ? `<a class="acao-mini acao-mini--link" href="#/residencia/questoes?temaId=${encodeURIComponent(item.temaId)}" aria-label="Questões de ${escapeHtml(item.titulo)}">Questões →</a>` : ""}
    </li>
  `;
}

function renderBarraProgresso(percentual) {
  return `
    <div style="background:var(--color-border);border-radius:999px;height:8px;overflow:hidden;">
      <div style="background:var(--color-accent);height:100%;width:${percentual}%;border-radius:999px;"></div>
    </div>
  `;
}

function formatarData(dataIso) {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}
