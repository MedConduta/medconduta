/**
 * MedConduta — reportar problema em uma questão (botão ⚠️ ao lado do favorito).
 *
 * O reporte fica salvo na conta de quem reportou (store "reportes_questoes") e
 * o administrador vê todos os reportes na tela de Admin (rota /admin/reportes).
 */

import { escapeHtml } from "./utils.js";
import { setItem } from "./db.js";

const STORE_REPORTES = "reportes_questoes";

export const CATEGORIAS_REPORTE = [
  { id: "erro-geral", rotulo: "Erro geral (texto, digitação, formatação)" },
  { id: "gabarito", rotulo: "Erro no gabarito" },
  { id: "comentario", rotulo: "Erro no comentário" },
  { id: "desatualizada", rotulo: "Questão desatualizada" },
  { id: "faltando-informacoes", rotulo: "Faltando informações (imagem, alternativa, dados)" },
  { id: "classificacao", rotulo: "Classificada no tema errado" },
];

export function renderBotaoReportar(questaoId) {
  return `<button type="button" class="reportar-btn" data-reportar-id="${escapeHtml(questaoId)}" title="Reportar problema nesta questão" aria-label="Reportar problema nesta questão" aria-expanded="false">⚠️</button>`;
}

function renderPainel(questaoId) {
  const nome = `reporte-${questaoId}`;
  return `
    <div class="reportar-painel" data-reportar-painel="${escapeHtml(questaoId)}">
      <p class="reportar-painel__titulo">O que há de errado nesta questão?</p>
      <div class="reportar-painel__opcoes" role="radiogroup">
        ${CATEGORIAS_REPORTE.map(
          (c, i) => `
          <label class="reportar-painel__opcao">
            <input type="radio" name="${escapeHtml(nome)}" value="${c.id}" ${i === 0 ? "checked" : ""}>
            <span>${escapeHtml(c.rotulo)}</span>
          </label>`
        ).join("")}
      </div>
      <label class="reportar-painel__detalhe">
        <span>Detalhes (opcional)</span>
        <textarea rows="2" maxlength="1000" placeholder="Ex.: o gabarito oficial é a letra C; falta a imagem do ECG..."></textarea>
      </label>
      <div class="btn-row">
        <button type="button" class="btn btn--primary" data-reportar-enviar>Enviar reporte</button>
        <button type="button" class="btn btn--ghost" data-reportar-cancelar>Cancelar</button>
      </div>
      <p class="reportar-painel__status" role="status" hidden></p>
    </div>`;
}

/**
 * Liga o botão ⚠️ de um card. `cardEl` é o card da questão; o painel é inserido
 * logo depois do cabeçalho (`ancoraEl`) na primeira vez que o botão é clicado.
 */
export function ligarBotaoReportar(cardEl, ancoraEl, q) {
  const btn = cardEl?.querySelector(`.reportar-btn[data-reportar-id="${CSS.escape(q.id)}"]`);
  if (!btn) return;
  btn.addEventListener("click", () => {
    let painel = cardEl.querySelector(`[data-reportar-painel="${CSS.escape(q.id)}"]`);
    if (painel) {
      painel.hidden = !painel.hidden;
      btn.setAttribute("aria-expanded", String(!painel.hidden));
      return;
    }
    (ancoraEl || btn.parentElement).insertAdjacentHTML("afterend", renderPainel(q.id));
    painel = cardEl.querySelector(`[data-reportar-painel="${CSS.escape(q.id)}"]`);
    btn.setAttribute("aria-expanded", "true");

    painel.querySelector("[data-reportar-cancelar]").addEventListener("click", () => {
      painel.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    });
    painel.querySelector("[data-reportar-enviar]").addEventListener("click", async (e) => {
      const enviar = e.currentTarget;
      const status = painel.querySelector(".reportar-painel__status");
      const categoria = painel.querySelector("input[type=radio]:checked")?.value || "erro-geral";
      const detalhe = painel.querySelector("textarea").value.trim();
      enviar.disabled = true;
      status.hidden = false;
      status.textContent = "Enviando...";
      try {
        await setItem(STORE_REPORTES, {
          id: `${q.id}-${Date.now()}`,
          questaoId: q.id,
          codigo: q.codigo || null,
          instituicao: q.instituicao || null,
          ano: q.ano ?? null,
          temaId: q.temaId || null,
          tema: q.tema || null,
          categoria,
          detalhe,
          criadoEm: new Date().toISOString(),
        });
        painel.innerHTML = `<p class="reportar-painel__ok">✓ Obrigado! O reporte foi enviado e a questão será revisada.</p>`;
        btn.classList.add("is-ativo");
        btn.title = "Você já reportou esta questão";
      } catch {
        enviar.disabled = false;
        status.textContent = "Não foi possível enviar agora. Tente de novo.";
      }
    });
  });
}
