/**
 * MedConduta — Fase 8: Modo Foco (registro de sessão).
 *
 * Guarda sessões de estudo com foco (temporizador dedicado, sem distração)
 * no store "sessoes" — cada registro é só {id, inicioEm, duracaoMin,
 * concluida}. Esses registros alimentam a "constância" (streak, tempo
 * total), ver constancia.js.
 */

import { setItem } from "./db.js";

export const DURACAO_PADRAO_MIN = 25;
export const DURACAO_MIN_MIN = 10;
export const DURACAO_MAX_MIN = 60;

// Sessões mais curtas que isso não são registradas — evita ruído de quem só
// clicou em "iniciar" e "encerrar" sem realmente estudar.
export const MIN_MINUTOS_PARA_REGISTRAR = 3;

/** Registra uma sessão de foco (completa ou encerrada antes do fim). */
export async function registrarSessao({ inicioEm, duracaoMin, concluida }) {
  if (duracaoMin < MIN_MINUTOS_PARA_REGISTRAR) return;
  await setItem("sessoes", {
    id: `sessao-${Date.now()}`,
    inicioEm,
    duracaoMin,
    concluida,
  });
}

// ---------- Sessão ativa (global) ----------
// O cronômetro vive aqui, fora da tela do Modo Foco, para continuar contando
// enquanto o usuário navega pela plataforma — a barra superior mostra o tempo
// ao lado do relógio. O estado fica no localStorage (só horários, nada de
// contador incremental), então sobrevive também a recarregar a página.

const CHAVE_SESSAO = "medconduta.focoAtivo";

// { duracaoMin, inicioEm, fimEmMs (rodando) | restanteMs (pausado), pausado }
let sessao = carregarSessao();
const ouvintes = new Set();
let intervalo = null;

function carregarSessao() {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE_SESSAO) || "null");
    return s && s.duracaoMin && s.inicioEm ? s : null;
  } catch {
    return null;
  }
}

function salvarSessao() {
  try {
    if (sessao) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    else localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    /* sem localStorage: a sessão só não sobrevive a recarregar a página */
  }
}

function segundosRestantesDe(s) {
  const ms = s.pausado ? s.restanteMs : s.fimEmMs - Date.now();
  return Math.max(0, Math.ceil(ms / 1000));
}

function minutosDecorridosDe(s) {
  return s.duracaoMin - Math.ceil(segundosRestantesDe(s) / 60);
}

/** Estado atual do cronômetro: null se não há sessão em andamento. */
export function getSessaoAtiva() {
  if (!sessao) return null;
  return {
    estado: sessao.pausado ? "pausado" : "rodando",
    duracaoMin: sessao.duracaoMin,
    segundosRestantes: segundosRestantesDe(sessao),
  };
}

/** Avisa a cada segundo (e a cada mudança) — recebe getSessaoAtiva() e, ao terminar, {concluida, minutos}. */
export function onSessaoFoco(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

function avisar(fim = null) {
  const atual = getSessaoAtiva();
  ouvintes.forEach((fn) => {
    try {
      fn(atual, fim);
    } catch {
      /* um ouvinte com erro não derruba os outros */
    }
  });
}

function garantirIntervalo() {
  if (sessao && !intervalo) intervalo = setInterval(tick, 1000);
  if (!sessao && intervalo) {
    clearInterval(intervalo);
    intervalo = null;
  }
}

function tick() {
  if (!sessao) return garantirIntervalo();
  if (!sessao.pausado && segundosRestantesDe(sessao) <= 0) {
    encerrarSessao(true);
    return;
  }
  avisar();
}

export function iniciarSessao(duracaoMin) {
  sessao = {
    duracaoMin,
    inicioEm: new Date().toISOString(),
    fimEmMs: Date.now() + duracaoMin * 60 * 1000,
    pausado: false,
  };
  salvarSessao();
  garantirIntervalo();
  avisar();
}

export function alternarPausaSessao() {
  if (!sessao) return;
  if (sessao.pausado) {
    sessao.fimEmMs = Date.now() + sessao.restanteMs;
    delete sessao.restanteMs;
    sessao.pausado = false;
  } else {
    sessao.restanteMs = Math.max(0, sessao.fimEmMs - Date.now());
    delete sessao.fimEmMs;
    sessao.pausado = true;
  }
  salvarSessao();
  avisar();
}

/** Encerra a sessão (no fim do tempo ou antes) e registra o tempo estudado. Devolve os minutos. */
export async function encerrarSessao(concluida) {
  if (!sessao) return 0;
  const s = sessao;
  sessao = null;
  salvarSessao();
  garantirIntervalo();
  const minutos = concluida ? s.duracaoMin : minutosDecorridosDe(s);
  try {
    await registrarSessao({ inicioEm: s.inicioEm, duracaoMin: minutos, concluida });
  } finally {
    avisar({ concluida, minutos });
  }
  return minutos;
}

/** Ao sair da conta: registra o que já foi estudado e limpa a sessão local. */
export async function encerrarSessaoAoSair() {
  if (sessao) await encerrarSessao(false).catch(() => {});
}

export function formatarMMSS(segundos) {
  const min = String(Math.floor(segundos / 60)).padStart(2, "0");
  const seg = String(segundos % 60).padStart(2, "0");
  return `${min}:${seg}`;
}

// Uma sessão salva de antes (página recarregada) retoma — ou é encerrada, se
// o tempo acabou enquanto a aba estava fechada.
garantirIntervalo();
