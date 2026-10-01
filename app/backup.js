/**
 * MedConduta — backup diário do progresso do usuário.
 *
 * Os dados já são salvos em tempo real no servidor a cada ação (ver db.js) —
 * isso aqui é uma camada extra: um snapshot completo por dia (últimos 30
 * dias, guardado no próprio banco em nuvem já usado pelo app, store
 * "backups") que o usuário pode baixar como arquivo a qualquer momento. Serve
 * de segurança adicional (ex.: olhar "como estava há alguns dias") e como
 * cópia exportável fora da plataforma.
 */

import { getAll, getItem, setItem, removeItem } from "./db.js";

// Todo store de dado do usuário que existe hoje na plataforma (ver cada
// módulo abaixo para a fonte de cada nome) — mantém sincronizado manualmente
// sempre que um novo store for criado.
const STORES_BACKUP = [
  "respostas", // questoes.js, erros.js, simulados.js
  "progresso", // conteudo.js
  "sessoes", // foco.js
  "prefs", // cronograma.js, theme.js
  "ia_temas", // iaConteudo.js
  "ia_fluxogramas", // iaConteudo.js
  "ia_questoes", // iaConteudo.js
  "ia_abas", // conteudo.js
  "filtros_salvos", // questoes.js
  "simulados", // simulados.js
  "srs_questoes", // erros.js
  "srs_flashcards", // flashcards.js
  "anotacoes", // anotacoes.js
  "questoes_favoritas", // favoritos.js
  "revisoes_curso", // revisaoCurso.js
];

const RETENCAO_DIAS = 30;

export function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

async function montarSnapshot() {
  const resultados = await Promise.all(STORES_BACKUP.map((s) => getAll(s)));
  const snapshot = {};
  let totalRegistros = 0;
  STORES_BACKUP.forEach((s, i) => {
    snapshot[s] = resultados[i];
    totalRegistros += resultados[i].length;
  });
  return { snapshot, totalRegistros };
}

async function podarBackupsAntigos(idsExistentes) {
  const limite = new Date();
  limite.setDate(limite.getDate() - RETENCAO_DIAS);
  const limiteIso = limite.toISOString().slice(0, 10);
  const antigos = idsExistentes.filter((id) => id < limiteIso);
  await Promise.all(antigos.map((id) => removeItem("backups", id)));
}

/** Cria (ou sobrescreve) o backup de hoje imediatamente. */
export async function criarBackupAgora() {
  const hoje = hojeIso();
  const { snapshot, totalRegistros } = await montarSnapshot();
  const registro = { id: hoje, snapshot, totalRegistros, criadoEm: new Date().toISOString() };
  await setItem("backups", registro);

  const todos = await getAll("backups");
  await podarBackupsAntigos(todos.map((b) => b.id));

  return registro;
}

/** Roda uma vez por dia (idempotente) — chamado automaticamente no boot do app. */
export async function rodarBackupDiarioSeNecessario() {
  const existente = await getItem("backups", hojeIso());
  if (existente) return existente;
  return criarBackupAgora();
}

/** Lista os backups guardados, mais recente primeiro (sem o snapshot completo, só o resumo). */
export async function listarBackups() {
  const todos = await getAll("backups");
  return todos
    .map((b) => ({ id: b.id, totalRegistros: b.totalRegistros, criadoEm: b.criadoEm }))
    .sort((a, b) => b.id.localeCompare(a.id));
}

/** Baixa um backup específico como arquivo .json. */
export async function baixarBackup(id) {
  const registro = await getItem("backups", id);
  if (!registro) return false;

  const conteudo = JSON.stringify({ exportadoEm: new Date().toISOString(), dataBackup: registro.id, dados: registro.snapshot }, null, 2);
  const blob = new Blob([conteudo], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `medconduta-backup-${registro.id}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}
