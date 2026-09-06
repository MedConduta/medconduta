/** MedConduta — utilitários compartilhados. */

export function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Falha ao carregar ${path}: ${res.status}`);
  return res.json();
}

const jsonCache = new Map();
export async function fetchJsonCached(path) {
  if (jsonCache.has(path)) return jsonCache.get(path);
  const data = await fetchJson(path);
  jsonCache.set(path, data);
  return data;
}

export function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function slugify(str) {
  const normalized = String(str).normalize("NFD");
  let stripped = "";
  for (const ch of normalized) {
    const code = ch.codePointAt(0);
    if (code >= 0x0300 && code <= 0x036f) continue;
    stripped += ch;
  }
  return stripped
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function uniq(arr) {
  return [...new Set(arr)];
}
