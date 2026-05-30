/**
 * descriptors/base.js — Matriz BASE (1D): eje BASE × columna Existencias.
 * rowKey = base. Sin columnas dinámicas.
 */
import { to2, fmtSigned, numOr, isMultipleOfStep } from "@/composables/ag-grid/useAgGridBase";
import { numericLeaf } from "./helpers";

const BASE_STEP = 0.25;

export function createBaseDescriptor(ctx) {
  const baseViewId = () =>
    String(ctx.sphType.value || "").toLowerCase().includes("neg") ? "base-neg" : "base-pos";
  const isNeg = () => baseViewId() === "base-neg";
  const phys = () => {
    const pl = ctx.physicalLimits.value || {};
    return { baseMin: to2(numOr(pl?.BASE?.min, -40)), baseMax: to2(numOr(pl?.BASE?.max, 40)) };
  };
  const filterDisplay = (n) => (isNeg() ? Number(n) <= 0 : Number(n) >= 0);
  const filterNewRow = (n) => (isNeg() ? Number(n) < 0 : Number(n) >= 0);

  return {
    tipoMatriz: "BASE",
    guardKeyPrefix: "base",
    hasDynamicColumns: false,
    cellEndpoint: () => "base",
    sortColId: "base",
    sortDir: () => (isNeg() ? "desc" : "asc"),

    internalTabs: () => [
      { id: "base-neg", label: "BASE (-)" },
      { id: "base-pos", label: "BASE (+)" },
    ],

    getRowId: (data) => String(to2(data.base)),
    isEditableField: (field) => field === "existencias",

    // WS: una celda del backend → {rowId, field, value}
    cellToRowPatch: (cell) => ({
      rowId: String(to2(cell.base)),
      field: "existencias",
      value: Number(cell.existencias ?? 0),
    }),

    // Tooltip: coordenadas etiquetadas de la celda
    tooltipParts: (p) => [{ label: "Base", value: fmtSigned(p.data.base) }],
    // Distancia al neutro (clasificación de stock) — espejo del backend: |BASE|
    cellDistance: (p) => Math.abs(Number(p.data.base) || 0),

    rebuildAxes() {
      const P = phys();
      const tab =
        ctx.sheetTabs.value.find((t) => t?.id === baseViewId()) ||
        ctx.sheetTabs.value.find((t) => String(t?.id || "").includes("base")) ||
        null;
      const backendAxis = Array.isArray(tab?.axis?.base) ? tab.axis.base : [];
      ctx.rowAxis.value = [...new Set(backendAxis.map(to2))]
        .filter((b) => Number.isFinite(b) && b >= P.baseMin && b <= P.baseMax && filterDisplay(b))
        .sort((a, b) => (isNeg() ? b - a : a - b));
      ctx.allColValues.value = [];
    },

    buildColumns() {
      return [
        {
          headerName: "BASE",
          children: [{
            field: "base", headerName: "Base", pinned: "left",
            width: 140, minWidth: 130, maxWidth: 170,
            editable: false, sortable: false, filter: false, resizable: false,
            cellClass: ["ag-cell--compact", "ag-cell--numeric", "ag-cell--pinned"],
            headerClass: ["ag-header-cell--compact", "ag-header-cell--pinned"],
            valueFormatter: (p) => fmtSigned(p.value),
          }],
        },
        {
          headerName: "EXISTENCIAS",
          children: [numericLeaf(ctx, {
            field: "existencias", headerName: "Stock", minWidth: 110, maxWidth: 140,
          })],
        },
      ];
    },

    buildFetchQuery(pageBases) {
      return { baseMin: Math.min(...pageBases), baseMax: Math.max(...pageBases), limit: ctx.fetchLimit };
    },

    normalizeItem: (i) => ({ base: to2(i.base), existencias: Number(i.existencias ?? 0) }),

    buildPivotPage(pageBases, items, pending) {
      const map = new Map(items.map((i) => [String(to2(i.base)), i.existencias]));
      return pageBases.map((base) => {
        const key = String(to2(base));
        const row = { base, existencias: map.get(key) ?? 0 };
        if (pending?.has(key)) row.existencias = pending.get(key).existencias;
        return row;
      });
    },

    // ── Guardado por celda ──
    changeRecord: (data, _field, newVal, baseline) => ({ base: to2(data.base), existencias: newVal, baseline }),
    historyMeta: (data) => ({ base: to2(data.base) }),

    // ── Add row (BASE no tiene columnas, sin addColumn) ──
    addRow(value) {
      const P = phys();
      const base = to2(value);
      if (!Number.isFinite(base)) return { error: "Ingresa BASE numérica", status: 400 };
      if (!isMultipleOfStep(base, BASE_STEP)) return { error: "BASE debe ser múltiplo de 0.25 D", status: 400 };
      if (base < P.baseMin || base > P.baseMax) return { error: "BASE fuera de límites", status: 400 };
      if (!filterNewRow(base)) return { error: isNeg() ? "Debe ser negativa" : "Debe ser 0 o positiva", status: 400 };
      if (ctx.rowAxis.value.includes(base)) return { error: "Ya existe", status: 409 };
      return { rows: [{ base, existencias: 0 }] };
    },
  };
}
