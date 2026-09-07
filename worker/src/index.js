/**
 * MedConduta — Worker (Cloudflare).
 *
 * Duas responsabilidades:
 *
 * 1) Proxy para o Gemini (POST /) — inalterado desde a versão anterior deste
 *    arquivo. Guarda a chave do Gemini como secret do lado do servidor e só
 *    repassa pergunta+contexto, devolvendo a resposta. Ver README.md.
 *
 * 2) Backend de conta/dados (Fase 1 da reconstrução — auditoria e roteiro
 *    combinados com o usuário): registro/login por e-mail+senha, sessão via
 *    token opaco, e um armazenamento chave-valor por usuário (tabela
 *    `records`) que espelha os mesmos "stores" que existiam no IndexedDB do
 *    navegador (srs, prefs, progresso, respostas, ia_temas, ia_flashcards,
 *    ia_questoes) — troca só *onde* o dado mora (agora no D1, multi-
 *    dispositivo), não o formato do dado. Um modelo de dados mais rico
 *    (cronograma, tentativas de questão, metadados de prioridade dos temas)
 *    é assunto da Fase 2.
 */

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

// ---------- Utilidades HTTP ----------

function corsHeaders(origin) {
  const permitido = ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": permitido ? origin : "null",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };
}

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(origin) },
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// ---------- Senha (PBKDF2 com salt por usuário, via Web Crypto — sem dependências) ----------

const PBKDF2_ITERATIONS = 100000;

function bufferParaHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexParaBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

async function derivarHashSenha(senha, saltHex) {
  const enc = new TextEncoder();
  const chaveBase = await crypto.subtle.importKey("raw", enc.encode(senha), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: hexParaBuffer(saltHex), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    chaveBase,
    256
  );
  return bufferParaHex(bits);
}

async function criarHashSenha(senha) {
  const salt = bufferParaHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await derivarHashSenha(senha, salt);
  return `${salt}:${hash}`;
}

async function verificarSenha(senha, saltEHash) {
  const [salt, hashEsperado] = saltEHash.split(":");
  if (!salt || !hashEsperado) return false;
  const hash = await derivarHashSenha(senha, salt);
  return hash === hashEsperado;
}

function gerarToken() {
  return bufferParaHex(crypto.getRandomValues(new Uint8Array(32)));
}

function gerarId() {
  return crypto.randomUUID();
}

const SESSAO_DIAS = 30;

// ---------- Autenticação ----------

function emailValido(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function handleRegister(request, env, origin) {
  const corpo = await readJson(request);
  if (!corpo) return jsonResponse({ erro: "JSON inválido no corpo da requisição." }, 400, origin);
  const { email, password } = corpo;
  if (!emailValido(email)) return jsonResponse({ erro: "E-mail inválido." }, 400, origin);
  if (typeof password !== "string" || password.length < 8) {
    return jsonResponse({ erro: "Senha precisa ter pelo menos 8 caracteres." }, 400, origin);
  }

  const existente = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existente) return jsonResponse({ erro: "Já existe uma conta com esse e-mail." }, 409, origin);

  const id = gerarId();
  const passwordHash = await criarHashSenha(password);
  const agora = new Date().toISOString();
  await env.DB.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)")
    .bind(id, email, passwordHash, agora)
    .run();

  const token = await criarSessao(env, id);
  return jsonResponse({ token, email }, 201, origin);
}

async function handleLogin(request, env, origin) {
  const corpo = await readJson(request);
  if (!corpo) return jsonResponse({ erro: "JSON inválido no corpo da requisição." }, 400, origin);
  const { email, password } = corpo;
  if (!emailValido(email) || typeof password !== "string") {
    return jsonResponse({ erro: "E-mail ou senha inválidos." }, 400, origin);
  }

  const usuario = await env.DB.prepare("SELECT id, password_hash FROM users WHERE email = ?").bind(email).first();
  if (!usuario || !(await verificarSenha(password, usuario.password_hash))) {
    return jsonResponse({ erro: "E-mail ou senha incorretos." }, 401, origin);
  }

  const token = await criarSessao(env, usuario.id);
  return jsonResponse({ token, email }, 200, origin);
}

