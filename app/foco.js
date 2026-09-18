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
