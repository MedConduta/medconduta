/**
 * MedConduta — Worker (Cloudflare) que faz proxy para a API do Gemini.
 *
 * Por que existe: o MedConduta é um site estático (GitHub Pages), sem backend.
 * Uma chave de API nunca pode ficar exposta no JS do navegador — qualquer pessoa
 * veria no código-fonte. Este Worker guarda a chave como secret do lado do
 * servidor (gratuito no plano free da Cloudflare) e só repassa pergunta+contexto
 * para o Gemini, devolvendo a resposta.
 *
 * A chave nunca aparece no repositório nem no client — ela é configurada com
 * `wrangler secret put GEMINI_API_KEY` (ver README.md).
 */

// Ajuste para a URL real onde o MedConduta está publicado (GitHub Pages) antes
// de rodar `wrangler deploy`. Pode ter mais de uma origem (ex.: preview local).
const ALLOWED_ORIGINS = [
  "https://medconduta.github.io",
  "http://localhost:8744",
  "http://127.0.0.1:8744",
];

const MODELO_PADRAO = "gemini-3.5-flash-lite";

const INSTRUCAO_SISTEMA = `Você é o motor de IA do MedConduta, uma plataforma de estudo para residência médica (R1) e prática
clínica. Você tem dois papéis, conforme a TAREFA indicada:

1) Assistente/avaliador: responder dúvidas ou avaliar criticamente um tema, com base no CONTEXTO fornecido
   (temas, prescrições, PDFs de referência). Se a informação não estiver clara ou presente no contexto,
   diga isso explicitamente e recomende conferir a fonte oficial — nunca invente doses, condutas ou
   referências bibliográficas.

2) Criador de conteúdo: quando a TAREFA pedir para gerar um tema, flashcards ou uma questão, produza
   conteúdo tecnicamente correto e atualizado, no formato JSON exato solicitado no prompt, sem texto fora
   do JSON. Quando pedirem uma autocrítica de um rascunho já gerado, revise com rigor (precisão clínica,
   atualidade, clareza) e devolva a versão corrigida no mesmo formato.

Em ambos os papéis: seja objetivo, use linguagem técnica apropriada para um médico, e tenha em mente que
todo o conteúdo é material de estudo — não substitui julgamento clínico, bula ou protocolo institucional
vigente.`;

function corsHeaders(origin) {
  const permitido = ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": permitido ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (!ALLOWED_ORIGINS.includes(origin)) {
      return jsonResponse({ erro: "Origem não permitida." }, 403, origin);
    }

    if (request.method !== "POST") {
      return jsonResponse({ erro: "Use POST." }, 405, origin);
    }

    if (!env.GEMINI_API_KEY) {
      return jsonResponse(
        { erro: "GEMINI_API_KEY não configurada no Worker. Rode: wrangler secret put GEMINI_API_KEY" },
        500,
        origin
      );
    }

    let corpo;
    try {
      corpo = await request.json();
    } catch {
      return jsonResponse({ erro: "JSON inválido no corpo da requisição." }, 400, origin);
    }

    const { pergunta, contexto, tarefa, formatoJson } = corpo;
    if (!pergunta || typeof pergunta !== "string" || !pergunta.trim()) {
      return jsonResponse({ erro: "Campo 'pergunta' é obrigatório." }, 400, origin);
    }

    const partesPrompt = [];
    if (contexto && typeof contexto === "string" && contexto.trim()) {
      // Limite defensivo — o modelo suporta ~1M tokens, mas mantemos um teto
      // razoável para custo/latência de uma ferramenta de estudo pessoal.
      partesPrompt.push(`CONTEXTO (temas/prescrições/documentos de referência):\n${contexto.slice(0, 100000)}`);
    }
    partesPrompt.push(`TAREFA: ${typeof tarefa === "string" && tarefa.trim() ? tarefa : "responder à pergunta do usuário"}`);
    partesPrompt.push(`PERGUNTA DO USUÁRIO: ${pergunta}`);

    const modelo = env.GEMINI_MODEL || MODELO_PADRAO;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;

    const generationConfig = { temperature: 0.3, maxOutputTokens: 4096 };
    if (formatoJson) {
      generationConfig.responseMimeType = "application/json";
    }

    const corpoRequisicaoGemini = JSON.stringify({
      systemInstruction: { parts: [{ text: INSTRUCAO_SISTEMA }] },
      contents: [{ parts: [{ text: partesPrompt.join("\n\n") }] }],
      generationConfig,
    });

    // O tier gratuito do Gemini ocasionalmente devolve 503 "high demand" ou 429
    // (rate limit) de forma transitória — tenta mais 2 vezes com espera curta
    // antes de desistir, para não quebrar fluxos que fazem 2 chamadas seguidas
    // (rascunho + autocrítica).
    let respostaGemini;
    let ultimoErro = "";
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        respostaGemini = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY,
          },
          body: corpoRequisicaoGemini,
        });
      } catch (e) {
        return jsonResponse({ erro: "Falha de rede ao chamar o Gemini.", detalhe: String(e) }, 502, origin);
      }

      if (respostaGemini.ok) break;

      ultimoErro = await respostaGemini.text();
      const tentarDeNovo = respostaGemini.status === 503 || respostaGemini.status === 429;
      if (!tentarDeNovo || tentativa === 2) break;
      await new Promise((r) => setTimeout(r, 800 * (tentativa + 1)));
    }

    if (!respostaGemini.ok) {
      return jsonResponse(
        { erro: "O modelo de IA recusou ou falhou a requisição.", detalhe: ultimoErro.slice(0, 800) },
        502,
        origin
      );
    }

    const dados = await respostaGemini.json();
    const texto = (dados?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");

    if (!texto) {
      return jsonResponse({ erro: "O modelo não retornou texto (pode ter sido bloqueado por segurança)." }, 502, origin);
    }

    return jsonResponse({ resposta: texto }, 200, origin);
  },
};
