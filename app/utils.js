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

function aplicarMarkdownInline(texto) {
  return texto
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

/**
 * Conversor de Markdown simples para HTML — cobre o subconjunto que respostas
 * de IA costumam usar (negrito, itálico, código inline, listas, títulos).
 * O texto já sai escapado (seguro contra HTML injetado pela resposta do
 * modelo); não use um parser de Markdown completo aqui de propósito, para
 * manter o app leve e sem dependências externas.
 */
export function renderMarkdown(texto) {
  const linhas = escapeHtml(texto).split("\n");
  const blocos = [];
  let listaAtual = null;

  function fecharLista() {
    if (listaAtual) {
      const itens = listaAtual.itens.map((i) => `<li>${i}</li>`).join("");
      blocos.push(`<${listaAtual.tipo}>${itens}</${listaAtual.tipo}>`);
      listaAtual = null;
    }
  }

  for (const linhaRaw of linhas) {
    const linha = linhaRaw.trim();

    if (/^-{3,}$/.test(linha) || /^\*{3,}$/.test(linha)) {
      fecharLista();
      blocos.push("<hr>");
      continue;
    }

    const marcadorLista = linha.match(/^[*-]\s+(.*)/);
    const marcadorNumerado = linha.match(/^\d+[.)]\s+(.*)/);
    const cabecalho = linha.match(/^(#{1,4})\s+(.*)/);

    if (marcadorLista) {
      if (!listaAtual || listaAtual.tipo !== "ul") {
        fecharLista();
        listaAtual = { tipo: "ul", itens: [] };
      }
      listaAtual.itens.push(aplicarMarkdownInline(marcadorLista[1]));
      continue;
    }
    if (marcadorNumerado) {
      if (!listaAtual || listaAtual.tipo !== "ol") {
        fecharLista();
        listaAtual = { tipo: "ol", itens: [] };
      }
      listaAtual.itens.push(aplicarMarkdownInline(marcadorNumerado[1]));
      continue;
    }
    fecharLista();

    if (!linha) continue;
    if (cabecalho) {
      blocos.push(`<h4 class="ia-markdown-titulo">${aplicarMarkdownInline(cabecalho[2])}</h4>`);
      continue;
    }
    blocos.push(`<p>${aplicarMarkdownInline(linha)}</p>`);
  }
  fecharLista();

  return blocos.join("");
}
