import { escapeHtml, fetchJsonCached, renderImagemEstudo } from "../utils.js";
import {
  getFilaRevisao,
  registrarRevisaoFlashcard,
  dominioPorTema,
  cardsDificeis,
  todosOsFlashcards,
  QUALIDADE,
  BARALHO_CURSO,
  BARALHO_SESPE,
  BARALHO_ENAMED,
  BARALHO_ERROS,
  BARALHO_DIFICEIS,
  BARALHO_QUESTOES,
} from "../flashcards.js";
import { getFocoCurso } from "../focoCurso.js";
import { AREA_POR_CATEGORIA } from "../areas.js";

const CHAVE_NOVOS_POR_SESSAO = "medconduta:flashcards_novos_por_sessao";
const OPCOES_NOVOS = [10, 20, 30, 50];

function lerNovosPorSessao() {
  try {
    const valor = Number(localStorage.getItem(CHAVE_NOVOS_POR_SESSAO));
    return OPCOES_NOVOS.includes(valor) ? valor : 20;
  } catch {
    return 20;
  }
}

function salvarNovosPorSessao(valor) {
  try {
    localStorage.setItem(CHAVE_NOVOS_POR_SESSAO, String(valor));
  } catch {
    /* preferência só deste aparelho — sem localStorage, volta ao padrão */
  }
}

const DESCRICAO_BARALHO = {
  [BARALHO_SESPE]: "Cards dos temas que a IAUPE/SES-PE mais cobra, do tema mais cobrado para o menos.",
  [BARALHO_ENAMED]: "Cards dos temas que o ENAMED e o ENARE mais cobram (mesma matriz), do mais cobrado para o menos.",
  [BARALHO_ERROS]: "Cards dos temas das questões que você errou, começando pelo tema em que você mais erra.",
  [BARALHO_DIFICEIS]: "Os cards que você já esqueceu duas vezes ou mais.",
  [BARALHO_QUESTOES]: "Cards antigos gerados a partir das suas questões.",
  todos: "Frente e verso com repetição espaçada: erre e o card volta rápido, acerte e o intervalo cresce. Os cards novos entram aos poucos, começando pelos temas que mais caem na prova.",
};

/** Frente de card de lacuna: {{termo}} vira um espaço até mostrar a resposta. */
function renderLacuna(texto, revelada) {
  return escapeHtml(texto).replace(/\{\{(.+?)\}\}/g, (_, termo) =>
    revelada ? `<mark class="fc-lacuna fc-lacuna--revelada">${termo}</mark>` : `<span class="fc-lacuna" aria-label="lacuna">${"_".repeat(Math.max(5, Math.min(14, termo.length)))}</span>`
  );
}

