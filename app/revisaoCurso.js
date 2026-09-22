/**
 * MedConduta — Curso: revisão espaçada por TEMA (não por flashcard/questão,
 * ver sm2.js/erros.js), ancorada na data real em que o usuário marcou o tema
 * como estudado (progresso.atualizadoEm, já gravado por marcarConcluido em
 * app/views/conteudo.js) — nunca na data programada do cronograma.
 *
 * Ao marcar um tema como estudado, gera de uma vez as 5 revisões do ciclo
 * (3/5/7/15/30 dias). `cicloId` é a própria data do estudo: uma nova data de
 * estudo (re-estudar o tema depois) abre um novo ciclo automaticamente, sem
 * precisar de contador à parte — o ciclo anterior fica registrado no
 * histórico, nunca é apagado. O id de cada revisão é determinístico
 * (temaId+cicloId+tipo), então gravar de novo (ex.: usuário clica em
 * "Marcar como estudado" duas vezes no mesmo dia) apenas sobrescreve o mesmo
 * registro — idempotente por construção, sem precisar checar duplicata.
 */

import { getAll, setItem } from "./db.js";

const STORE_REVISOES = "revisoes_curso";

export const REVIEW_INTERVALS = [
  { tipo: "3d", dias: 3 },
  { tipo: "5d", dias: 5 },
  { tipo: "7d", dias: 7 },
  { tipo: "15d", dias: 15 },
  { tipo: "30d", dias: 30 },
];

/** Hoje no formato YYYY-MM-DD, em horário local (evita o drift de UTC — ver cronograma.js:calcularDiasRestantes). */
export function hojeIso(referencia = new Date()) {
  const d = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function somarDias(dataIso, dias) {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const d = new Date(ano, mes - 1, dia + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Diferença em dias entre duas datas YYYY-MM-DD (b - a). */
export function diffDias(dataIsoA, dataIsoB) {
  const [anoA, mesA, diaA] = dataIsoA.split("-").map(Number);
  const [anoB, mesB, diaB] = dataIsoB.split("-").map(Number);
  const a = new Date(anoA, mesA - 1, diaA);
  const b = new Date(anoB, mesB - 1, diaB);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/** Grava as 5 revisões do ciclo aberto por um estudo em `dataEstudoIso` (YYYY-MM-DD). Idempotente. */
export async function gerarRevisoesParaTema(temaId, dataEstudoIso) {
  await Promise.all(
    REVIEW_INTERVALS.map(({ tipo, dias }) =>
      setItem(STORE_REVISOES, {
        id: `${temaId}__${dataEstudoIso}__${tipo}`,
        temaId,
        cicloId: dataEstudoIso,
        tipo,
        dataEstudo: dataEstudoIso,
        dataAgendada: somarDias(dataEstudoIso, dias),
        status: "pendente",
        concluidaEm: null,
      })
    )
  );
}

export async function marcarRevisaoConcluida(revisaoId) {
  const todas = await getAll(STORE_REVISOES);
  const revisao = todas.find((r) => r.id === revisaoId);
  if (!revisao) return;
  await setItem(STORE_REVISOES, { ...revisao, status: "concluida", concluidaEm: new Date().toISOString() });
}

/**
 * Agenda de revisões pendentes, já separada por status. `vencidas`/`hoje`
 * comparam `dataAgendada` com a data local de hoje — nunca UTC puro.
 */
export async function getAgendaRevisoes(referencia = new Date()) {
  const hoje = hojeIso(referencia);
  const todas = await getAll(STORE_REVISOES);
  const pendentes = todas.filter((r) => r.status === "pendente");

  const vencidas = pendentes.filter((r) => r.dataAgendada < hoje).sort((a, b) => a.dataAgendada.localeCompare(b.dataAgendada));
  const hojeLista = pendentes.filter((r) => r.dataAgendada === hoje);
  const futuras = pendentes.filter((r) => r.dataAgendada > hoje).sort((a, b) => a.dataAgendada.localeCompare(b.dataAgendada));

  return { vencidas, hoje: hojeLista, futuras, total: pendentes.length };
}
