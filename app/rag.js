/**
 * MedConduta — recuperação de contexto (RAG) sem banco vetorial.
 *
 * Dado o volume de conteúdo do app (dezenas de temas, não milhares), uma busca
 * por sobreposição de palavras-chave já é suficiente: tokeniza a pergunta,
 * pontua cada tema pela contagem de termos em comum e devolve o texto completo
 * dos mais relevantes para ser colado no prompt da IA.
 */

import { fetchJsonCached } from "./utils.js";

const STOPWORDS = new Set([
  "a", "o", "as", "os", "de", "da", "do", "das", "dos", "que", "e", "é", "em",
  "um", "uma", "uns", "umas", "para", "com", "por", "no", "na", "nos", "nas",
  "se", "ou", "como", "qual", "quais", "quando", "onde", "porque", "por que",
  "mais", "menos", "muito", "isso", "esse", "essa", "este", "esta", "ao", "aos",
]);

function tokenizar(texto) {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/<[^>]+>/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function textoCompletoTema(tema) {
  return [
    tema.titulo,
    tema.resumo,
    tema.categoria,
    ...(tema.secoes || []).map((s) => `${s.titulo} ${s.conteudo}`),
    ...(tema.mnemonicos || []).map((m) => `${m.palavra} ${m.explicacao}`),
  ].join(" ");
}

/** Formata um tema como bloco de contexto legível para o prompt da IA. */
export function formatarTemaComoContexto(tema) {
  const secoesTexto = (tema.secoes || [])
    .map((s) => `## ${s.titulo}\n${s.conteudo.replace(/<[^>]+>/g, "")}`)
    .join("\n\n");
  const mnemonicos = (tema.mnemonicos || [])
    .map((m) => `Mnemônico "${m.palavra}": ${m.explicacao}`)
    .join("\n");
  const fonte = tema.fonte ? `\nFonte de referência indicada: ${tema.fonte}` : "";
  return `# ${tema.titulo} [${tema.categoria}]\n${secoesTexto}\n\n${mnemonicos}${fonte}`;
}

/**
 * Busca os temas mais relevantes para uma pergunta livre e devolve o contexto
 * já formatado para o prompt, respeitando um teto de caracteres.
 */
export async function buscarContextoRelevante(pergunta, { maxTemas = 3, maxChars = 12000 } = {}) {
  const temas = await fetchJsonCached("data/temas.json");
  const termos = tokenizar(pergunta);
  if (!termos.length) return "";

  const pontuados = temas.map((tema) => {
    const contagem = new Map();
    for (const t of tokenizar(textoCompletoTema(tema))) {
      contagem.set(t, (contagem.get(t) || 0) + 1);
    }
    let pontos = 0;
    for (const termo of termos) pontos += contagem.get(termo) || 0;
    return { tema, pontos };
  });

  const relevantes = pontuados
    .filter((p) => p.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, maxTemas);

  let contexto = relevantes.map((p) => formatarTemaComoContexto(p.tema)).join("\n\n---\n\n");
  if (contexto.length > maxChars) {
    contexto = `${contexto.slice(0, maxChars)}\n[...contexto truncado por limite de tamanho...]`;
  }
  return contexto;
}
