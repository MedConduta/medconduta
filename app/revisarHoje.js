/**
 * Fila única de "o que revisar hoje": junta os três sistemas de revisão que
 * já existiam separados — revisões espaçadas dos temas do Curso
 * (revisaoCurso.js), questões erradas (erros.js) e flashcards (flashcards.js).
 */
import { getAll } from "./db.js";
import { fetchJsonCached } from "./utils.js";
import { getAgendaRevisoes } from "./revisaoCurso.js";
import { getQuestoesEmRevisao } from "./erros.js";
import { getFilaRevisao } from "./flashcards.js";

export async function getRevisarHoje() {
  const [agenda, erros, flashcards, temasCurados, temasIA] = await Promise.all([
    getAgendaRevisoes(),
    getQuestoesEmRevisao(),
    getFilaRevisao(),
    fetchJsonCached("data/temas.json"),
    getAll("ia_temas"),
  ]);

  const temaPorId = new Map([...temasCurados, ...temasIA].map((t) => [t.id, t]));
  const revisoesCurso = [...agenda.vencidas, ...agenda.hoje]
    .map((r) => ({ ...r, tema: temaPorId.get(r.temaId) || null }))
    .filter((r) => r.tema);

  // Cartões nunca vistos contam como "vencidos" na fila de flashcards, mas não
  // são revisão — entram como "novos", fora do contador.
  const flashcardsVencidos = flashcards.vencidos.filter((i) => i.estado);
  const flashcardsNovos = flashcards.vencidos.length - flashcardsVencidos.length;

  return {
    revisoesCurso,
    erros: erros.vencidas,
    flashcards: flashcardsVencidos,
    flashcardsNovos,
    total: revisoesCurso.length + erros.vencidas.length + flashcardsVencidos.length,
  };
}
