/**
 * Editor de anotações com formatação básica: negrito, itálico, sublinhado,
 * marca-texto, listas, alinhamento (esquerda/justificado), imagem e limpar
 * formatação. contenteditable + execCommand (suportado em todos os
 * navegadores atuais) — sem biblioteca externa.
 *
 * O HTML é sempre higienizado por lista de permissões (higienizarHtml) antes
 * de salvar e ao carregar: só tags de formatação simples e imagens data:.
 */

const TAGS_PERMITIDAS = new Set(["B", "STRONG", "I", "EM", "U", "MARK", "P", "DIV", "BR", "UL", "OL", "LI", "IMG", "SPAN"]);
const ALINHAMENTOS = new Set(["left", "justify", "center", "right"]);

// Fotos de celular têm 3000–4000px; reduzir mantém a anotação leve para salvar
// e sincronizar (cada anotação vai inteira num único registro do banco).
const IMAGEM_LARGURA_MAX = 1000;
const IMAGEM_QUALIDADE = 0.8;
const LIMITE_ANOTACAO_BYTES = 1_500_000;

const ICONES = {
  negrito: '<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7z"/><path d="M7 12h7a3.5 3.5 0 0 1 0 7H7z"/>',
  italico: '<path d="M14 5h-4M14 19h-4M14 5l-4 14"/>',
  sublinhado: '<path d="M7 5v6a5 5 0 0 0 10 0V5"/><path d="M5 20h14"/>',
  marca: '<path d="m9 11-5 5v3h3l5-5"/><path d="m14 6 4 4-6 6-4-4z"/><path d="M4 22h16" stroke="var(--color-mark, #f5d90a)" stroke-width="3"/>',
  lista: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  numerada: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 4h1v4M4 8h2M4 14.5a1 1 0 0 1 2 0c0 1-2 1.5-2 3.5h2"/>',
  esquerda: '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
  justificar: '<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
  imagem: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  limpar: '<path d="M6 5h12M10 5l-3 14"/><path d="m15 14 5 5M20 14l-5 5"/>',
};

const BOTOES = [
  { acao: "bold", titulo: "Negrito (Ctrl+B)", icone: "negrito" },
  { acao: "italic", titulo: "Itálico (Ctrl+I)", icone: "italico" },
  { acao: "underline", titulo: "Sublinhado (Ctrl+U)", icone: "sublinhado" },
  { acao: "marca", titulo: "Marca-texto", icone: "marca" },
  { separador: true },
  { acao: "insertUnorderedList", titulo: "Lista com marcadores", icone: "lista" },
  { acao: "insertOrderedList", titulo: "Lista numerada", icone: "numerada" },
  { separador: true },
  { acao: "justifyLeft", titulo: "Alinhar à esquerda", icone: "esquerda" },
  { acao: "justifyFull", titulo: "Justificar", icone: "justificar" },
  { separador: true },
  { acao: "imagem", titulo: "Inserir imagem", icone: "imagem" },
  { acao: "removeFormat", titulo: "Limpar formatação", icone: "limpar" },
];

