/**
 * MedConduta — ícones inline (SVG, stroke, 24x24), sem dependência externa.
 * Uso: icon("book") retorna o markup do <svg>.
 */

const PATHS = {
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  brain: '<path d="M9.5 2a3 3 0 0 0-3 3v.5A2.5 2.5 0 0 0 4 8v1a2.5 2.5 0 0 0 1 2 2.5 2.5 0 0 0-1 2v1a2.5 2.5 0 0 0 2.5 2.5A3 3 0 0 0 9.5 19"/><path d="M14.5 2a3 3 0 0 1 3 3v.5A2.5 2.5 0 0 1 20 8v1a2.5 2.5 0 0 1-1 2 2.5 2.5 0 0 1 1 2v1a2.5 2.5 0 0 1-2.5 2.5A3 3 0 0 1 14.5 19"/><path d="M9.5 2v17M14.5 2v17"/>',
  layers: '<path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
  flowchart: '<rect x="4" y="3" width="7" height="5" rx="1.5"/><rect x="13" y="16" width="7" height="5" rx="1.5"/><path d="M7.5 8v4a3 3 0 0 0 3 3H13"/>',
  checklist: '<path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="2"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18"/>',
  stethoscope: '<path d="M5 3v6a4 4 0 0 0 8 0V3"/><path d="M9 13v2a6 6 0 0 0 12 0v-2.5"/><circle cx="21" cy="10.5" r="1.75"/>',
  siren: '<path d="M12 2a7 7 0 0 1 7 7v6H5V9a7 7 0 0 1 7-7z"/><path d="M12 2v2M4 16h16v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3z"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 11h6M9 15h6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
};

export function icon(name, { size = 20, className = "" } = {}) {
  const path = PATHS[name] || "";
  return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
