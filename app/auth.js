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

export async function registrar(email, password) {
  const dados = await chamarAuth("/auth/register", { email, password });
  salvarSessao(dados.token, dados.email);
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
