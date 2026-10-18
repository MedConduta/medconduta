/**
 * MedConduta — acesso ao banco de questões particionado (data/questoes/).
 *
 * O banco é dividido em um índice leve (indice.json: id, instituição, ano,
 * prova, tema e arquivo de cada questão) e um arquivo por especialidade com
 * as questões completas. Filtros e contagens usam só o índice; o conteúdo
 * (enunciado, alternativas, imagens) é baixado por especialidade, apenas
 * quando alguma tela precisa mostrar ou sortear aquela questão. O formato
 * dos arquivos está descrito em ferramentas/banco_questoes.py.
 *
 * Cópias mescladas de uma mesma questão deixam o id antigo em `aliases`;
 * resolverId() traduz esses ids para que respostas e favoritos gravados antes
 * da mescla continuem apontando para a questão certa.
 *
 * Questões repetidas entre cadernos da mesma instituição (a R+ que reaproveita
 * a questão da R1, às vezes com as alternativas em outra ordem) têm `repetidaDe`:
 * ficam fora do banco, das contagens e dos sorteios (`registros`), mas continuam
 * na prova completa de origem (`registrosProvas`).
 */
import { fetchJsonCached } from "./utils.js";
import { AREA_POR_CATEGORIA } from "./areas.js";

const BASE = "data/questoes/";
const LETRAS = "ABCDE";

let indicePromise = null;
const arquivosCarregados = new Map(); // nome do arquivo -> Promise<Map<id, questão completa>>

/**
 * Rótulo de instituição para filtros/badges. `origem` (de onde o texto veio:
 * MedCof, Medway...) é só interno — nunca aparece na tela nem vira filtro.
 */
export function rotuloInstituicao(q) {
  return q.instituicao || "Instituição não informada";
}

function linhaParaRegistro(linha, campos, dic, temaPorId) {
  const r = {};
  campos.forEach((campo, i) => {
    const valor = linha[i];
    r[campo] = dic[campo] ? (valor === -1 || valor === null ? null : dic[campo][valor]) : valor;
  });
  const tema = temaPorId.get(r.temaId);
  r.anulada = Boolean(r.anulada);
  r.repetida = Boolean(r.repetida);
  r.tema = tema?.titulo || r.temaId;
  r.especialidade = tema?.categoria || "Outros";
  r.categoria = r.especialidade;
  r.grandeArea = AREA_POR_CATEGORIA[r.especialidade] || "Outros";
  r.banca = rotuloInstituicao(r);
  return r;
}

/**
 * Carrega (uma vez por sessão) o índice leve. Retorna
 * { registros, registrosProvas, porId: Map(id -> registro leve), resolverId(id) }.
 */
export function carregarIndiceBanco() {
  if (!indicePromise) {
    indicePromise = Promise.all([fetchJsonCached(`${BASE}indice.json`), fetchJsonCached("data/temas.json")])
      .then(([indice, temas]) => {
        const temaPorId = new Map(temas.map((t) => [t.id, t]));
        const registrosProvas = indice.linhas.map((l) => linhaParaRegistro(l, indice.campos, indice.dicionarios, temaPorId));
        const registros = registrosProvas.filter((r) => !r.repetida);
        const porId = new Map(registrosProvas.map((r) => [r.id, r]));
        const aliases = new Map(Object.entries(indice.aliases || {}));
        return { registros, registrosProvas, porId, resolverId: (id) => aliases.get(id) || id };
      })
      .catch((err) => {
        indicePromise = null; // permite tentar de novo (ex.: voltou a conexão)
        throw err;
      });
  }
  return indicePromise;
}

/** Acrescenta à questão completa os campos que o restante do app já usa (correta, banca, categoria...). */
function normalizar(q) {
  const especialidade = q.especialidade || "Outros";
  return {
    ...q,
    correta: q.gabarito ? LETRAS.indexOf(q.gabarito) : -1,
    categoria: especialidade,
    grandeArea: q.grandeArea || AREA_POR_CATEGORIA[especialidade] || "Outros",
    banca: rotuloInstituicao(q),
    imagens: q.imagens || [],
  };
}

/** Baixa (uma vez) um arquivo de especialidade. */
export function carregarArquivo(nome) {
  if (!arquivosCarregados.has(nome)) {
    const p = fetchJsonCached(`${BASE}${nome}`)
      .then((lista) => new Map(lista.map((q) => [q.id, normalizar(q)])))
      .catch((err) => {
        arquivosCarregados.delete(nome);
        throw err;
      });
    arquivosCarregados.set(nome, p);
  }
  return arquivosCarregados.get(nome);
}

/** Questões completas dos ids pedidos (ids antigos são resolvidos). Ids inexistentes são ignorados. */
export async function obterQuestoes(ids) {
  const { porId, resolverId } = await carregarIndiceBanco();
  const resolvidos = [...new Set(ids.map(resolverId))].filter((id) => porId.has(id));
  const arquivos = [...new Set(resolvidos.map((id) => porId.get(id).arquivo))];
  const mapas = await Promise.all(arquivos.map(carregarArquivo));
  const todas = new Map();
  for (const m of mapas) for (const [id, q] of m) todas.set(id, q);
  const saida = new Map();
  for (const id of resolvidos) if (todas.has(id)) saida.set(id, todas.get(id));
  return saida;
}

/** Todas as questões completas das especialidades pedidas (ou de todas, sem argumento). */
export async function carregarEspecialidades(especialidades) {
  const { registros } = await carregarIndiceBanco();
  const alvo = especialidades ? new Set(especialidades) : null;
  const arquivos = [...new Set(registros.filter((r) => !alvo || alvo.has(r.especialidade)).map((r) => r.arquivo))];
  const mapas = await Promise.all(arquivos.map(carregarArquivo));
  return mapas.flatMap((m) => [...m.values()]).filter((q) => !q.repetidaDe);
}

/** Completa registros leves (do índice) com o conteúdo, preservando a ordem. */
export async function hidratar(registrosOuIds) {
  const ids = registrosOuIds.map((r) => (typeof r === "string" ? r : r.id));
  const mapa = await obterQuestoes(ids);
  return ids.map((id) => mapa.get(id)).filter(Boolean);
}
