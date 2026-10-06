import { escapeHtml, fetchJsonCached } from "../utils.js";
import { getAll } from "../db.js";
import { icon } from "./icons.js";

/**
 * Busca global (Ctrl+K / ⌘K): telas da plataforma + temas de Conteúdo. Para
 * questões, oferece um atalho que abre o banco já filtrado pelo termo — o
 * banco tem dezenas de milhares de questões e já tem busca própria.
 */
const PAGINAS = [
  { titulo: "Início", detalhe: "Visão geral", path: "/residencia/minha-preparacao" },
  { titulo: "Agenda do dia", detalhe: "Início", path: "/residencia/planejador" },
  { titulo: "Curso — trilha semanal", detalhe: "Curso", path: "/residencia/curso" },
  { titulo: "Cronograma", detalhe: "Curso · data da prova e prova-alvo", path: "/residencia/cronograma" },
  { titulo: "Planejamento semanal", detalhe: "Curso", path: "/residencia/planejamento-semanal" },
  { titulo: "Conteúdo", detalhe: "Resumos por tema", path: "/residencia/conteudo" },
  { titulo: "Questões", detalhe: "Banco de questões", path: "/residencia/questoes" },
  { titulo: "Revisar", detalhe: "O que revisar hoje", path: "/residencia/revisar" },
  { titulo: "Meus erros", detalhe: "Revisar", path: "/residencia/erros" },
  { titulo: "Flashcards", detalhe: "Revisar", path: "/residencia/flashcards" },
  { titulo: "Alto rendimento", detalhe: "Revisar", path: "/residencia/revisao-alto-rendimento" },
  { titulo: "Simulados", detalhe: "Provas cronometradas", path: "/residencia/simulados" },
  { titulo: "Desempenho", detalhe: "Estatísticas", path: "/residencia/desempenho" },
  { titulo: "Prontidão", detalhe: "Desempenho", path: "/residencia/prontidao" },
  { titulo: "Relatório semanal", detalhe: "Desempenho", path: "/residencia/relatorio-semanal" },
  { titulo: "Modo Foco", detalhe: "Cronômetro de estudo", path: "/residencia/foco" },
  { titulo: "Assistente IA", detalhe: "Tire dúvidas com a IA", path: "/residencia/assistente" },
];

let temasCache = null;

async function carregarTemas() {
  if (!temasCache) {
    const [curados, gerados] = await Promise.all([fetchJsonCached("data/temas.json"), getAll("ia_temas")]);
    temasCache = [...curados, ...gerados].map((t) => ({
      titulo: t.titulo,
      detalhe: `Tema · ${t.categoria || ""}`,
      path: `/residencia/conteudo/${t.id}`,
      chave: normalizar(`${t.titulo} ${t.categoria || ""}`),
    }));
  }
  return temasCache;
}

function normalizar(texto) {
  return String(texto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function pontuar(chave, termos) {
  let pontos = 0;
  for (const termo of termos) {
    const pos = chave.indexOf(termo);
    if (pos === -1) return -1;
    pontos += pos === 0 ? 3 : chave.includes(` ${termo}`) ? 2 : 1;
  }
  return pontos;
}

export function initBusca(botao) {
  const overlay = document.createElement("div");
  overlay.className = "busca-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="busca-painel" role="dialog" aria-modal="true" aria-label="Buscar">
      <div class="busca-campo">
        ${icon("search", { size: 18 })}
        <input type="search" id="busca-input" placeholder="Buscar temas, telas ou questões…" autocomplete="off" spellcheck="false" />
        <kbd class="topbar-busca__atalho">Esc</kbd>
      </div>
      <ul class="busca-resultados" id="busca-resultados" role="listbox"></ul>
    </div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector("#busca-input");
  const lista = overlay.querySelector("#busca-resultados");
  let resultados = [];
  let selecionado = 0;

  function fechar() {
    overlay.hidden = true;
    input.value = "";
  }

  async function abrir() {
    overlay.hidden = false;
    input.focus();
    atualizar();
    await carregarTemas();
    if (!overlay.hidden) atualizar();
  }

  function atualizar() {
    const consulta = input.value.trim();
    const termos = normalizar(consulta).split(/\s+/).filter(Boolean);
    const paginas = PAGINAS.map((p) => ({ ...p, chave: normalizar(`${p.titulo} ${p.detalhe}`) }));

    if (!termos.length) {
      resultados = paginas.slice(0, 8);
    } else {
      const candidatos = [...paginas, ...(temasCache || [])]
        .map((r) => ({ r, pontos: pontuar(r.chave, termos) }))
        .filter((x) => x.pontos >= 0)
        .sort((a, b) => b.pontos - a.pontos || a.r.titulo.length - b.r.titulo.length)
        .slice(0, 10)
        .map((x) => x.r);
      resultados = [
        ...candidatos,
        { titulo: `Buscar “${consulta}” nas questões`, detalhe: "Questões", path: `/residencia/questoes?busca=${encodeURIComponent(consulta)}` },
      ];
    }
    selecionado = 0;
    renderLista();
  }

  function renderLista() {
    lista.innerHTML = resultados
      .map(
        (r, i) => `
        <li>
          <a class="busca-item${i === selecionado ? " is-selecionado" : ""}" href="#${r.path}" data-i="${i}" role="option" aria-selected="${i === selecionado}">
            <span class="busca-item__titulo">${escapeHtml(r.titulo)}</span>
            <span class="busca-item__detalhe">${escapeHtml(r.detalhe)}</span>
          </a>
        </li>`
      )
      .join("");
  }

  input.addEventListener("input", atualizar);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!resultados.length) return;
      selecionado = (selecionado + (e.key === "ArrowDown" ? 1 : -1) + resultados.length) % resultados.length;
      renderLista();
      lista.querySelector(".is-selecionado")?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = resultados[selecionado];
      if (r) {
        fechar();
        window.location.hash = r.path;
      }
    }
  });
  lista.addEventListener("click", (e) => {
    if (e.target.closest("a")) fechar();
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fechar();
  });
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      overlay.hidden ? abrir() : fechar();
    } else if (e.key === "Escape" && !overlay.hidden) {
      fechar();
    }
  });
  botao.addEventListener("click", abrir);
}
