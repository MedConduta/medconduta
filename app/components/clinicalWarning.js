import { escapeHtml } from "../utils.js";

/**
 * Banner obrigatório em toda tela de conteúdo clínico (residência ou guia de bolso).
 * Reforça que os dados são placeholder de estudo e precisam de validação por fonte
 * oficial e revisão de médico responsável antes de qualquer uso assistencial real.
 */
export function renderClinicalWarning({ revisado = false, fonte = "" } = {}) {
  const statusHtml = revisado
    ? `<span class="validation-flag validation-flag--ok">✓ Marcado como revisado${fonte ? ` — fonte: ${escapeHtml(fonte)}` : ""}</span>`
    : `<span class="validation-flag validation-flag--pending">⚠ Ainda não revisado por profissional responsável</span>`;

  return `
    <div class="clinical-warning" role="note">
      <span class="clinical-warning__icon" aria-hidden="true">⚠</span>
      <div>
        <strong>Conteúdo de estudo — rascunho a validar.</strong>
        Doses, condutas e fluxos aqui apresentados são placeholders para fins de organização de estudo
        e <strong>não substituem bula, protocolo institucional ou diretriz oficial</strong>.
        Confira sempre em fonte oficial e com revisão de médico responsável antes de qualquer uso assistencial.
        <br />${statusHtml}
      </div>
    </div>
  `;
}
