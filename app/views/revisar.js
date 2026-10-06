import { escapeHtml } from "../utils.js";
import { getRevisarHoje } from "../revisarHoje.js";
import { marcarRevisaoConcluida, hojeIso } from "../revisaoCurso.js";
import { definirContador } from "../components/sidebar.js";

const MOSTRAR_REVISOES = 8;

export async function renderRevisar(container) {
  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="skeleton skeleton-line" style="height:28px;width:40%;"></div>
      </div>
      <div class="stat-row">${Array.from({ length: 3 }, () => `<div class="skeleton" style="height:120px;"></div>`).join("")}</div>
    </div>`;

  const dados = await getRevisarHoje();
  definirContador("revisar", dados.total);

  const revisoes = dados.revisoesCurso.slice(0, MOSTRAR_REVISOES);
  const hoje = hojeIso();

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Revisar</div>
        <h1>${dados.total ? `${dados.total} ${dados.total === 1 ? "revisão" : "revisões"} para hoje` : "Tudo revisado por hoje"}</h1>
        <p class="page-header__desc">Tudo o que venceu hoje num lugar só: temas do Curso, questões que você errou e flashcards.</p>
      </div>

      <div class="revisar-grid">
        ${cartao({
          titulo: "Temas do Curso",
          numero: dados.revisoesCurso.length,
          descricao: "Revisões espaçadas (3, 5, 7, 15 e 30 dias) dos temas que você estudou.",
          cor: 1,
        })}
        ${cartao({
          titulo: "Questões erradas",
          numero: dados.erros.length,
          descricao: "Questões que você errou e voltaram para a fila de revisão.",
          cor: 2,
          link: "#/residencia/erros",
          acao: "Revisar questões",
        })}
        ${cartao({
          titulo: "Flashcards",
          numero: dados.flashcards.length,
          descricao: dados.flashcardsNovos ? `${dados.flashcardsNovos} cartões novos ainda não vistos.` : "Cartões que venceram hoje.",
          cor: 3,
          link: "#/residencia/flashcards",
          acao: dados.flashcards.length ? "Revisar flashcards" : "Estudar cartões novos",
        })}
      </div>

      ${
        revisoes.length
          ? `
        <section class="card" style="margin-top:24px;">
          <h2 style="font-size:var(--fs-lg);">Temas para revisar</h2>
          <ul class="revisar-lista">
            ${revisoes
              .map(
                (r) => `
              <li class="revisar-lista__item">
                <a href="#/residencia/conteudo/${encodeURIComponent(r.temaId)}" class="revisar-lista__tema">
                  <strong>${escapeHtml(r.tema.titulo)}</strong>
                  <span>Revisão de ${escapeHtml(r.tipo)}${r.dataAgendada < hoje ? ' · <span class="revisar-lista__atrasada">atrasada</span>' : ""}</span>
                </a>
                <button class="btn btn--secondary btn--sm" data-concluir-revisao="${escapeHtml(r.id)}">✓ Concluir</button>
              </li>`
              )
              .join("")}
          </ul>
          ${dados.revisoesCurso.length > MOSTRAR_REVISOES ? `<p class="page-header__desc">+${dados.revisoesCurso.length - MOSTRAR_REVISOES} outros temas na fila.</p>` : ""}
        </section>`
          : ""
      }
    </div>`;

  container.querySelectorAll("[data-concluir-revisao]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      await marcarRevisaoConcluida(btn.dataset.concluirRevisao);
      renderRevisar(container);
    })
  );
}

function cartao({ titulo, numero, descricao, cor, link, acao }) {
  return `
    <div class="card revisar-cartao" data-cor="${cor}">
      <div class="revisar-cartao__numero">${numero}</div>
      <div class="revisar-cartao__titulo">${titulo}</div>
      <p class="revisar-cartao__desc">${escapeHtml(descricao)}</p>
      ${link ? `<a class="btn ${numero ? "btn--primary" : "btn--secondary"} btn--sm" href="${link}">${acao}</a>` : ""}
    </div>`;
}
