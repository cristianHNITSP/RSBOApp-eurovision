// src/services/search.service.js
/**
 * Servicio de búsqueda global.
 * Conecta con GET /api/search?q=<texto>
 */
import api from '@/api/axios';

/**
 * @param {string} q        — texto a buscar (mínimo 2 caracteres)
 * @param {number} [limit]  — máx resultados por categoría (default 8)
 * @returns {Promise<{ routes: RouteResult[], sheets: SheetResult[], orders: OrderResult[] }>}
 */
export async function globalSearch(q, limit = 8) {
  const { data } = await api.get('/search', {
    params: { q: q.trim(), limit },
    withCredentials: true
  });
  return data;
}

/**
 * Construye una lista "plana" de resultados combinados y agrupados
 * lista conveniente para renderizar en el dropdown.
 *
 * Formato devuelto:
 * [
 *   { type: 'header', label: 'Páginas' },
 *   { type: 'route',  ...routeData },
 *   { type: 'header', label: 'Plantillas oftálmicas' },
 *   { type: 'sheet',  ...sheetData },
 * ]
 */
export function flattenResults({ routes = [], sheets = [], orders = [] }) {
  const items = [];

  if (routes.length) {
    items.push({ type: 'header', label: 'Páginas', icon: 'compass' });
    routes.forEach(r => items.push({ type: 'route', ...r }));
  }

  // Agrupar planillas por su categoría (oftálmicas vs lentes de contacto)
  const byCategory = {};
  sheets.forEach(s => {
    const cat = s.category || 'Planillas oftálmicas';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(s);
  });

  const catIcons = {
    'Planillas oftálmicas': 'glasses',
    'Lentes de contacto':   'eye'
  };

  Object.entries(byCategory).forEach(([label, group]) => {
    items.push({ type: 'header', label, icon: catIcons[label] || 'glasses' });
    group.forEach(s => items.push({ type: 'sheet', ...s }));
  });

  if (orders.length) {
    items.push({ type: 'header', label: 'Órdenes de laboratorio', icon: 'flask' });
    orders.forEach(o => items.push({ type: 'order', ...o }));
  }

  return items;
}