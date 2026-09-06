/**
 * MedConduta — algoritmo de repetição espaçada tipo SM-2 (SuperMemo 2).
 * Estado por item: { ease, interval (dias), repetitions, dueDate (ISO), lastQuality }
 * Qualidade da resposta: 0-5 (0-2 = errou/difícil demais, reinicia; 3-5 = acertou, evolui).
 */

const MIN_EASE = 1.3;

export function criarEstadoInicial() {
  return {
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: new Date().toISOString(),
    lastQuality: null,
  };
}

/**
 * Aplica uma revisão ao estado SM-2 e retorna o novo estado.
 * @param {object} estado - estado atual (ou null para novo item)
 * @param {number} qualidade - 0 a 5
 */
export function revisar(estado, qualidade) {
  const s = estado ? { ...estado } : criarEstadoInicial();
  qualidade = Math.max(0, Math.min(5, qualidade));

  if (qualidade < 3) {
    s.repetitions = 0;
    s.interval = 1;
  } else {
    s.repetitions += 1;
    if (s.repetitions === 1) s.interval = 1;
    else if (s.repetitions === 2) s.interval = 6;
    else s.interval = Math.round(s.interval * s.ease);
  }

  s.ease = Math.max(
    MIN_EASE,
    s.ease + (0.1 - (5 - qualidade) * (0.08 + (5 - qualidade) * 0.02))
  );

  s.lastQuality = qualidade;
  const due = new Date();
  due.setDate(due.getDate() + s.interval);
  s.dueDate = due.toISOString();

  return s;
}

export function estaVencido(estado, referencia = new Date()) {
  if (!estado) return true;
  return new Date(estado.dueDate).getTime() <= referencia.getTime();
}

export function diasAteVencer(estado, referencia = new Date()) {
  if (!estado) return 0;
  const diff = new Date(estado.dueDate).getTime() - referencia.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
