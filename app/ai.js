/**
 * MedConduta — cliente do assistente de IA (fala com o Worker Cloudflare,
 * que por sua vez fala com o Gemini). Ver /worker/README ou README.md
 * principal para instruções de deploy do Worker.
 *
 * A URL do Worker é configurada pelo usuário (tela Assistente IA) e fica
 * salva localmente — nada disso é fixado no código, então o app funciona
 * sem IA até que alguém configure seu próprio Worker.
 */

import { getPref, setPref } from "./db.js";

const PREF_ENDPOINT = "ai_worker_url";

export async function getAiEndpoint() {
  return (await getPref(PREF_ENDPOINT, "")) || "";
}

export async function setAiEndpoint(url) {
  await setPref(PREF_ENDPOINT, url.trim());
}

export async function isAiConfigured() {
  return Boolean(await getAiEndpoint());
}

/**
 * Envia uma pergunta (com contexto opcional) ao Worker e devolve o texto da
 * resposta. Lança erro com mensagem amigável em caso de falha.
 */
export async function askAI({ pergunta, contexto = "", tarefa = "responder à pergunta do usuário" }) {
  const endpoint = await getAiEndpoint();
  if (!endpoint) {
    throw new Error("Configure o endereço do assistente de IA na tela \"Assistente IA\" antes de usar.");
  }

  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pergunta, contexto, tarefa }),
    });
  } catch {
    throw new Error("Não foi possível conectar ao assistente de IA. Verifique sua internet e o endereço configurado.");
  }

  const dados = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(dados.erro || `Erro ao consultar o assistente de IA (HTTP ${res.status}).`);
  }
  return dados.resposta || "";
}