export async function renderFlashcards(container, params, query = {}) {
  let estado = "config"; // config | revisando | resumo
  const temaIdFiltro = query.tema || null;
  // Com o Curso ativo, o baralho padrão é o do Curso (temas da semana + já estudados).
  const focoCurso = temaIdFiltro ? null : await getFocoCurso().catch(() => null);
  const temNoAparelho = (await todosOsFlashcards()).some((c) => c.origem === "questao");
  const baralhosValidos = [
    BARALHO_SESPE,
    BARALHO_ENAMED,
    BARALHO_ERROS,
    BARALHO_DIFICEIS,
    ...(temNoAparelho ? [BARALHO_QUESTOES] : []),
    ...(focoCurso ? [BARALHO_CURSO] : []),
  ];
  let baralho = baralhosValidos.includes(query.baralho) ? query.baralho : focoCurso && !temaIdFiltro ? BARALHO_CURSO : "todos";
  let area = query.area || "";
  let novosPorSessao = lerNovosPorSessao();
  let fila = [];
  let indiceAtual = 0;
  let mostrandoVerso = false;
  let jaAvaliados = new Set(); // cards que voltaram na mesma sessão não mexem de novo no SM-2
  const resultado = { naoLembrei: 0, lembrei: 0, facil: 0 };
  let temaPorId = new Map();

  async function montar() {
    if (estado === "config") return montarConfig();
    if (estado === "revisando") return montarRevisao();
    return montarResumo();
  }

  function categoriasDaArea(temas) {
    if (!area) return null;
    if (area.startsWith("cat:")) return new Set([area.slice(4)]);
    return new Set(temas.map((t) => t.categoria).filter((c) => (AREA_POR_CATEGORIA[c] || "Outros") === area));
  }

  function seletorArea(temas) {
    const porArea = new Map();
    for (const c of new Set(temas.map((t) => t.categoria))) {
      const a = AREA_POR_CATEGORIA[c] || "Outros";
      if (!porArea.has(a)) porArea.set(a, []);
      porArea.get(a).push(c);
    }
    return `
      <div class="field fc-area">
        <label for="fc-area">Área</label>
        <select id="fc-area">
          <option value="">Todas as áreas</option>
          ${[...porArea.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(
              ([a, cats]) => `<optgroup label="${escapeHtml(a)}">
                <option value="${escapeHtml(a)}"${area === a ? " selected" : ""}>${escapeHtml(a)} — tudo</option>
                ${cats.length > 1 ? cats.sort().map((c) => `<option value="cat:${escapeHtml(c)}"${area === `cat:${c}` ? " selected" : ""}>${escapeHtml(c)}</option>`).join("") : ""}
              </optgroup>`
            )
            .join("")}
        </select>
      </div>`;
  }

  function chip(valor, rotulo) {
    const ativo = baralho === valor;
    return `<button type="button" class="tag-filter${ativo ? " is-active" : ""}" data-baralho="${valor}" aria-pressed="${ativo}">${rotulo}</button>`;
  }

  async function montarConfig() {
    const temas = await fetchJsonCached("data/temas.json");
    temaPorId = new Map(temas.map((t) => [t.id, t]));
    const { revisoes, novos, futuros, total, itens } = await getFilaRevisao({
      temaId: temaIdFiltro || undefined,
      baralho,
      categorias: temaIdFiltro ? null : categoriasDaArea(temas),
      temaIdsCurso: focoCurso?.temaIdsCurso,
      temaIdsPrioritarios: focoCurso?.temaIdsSemana,
    });

    const tema = temaIdFiltro ? temaPorId.get(temaIdFiltro) : null;
    const novosDaSessao = Math.min(novos.length, novosPorSessao);
    const tamanhoSessao = revisoes.length + novosDaSessao;
    const dominio = dominioPorTema(itens);
    const dificeis = cardsDificeis(itens);
    const dominados = dominio.reduce((s, t) => s + t.dominados, 0);

    const vazio =
      baralho === BARALHO_ERROS
        ? `<h2>Nenhum tema errado com cards ainda</h2><p>Quando você errar questões em Questões ou Simulados, os cards desses temas aparecem aqui.</p>`
        : baralho === BARALHO_DIFICEIS
        ? `<h2>Nenhum card difícil</h2><p>Os cards que você esquecer duas vezes ou mais vêm para cá.</p>`
        : baralho === BARALHO_CURSO
        ? `<h2>Sem flashcards para os temas do Curso ainda</h2><p>Os temas da semana ${focoCurso.semana} ainda não têm cards. Use "Todos os cards" enquanto isso.</p>`
        : `<h2>Ainda sem flashcards ${tema ? "para este tema" : "neste filtro"}</h2><p>Escolha outro baralho ou outra área.</p>`;

    container.innerHTML = `
      <div class="main__container" id="fc-config">
        <div class="page-header">
          <div class="page-header__eyebrow">Residência — Flashcards</div>
          <h1>${tema ? `Flashcards — ${escapeHtml(tema.titulo)}` : "Flashcards"}</h1>
          <p class="page-header__desc">${
            baralho === BARALHO_CURSO
              ? `Foco no Curso: cards dos temas da semana ${focoCurso.semana} primeiro, e revisão dos temas do Curso que você já estudou.`
              : DESCRICAO_BARALHO[baralho] || DESCRICAO_BARALHO.todos
          }</p>
        </div>

        <div class="tag-filter-bar" role="group" aria-label="Baralho" style="margin-bottom:12px;">
          ${focoCurso ? chip(BARALHO_CURSO, `📘 Curso — semana ${focoCurso.semana}`) : ""}
          ${chip("todos", "Todos os cards")}
          ${chip(BARALHO_SESPE, "Mais cobrados SES-PE")}
          ${chip(BARALHO_ENAMED, "Mais cobrados ENAMED")}
          ${chip(BARALHO_ERROS, "Temas que errei")}
          ${chip(BARALHO_DIFICEIS, "Mais esquecidos")}
          ${temNoAparelho ? chip(BARALHO_QUESTOES, "Das minhas questões") : ""}
        </div>
        ${tema ? "" : seletorArea(temas)}

        <div class="stat-row" style="margin:16px 0 24px;">
          <div class="stat-tile"><div class="stat-tile__value">${revisoes.length}</div><div class="stat-tile__label">Revisões para hoje</div></div>
          <div class="stat-tile"><div class="stat-tile__value">${novos.length}</div><div class="stat-tile__label">Cards novos</div></div>
          <div class="stat-tile"><div class="stat-tile__value">${futuros.length}</div><div class="stat-tile__label">Em dia (revisão futura)</div></div>
          <div class="stat-tile"><div class="stat-tile__value">${total ? Math.round((dominados / total) * 100) : 0}%</div><div class="stat-tile__label">Dominados (${dominados} de ${total})</div></div>
        </div>

        ${
          novos.length
            ? `<div class="field" style="max-width:280px;margin-bottom:20px;">
          <label for="novos-por-sessao">Cards novos por sessão</label>
          <select id="novos-por-sessao">
            ${OPCOES_NOVOS.map((n) => `<option value="${n}"${n === novosPorSessao ? " selected" : ""}>${n} novos</option>`).join("")}
          </select>
        </div>`
            : ""
        }

        ${
          tamanhoSessao
            ? `<button class="btn btn--primary" id="btn-revisar">Estudar ${tamanhoSessao} card${tamanhoSessao > 1 ? "s" : ""} agora</button>
          <p style="margin-top:8px;font-size:var(--fs-sm);color:var(--color-text-secondary);">${[
            revisoes.length ? `${revisoes.length} revis${revisoes.length > 1 ? "ões" : "ão"}` : "",
            novosDaSessao ? `${novosDaSessao} novo${novosDaSessao > 1 ? "s" : ""}` : "",
          ]
            .filter(Boolean)
            .join(" + ")}</p>`
            : `<div class="empty-state">${total ? `<h2>Tudo revisado por hoje ✓</h2><p>Nenhum card vencido agora. Volte mais tarde.</p>` : vazio}</div>`
        }

        ${
          dificeis.length
            ? `<details class="card fc-painel" open>
          <summary><strong>Cards que você mais esquece</strong> <span class="badge badge--danger">${dificeis.length}</span></summary>
          <ul class="fc-dificeis">
            ${dificeis
              .map(
                ({ card, estado: e }) => `<li>
              <span class="fc-dificeis__frente">${escapeHtml(card.frente.replace(/\{\{(.+?)\}\}/g, "___").slice(0, 140))}</span>
              <span class="fc-dificeis__meta">${escapeHtml(temaPorId.get(card.temaId)?.titulo || "")} · esqueceu ${e.erros}×</span>
            </li>`
              )
              .join("")}
          </ul>
          ${baralho === BARALHO_DIFICEIS ? "" : `<button type="button" class="btn btn--secondary" data-baralho="${BARALHO_DIFICEIS}">Estudar os mais esquecidos</button>`}
        </details>`
            : ""
        }

        ${
          !tema && dominio.length
            ? `<details class="card fc-painel"${dominio.length <= 12 ? " open" : ""}>
          <summary><strong>Domínio por tema</strong> <span class="fc-painel__dica">${dominio.length} temas · o menos dominado primeiro</span></summary>
          <ul class="fc-dominio">
            ${dominio
              .map((t) => {
                const pct = Math.round((t.dominados / t.total) * 100);
                const titulo = temaPorId.get(t.temaId)?.titulo || t.temaId;
                return `<li>
              <div class="fc-dominio__linha">
                <a href="#/residencia/flashcards?tema=${encodeURIComponent(t.temaId)}" class="fc-dominio__titulo">${escapeHtml(titulo)}</a>
                <span class="fc-dominio__num">${pct}% · ${t.vistos}/${t.total} vistos</span>
              </div>
              <div class="fc-barra" role="img" aria-label="${pct}% dominado"><span style="width:${pct}%"></span></div>
            </li>`;
              })
              .join("")}
          </ul>
        </details>`
            : ""
        }
        ${tema ? `<a class="btn btn--ghost" href="#/residencia/conteudo/${tema.id}" style="margin-top:12px;">← Voltar para ${escapeHtml(tema.titulo)}</a>` : ""}
      </div>
    `;

    container.querySelectorAll("[data-baralho]").forEach((botao) =>
      botao.addEventListener("click", () => {
        if (baralho === botao.dataset.baralho) return;
        baralho = botao.dataset.baralho;
        montar();
      })
    );

    container.querySelector("#fc-area")?.addEventListener("change", (e) => {
      area = e.target.value;
      montar();
    });

    container.querySelector("#novos-por-sessao")?.addEventListener("change", (e) => {
      novosPorSessao = Number(e.target.value);
      salvarNovosPorSessao(novosPorSessao);
      montar();
    });

    container.querySelector("#btn-revisar")?.addEventListener("click", () => {
      fila = [...revisoes, ...novos.slice(0, novosDaSessao)];
      indiceAtual = 0;
      mostrandoVerso = false;
      jaAvaliados = new Set();
      resultado.naoLembrei = 0;
      resultado.lembrei = 0;
      resultado.facil = 0;
      estado = "revisando";
      ligarTeclado();
      montar();
    });
  }

  function montarRevisao() {
    const { card, estado: estadoCard, repeticao } = fila[indiceAtual];
    const temaDoCard = temaPorId.get(card.temaId);
    const lacuna = card.tipo === "lacuna";
    const alinhamento = card.origem === "questao" ? "text-align:left;" : "";
    const frente = lacuna ? renderLacuna(card.frente, mostrandoVerso) : escapeHtml(card.frente);

    container.innerHTML = `
      <div class="main__container fc-sessao">
        <div class="page-header">
          <div class="page-header__eyebrow">Flashcard ${indiceAtual + 1} de ${fila.length}${repeticao ? " · de novo" : estadoCard ? "" : " · novo"}</div>
          <p class="page-header__desc" style="margin-top:4px;">${temaDoCard ? escapeHtml(temaDoCard.titulo) : ""}${
            card.fonteQuestao || card.banca ? ` <span class="badge" style="margin-left:6px;">${escapeHtml(card.fonteQuestao || card.banca)}</span>` : ""
          }</p>
        </div>
        <div class="fc-progresso" aria-hidden="true"><span style="width:${Math.round((indiceAtual / fila.length) * 100)}%"></span></div>

        <div class="card fc-card${mostrandoVerso ? "" : " fc-card--frente"}" id="fc-card">
          ${card.imagem ? renderImagemEstudo(card.imagem) : ""}
          <p class="enunciado-texto fc-card__frente" style="${alinhamento}">${frente}</p>
          ${
            mostrandoVerso && card.verso
              ? `<div class="fc-card__verso"><p class="enunciado-texto" style="${alinhamento}">${escapeHtml(card.verso)}</p></div>`
              : ""
          }
          ${
            mostrandoVerso && temaDoCard
              ? `<a class="fc-card__resumo" href="#/residencia/conteudo/${encodeURIComponent(card.temaId)}" target="_blank" rel="noopener">Ver no resumo ↗</a>`
              : ""
          }
        </div>

        ${
          mostrandoVerso
            ? `
          <div class="btn-row fc-botoes">
            <button class="btn btn--secondary" id="btn-nao-lembrei">Não lembrei <kbd>1</kbd></button>
            <button class="btn btn--secondary" id="btn-lembrei">Lembrei <kbd>2</kbd></button>
            <button class="btn btn--primary" id="btn-facil">Fácil <kbd>3</kbd></button>
          </div>`
            : `<button class="btn btn--primary fc-mostrar" id="btn-mostrar">Mostrar resposta <kbd>espaço</kbd></button>`
        }
        <p class="fc-dica">No celular: toque no card para virar; depois deslize para a esquerda (não lembrei) ou para a direita (lembrei).</p>
        <button type="button" class="btn btn--ghost" id="btn-encerrar" style="margin-top:8px;">Encerrar sessão</button>
      </div>
    `;

    container.querySelector("#btn-mostrar")?.addEventListener("click", mostrar);
    container.querySelector("#btn-nao-lembrei")?.addEventListener("click", () => avaliar("naoLembrei"));
    container.querySelector("#btn-lembrei")?.addEventListener("click", () => avaliar("lembrei"));
    container.querySelector("#btn-facil")?.addEventListener("click", () => avaliar("facil"));
    container.querySelector("#btn-encerrar").addEventListener("click", () => {
      estado = "resumo";
      montar();
    });
    ligarToque(container.querySelector("#fc-card"));
  }

  function mostrar() {
    if (estado !== "revisando" || mostrandoVerso) return;
    mostrandoVerso = true;
    montarRevisao();
  }

  function ligarToque(el) {
    let x0 = null;
    let y0 = null;
    el.addEventListener("touchstart", (e) => {
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
    }, { passive: true });
    el.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (mostrandoVerso && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) avaliar(dx < 0 ? "naoLembrei" : "lembrei");
    });
    el.addEventListener("click", (e) => {
      if (e.target.closest("a, button")) return;
      mostrar();
    });
  }

  function aoTeclar(e) {
    if (!container.isConnected || estado !== "revisando") {
      document.removeEventListener("keydown", aoTeclar);
      return;
    }
    if (e.target.closest?.("input, select, textarea") || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!mostrandoVerso && (e.key === " " || e.key === "Enter")) {
      e.preventDefault();
      mostrar();
    } else if (mostrandoVerso && ["1", "2", "3"].includes(e.key)) {
      e.preventDefault();
      avaliar(["naoLembrei", "lembrei", "facil"][Number(e.key) - 1]);
    }
  }

  function ligarTeclado() {
    document.removeEventListener("keydown", aoTeclar);
    document.addEventListener("keydown", aoTeclar);
  }

  let avaliando = false;
  async function avaliar(tipo) {
    if (avaliando) return;
    avaliando = true;
    try {
      const item = fila[indiceAtual];
      // Só a primeira resposta da sessão conta para o intervalo; o card esquecido
      // volta no fim da sessão até a pessoa lembrar.
      if (!jaAvaliados.has(item.card.id)) {
        await registrarRevisaoFlashcard(item.card.id, QUALIDADE[tipo]);
        jaAvaliados.add(item.card.id);
        resultado[tipo] += 1;
      }
      if (tipo === "naoLembrei") fila.push({ ...item, repeticao: true });
      indiceAtual += 1;
      mostrandoVerso = false;
      if (indiceAtual >= fila.length) estado = "resumo";
      await montar();
    } finally {
      avaliando = false;
    }
  }

  function montarResumo() {
    document.removeEventListener("keydown", aoTeclar);
    container.innerHTML = `
      <div class="main__container">
        <div class="page-header">
          <div class="page-header__eyebrow">Residência — Flashcards</div>
          <h1>Revisão concluída</h1>
        </div>
        <div class="stat-row" style="margin-bottom:24px;">
          <div class="stat-tile"><div class="stat-tile__value">${resultado.naoLembrei}</div><div class="stat-tile__label">Não lembrei</div></div>
          <div class="stat-tile"><div class="stat-tile__value">${resultado.lembrei}</div><div class="stat-tile__label">Lembrei</div></div>
          <div class="stat-tile"><div class="stat-tile__value">${resultado.facil}</div><div class="stat-tile__label">Fácil</div></div>
        </div>
        <button class="btn btn--primary" id="btn-voltar">Voltar</button>
      </div>
    `;
    container.querySelector("#btn-voltar").addEventListener("click", () => {
      estado = "config";
      montar();
    });
  }

  await montar();
}
