import { icon } from "./icons.js";

/** Stat-tile com ícone colorido — mesma identidade visual usada em Questões. */
export function statTile({ value, label, icone, tom = "accent" }) {
  return `
    <div class="stat-tile stat-tile--icon">
      <span class="icon-badge icon-badge--sm icon-badge--${tom}">${icon(icone, { size: 16 })}</span>
      <span>
        <span class="stat-tile__value">${value}</span>
        <span class="stat-tile__label">${label}</span>
      </span>
    </div>`;
}
