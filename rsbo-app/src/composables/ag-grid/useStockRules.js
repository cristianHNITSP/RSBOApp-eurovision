/**
 * useStockRules.js
 * Composable COMPARTIDO — reglas de stock para todos los templates de AG Grid.
 *
 * Expone:
 *   - LOW_STOCK_THRESHOLD  (computed reactivo a sheetMeta)
 *   - isZeroStock(v)       → boolean
 *   - isLowStock(v)        → boolean
 *   - stockRowClassRules   → AG Grid rowClassRules object
 *   - stockCellClassRules  → AG Grid cellClassRules object (para celdas individuales)
 *
 * Uso:
 *   const { LOW_STOCK_THRESHOLD, isZeroStock, isLowStock,
 *           stockRowClassRules, stockCellClassRules } = useStockRules(sheetMeta)
 *
 *   // En columnDef.cellClassRules:
 *   cellClassRules: stockCellClassRules.value
 *
 *   // En AgGridVue :rowClassRules:
 *   :rowClassRules="stockRowClassRules.value"
 */
import { computed } from "vue";

export const LOW_STOCK_THRESHOLD_DEFAULT = 2;

/**
 * @param {import('vue').Ref<object|null>} sheetMeta — ref al metadata de la hoja
 */
export function useStockRules(sheetMeta) {
  // ── Umbral configurable por hoja (con fallback) ──────────────────────────
  const LOW_STOCK_THRESHOLD = computed(() => {
    const s = sheetMeta?.value || {};
    const raw =
      s?.lowStockThreshold ??
      s?.alerts?.lowStock ??
      s?.config?.lowStockThreshold ??
      LOW_STOCK_THRESHOLD_DEFAULT;
    const n = Number(raw);
    return Number.isFinite(n) ? n : LOW_STOCK_THRESHOLD_DEFAULT;
  });

  // ── Predicados ───────────────────────────────────────────────────────────
  const isZeroStock = (v) => Number(v ?? 0) <= 0;
  const isLowStock = (v) => {
    const n = Number(v ?? 0);
    return n > 0 && n <= LOW_STOCK_THRESHOLD.value;
  };

  /**
   * Revisa si ALGUNA celda de datos (cyl_*, add_*, existencias) de la fila
   * cumple la condición. Ignora filas con __loading.
   */
  function _rowHasCondition(row, predicate) {
    if (!row || row.__loading) return false;
    for (const k of Object.keys(row)) {
      if (
        k === "existencias" ||
        k.startsWith("cyl_") ||
        k.startsWith("add_")
      ) {
        if (predicate(row[k])) return true;
      }
    }
    return false;
  }

  // ── Reglas de clase para FILAS ───────────────────────────────────────────
  const stockRowClassRules = computed(() => ({
    "ag-row--stock-zero": (p) => _rowHasCondition(p?.data, isZeroStock),
    "ag-row--stock-low": (p) =>
      !_rowHasCondition(p?.data, isZeroStock) &&
      _rowHasCondition(p?.data, isLowStock),
  }));

  // ── Reglas de clase para CELDAS individuales ─────────────────────────────
  const stockCellClassRules = computed(() => ({
    "ag-cell--stock-zero": (p) =>
      !p?.data?.__loading && isZeroStock(p.value),
    "ag-cell--stock-low": (p) =>
      !p?.data?.__loading && isLowStock(p.value),
  }));

  return {
    LOW_STOCK_THRESHOLD,
    isZeroStock,
    isLowStock,
    stockRowClassRules,
    stockCellClassRules,
  };
}
