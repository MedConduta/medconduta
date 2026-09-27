/**
 * MedConduta — motivo do erro: ao errar uma questão, uma pergunta rápida de
 * "por quê?" pra separar problema de CONTEÚDO de problema de PROVA (leitura,
 * atenção, confusão entre alternativas parecidas). Campo opcional — não
 * quebra o contrato de `respostas` (que outras 11+ telas dependem).
 */

import { getItem, setItem } from "./db.js";
import { escapeHtml } from "./utils.js";

export const MOTIVOS_ERRO = {
  naoSabia: "Não sabia",
  confundiu: "Confundi com outra coisa",
  interpretacao: "Erro de interpretação",
  atencao: "Falta de atenção",
};

export function renderSeletorMotivoErro() {
  return `
    <div class="motivo-erro" data-motivo-erro>
      <span class="motivo-erro__label">Por que errou?</span>
      <div class="motivo-erro__opcoes">
        ${Object.entries(MOTIVOS_ERRO)
          .map(([chave, rotulo]) => `<button type="button" class="motivo-erro__btn" data-motivo="${chave}">${escapeHtml(rotulo)}</button>`)
          .join("")}
      </div>
    </div>`;
}

/** Liga os cliques do seletor renderizado em `rootEl`. `onEscolher(chave)` é chamado ao clicar. */
export function ligarSeletorMotivoErro(rootEl, onEscolher) {
  const wrap = rootEl?.querySelector("[data-motivo-erro]");
  if (!wrap) return;
  wrap.querySelectorAll("[data-motivo]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      wrap.querySelectorAll("[data-motivo]").forEach((b) => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      await onEscolher(btn.dataset.motivo);
    });
  });
}

/** Registra o motivo em um registro de `respostas` já salvo, sem tocar nos demais campos. */
export async function registrarMotivoErro(respostaId, motivo) {
  const registro = await getItem("respostas", respostaId);
  if (!registro) return;
  await setItem("respostas", { ...registro, motivoErro: motivo });
}
