/**
 * MedConduta — engine de indexação/filtro/contagem do banco de questões.
 *
 * Carrega o banco curado (data/questoes.json) + gerado por IA (store
 * "ia_questoes") + temas (data/temas.json, para a hierarquia grande
 * área/especialidade/tema) + histórico de respostas do usuário (store
 * "respostas") UMA VEZ, e monta índices em memória (Map) para que filtrar,
 * contar e ordenar sejam operações síncronas em milissegundos — sem re-fetch
 * de rede a cada mudança de filtro. Separado de app/views/questoes.js para
 * ficar testável isoladamente e reutilizável por outras views no futuro
 * (erros.js, simulados.js etc. já fazem a mesma junção "questões + respostas"
 * de forma independente e não são tocados aqui).
 */
import { fetchJsonCached, uniq } from "./utils.js";
import { getAll } from "./db.js";
import { AREA_POR_CATEGORIA, ORDEM_AREAS } from "./areas.js";

export const STATUS = {
  TODAS: "todas",
  NAO_RESPONDIDAS: "nao-respondidas",
  RESPONDIDAS: "respondidas",
  CORRETAS: "corretas",
  INCORRETAS: "incorretas",
};

export const ORDENACAO = {
  RECENTES: "recentes",
  ANTIGAS: "antigas",
  ACERTO_ASC: "acerto-asc",
  ACERTO_DESC: "acerto-desc",
  ALEATORIO: "aleatorio",
};

/** Monta o índice completo. Chamar uma vez por sessão da página; filtros/contagens depois não re-fazem fetch. */
export async function carregarIndice() {
  const [curadas, geradas, temas, respostas] = await Promise.all([
    fetchJsonCached("data/questoes.json"),
    getAll("ia_questoes"),
    fetchJsonCached("data/temas.json"),
    getAll("respostas"),
  ]);

  const temaPorId = new Map(temas.map((t) => [t.id, t]));

  const statusPorQuestao = new Map(); // questaoId -> { respondida, acertouUltima, tentativas, ultimaEm }
  for (const r of respostas) {
    const atual = statusPorQuestao.get(r.questaoId);
    if (!atual || (r.respondidoEm || "") > atual.ultimaEm) {
      statusPorQuestao.set(r.questaoId, {
        respondida: true,
        acertouUltima: !!r.acertou,
        tentativas: (atual?.tentativas || 0) + 1,
        ultimaEm: r.respondidoEm || "",
      });
    } else {
      atual.tentativas += 1;
    }
  }

  const questoesPorId = new Map();
  for (const q of [...curadas, ...geradas]) {
    const tema = temaPorId.get(q.temaId);
    const especialidade = tema?.categoria || "Outros";
    const grandeArea = AREA_POR_CATEGORIA[especialidade] || "Outros";
    questoesPorId.set(q.id, { ...q, grandeArea, especialidade });
  }

  const grandeAreas = ORDEM_AREAS.filter((a) => [...questoesPorId.values()].some((q) => q.grandeArea === a));
  const bancas = uniq([...questoesPorId.values()].map((q) => q.banca)).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const anos = uniq([...questoesPorId.values()].map((q) => q.ano)).sort((a, b) => b - a);

  return { questoesPorId, statusPorQuestao, grandeAreas, bancas, anos };
}

/** true se a questão bate com os filtros. `ignorarCampo` exclui um campo do filtro (usado por contarPorNivel). */
function corresponde(indice, questao, filtros, ignorarCampo) {
  const f = filtros || {};
  if (f.grandeArea && ignorarCampo !== "grandeArea" && questao.grandeArea !== f.grandeArea) return false;
  if (f.especialidade && ignorarCampo !== "especialidade" && questao.especialidade !== f.especialidade) return false;
  if (f.temaId && ignorarCampo !== "temaId" && questao.temaId !== f.temaId) return false;
  if (f.banca && ignorarCampo !== "banca" && questao.banca !== f.banca) return false;
  if (f.ano && ignorarCampo !== "ano" && questao.ano !== f.ano) return false;

  if (f.status && f.status !== STATUS.TODAS) {
    const st = indice.statusPorQuestao.get(questao.id);
    if (f.status === STATUS.NAO_RESPONDIDAS && st?.respondida) return false;
    if (f.status === STATUS.RESPONDIDAS && !st?.respondida) return false;
    if (f.status === STATUS.CORRETAS && !(st?.respondida && st.acertouUltima)) return false;
    if (f.status === STATUS.INCORRETAS && !(st?.respondida && !st.acertouUltima)) return false;
  }

  if (f.busca && f.busca.trim()) {
    const alvo = `${questao.tema} ${questao.enunciado}`.toLowerCase();
    if (!alvo.includes(f.busca.trim().toLowerCase())) return false;
  }

  return true;
}

