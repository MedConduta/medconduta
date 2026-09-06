/**
 * MedConduta — geração de conteúdo por IA (temas, flashcards, questões) e
 * avaliação crítica de temas existentes.
 *
 * Todo conteúdo criado passa por duas chamadas: um rascunho, e uma segunda
 * chamada pedindo que a própria IA revise/corrija criticamente o rascunho
 * antes de salvar — é a "autocrítica" antes de virar conteúdo real do app.
 * O resultado final é salvo no IndexedDB (não no repositório) e aparece
 * mesclado com o conteúdo curado, sempre marcado com `origem: "ia"`.
 */

import { askAI, askAIJson } from "./ai.js";
import { formatarTemaComoContexto } from "./rag.js";
import { slugify } from "./utils.js";
import { setItem } from "./db.js";
import { CATEGORIAS_VALIDAS } from "./areas.js";

function idUnico(prefixo) {
  const sufixo = (crypto.randomUUID?.() || String(Math.random())).replace(/-/g, "").slice(0, 6);
  return `${prefixo}-${sufixo}`;
}

/** Gera um tema novo do zero a partir de um tópico livre, já autocriticado. */
export async function gerarTemaComIA({ topico, categoria }) {
  const categoriaValida = CATEGORIAS_VALIDAS.includes(categoria) ? categoria : CATEGORIAS_VALIDAS[0];

  const rascunho = await askAIJson({
    pergunta: `Crie o conteúdo de estudo completo sobre: "${topico}" (categoria: ${categoriaValida}).`,
    tarefa: `gerar um tema de estudo para residência médica em JSON, exatamente neste formato:
{"titulo": "string curta e específica", "resumo": "1-2 frases", "mnemonicos": [{"palavra": "string curta", "explicacao": "string"}], "secoes": [{"titulo": "string", "conteudo": "2-4 frases em texto corrido"}], "fonteSugerida": "nome de uma diretriz/sociedade médica real e reconhecida (brasileira ou internacional)"}.
Inclua de 4 a 6 seções cobrindo definição/diagnóstico, conduta/tratamento e sinais de alerta. Pelo menos 1 mnemônico.`,
  });

  const final = await askAIJson({
    pergunta: "Revise criticamente o rascunho de tema abaixo quanto a precisão clínica, atualidade e clareza. Corrija o que for necessário.",
    contexto: JSON.stringify(rascunho),
    tarefa: `autocrítica: devolva a versão final no MESMO formato JSON do rascunho, adicionando o campo "notaRevisao" (1 frase: o que foi corrigido, ou confirmando que estava adequado).`,
  });

  const tema = {
    id: idUnico(slugify(final.titulo || topico)),
    area: "residencia",
    categoria: categoriaValida,
    titulo: final.titulo || topico,
    resumo: final.resumo || "",
    revisado: false,
    fonte: final.fonteSugerida || "",
    origem: "ia",
    notaRevisaoIA: final.notaRevisao || "",
    mnemonicos: Array.isArray(final.mnemonicos) ? final.mnemonicos : [],
    secoes: Array.isArray(final.secoes) ? final.secoes : [],
  };

  await setItem("ia_temas", tema);
  return tema;
}

/** Gera um baralho de flashcards para um tema (curado ou de IA), autocriticado. */
export async function gerarFlashcardsComIA(tema) {
  const contexto = formatarTemaComoContexto(tema);

  const rascunho = await askAIJson({
    pergunta: `Crie de 4 a 6 flashcards (frente/verso) para estudar o tema "${tema.titulo}", cobrindo os pontos mais cobrados em prova de residência.`,
    contexto,
    tarefa: `gerar flashcards em JSON: {"titulo": "string", "cards": [{"frente": "string (pergunta objetiva)", "verso": "string (resposta direta)"}]}`,
  });

  const final = await askAIJson({
    pergunta: "Revise criticamente os flashcards abaixo quanto a precisão e clareza. Corrija o que for necessário.",
    contexto: JSON.stringify(rascunho),
    tarefa: `autocrítica: devolva a versão final no MESMO formato JSON, adicionando "notaRevisao" (1 frase).`,
  });

  const deck = {
    id: idUnico(`deck-ia-${tema.id}`),
    temaId: tema.id,
    titulo: final.titulo || `${tema.titulo} (gerado por IA)`,
    origem: "ia",
    notaRevisaoIA: final.notaRevisao || "",
    cards: (Array.isArray(final.cards) ? final.cards : []).map((c, i) => ({
      id: `${idUnico("card-ia")}-${i}`,
      frente: c.frente || "",
      verso: c.verso || "",
    })),
  };

  await setItem("ia_flashcards", deck);
  return deck;
}

/** Gera uma questão de múltipla escolha para um tema, autocriticada, e salva no banco. */
export async function gerarQuestaoComIA(tema) {
  const contexto = formatarTemaComoContexto(tema);

  const rascunho = await askAIJson({
    pergunta: `Crie 1 questão de múltipla escolha, estilo prova de residência médica, sobre "${tema.titulo}".`,
    contexto,
    tarefa: `gerar uma questão em JSON: {"enunciado": "string (caso clínico ou pergunta direta)", "alternativas": ["string", "string", "string", "string"], "correta": 0, "comentario": "string explicando por que a alternativa correta está certa e as outras erradas"}. "correta" é o índice (0 a 3) da alternativa certa.`,
  });

  const final = await askAIJson({
    pergunta: "Revise criticamente a questão abaixo: confirme que só há uma alternativa correta, que o comentário está tecnicamente correto e claro. Corrija o que for necessário.",
    contexto: JSON.stringify(rascunho),
    tarefa: `autocrítica: devolva a versão final no MESMO formato JSON, adicionando "notaRevisao" (1 frase).`,
  });

  const questao = {
    id: idUnico(`q-ia-${tema.id}`),
    temaId: tema.id,
    tema: tema.titulo,
    banca: "Gerada por IA",
    ano: new Date().getFullYear(),
    revisado: false,
    fonte: tema.fonte || "",
    origem: "ia",
    notaRevisaoIA: final.notaRevisao || "",
    enunciado: final.enunciado || "",
    alternativas: Array.isArray(final.alternativas) ? final.alternativas : [],
    correta: Number.isInteger(final.correta) ? final.correta : 0,
    comentario: final.comentario || "",
  };

  await setItem("ia_questoes", questao);
  return questao;
}

/** Pede uma avaliação crítica (texto livre) de um tema existente — não persiste. */
export async function avaliarTemaComIA(tema) {
  return askAI({
    pergunta: `Avalie criticamente o tema "${tema.titulo}" quanto a possíveis desatualizações, imprecisões ou pontos que merecem mais atenção, considerando o conhecimento médico mais atual disponível para você. Seja específico: cite o que está desatualizado ou fraco, se houver, e o que já está adequado.`,
    contexto: formatarTemaComoContexto(tema),
    tarefa: "avaliação crítica de um tema de estudo já existente na plataforma",
  });
}
