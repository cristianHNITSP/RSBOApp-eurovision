/**
 * descriptors/torico.js — Matriz SPH_CYL_AXIS: eje SPH × columnas CYL, por grado (eje).
 * rowKey = sph. Cache lazy por grado (viewToken `sphType|deg`) con LRU.
 * El datasource pide SOLO el grado activo (axisMin=axisMax=deg) — sin preload masivo.
 */
import { to2, fmtSigned, numOr } from "@/composables/ag-grid/useAgGridBase";
import { norm, parseCylFromField, fmtCylHeader } from "@/components/ag-grid/utils/ag-grid-utils";
import { GRID_CONFIG } from "@/components/ag-grid/gridConfig";
import { numericLeaf } from "./helpers";

export function createToricoDescriptor(ctx) {
  const isNeg = () => ctx.sphType.value === "sph-neg";
  const deg = () => ctx.selectedDegree.value;
  const phys = () => {
    const pl = ctx.physicalLimits.value || {};
    const SPH = pl.SPH || pl.sph || {};
    const CYL = pl.CYL || pl.cyl || {};
    const cylAbsMax = Math.max(Math.abs(numOr(CYL.min, -15)), Math.abs(numOr(CYL.max, 15)));
    return {
      sphMin: numOr(SPH.min, -40), sphMax: numOr(SPH.max, 40),
      cylMin: numOr(CYL.min, -15), cylMax: numOr(CYL.max, 15), cylAbsMax,
    };
  };

  return {
    tipoMatriz: "SPH_CYL_AXIS",
    hasDynamicColumns: true,
    cellEndpoint: () => "torico",
    sortColId: "sph",
    sortDir: () => (isNeg() ? "desc" : "asc"),
    internalTabs: () => [
      { id: "sph-neg", label: "SPH (-)" },
      { id: "sph-pos", label: "SPH (+)" },
    ],

    ext: {
      degreeBar: true,
      lazyRowCache: true,
      lruSize: GRID_CONFIG.toricoLruSize,
      wsThrottleMs: GRID_CONFIG.wsThrottleMs,
    },

    getRowId: (data) => String(to2(data.sph)),
    isEditableField: (field) => field.startsWith("cyl_"),

    // Solo aplica si la celda es del grado activo; si no, devuelve null (se ignora / invalida memo)
    cellToRowPatch: (cell) => {
      if (Number(cell.axis) !== deg()) return null;
      return {
        rowId: String(to2(cell.sph)),
        field: `cyl_${norm(Math.abs(to2(cell.cyl)))}`,
        value: Number(cell.existencias ?? 0),
      };
    },

    tooltipParts: (p) => {
      const c = parseCylFromField(p.colDef.field);
      return [
        { label: "Esfera", value: fmtSigned(p.data.sph) },
        { label: "Cilindro", value: c == null ? "" : fmtCylHeader(c) },
        { label: "Eje", value: `${deg()}°` },
      ];
    },
    // |SPH| + |CYL| (espejo del backend SPH_CYL_AXIS)
    cellDistance: (p) => Math.abs(Number(p.data.sph) || 0) + Math.abs(parseCylFromField(p.colDef.field) || 0),

    rebuildAxes() {
      const P = phys();
      const tab =
        ctx.sheetTabs.value.find((t) => t?.id === ctx.sphType.value) ||
        ctx.sheetTabs.value.find((t) => String(t?.id || "").includes("sph")) || null;
      const backendSph = Array.isArray(tab?.axis?.sph) ? tab.axis.sph : [];
      const backendCyl = Array.isArray(tab?.axis?.cyl) ? tab.axis.cyl : [];
      const backendDeg = Array.isArray(tab?.axis?.degrees) ? tab.axis.degrees : [];

      ctx.degreeValues.value = [...new Set(backendDeg)]
        .filter((d) => Number.isFinite(d) && d >= 10 && d <= 180 && d % 10 === 0)
        .sort((a, b) => b - a);
      if (!ctx.degreeValues.value.includes(ctx.selectedDegree.value)) {
        ctx.selectedDegree.value = ctx.degreeValues.value[0] || 180;
      }

      ctx.rowAxis.value = [...new Set(backendSph.map(to2))]
        .filter((s) => Number.isFinite(s) && s >= P.sphMin && s <= P.sphMax && (isNeg() ? s <= 0 : s >= 0))
        .sort((a, b) => (isNeg() ? b - a : a - b));
      ctx.allColValues.value = [...new Set(backendCyl.map(to2))]
        .filter((n) => Number.isFinite(n) && n >= 0 && n <= P.cylAbsMax)
        .sort((a, b) => a - b);
    },

    buildColumns() {
      return [
        {
          headerName: `SPH ${isNeg() ? "(-)" : "(+)"}`,
          children: [{
            field: "sph", headerName: "SPH", width: 90, minWidth: 86, maxWidth: 96,
            pinned: "left", editable: false, sortable: false, filter: false,
            comparator: (a, b) => Number(a) - Number(b),
            cellClass: ["ag-cell--compact", "ag-cell--numeric", "ag-cell--pinned"],
            headerClass: ["ag-header-cell--compact", "ag-header-cell--pinned"],
            valueFormatter: (p) => (Number.isFinite(Number(p.value)) ? fmtSigned(p.value) : (p.value ?? "")),
          }],
        },
        {
          headerName: `CYL (-) | Eje ${deg()}°`,
          children: ctx.allColValues.value.map((cDisp) => numericLeaf(ctx, {
            field: `cyl_${norm(cDisp)}`, headerName: fmtCylHeader(cDisp), minWidth: 80, maxWidth: 110,
          })),
        },
      ];
    },

    buildFetchQuery(pageSphs) {
      const P = phys();
      return {
        sphMin: Math.min(...pageSphs), sphMax: Math.max(...pageSphs),
        cylMin: P.cylMin, cylMax: 0, axisMin: deg(), axisMax: deg(), limit: ctx.fetchLimit,
      };
    },

    normalizeItem: (i) => {
      let cyl = to2(i.cyl);
      if (Number.isFinite(cyl) && cyl > 0) cyl = -Math.abs(cyl);
      return { sph: to2(i.sph), cyl, axis: Number(i.axis ?? 180), existencias: Number(i.existencias ?? 0) };
    },

    buildPivotPage(pageSphs, items, pending) {
      const cylAll = ctx.allColValues.value;
      const d = deg();
      const itemMap = new Map();
      items.forEach((it) => itemMap.set(`${it.sph}|${to2(Math.abs(it.cyl))}`, it.existencias));
      return pageSphs.map((sph) => {
        const row = { sph };
        cylAll.forEach((cDisp) => {
          const field = `cyl_${norm(cDisp)}`;
          row[field] = itemMap.get(`${sph}|${cDisp}`) ?? 0;
          const pk = `${to2(sph)}|${cDisp}|${d}`;
          if (pending?.has(pk)) row[field] = pending.get(pk).existencias;
        });
        return row;
      });
    },

    // ── Guardado por celda (record incluye el grado activo) ──
    changeRecord(data, field, newVal, baseline) {
      const cDisp = parseCylFromField(field);
      return { sph: to2(data.sph), cyl: -cDisp, axis: deg(), existencias: newVal, baseline };
    },
    historyMeta(data, field) {
      const cDisp = parseCylFromField(field);
      return { sph: to2(data.sph), cyl: -cDisp, axis: deg() };
    },

    // ── Add row / column (genera todos los grados) ──
    addRow(value) {
      const P = phys();
      const sph = to2(value);
      if (!Number.isFinite(sph)) return { error: "Ingresa SPH numérico", status: 400 };
      if (sph < P.sphMin || sph > P.sphMax) return { error: "SPH fuera de límites", status: 400 };
      if (ctx.rowAxis.value.includes(sph)) return { error: "SPH ya existe", status: 409 };
      return { rows: ctx.allColValues.value.flatMap((c) =>
        ctx.degreeValues.value.map((d) => ({ sph, cyl: -c, axis: d, existencias: 0 }))) };
    },
    addColumn(value) {
      const P = phys();
      const cDisp = to2(Math.abs(Number(value)));
      if (!Number.isFinite(cDisp)) return { error: "Ingresa CYL numérico", status: 400 };
      if (cDisp > P.cylAbsMax) return { error: "CYL fuera de límites", status: 400 };
      if (ctx.allColValues.value.includes(cDisp)) return { error: "CYL ya existe", status: 409 };
      return { rows: ctx.rowAxis.value.flatMap((sph) =>
        ctx.degreeValues.value.map((d) => ({ sph, cyl: -cDisp, axis: d, existencias: 0 }))) };
    },
  };
}
