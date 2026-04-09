// src/services/search.service.js
/**
 * Servicio de búsqueda global.
 * Conecta con GET /api/search?q=<texto>
 */
import api from '@/api/axios';

const HISTORY_KEY = 'gs_history';
const HISTORY_MAX = 8;

// ── Historial de búsquedas ────────────────────────────────────────────────────
export function getSearchHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { return []; }
}

export function pushSearchHistory(item) {
  if (!item?.label) return;
  const prev = getSearchHistory().filter(h => h.id !== item.id);
  const next = [{ ...item, historyAt: Date.now() }, ...prev].slice(0, HISTORY_MAX);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function clearSearchHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export function removeHistoryItem(id) {
  const next = getSearchHistory().filter(h => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

// ── Formateador de rangos de dioptrias ───────────────────────────────────────
const RANGE_LABELS = { sph: 'Esf', cyl: 'Cil', add: 'Add', base: 'Base', axis: 'Eje' };

/** Formatea un valor dióptrico con signo (ej. -3 → "-3.00", 2 → "+2.00") */
function fmtDiop(n) {
  if (n == null) return '?';
  const s = Number(n).toFixed(2);
  return n > 0 ? `+${s}` : s;
}

/** Formatea un rango de eje (eje 10°–180° sin signo) */
function fmtAxis(n) {
  return n == null ? '?' : `${Number(n).toFixed(0)}°`;
}

/**
 * Convierte el objeto `ranges` de una planilla en un array de chips legibles.
 * Ej: [ "Esf: -16.00…+8.00", "Cil: -6.00…0.00" ]
 */
export function formatRangeChips(ranges) {
  if (!ranges) return [];
  return Object.entries(RANGE_LABELS)
    .filter(([key]) => ranges[key] != null)
    .map(([key, label]) => {
      const { start, end } = ranges[key];
      if (key === 'axis') {
        return `${label}: ${fmtAxis(start)}–${fmtAxis(end)}`;
      }
      const lo = Math.min(start, end);
      const hi = Math.max(start, end);
      return `${label}: ${fmtDiop(lo)}…${fmtDiop(hi)}`;
    });
}

// ── API call ──────────────────────────────────────────────────────────────────
/**
 * @param {string} q        — texto a buscar (mínimo 2 caracteres)
 * @param {number} [limit]  — máx resultados por categoría (default 8)
 */
export async function globalSearch(q, limit = 8) {
  const { data } = await api.get('/search', {
    params: { q: q.trim(), limit },
    withCredentials: true
  });
  return data;
}

// ── flattenResults ────────────────────────────────────────────────────────────
const CAT_ICONS = {
  'Planillas oftálmicas': 'glasses',
  'Lentes de contacto':   'eye'
};

/**
 * Construye la lista plana agrupada para el dropdown.
 * Formato: [ header, item, item, header, item, ... ]
 */
export function flattenResults({ routes = [], sheets = [], orders = [] }) {
  const items = [];

  if (routes.length) {
    items.push({ type: 'header', label: 'Páginas', icon: 'compass', count: routes.length });
    routes.forEach(r => items.push({ type: 'route', ...r }));
  }

  // Agrupar planillas por categoría
  const byCategory = {};
  sheets.forEach(s => {
    const cat = s.category || 'Planillas oftálmicas';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(s);
  });

  Object.entries(byCategory).forEach(([label, group]) => {
    items.push({ type: 'header', label, icon: CAT_ICONS[label] || 'glasses', count: group.length });
    group.forEach(s => items.push({ type: 'sheet', ...s }));
  });

  if (orders.length) {
    items.push({ type: 'header', label: 'Órdenes de laboratorio', icon: 'flask', count: orders.length });
    orders.forEach(o => items.push({ type: 'order', ...o }));
  }

  return items;
}
