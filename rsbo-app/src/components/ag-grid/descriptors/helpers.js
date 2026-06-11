/**
 * descriptors/helpers.js
 * Helpers puros compartidos por los descriptores de tipo de matriz.
 *
 * Client-Side Row Model: las filas siempre están cargadas (un fetch por vista),
 * así que NO hay estado "cargando" por celda → sin skeletons. El estado de carga
 * lo cubre el overlay nativo de AG Grid durante el único fetch.
 */
import { classifyStock } from "@/composables/ag-grid/stockTiers";
import { labToast } from "@/composables/shared/useLabToast";

/* Reglas de existencias — ESPEJO del servidor (inventory.routes / chunkValidate):
   entero entre 0 y 999,999. Sin signos, letras ni decimales. */
export const MAX_STOCK = 999999;
const INT_RX = /^\d+$/;

/**
 * valueSetter genérico: valida y escribe en la fila (óptimista).
 * Entrada inválida → se RECHAZA (la celda conserva su valor) y se avisa con
 * un mensaje claro, en lugar de convertir silenciosamente a 0.
 * El guardado se dispara UNA sola vez en cellValueChanged del componente.
 */
export const makeValueSetter = () => (p) => {
  const raw = String(p.newValue ?? "").trim();

  // Celda vaciada → 0 (gesto habitual para "sin stock")
  let newVal;
  if (raw === "") {
    newVal = 0;
  } else if (!INT_RX.test(raw)) {
    labToast.warning(
      "Valor no guardado: escribe solo números enteros (sin signos, letras, puntos ni espacios). Ejemplo: 12",
      4000
    );
    return false; // la celda conserva el valor anterior
  } else {
    newVal = Number(raw);
    if (newVal > MAX_STOCK) {
      labToast.warning(
        `Valor no guardado: el máximo permitido por celda es ${MAX_STOCK.toLocaleString("es-MX")} piezas.`,
        4000
      );
      return false;
    }
  }

  if (Number(p.oldValue ?? 0) === newVal) return false; // sin cambio → no dispara cellValueChanged
  p.data[p.colDef.field] = newVal;
  return true;
};

/**
 * Determina qué lados (negativo / positivo) tienen filas reales en el eje firmado,
 * uniendo los valores de todos los tabs del backend. El 0 NO cuenta para ningún
 * lado (es una fila compartida por ambas vistas), así que una hoja con solo el 0
 * no justifica mostrar el toggle. Se recalcula al cargar/crecer el eje.
 *
 * @param {Array}  tabs   ctx.sheetTabs.value (cada uno con .axis[field])
 * @param {string} field  "sph" | "base"
 * @returns {{ hasNeg: boolean, hasPos: boolean }}
 */
export const axisSides = (tabs, field) => {
  const all = (Array.isArray(tabs) ? tabs : [])
    .flatMap((t) => (Array.isArray(t?.axis?.[field]) ? t.axis[field] : []));
  return {
    hasNeg: all.some((v) => Number(v) < 0),
    hasPos: all.some((v) => Number(v) > 0),
  };
};

const STOCK_ICONS = {
  SIN_STOCK: '<i class="fas fa-ban sic sic--zero"></i>',
  CRITICO:   '<i class="fas fa-exclamation-circle sic sic--crit"></i>',
  BAJO:      '<i class="fas fa-exclamation-triangle sic sic--low"></i>',
  NEUTRO:    '<i class="fas fa-circle sic sic--neutral"></i>',
};

function stockIconRenderer(params) {
  if (!params.data || params.data.__loading) return String(params.value ?? '');
  const raw = params.value ?? 0;
  const dist = typeof params.cellDistance === 'function' ? params.cellDistance(params) : 0;
  const state = classifyStock(raw, dist);
  const icon = STOCK_ICONS[state] ?? '';
  if (!icon) return String(raw);
  return `<span class="sic-wrap">${raw}${icon}</span>`;
}

/** Leaf de columna numérica editable (sin skeleton; valor directo). */
export const numericLeaf = (ctx, { field, headerName, minWidth = 90, maxWidth = 140, cellDistance }) => ({
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
  cellRenderer: stockIconRenderer,
  cellRendererParams: { cellDistance: cellDistance ?? null },
  valueSetter: makeValueSetter(),
});
