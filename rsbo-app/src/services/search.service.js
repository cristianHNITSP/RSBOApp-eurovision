// src/services/search.service.js
/**
 * Servicio de búsqueda global.
 * Conecta con GET /api/search?q=<texto>
 */
import api from '@/api/axios';

/**
 * @param {string} q        — texto a buscar (mínimo 2 caracteres)
 * @param {number} [limit]  — máx resultados por categoría (default 8)
 * @returns {Promise<{ routes: RouteResult[], sheets: SheetResult[] }>}
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
export function flattenResults({ routes = [], sheets = [] }) {
  const items = [];

  if (routes.length) {
    items.push({ type: 'header', label: 'Páginas', icon: 'compass' });
    routes.forEach(r => items.push({ type: 'route', ...r }));
  }

  if (sheets.length) {
    items.push({ type: 'header', label: 'Plantillas oftálmicas', icon: 'glasses' });
    sheets.forEach(s => items.push({ type: 'sheet', ...s }));
  }

  return items;
}