/** Retorna os ids das questões que batem com todos os filtros, já ordenados. */
export function filtrar(indice, filtros = {}) {
  let ids = [];
  for (const q of indice.questoesPorId.values()) {
    if (corresponde(indice, q, filtros)) ids.push(q.id);
  }

  const ordenacao = filtros.ordenacao || ORDENACAO.RECENTES;
  if (ordenacao === ORDENACAO.ALEATORIO) {
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
  } else if (ordenacao === ORDENACAO.RECENTES || ordenacao === ORDENACAO.ANTIGAS) {
    const sinal = ordenacao === ORDENACAO.RECENTES ? -1 : 1;
    ids.sort((a, b) => sinal * (indice.questoesPorId.get(a).ano - indice.questoesPorId.get(b).ano));
  } else if (ordenacao === ORDENACAO.ACERTO_ASC || ordenacao === ORDENACAO.ACERTO_DESC) {
    // Taxa de acerto DO PRÓPRIO USUÁRIO nessa questão (não há dado agregado de outros usuários).
    // Questões nunca respondidas ficam no fim, em ambos os sentidos.
    const sinal = ordenacao === ORDENACAO.ACERTO_ASC ? 1 : -1;
    ids.sort((a, b) => {
      const sa = indice.statusPorQuestao.get(a);
      const sb = indice.statusPorQuestao.get(b);
      if (!sa?.respondida && !sb?.respondida) return 0;
      if (!sa?.respondida) return 1;
      if (!sb?.respondida) return -1;
      return sinal * ((sa.acertouUltima ? 1 : 0) - (sb.acertouUltima ? 1 : 0));
    });
  }

  return ids;
}

/** Contagem por valor de um nível (grandeArea/especialidade/temaId/banca/ano), respeitando os demais filtros ativos. */
export function contarPorNivel(indice, filtros, campo) {
  const contagem = new Map();
  for (const q of indice.questoesPorId.values()) {
    if (!corresponde(indice, q, filtros, campo)) continue;
    const valor = q[campo];
    contagem.set(valor, (contagem.get(valor) || 0) + 1);
  }
  return contagem;
}

/** Contadores agregados (topo da página), respeitando os filtros ativos exceto o próprio status. */
export function contadores(indice, filtros = {}) {
  const ids = filtrar(indice, { ...filtros, status: STATUS.TODAS });
  let respondidas = 0;
  let acertos = 0;
  for (const id of ids) {
    const st = indice.statusPorQuestao.get(id);
    if (st?.respondida) {
      respondidas += 1;
      if (st.acertouUltima) acertos += 1;
    }
  }
  const total = ids.length;
  const naoRespondidas = total - respondidas;
  const erros = respondidas - acertos;
  const percentualAcerto = respondidas > 0 ? (acertos / respondidas) * 100 : 0;
  return { total, naoRespondidas, respondidas, acertos, erros, percentualAcerto };
}

/** Especialidades existentes dentro de uma grande área (ou todas, se grandeArea for omitida). */
export function especialidadesDe(indice, grandeArea) {
  const set = new Set();
  for (const q of indice.questoesPorId.values()) {
    if (!grandeArea || q.grandeArea === grandeArea) set.add(q.especialidade);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** Temas existentes dentro de uma especialidade (id + título). */
export function temasDe(indice, especialidade) {
  const map = new Map();
  for (const q of indice.questoesPorId.values()) {
    if (!especialidade || q.especialidade === especialidade) map.set(q.temaId, q.tema);
  }
  return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
}

/** Atualiza o índice em memória após uma nova resposta, sem re-fetch de rede. */
export function registrarRespostaNoIndice(indice, questaoId, acertou, respondidoEmIso) {
  const atual = indice.statusPorQuestao.get(questaoId);
  indice.statusPorQuestao.set(questaoId, {
    respondida: true,
    acertouUltima: acertou,
    tentativas: (atual?.tentativas || 0) + 1,
    ultimaEm: respondidoEmIso,
  });
}
