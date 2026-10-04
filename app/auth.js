/**
 * MedConduta — cliente de autenticação (fala com o Worker Cloudflare).
 * Token de sessão fica em localStorage; todas as chamadas de dados em db.js
 * usam getToken() para montar o cabeçalho Authorization.
 */

const ENDPOINT_PADRAO = "https://medconduta-ai.medcondutaa.workers.dev";
const TOKEN_KEY = "medconduta:auth_token";
const EMAIL_KEY = "medconduta:auth_email";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getEmail() {
  return localStorage.getItem(EMAIL_KEY);
}

function salvarSessao(token, email) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EMAIL_KEY, email);
}

export function isAuthenticated() {
  return !!getToken();
}

async function chamarAuth(caminho, corpo) {
  let res;
  try {
    res = await fetch(`${ENDPOINT_PADRAO}${caminho}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique sua internet.");
  }
  const dados = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(dados.erro || `Erro ao autenticar (HTTP ${res.status}).`);
  return dados;
}

export async function registrar(email, password, convite) {
  const dados = await chamarAuth("/auth/register", { email, password, convite });
  salvarSessao(dados.token, dados.email);
}

/**
 * Chamada autenticada que preserva status e mensagem de erro — ao contrário
 * de db.js, que engole erros para não travar a UI. Usada pela tela de admin.
 */
export async function chamarApiAutenticada(method, caminho, corpo) {
  const token = getToken();
  if (!token) return { ok: false, status: 401, dados: { erro: "Não autenticado." } };
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
    return { ok: false, status: 0, dados: { erro: "Não foi possível conectar ao servidor." } };
  }
  const dados = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, dados };
}

/** { email, admin } da sessão atual, ou null se indisponível. */
export async function buscarPerfil() {
  const { ok, dados } = await chamarApiAutenticada("GET", "/auth/me");
  return ok ? dados : null;
}

export async function entrar(email, password) {
  const dados = await chamarAuth("/auth/login", { email, password });
  salvarSessao(dados.token, dados.email);
}

export async function sair() {
  const token = getToken();
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
  if (token) {
    try {
      await fetch(`${ENDPOINT_PADRAO}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      /* sessão local já foi limpa; a do servidor expira sozinha em 30 dias */
    }
  }
}
