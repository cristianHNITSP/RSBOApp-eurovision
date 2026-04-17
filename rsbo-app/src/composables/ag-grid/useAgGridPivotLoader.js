/**
 * useAgGridPivotLoader.js
 * Factory para el datasource de AgGrid Infinite Row Model con soporte para carga en dos fases (skeletons + items reales).
 */

import { computed } from "vue";
import { sleep } from "@/components/ag-grid/utils/ag-grid-utils";

export function useAgGridPivotLoader({
  baseAxis,
  getRowCache,
  fetchItems,
  sheetId,
  buildFetchQuery,
  normalizeItem,
  buildPivotPage,
  gridApi,
  rowIdGetter,
  pendingChanges,
  DEV_DELAY_MS = 0,
  LOG_ROWS = () => {},
}) {
  const datasource = computed(() => ({
    getRows({ startRow, endRow, successCallback }) {
      const axis = baseAxis.value;
      const pageKeys = axis.slice(startRow, endRow);

      LOG_ROWS(`getRows [${startRow}–${endRow}] (${pageKeys.length} filas)`);

      if (!pageKeys.length) {
        successCallback([], axis.length);
        return;
      }

      // ── Cache-first: si todas las filas de la página ya están en caché → sin skeleton ──
      const cache = getRowCache();
      if (pageKeys.every(k => cache.has(String(k)))) {
        LOG_ROWS(`getRows [${startRow}–${endRow}]: cache hit total.`);
        successCallback(pageKeys.map(k => cache.get(String(k))), axis.length);
        return;
      }

      // FASE 1: placeholders inmediatos
      const loadingRows = buildPivotPage(pageKeys, [], { loading: true });
      successCallback(loadingRows, axis.length);
      LOG_ROWS(`FASE 1: ${loadingRows.length} placeholders enviados.`);

      // FASE 2: fetch real
      (async () => {
        try {
          if (DEV_DELAY_MS > 0) {
            LOG_ROWS(`FASE 2: delay ${DEV_DELAY_MS}ms...`);
            await sleep(DEV_DELAY_MS);
          }

          const query = buildFetchQuery(pageKeys);
          LOG_ROWS("FASE 2: query →", query);
          const { data } = await fetchItems(sheetId.value, query);
          const items = (data?.data || []).map(normalizeItem);
          LOG_ROWS(`FASE 2: ${items.length} items recibidos del backend.`);

          const realRows = buildPivotPage(pageKeys, items, { loading: false, pendingChanges: pendingChanges.value });

          // Guardar en caché
          realRows.forEach(row => {
            const id = rowIdGetter(row);
            cache.set(String(id), row);
          });

          // Actualizar nodos en el grid
          if (gridApi.value) {
            let n = 0;
            realRows.forEach(row => {
              const id = rowIdGetter(row);
              const node = gridApi.value.getRowNode(String(id));
              if (node) {
                node.setData(row);
                gridApi.value.refreshCells({ rowNodes: [node], force: true });
                n++;
              }
            });
            LOG_ROWS(`FASE 2: ${n}/${realRows.length} nodos actualizados.`);
          }
        } catch (e) {
          console.error("[PivotLoader] FASE 2 error:", e);
        }
      })();
    },
  }));

  return {
    datasource,
  };
}
