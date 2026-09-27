/**
 * MedConduta — indicador de streak (dias seguidos estudando) mais chamativo,
 * no estilo dos apps de hábito (ex.: Duolingo) — substitui o texto pequeno
 * "🔥 X dias seguidos" que existia antes em Minha Preparação e Hoje.
 */
export function renderStreak(streakAtual) {
  const ativo = streakAtual > 0;
  return `
    <div class="streak-chamativo ${ativo ? "is-ativo" : "is-inativo"}">
      <span class="streak-chamativo__chama" aria-hidden="true">🔥</span>
      <div class="streak-chamativo__texto">
        <span class="streak-chamativo__numero">${streakAtual}</span>
        <span class="streak-chamativo__label">dia${streakAtual === 1 ? "" : "s"} seguido${streakAtual === 1 ? "" : "s"}${ativo ? "" : " — comece hoje"}</span>
      </div>
    </div>`;
}
