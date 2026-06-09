// src/composables/search/useHighlight.js
// Resalta en HTML los caracteres que coinciden con la query (pure, sin estado).

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Devuelve `text` con las coincidencias de `query` envueltas en <mark>. */
export function highlight(text, query) {
  if (!query || !text) return text ?? "";
  return String(text).replace(
    new RegExp(`(${escapeRegex(query)})`, "gi"),
    '<mark class="gs-mark">$1</mark>'
  );
}
