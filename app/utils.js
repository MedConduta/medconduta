/** MedConduta — utilitários compartilhados. */

export function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renderiza uma imagem de estudo (ECG, radiografia etc.) com legenda e fonte.
 * `imagem` é o objeto opcional {url, legenda, fonte} usado em secoes de
 * data/temas.json e em questoes de data/questoes.json. Carregamento é lazy
 * (não entra no precache do Service Worker) para não pesar o app inteiro.
 */
export function renderImagemEstudo(imagem) {
  if (!imagem?.url) return "";
  return `
    <figure class="imagem-estudo">
      <img src="${escapeHtml(imagem.url)}" alt="${escapeHtml(imagem.legenda || "")}" loading="lazy" />
      <figcaption>
        ${escapeHtml(imagem.legenda || "")}
        ${imagem.fonte ? `<span class="imagem-estudo__fonte">${escapeHtml(imagem.fonte)}</span>` : ""}
      </figcaption>
    </figure>
  `;
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

const SIMBOLOS_LATEX = {
  alpha: "α", beta: "β", gamma: "γ", Gamma: "Γ", delta: "δ", Delta: "Δ",
  epsilon: "ε", zeta: "ζ", eta: "η", theta: "θ", Theta: "Θ", iota: "ι",
  kappa: "κ", lambda: "λ", Lambda: "Λ", mu: "μ", nu: "ν", xi: "ξ",
  pi: "π", Pi: "Π", rho: "ρ", sigma: "σ", Sigma: "Σ", tau: "τ",
  phi: "φ", Phi: "Φ", chi: "χ", psi: "ψ", omega: "ω", Omega: "Ω",
  times: "×", div: "÷", pm: "±", mp: "∓", cdot: "·", sqrt: "√",
  leq: "≤", le: "≤", geq: "≥", ge: "≥", neq: "≠", approx: "≈", equiv: "≡",
  rightarrow: "→", to: "→", leftarrow: "←", infty: "∞", circ: "°", degree: "°",
};

/**
 * Sanitiza resíduos de notação LaTeX que a IA às vezes gera (ex.: "$\beta$-hCG")
 * mesmo com instrução em contrário — o app não tem renderizador de LaTeX/MathJax,
 * então isso apareceria literal na tela. Remove os delimitadores de matemática
 * ($...$, \(...\), \[...\]) e converte comandos de símbolo (\beta, \times, \geq...)
 * no caractere Unicode equivalente; comandos desconhecidos são deixados como estão.
 */
export function limparNotacaoMatematica(texto) {
  if (typeof texto !== "string" || (!texto.includes("\\") && !texto.includes("$"))) return texto;
  return texto
    .replace(/\$\$([\s\S]+?)\$\$/g, "$1")
    .replace(/\\\[([\s\S]+?)\\\]/g, "$1")
    .replace(/\\\(([\s\S]+?)\\\)/g, "$1")
    .replace(/\$([^$\n]+?)\$/g, "$1")
    .replace(/\\([A-Za-z]+)(\{\})?/g, (match, comando) => SIMBOLOS_LATEX[comando] ?? match)
    .replace(/\{\}/g, "");
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
  // Linhas soltas de um mesmo parágrafo (sem linha em branco entre elas) são
  // acumuladas aqui e só viram <p> quando o parágrafo fecha — juntar antes de
  // aplicar o markdown inline evita que um **negrito**/*itálico* que a IA
  // quebrou em duas linhas (quebra de linha "solta" no meio da frase) fique
  // com os asteriscos literais, já que cada linha isolada nunca fecha o par.
  let paragrafoAtual = [];

  function fecharLista() {
    if (listaAtual) {
      const itens = listaAtual.itens.map((i) => `<li>${i}</li>`).join("");
      blocos.push(`<${listaAtual.tipo}>${itens}</${listaAtual.tipo}>`);
      listaAtual = null;
    }
  }

  function fecharParagrafo() {
    if (paragrafoAtual.length) {
      blocos.push(`<p>${aplicarMarkdownInline(paragrafoAtual.join(" "))}</p>`);
      paragrafoAtual = [];
    }
  }

  for (const linhaRaw of linhas) {
    const linha = linhaRaw.trim();

    if (/^-{3,}$/.test(linha) || /^\*{3,}$/.test(linha)) {
      fecharParagrafo();
      fecharLista();
      blocos.push("<hr>");
      continue;
    }

    const marcadorLista = linha.match(/^[*-]\s+(.*)/);
    const marcadorNumerado = linha.match(/^\d+[.)]\s+(.*)/);
    const cabecalho = linha.match(/^(#{1,4})\s+(.*)/);

    if (marcadorLista) {
      fecharParagrafo();
      if (!listaAtual || listaAtual.tipo !== "ul") {
        fecharLista();
        listaAtual = { tipo: "ul", itens: [] };
      }
      listaAtual.itens.push(aplicarMarkdownInline(marcadorLista[1]));
      continue;
    }
    if (marcadorNumerado) {
      fecharParagrafo();
      if (!listaAtual || listaAtual.tipo !== "ol") {
        fecharLista();
        listaAtual = { tipo: "ol", itens: [] };
      }
      listaAtual.itens.push(aplicarMarkdownInline(marcadorNumerado[1]));
      continue;
    }
    fecharLista();

    if (!linha) {
      fecharParagrafo();
      continue;
    }
    if (cabecalho) {
      fecharParagrafo();
      blocos.push(`<h4 class="ia-markdown-titulo">${aplicarMarkdownInline(cabecalho[2])}</h4>`);
      continue;
    }
    paragrafoAtual.push(linha);
  }
  fecharLista();
  fecharParagrafo();

  return blocos.join("");
}
