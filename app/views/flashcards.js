import { escapeHtml, fetchJsonCached } from "../utils.js";
import { getFilaRevisao, registrarRevisaoFlashcard, gerarCardsDeQuestoes, QUALIDADE, BARALHO_SESPE, BARALHO_CURSO, BARALHO_QUESTOES } from "../flashcards.js";
import { getFocoCurso } from "../focoCurso.js";
import { getQuestoesEmRevisao } from "../erros.js";
import { carregarIndiceBanco, obterQuestoes } from "../bancoQuestoes.js";

const CARDS_POR_TEMA = 20;

/** Questões que a pessoa errou (todas) ou, com tema, até 20 do tema — erradas primeiro, depois as mais recentes. */
async function questoesParaGerarCards(temaId) {
  const { vencidas, proximas } = await getQuestoesEmRevisao();
  const erradas = [...vencidas, ...proximas].map((i) => i.questao);
  if (!temaId) return erradas;
  const doTema = erradas.filter((q) => q.temaId === temaId);
  const { registros } = await carregarIndiceBanco();
  const ids = registros
    .filter((r) => r.temaId === temaId && !r.anulada && !doTema.some((q) => q.id === r.id))
    .sort((a, b) => (b.ano || 0) - (a.ano || 0))
    .slice(0, Math.max(0, CARDS_POR_TEMA - doTema.length))
    .map((r) => r.id);
  const porId = await obterQuestoes(ids);
  return [...doTema, ...ids.map((id) => porId.get(id)).filter(Boolean)];
}

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