async function criarSessao(env, userId) {
  const token = gerarToken();
  const agora = new Date();
  const expira = new Date(agora.getTime() + SESSAO_DIAS * 24 * 60 * 60 * 1000);
  await env.DB.prepare("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(token, userId, agora.toISOString(), expira.toISOString())
    .run();
  return token;
}

async function handleLogout(request, env, origin) {
  const token = tokenDoCabecalho(request);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  return jsonResponse({ ok: true }, 200, origin);
}

function tokenDoCabecalho(request) {
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

/** Retorna o user_id da sessão válida, ou null. */
async function autenticar(request, env) {
  const token = tokenDoCabecalho(request);
  if (!token) return null;
  const sessao = await env.DB.prepare("SELECT user_id, expires_at FROM sessions WHERE token = ?").bind(token).first();
  if (!sessao) return null;
  if (new Date(sessao.expires_at).getTime() < Date.now()) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
    return null;
  }
  return sessao.user_id;
}

// ---------- Dados (armazenamento chave-valor por usuário) ----------

const STORE_RE = /^[a-z0-9_]{1,64}$/i;
const RECORD_ID_RE = /^[^/]{1,256}$/;

function storeValido(store) {
  return typeof store === "string" && STORE_RE.test(store);
}

async function handleDataGetAll(env, origin, userId, store) {
  if (!storeValido(store)) return jsonResponse({ erro: "Nome de store inválido." }, 400, origin);
  const { results } = await env.DB.prepare("SELECT value FROM records WHERE user_id = ? AND store = ?")
    .bind(userId, store)
    .all();
  return jsonResponse(results.map((r) => JSON.parse(r.value)), 200, origin);
}

async function handleDataGetOne(env, origin, userId, store, recordId) {
  if (!storeValido(store)) return jsonResponse({ erro: "Nome de store inválido." }, 400, origin);
  const row = await env.DB.prepare("SELECT value FROM records WHERE user_id = ? AND store = ? AND record_id = ?")
    .bind(userId, store, recordId)
    .first();
  return jsonResponse(row ? JSON.parse(row.value) : null, 200, origin);
}

async function handleDataPut(request, env, origin, userId, store, recordId) {
  if (!storeValido(store)) return jsonResponse({ erro: "Nome de store inválido." }, 400, origin);
  const valor = await readJson(request);
  if (valor === null || typeof valor !== "object") {
    return jsonResponse({ erro: "Corpo precisa ser um objeto JSON." }, 400, origin);
  }
  const agora = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO records (user_id, store, record_id, value, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (user_id, store, record_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  )
    .bind(userId, store, recordId, JSON.stringify(valor), agora)
    .run();
  return jsonResponse({ ok: true }, 200, origin);
}

async function handleDataDelete(env, origin, userId, store, recordId) {
  if (!storeValido(store)) return jsonResponse({ erro: "Nome de store inválido." }, 400, origin);
  await env.DB.prepare("DELETE FROM records WHERE user_id = ? AND store = ? AND record_id = ?")
    .bind(userId, store, recordId)
    .run();
  return jsonResponse({ ok: true }, 200, origin);
}

// ---------- Proxy Gemini (inalterado) ----------

async function handleGeminiProxy(request, env, origin) {
  if (!env.GEMINI_API_KEY) {
    return jsonResponse(
      { erro: "GEMINI_API_KEY não configurada no Worker. Rode: wrangler secret put GEMINI_API_KEY" },
      500,
      origin
    );
  }

  const corpo = await readJson(request);
  if (!corpo) return jsonResponse({ erro: "JSON inválido no corpo da requisição." }, 400, origin);

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
}

// ---------- Roteador ----------

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (!ALLOWED_ORIGINS.includes(origin)) {
      return jsonResponse({ erro: "Origem não permitida." }, 403, origin);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    // Proxy do Gemini — comportamento inalterado (POST na raiz).
    if (path === "/") {
      if (request.method !== "POST") return jsonResponse({ erro: "Use POST." }, 405, origin);
      return handleGeminiProxy(request, env, origin);
    }

    if (path === "/auth/register" && request.method === "POST") {
      return handleRegister(request, env, origin);
    }
    if (path === "/auth/login" && request.method === "POST") {
      return handleLogin(request, env, origin);
    }
    if (path === "/auth/logout" && request.method === "POST") {
      return handleLogout(request, env, origin);
    }

    const dataMatch = path.match(/^\/data\/([^/]+)(?:\/(.+))?$/);
    if (dataMatch) {
      const userId = await autenticar(request, env);
      if (!userId) return jsonResponse({ erro: "Não autenticado." }, 401, origin);

      const [, store, recordId] = dataMatch;
      if (!recordId) {
        if (request.method === "GET") return handleDataGetAll(env, origin, userId, store);
        return jsonResponse({ erro: "Método não suportado nessa rota." }, 405, origin);
      }
      if (!RECORD_ID_RE.test(recordId)) return jsonResponse({ erro: "Id de registro inválido." }, 400, origin);
      if (request.method === "GET") return handleDataGetOne(env, origin, userId, store, recordId);
      if (request.method === "PUT") return handleDataPut(request, env, origin, userId, store, recordId);
      if (request.method === "DELETE") return handleDataDelete(env, origin, userId, store, recordId);
      return jsonResponse({ erro: "Método não suportado nessa rota." }, 405, origin);
    }

    return jsonResponse({ erro: "Rota não encontrada." }, 404, origin);
  },
};
