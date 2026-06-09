// src/services/search.service.js
// Cliente del buscador global: llamada a la API + historial en localStorage.
// El formateo/flatten vive en data/search + composables/search (separación de capas).
import api from "@/api/axios";

const HISTORY_KEY = "gs_history";
const HISTORY_MAX = 8;

// ── API ───────────────────────────────────────────────────────────────────────
/**
 * GET /api/search?q=&limit= → { diopters?, optica?, sheets?, routes? }
 * @param {string} q
 * @param {number} [limit]
 */
export async function globalSearch(q, limit = 8) {
  const { data } = await api.get("/search", {
    params: { q: q.trim(), limit },
    withCredentials: true,
  });
  return data || {};
}

// ── Historial (localStorage) ──────────────────────────────────────────────────
export function getSearchHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}

export function pushSearchHistory(item) {
  if (!item?.label) return;
  const prev = getSearchHistory().filter((h) => h.id !== item.id);
  const next = [{ ...item, historyAt: Date.now() }, ...prev].slice(0, HISTORY_MAX);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function clearSearchHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export function removeHistoryItem(id) {
  const next = getSearchHistory().filter((h) => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}
