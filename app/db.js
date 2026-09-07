/**
 * MedConduta — camada de persistência (Fase 1: backend via Worker + D1).
 * Guarda: estado de repetição espaçada (SM-2) por flashcard, preferências
 * (tema), progresso de temas lidos, histórico de respostas de questões, e o
 * conteúdo (temas/flashcards/questões) que a IA cria.
 *
 * Antes esses dados viviam só no IndexedDB do navegador (um aparelho só, sem
 * login). Agora vivem no servidor, por conta — mesmo formato de dado, mesma
 * assinatura de função (getItem/setItem/getAll/removeItem), só troca onde o
 * dado mora. Isso exige estar autenticado (ver app/auth.js) e ter internet;
 * chamadas feitas sem sessão válida resolvem "vazias" em vez de travar a UI
 * (o roteador em app/main.js já impede o app de chegar aqui deslogado).
 */

import { getToken } from "./auth.js";

const ENDPOINT_PADRAO = "https://medconduta-ai.medcondutaa.workers.dev";

async function chamarApi(method, caminho, corpo) {
  const token = getToken();
  if (!token) return null;

  let res;
  try {
    res = await fetch(`${ENDPOINT_PADRAO}${caminho}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(corpo !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    return null; // sem conexão — quem chamou trata o retorno vazio/null como "sem dado ainda"
  }
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

/** Lê um registro por id em um "store" lógico. */
export async function getItem(store, id) {
  const dado = await chamarApi("GET", `/data/${store}/${encodeURIComponent(id)}`);
  return dado ?? null;
}

/** Grava um registro (precisa conter `id`). */
export async function setItem(store, value) {
  await chamarApi("PUT", `/data/${store}/${encodeURIComponent(value.id)}`, value);
}

/** Retorna todos os registros de um store. */
export async function getAll(store) {
  const dados = await chamarApi("GET", `/data/${store}`);
  return Array.isArray(dados) ? dados : [];
}

/** Remove um registro por id. */
export async function removeItem(store, id) {
  await chamarApi("DELETE", `/data/${store}/${encodeURIComponent(id)}`);
}

export async function getPref(key, fallback = null) {
  const rec = await getItem("prefs", key);
  return rec ? rec.value : fallback;
}

export async function setPref(key, value) {
  await setItem("prefs", { id: key, value });
}
