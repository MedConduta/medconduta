/**
 * MedConduta — cliente do assistente de IA (fala com o Worker Cloudflare,
 * que por sua vez fala com o Gemini). Ver /worker e README.md para o
 * deploy do Worker.
 *
 * A URL já vem fixa (o Worker deste projeto está publicado e é estável) —
 * não há mais tela de configuração. Se um dia for preciso trocar de Worker,
 * basta atualizar ENDPOINT_PADRAO abaixo.
 */

import { buscarNoCache, salvarNoCache } from "./iaCache.js";

const ENDPOINT_PADRAO = "https://medconduta-ai.medcondutaa.workers.dev";

/**
 * Envia uma pergunta (com contexto opcional) ao Worker e devolve o texto da
 * resposta. Lança erro com mensagem amigável em caso de falha.
 *
 * Por padrão, consulta o cache anti-duplicação (ver iaCache.js, Fase 10)
 * antes de chamar o Gemini — a mesma pergunta+contexto+tarefa devolve a
 * mesma resposta sem gastar uma chamada nova. Fluxos que precisam de uma
 * resposta diferente a cada chamada (ex.: gerar mais uma questão de treino)
 * devem passar `semCache: true` pra sempre ir direto ao modelo.
 */
export async function askAI({ pergunta, contexto = "", tarefa = "responder à pergunta do usuário", formatoJson = false, semCache = false }) {
  const paramsCache = { pergunta, contexto, tarefa, formatoJson };
  if (!semCache) {
    const cacheada = await buscarNoCache(paramsCache);
    if (cacheada !== null) return cacheada;
  }

  let res;
  try {
    res = await fetch(ENDPOINT_PADRAO, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pergunta, contexto, tarefa, formatoJson }),
    });
  } catch {
    throw new Error("Não foi possível conectar ao assistente de IA. Verifique sua internet.");
  }

  const dados = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(dados.erro || `Erro ao consultar o assistente de IA (HTTP ${res.status}).`);
  }
  const resposta = dados.resposta || "";
  if (!semCache && resposta) await salvarNoCache(paramsCache, resposta);
  return resposta;
}

/**
 * Igual a askAI, mas pede saída estruturada em JSON e já devolve o objeto
 * parseado. Lança erro descritivo se a IA não devolver JSON válido.
 */
export async function askAIJson(params) {
  const texto = await askAI({ ...params, formatoJson: true });
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error("A IA não devolveu um JSON válido. Tente novamente.");
  }
}
