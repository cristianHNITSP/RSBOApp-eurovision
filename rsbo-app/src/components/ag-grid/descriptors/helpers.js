/**
 * descriptors/helpers.js
 * Helpers puros compartidos por los descriptores de tipo de matriz.
 *
 * Client-Side Row Model: las filas siempre están cargadas (un fetch por vista),
 * así que NO hay estado "cargando" por celda → sin skeletons. El estado de carga
 * lo cubre el overlay nativo de AG Grid durante el único fetch.
 */
import { isNumeric } from "@/composables/ag-grid/useAgGridBase";

/**
 * valueSetter genérico: coerciona a número y escribe en la fila (óptimista).
 * El guardado se dispara UNA sola vez en el evento cellValueChanged del componente
 * (no aquí), para evitar doble guardado.
 */
export const makeValueSetter = () => (p) => {
  const raw = String(p.newValue ?? "").trim();
  const newVal = isNumeric(raw) ? Number(raw) : 0;
  if (Number(p.oldValue ?? 0) === newVal) return false; // sin cambio → no dispara cellValueChanged
  p.data[p.colDef.field] = newVal;
  return true;
};

/** Leaf de columna numérica editable (sin skeleton; valor directo). */
export const numericLeaf = (ctx, { field, headerName, minWidth = 90, maxWidth = 140 }) => ({
  field,
  headerName,
  headerTooltip: headerName,                                  // tooltip del header (truncado)
  tooltipComponent: "stockTooltip",                          // tarjeta rica por celda
  // string no-vacío para garantizar que el tooltip se dispare (incluso con valor 0)
  tooltipValueGetter: (p) => (p.data == null ? null : String(p.value ?? 0)),
  editable: true,
  filter: false,
  minWidth,
  maxWidth,
  cellClass: ["ag-cell--compact", "ag-cell--numeric"],
  headerClass: ["ag-header-cell--compact"],
  cellClassRules: { ...ctx.stockCellClassRules.value },
  valueSetter: makeValueSetter(),
});
