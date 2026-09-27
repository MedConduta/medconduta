import { escapeHtml, fetchJsonCached } from "../utils.js";
import { getFilaRevisao, registrarRevisaoFlashcard, QUALIDADE } from "../flashcards.js";

export async function renderFlashcards(container, params, query = {}) {
  let estado = "config"; // config | revisando | resumo
  const temaIdFiltro = query.tema || null;
  let fila = [];
  let indiceAtual = 0;
  let mostrandoVerso = false;
  const resultado = { naoLembrei: 0, lembrei: 0, facil: 0 };

  async function montar() {
    if (estado === "config") return montarConfig();
    if (estado === "revisando") return montarRevisao();
    return montarResumo();
  }

  async function montarConfig() {
    const [{ vencidos, futuros, total }, temas] = await Promise.all([
      getFilaRevisao(temaIdFiltro ? { temaId: temaIdFiltro } : {}),
      fetchJsonCached("data/temas.json"),
    ]);

    if (!total) {
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

    const tema = temaIdFiltro ? temas.find((t) => t.id === temaIdFiltro) : null;

    container.innerHTML = `
      <div class="main__container">
        <div class="page-header">
          <div class="page-header__eyebrow">Residência — Flashcards</div>
          <h1>${tema ? `Flashcards — ${escapeHtml(tema.titulo)}` : "Flashcards"}</h1>
          <p class="page-header__desc">Frente e verso com repetição espaçada — erre e o card volta rápido; acerte e o intervalo cresce, igual à revisão de erros.</p>
        </div>

        <div class="stat-row" style="margin-bottom:24px;">
          <div class="stat-tile"><div class="stat-tile__value">${vencidos.length}</div><div class="stat-tile__label">Para revisar agora</div></div>
          <div class="stat-tile"><div class="stat-tile__value">${total}</div><div class="stat-tile__label">Cards ${tema ? "deste tema" : "no total"}</div></div>
          <div class="stat-tile"><div class="stat-tile__value">${futuros.length}</div><div class="stat-tile__label">Ainda não vencidos</div></div>
        </div>

        ${
          vencidos.length
            ? `<button class="btn btn--primary" id="btn-revisar">Revisar ${vencidos.length} card${vencidos.length > 1 ? "s" : ""} agora</button>`
            : `<div class="empty-state"><h2>Tudo revisado por hoje ✓</h2><p>Nenhum card vencido agora. Volte mais tarde.</p></div>`
        }
        ${tema ? `<a class="btn btn--ghost" href="#/residencia/conteudo/${tema.id}" style="margin-top:12px;">← Voltar para ${escapeHtml(tema.titulo)}</a>` : ""}
      </div>
    `;

    container.querySelector("#btn-revisar")?.addEventListener("click", () => {
      fila = [...vencidos];
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
    const { card } = fila[indiceAtual];

    container.innerHTML = `
      <div class="main__container">
        <div class="page-header">
          <div class="page-header__eyebrow">Flashcard ${indiceAtual + 1} de ${fila.length}</div>
        </div>

        <div class="card" style="min-height:220px;display:flex;flex-direction:column;justify-content:center;text-align:center;padding:32px;">
          <p style="font-size:var(--fs-md);font-weight:500;margin:0;">${escapeHtml(card.frente)}</p>
          ${
            mostrandoVerso
              ? `<div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--color-border);"><p style="color:var(--color-text-secondary);margin:0;">${escapeHtml(card.verso)}</p></div>`
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
