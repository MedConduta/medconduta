/**
 * MedConduta — anotação pessoal por tema: campo de texto livre, persistente
 * entre sessões, pra registrar o "macete" que o próprio usuário criou.
 */

import { getItem, setItem } from "./db.js";

const STORE_ANOTACOES = "anotacoes";

export async function getAnotacao(temaId) {
  const registro = await getItem(STORE_ANOTACOES, temaId);
  return registro?.texto || "";
}

export async function salvarAnotacao(temaId, texto) {
  await setItem(STORE_ANOTACOES, { id: temaId, texto, atualizadoEm: new Date().toISOString() });
}
