/**
 * gridConfig.js
 * Configuración central de AgGridSheet — ÚNICO lugar editable, no por tipo de matriz.
 *
 * `rowPageSize` es el cacheBlockSize del Infinite Row Model: cuántas filas (del eje)
 * pide AG Grid por request. Bajarlo hace la carga más ligera (más requests, menos datos
 * por request); subirlo hace lo contrario. No requiere cambios en el servidor: el backend
 * ya filtra por rango y tiene su propio `limit` de seguridad.
 */
export const GRID_CONFIG = {
  rowHeight: 30,
  headerHeight: 32,
  fetchLimit: 5000,                          // tope de seguridad por request (alineado con el backend)
  // ── Paginación nativa (Client-Side; solo display, no pega al servidor) ──
  pagination: true,
  paginationPageSize: 20,                    // por defecto
  paginationPageSizeSelector: [10, 20, 50, 100],
  // ── Tórico ──
  toricoLruSize: 3,                          // grados que el memo de Tórico mantiene vivos
};
