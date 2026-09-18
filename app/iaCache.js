/**
 * MedConduta — Fase 10: cache anti-duplicação de chamadas ao Gemini.
 *
 * Uma pergunta idêntica (mesma pergunta+contexto+tarefa+formatoJson) não
 * precisa ir ao Gemini de novo — conteúdo médico de referência não muda de
 * uma hora pra outra, e cada chamada evitada economiza tempo de resposta e
 * custo (ver princípio de performance do prompt mestre: "evitar chamadas
 * duplicadas ao Gemini, reaproveitar conteúdo já gerado"). O cache é por
 * usuário (mesmo armazenamento chave-valor do resto do app, store
 * "ia_cache") e não expira — se o usuário quiser uma resposta realmente
 * nova, muda a pergunta; fluxos que precisam de variedade a cada chamada
 * (gerar mais uma questão de treino) simplesmente não passam por aqui.
 */

import { getItem, setItem } from "./db.js";

const STORE_CACHE_IA = "ia_cache";

async function chaveCache({ pergunta, contexto, tarefa, formatoJson }) {
  const assinatura = JSON.stringify({ pergunta, contexto, tarefa, formatoJson: !!formatoJson });
  const bytes = new TextEncoder().encode(assinatura);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Resposta já cacheada para essa requisição exata, ou null se não houver. */
export async function buscarNoCache(params) {
  const chave = await chaveCache(params);
  const registro = await getItem(STORE_CACHE_IA, chave);
  return registro ? registro.resposta : null;
}

/** Salva a resposta pra próxima requisição idêntica não precisar chamar o Gemini de novo. */
export async function salvarNoCache(params, resposta) {
  const chave = await chaveCache(params);
  await setItem(STORE_CACHE_IA, { id: chave, resposta, criadoEm: new Date().toISOString() });
}
