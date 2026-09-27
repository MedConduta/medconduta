/**
 * MedConduta — favoritar/marcar questão pra revisar depois.
 * Ao contrário de Meus Erros (que só guarda o que o usuário errou), aqui
 * qualquer questão pode ser marcada — útil pra quem acertou "no chute" ou
 * achou a questão capciosa.
 */

import { getAll, setItem, removeItem } from "./db.js";

const STORE_QUESTOES_FAVORITAS = "questoes_favoritas";

export async function carregarFavoritos() {
  const registros = await getAll(STORE_QUESTOES_FAVORITAS);
  return new Set(registros.map((r) => r.id));
}

/** Alterna o estado de favorito de uma questão e retorna o novo estado (true = favoritada). */
export async function alternarFavorito(questaoId, estaFavoritada) {
  if (estaFavoritada) {
    await removeItem(STORE_QUESTOES_FAVORITAS, questaoId);
    return false;
  }
  await setItem(STORE_QUESTOES_FAVORITAS, { id: questaoId, criadoEm: new Date().toISOString() });
  return true;
}
