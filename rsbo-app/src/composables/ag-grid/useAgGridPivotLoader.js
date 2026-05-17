/**
 * useAgGridPivotLoader.js
 * Factory para el datasource de AgGrid Infinite Row Model.
 *
 * Patrón nativo de AG Grid: un solo `successCallback(rows, lastRow)` por
 * petición. El `rowCaches` Map del template preserva filas entre cambios
 * de eje (sphType/degree) — separado del cache interno de AG Grid que
 * sólo conoce el eje actual.
 */

import { computed, ref } from "vue";
import { sleep } from "@/components/ag-grid/utils/ag-grid-utils";

export function useAgGridPivotLoader({
  baseAxis,
  getRowCache,
  fetchItems,
  sheetId,
  viewId,
  buildFetchQuery,
  normalizeItem,
  buildPivotPage,
  rowIdGetter,
  pendingChanges,
  DEV_DELAY_MS = 0,
  LOG_ROWS = () => { },
}) {
  const readViewId = () => {
    if (viewId == null) return null;
    if (typeof viewId === "function") return viewId();
    if (typeof viewId === "object" && "value" in viewId) return viewId.value;
    return viewId;
  };

  const loadingRowsCount = ref(0);
  const rowsInCacheCount = ref(0);

  const datasource = computed(() => ({
    async getRows({ startRow, endRow, successCallback, failCallback }) {
      const axis = baseAxis.value;
      const pageKeys = axis.slice(startRow, endRow);

      LOG_ROWS(`getRows [${startRow}–${endRow}] (${pageKeys.length} filas)`);

      if (!pageKeys.length) {
        successCallback([], axis.length);
        return;
      }

      const cache = getRowCache();
      rowsInCacheCount.value = cache.size;

      // Cache-first (cross-axis preservation)
      if (pageKeys.every(k => cache.has(String(k)))) {
        LOG_ROWS(`getRows [${startRow}–${endRow}]: cache hit total.`);
        successCallback(pageKeys.map(k => cache.get(String(k))), axis.length);
        return;
      }

      loadingRowsCount.value += pageKeys.length;
      try {
        if (DEV_DELAY_MS > 0) {
          LOG_ROWS(`delay ${DEV_DELAY_MS}ms...`);
          await sleep(DEV_DELAY_MS);
        }

        const query = buildFetchQuery(pageKeys);
        LOG_ROWS("query →", query);

        const requestSheetId = sheetId.value;
        const requestViewId  = readViewId();
        const { data } = await fetchItems(requestSheetId, query);

        if (sheetId.value !== requestSheetId) {
          LOG_ROWS("abortado: el sheetId cambió");
          failCallback();
          return;
        }
        if (requestViewId !== null && readViewId() !== requestViewId) {
          LOG_ROWS(`abortado: el viewId cambió (${requestViewId} → ${readViewId()})`);
          failCallback();
          return;
        }

        const items = (data?.data || []).map(normalizeItem);
        LOG_ROWS(`${items.length} items recibidos.`);

        const realRows = buildPivotPage(pageKeys, items, { pendingChanges: pendingChanges.value });

        realRows.forEach(row => {
          const id = rowIdGetter(row);
          cache.set(String(id), row);
        });
        rowsInCacheCount.value = cache.size;

        successCallback(realRows, axis.length);
      } catch (e) {
        console.error("[PivotLoader] fetch error:", e);
        failCallback();
      } finally {
        loadingRowsCount.value = Math.max(0, loadingRowsCount.value - pageKeys.length);
      }
    },
  }));

  return {
    datasource,
    loadingRowsCount,
    rowsInCacheCount,
  };
}