function svg(nome) {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome]}</svg>`;
}

/** Lista de permissões: mantém só formatação simples, alinhamento e imagens data:image. */
export function higienizarHtml(html) {
  const modelo = document.createElement("template");
  modelo.innerHTML = html || "";

  function limpar(no) {
    for (const filho of [...no.childNodes]) {
      if (filho.nodeType === Node.TEXT_NODE) continue;
      if (filho.nodeType !== Node.ELEMENT_NODE || !TAGS_PERMITIDAS.has(filho.tagName)) {
        // Elemento desconhecido: mantém só o texto (ou some, se for script/style).
        if (filho.nodeType === Node.ELEMENT_NODE && !["SCRIPT", "STYLE", "IFRAME", "OBJECT"].includes(filho.tagName)) {
          limpar(filho);
          filho.replaceWith(...filho.childNodes);
        } else {
          filho.remove();
        }
        continue;
      }

      const alinhamento = filho.style?.textAlign;
      const src = filho.tagName === "IMG" ? filho.getAttribute("src") || "" : "";
      for (const attr of [...filho.attributes]) filho.removeAttribute(attr.name);
      if (alinhamento && ALINHAMENTOS.has(alinhamento) && ["P", "DIV", "LI"].includes(filho.tagName)) {
        filho.style.textAlign = alinhamento;
      }
      if (filho.tagName === "IMG") {
        if (!/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(src)) {
          filho.remove();
          continue;
        }
        filho.setAttribute("src", src);
        filho.setAttribute("alt", "Imagem da anotação");
      }
      limpar(filho);
    }
  }

  limpar(modelo.content);
  return modelo.innerHTML;
}

function lerArquivo(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsDataURL(arquivo);
  });
}

/** Reduz a imagem para no máximo IMAGEM_LARGURA_MAX de largura (JPEG; PNG pequeno fica como está). */
async function prepararImagem(arquivo) {
  const original = await lerArquivo(arquivo);
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = original;
  });
  if (img.width <= IMAGEM_LARGURA_MAX && original.length < 300_000) return original;
  const escala = Math.min(1, IMAGEM_LARGURA_MAX / img.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * escala);
  canvas.height = Math.round(img.height * escala);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; // JPEG não tem transparência
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", IMAGEM_QUALIDADE);
}

/**
 * Monta o editor dentro de `alvo`. `onSalvar(html, texto)` é chamado com
 * debounce a cada alteração; `onStatus(msg)` informa "Salvando…/Salvo ✓".
 */
export function montarEditorAnotacao(alvo, { html, placeholder, onSalvar, onStatus }) {
  alvo.innerHTML = `
    <div class="editor-anotacao">
      <div class="editor-anotacao__barra" role="toolbar" aria-label="Formatação da anotação">
        ${BOTOES.map((b) =>
          b.separador
            ? '<span class="editor-anotacao__sep" aria-hidden="true"></span>'
            : `<button type="button" class="editor-anotacao__btn" data-acao="${b.acao}" title="${b.titulo}" aria-label="${b.titulo}">${svg(b.icone)}</button>`
        ).join("")}
        <input type="file" accept="image/*" hidden class="editor-anotacao__arquivo" />
      </div>
      <div class="editor-anotacao__area" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="${placeholder || ""}"></div>
    </div>`;

  const area = alvo.querySelector(".editor-anotacao__area");
  const barra = alvo.querySelector(".editor-anotacao__barra");
  const inputArquivo = alvo.querySelector(".editor-anotacao__arquivo");
  area.innerHTML = higienizarHtml(html);

  try {
    document.execCommand("defaultParagraphSeparator", false, "div");
    document.execCommand("styleWithCSS", false, false);
  } catch {
    /* navegadores sem suporte usam o padrão deles */
  }

  let temporizador = null;
  function agendarSalvamento() {
    onStatus?.("Salvando...");
    clearTimeout(temporizador);
    temporizador = setTimeout(async () => {
      const limpo = higienizarHtml(area.innerHTML);
      if (limpo.length > LIMITE_ANOTACAO_BYTES) {
        onStatus?.("Anotação grande demais para salvar — remova alguma imagem.");
        return;
      }
      const texto = area.innerText.trim();
      const vazio = !texto && !limpo.includes("<img");
      await onSalvar(vazio ? "" : limpo, texto);
      onStatus?.("Salvo ✓");
    }, 700);
  }

  // Seleção guardada: clicar na barra tira o foco da área de texto.
  let ultimaSelecao = null;
  function aoMudarSelecao() {
    // Ao trocar de tela o editor sai do DOM: solta o ouvinte global.
    if (!area.isConnected) {
      document.removeEventListener("selectionchange", aoMudarSelecao);
      return;
    }
    const sel = document.getSelection();
    if (sel.rangeCount && area.contains(sel.anchorNode)) {
      ultimaSelecao = sel.getRangeAt(0).cloneRange();
      atualizarEstados();
    }
  }
  document.addEventListener("selectionchange", aoMudarSelecao);
  function restaurarSelecao() {
    area.focus();
    if (!ultimaSelecao) return;
    const sel = document.getSelection();
    sel.removeAllRanges();
    sel.addRange(ultimaSelecao);
  }

  function marcaAtual() {
    const sel = document.getSelection();
    let no = sel.anchorNode;
    while (no && no !== area) {
      if (no.nodeName === "MARK") return no;
      no = no.parentNode;
    }
    return null;
  }

  function alternarMarca() {
    const marca = marcaAtual();
    if (marca) {
      marca.replaceWith(...marca.childNodes);
      return;
    }
    const sel = document.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return;
    const intervalo = sel.getRangeAt(0);
    const mark = document.createElement("mark");
    mark.appendChild(intervalo.extractContents());
    intervalo.insertNode(mark);
    sel.removeAllRanges();
    const novo = document.createRange();
    novo.selectNodeContents(mark);
    sel.addRange(novo);
  }

  function atualizarEstados() {
    barra.querySelectorAll("[data-acao]").forEach((btn) => {
      const acao = btn.dataset.acao;
      let ativo = false;
      if (acao === "marca") ativo = Boolean(marcaAtual());
      else if (!["imagem", "removeFormat"].includes(acao)) {
        try {
          ativo = document.queryCommandState(acao);
        } catch {
          ativo = false;
        }
      }
      btn.classList.toggle("is-ativo", ativo);
      btn.setAttribute("aria-pressed", String(ativo));
    });
  }

  async function inserirImagens(arquivos) {
    const imagens = [...arquivos].filter((a) => a.type.startsWith("image/"));
    if (!imagens.length) return false;
    restaurarSelecao();
    // Insere depois do trecho selecionado, sem apagar o texto que estava marcado.
    const sel = document.getSelection();
    if (sel.rangeCount && !sel.isCollapsed) sel.collapseToEnd();
    for (const arquivo of imagens) {
      try {
        const dataUrl = await prepararImagem(arquivo);
        document.execCommand("insertHTML", false, `<img src="${dataUrl}" alt="Imagem da anotação"><br>`);
      } catch {
        onStatus?.("Não foi possível ler essa imagem.");
      }
    }
    agendarSalvamento();
    return true;
  }

  // mousedown + preventDefault: o clique na barra não rouba a seleção do texto.
  barra.addEventListener("mousedown", (e) => {
    if (e.target.closest("[data-acao]")) e.preventDefault();
  });
  barra.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-acao]");
    if (!btn) return;
    const acao = btn.dataset.acao;
    if (acao === "imagem") {
      inputArquivo.click();
      return;
    }
    restaurarSelecao();
    if (acao === "marca") alternarMarca();
    else if (acao === "removeFormat") {
      document.execCommand("removeFormat");
      // removeFormat não tira <mark> nem listas: desfaz a marca da seleção também.
      const marca = marcaAtual();
      if (marca) marca.replaceWith(...marca.childNodes);
    } else document.execCommand(acao);
    atualizarEstados();
    agendarSalvamento();
  });

  inputArquivo.addEventListener("change", async () => {
    await inserirImagens(inputArquivo.files);
    inputArquivo.value = "";
  });

  // Colar: imagens viram imagem; texto entra sem a formatação de outros sites.
  area.addEventListener("paste", async (e) => {
    const dados = e.clipboardData;
    if (!dados) return;
    if ([...dados.files].some((f) => f.type.startsWith("image/"))) {
      e.preventDefault();
      await inserirImagens(dados.files);
      return;
    }
    const texto = dados.getData("text/plain");
    if (texto) {
      e.preventDefault();
      document.execCommand("insertText", false, texto);
    }
  });
  area.addEventListener("drop", async (e) => {
    if (e.dataTransfer?.files?.length && [...e.dataTransfer.files].some((f) => f.type.startsWith("image/"))) {
      e.preventDefault();
      await inserirImagens(e.dataTransfer.files);
    }
  });

  area.addEventListener("input", agendarSalvamento);
  area.addEventListener("keyup", atualizarEstados);
  area.addEventListener("mouseup", atualizarEstados);
}
