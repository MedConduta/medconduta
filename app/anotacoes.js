/**
 * MedConduta — anotação pessoal por tema: campo de texto livre, persistente
 * entre sessões, pra registrar o "macete" que o próprio usuário criou.
 *
 * Desde o editor com formatação (components/editorAnotacao.js) o conteúdo é
 * HTML (`html`), sempre higienizado; `texto` guarda a versão em texto puro
 * (compatível com anotações antigas e com o backup).
 */

import { getItem, setItem } from "./db.js";
import { escapeHtml } from "./utils.js";

const STORE_ANOTACOES = "anotacoes";

/** Devolve o HTML da anotação (anotações antigas, só texto, viram parágrafos). */
export async function getAnotacao(temaId) {
  const registro = await getItem(STORE_ANOTACOES, temaId);
  if (registro?.html) return registro.html;
  const texto = registro?.texto || "";
  return texto
    ? texto
        .split(/\n/)
        .map((linha) => `<div>${escapeHtml(linha) || "<br>"}</div>`)
        .join("")
    : "";
}

export async function salvarAnotacao(temaId, html, texto) {
  await setItem(STORE_ANOTACOES, { id: temaId, html, texto, atualizadoEm: new Date().toISOString() });
}