export async function renderFlashcards(container, params, query = {}) {
  let estado = "config"; // config | revisando | resumo
  const temaIdFiltro = query.tema || null;
  // Com o Curso ativo, o baralho padrão é o do Curso (temas da semana + já estudados).
  const focoCurso = temaIdFiltro ? null : await getFocoCurso().catch(() => null);
  const baralhosValidos = [BARALHO_SESPE, BARALHO_QUESTOES, ...(focoCurso ? [BARALHO_CURSO] : [])];
  let baralho = baralhosValidos.includes(query.baralho) ? query.baralho : focoCurso ? BARALHO_CURSO : "todos";
  let novosPorSessao = lerNovosPorSessao();
  let fila = [];
  let indiceAtual = 0;
  let mostrandoVerso = false;
  const resultado = { naoLembrei: 0, lembrei: 0, facil: 0 };
  let temaPorId = new Map();

  async function montar() {
    if (estado === "config") return montarConfig();
    if (estado === "revisando") return montarRevisao();
    return montarResumo();
  }

  async function montarConfig() {
    const [{ revisoes, novos, futuros, total }, temas] = await Promise.all([
      getFilaRevisao({
        temaId: temaIdFiltro || undefined,
        baralho,
        temaIdsCurso: focoCurso?.temaIdsCurso,
        temaIdsPrioritarios: focoCurso?.temaIdsSemana,
      }),
      fetchJsonCached("data/temas.json"),
    ]);
    temaPorId = new Map(temas.map((t) => [t.id, t]));

    if (!total && baralho === "todos") {
      container.innerHTML = `
        <div class="main__container">
          <div class="page-header">
            <div class="page-header__eyebrow">Residência — Flashcards</div>
            <h1>Flashcards</h1>
          </div>
          <div class="empty-state">
            <h2>Ainda sem flashcards ${temaIdFiltro ? "para este tema" : "cadastrados"}</h2>
            <p>Os flashcards cobrem os temas de maior prioridade de prova primeiro — mais temas vão sendo adicionados aos poucos.</p>
            <a class="btn btn--secondary" href="#/residencia/conteudo" style="margin-top:12px;">Voltar para Conteúdo</a>
          </div>
        </div>
      `;
      return;
    }

    const tema = temaIdFiltro ? temaPorId.get(temaIdFiltro) : null;
    const novosDaSessao = Math.min(novos.length, novosPorSessao);
    const tamanhoSessao = revisoes.length + novosDaSessao;

    container.innerHTML = `
      <div class="main__container">
        <div class="page-header">
          <div class="page-header__eyebrow">Residência — Flashcards</div>
          <h1>${tema ? `Flashcards — ${escapeHtml(tema.titulo)}` : "Flashcards"}</h1>
          <p class="page-header__desc">${
            baralho === BARALHO_CURSO
              ? `Foco no Curso: cards dos temas da semana ${focoCurso.semana} primeiro, e revisão dos temas do Curso que você já estudou.`
              : "Frente e verso com repetição espaçada — erre e o card volta rápido; acerte e o intervalo cresce. Os cards novos entram aos poucos, começando pelos temas que mais caem na prova."
          }</p>
        </div>

        <div class="tag-filter-bar" role="group" aria-label="Baralho" style="margin-bottom:16px;">
          ${focoCurso ? `<button type="button" class="tag-filter${baralho === BARALHO_CURSO ? " is-active" : ""}" data-baralho="${BARALHO_CURSO}" aria-pressed="${baralho === BARALHO_CURSO}">📘 Curso — semana ${focoCurso.semana}</button>` : ""}
          <button type="button" class="tag-filter${baralho === "todos" ? " is-active" : ""}" data-baralho="todos" aria-pressed="${baralho === "todos"}">Todos os cards</button>
          <button type="button" class="tag-filter${baralho === BARALHO_SESPE ? " is-active" : ""}" data-baralho="${BARALHO_SESPE}" aria-pressed="${baralho === BARALHO_SESPE}">Mais cobrados IAUPE/SES-PE</button>
          <button type="button" class="tag-filter${baralho === BARALHO_QUESTOES ? " is-active" : ""}" data-baralho="${BARALHO_QUESTOES}" aria-pressed="${baralho === BARALHO_QUESTOES}">Das minhas questões</button>
        </div>

        <div class="card" style="margin-bottom:20px;display:flex;flex-wrap:wrap;align-items:center;gap:12px;justify-content:space-between;">
          <p style="margin:0;font-size:var(--fs-sm);color:var(--color-text-secondary);min-width:0;flex:1 1 240px;">${
            tema
              ? `Gere cards a partir das questões deste tema: as que você errou primeiro, depois as provas mais recentes (até ${CARDS_POR_TEMA}).`
              : "Gere cards a partir das questões que você errou: a frente é o caso, o verso é a resposta com o comentário. Também dá para criar um card de qualquer questão logo depois de responder."
          }</p>
          <button type="button" class="btn btn--secondary" id="btn-gerar-cards">${tema ? "Gerar cards deste tema" : "Gerar cards dos meus erros"}</button>
          <p id="gerar-cards-status" role="status" style="margin:0;width:100%;font-size:var(--fs-xs);color:var(--color-text-muted);" hidden></p>
        </div>

        <div class="stat-row" style="margin-bottom:24px;">
          <div class="stat-tile"><div class="stat-tile__value">${revisoes.length}</div><div class="stat-tile__label">Revisões para hoje</div></div>
          <div class="stat-tile"><div class="stat-tile__value">${novos.length}</div><div class="stat-tile__label">Cards novos</div></div>
          <div class="stat-tile"><div class="stat-tile__value">${futuros.length}</div><div class="stat-tile__label">Em dia (revisão futura)</div></div>
          <div class="stat-tile"><div class="stat-tile__value">${total}</div><div class="stat-tile__label">Cards ${tema ? "deste tema" : "no baralho"}</div></div>
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
            : baralho === BARALHO_QUESTOES && !total
            ? `<div class="empty-state"><h2>Nenhum card gerado de questões ainda</h2><p>Use o botão acima para gerar cards das questões que você errou.</p></div>`
            : baralho === BARALHO_CURSO && !total
            ? `<div class="empty-state"><h2>Sem flashcards para os temas do Curso ainda</h2><p>Os temas da semana ${focoCurso.semana} ainda não têm cards. Use "Todos os cards" enquanto isso.</p></div>`
            : `<div class="empty-state"><h2>Tudo revisado por hoje ✓</h2><p>Nenhum card vencido agora. Volte mais tarde.</p></div>`
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

    container.querySelector("#btn-gerar-cards")?.addEventListener("click", async (e) => {
      const botao = e.currentTarget;
      const status = container.querySelector("#gerar-cards-status");
      botao.disabled = true;
      status.hidden = false;
      status.textContent = "Gerando cards...";
      try {
        const criados = await gerarCardsDeQuestoes(await questoesParaGerarCards(temaIdFiltro));
        if (!criados) {
          status.textContent = temaIdFiltro ? "Essas questões já viraram card." : "Nenhuma questão errada nova para virar card.";
          botao.disabled = false;
          return;
        }
        baralho = BARALHO_QUESTOES;
        await montar();
        const novoStatus = container.querySelector("#gerar-cards-status");
        novoStatus.hidden = false;
        novoStatus.textContent = `${criados} card${criados > 1 ? "s" : ""} criado${criados > 1 ? "s" : ""}.`;
      } catch {
        status.textContent = "Não foi possível gerar os cards agora. Tente de novo.";
        botao.disabled = false;
      }
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
      resultado.naoLembrei = 0;
      resultado.lembrei = 0;
      resultado.facil = 0;
      estado = "revisando";
      montar();
    });
  }

  function montarRevisao() {
    const { card, estado: estadoCard } = fila[indiceAtual];
    const temaDoCard = temaPorId.get(card.temaId);

    container.innerHTML = `
      <div class="main__container">
        <div class="page-header">
          <div class="page-header__eyebrow">Flashcard ${indiceAtual + 1} de ${fila.length}${estadoCard ? "" : " · novo"}</div>
          <p class="page-header__desc" style="margin-top:4px;">${temaDoCard ? escapeHtml(temaDoCard.titulo) : ""}${
            card.banca ? ` <span class="badge" style="margin-left:6px;">${escapeHtml(card.banca)}</span>` : ""
          }</p>
        </div>

        <div class="card" style="min-height:220px;display:flex;flex-direction:column;justify-content:center;text-align:center;padding:32px;">
          <p class="enunciado-texto" style="font-size:var(--fs-md);font-weight:500;margin:0;${card.origem === "questao" && !card.geradoPorIA ? "text-align:left;" : ""}">${escapeHtml(card.frente)}</p>
          ${
            mostrandoVerso
              ? `<div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--color-border);"><p class="enunciado-texto" style="color:var(--color-text-secondary);margin:0;${card.origem === "questao" && !card.geradoPorIA ? "text-align:left;" : ""}">${escapeHtml(card.verso)}</p></div>`
              : ""
          }
        </div>

        ${
          mostrandoVerso
            ? `
          <div class="btn-row" style="margin-top:20px;justify-content:center;">
            <button class="btn btn--secondary" id="btn-nao-lembrei">Não lembrei</button>
            <button class="btn btn--secondary" id="btn-lembrei">Lembrei</button>
            <button class="btn btn--primary" id="btn-facil">Fácil</button>
          </div>`
            : `<button class="btn btn--primary" id="btn-mostrar" style="margin-top:20px;display:block;margin-left:auto;margin-right:auto;">Mostrar resposta</button>`
        }
      </div>
    `;

    container.querySelector("#btn-mostrar")?.addEventListener("click", () => {
      mostrandoVerso = true;
      montarRevisao();
    });

    container.querySelector("#btn-nao-lembrei")?.addEventListener("click", () => avaliar("naoLembrei"));
    container.querySelector("#btn-lembrei")?.addEventListener("click", () => avaliar("lembrei"));
    container.querySelector("#btn-facil")?.addEventListener("click", () => avaliar("facil"));
  }

  async function avaliar(tipo) {
    const { card } = fila[indiceAtual];
    await registrarRevisaoFlashcard(card.id, QUALIDADE[tipo]);
    resultado[tipo] += 1;
    indiceAtual += 1;
    mostrandoVerso = false;
    if (indiceAtual >= fila.length) {
      estado = "resumo";
    }
    await montar();
  }

  function montarResumo() {
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
