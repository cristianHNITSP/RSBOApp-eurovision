/**
 * descriptors/bifocal.js — Matriz SPH_ADD: eje SPH × columnas ADD×(OD/OI).
 * rowKey = sph. Columnas agrupadas por ADD con marryChildren (Der./Izq.).
 */
import { to2, fmtSigned, numOr } from "@/composables/ag-grid/useAgGridBase";
import { norm, parseAddEyeFromField } from "@/components/ag-grid/utils/ag-grid-utils";
import { numericLeaf, axisSides } from "./helpers";

export function createBifocalDescriptor(ctx) {
  const isNeg = () => ctx.sphType.value === "sph-neg";
  const phys = () => {
    const p = ctx.physicalLimits.value || {};
    return { SPH: p.SPH || { min: -40, max: 40 }, ADD: p.ADD || { min: 0, max: 8 } };
  };
  const bifocalCellDistance = (p) => Math.abs(Number(p.data.sph) || 0);
  const addLeaf = (add, eye) => numericLeaf(ctx, {
    field: `add_${norm(add)}_${eye}`, headerName: eye === "OD" ? "Der." : "Izq.",
    minWidth: 90, maxWidth: 120,
    cellDistance: bifocalCellDistance,
  });

  return {
    tipoMatriz: "SPH_ADD",
    hasDynamicColumns: true,
    // contactlenses NO tiene /bifocal/cell → null = fallback a chunk-de-1-fila
    cellEndpoint: (apiType) => (apiType === "contactlenses" ? null : "bifocal"),
    sortColId: "sph",
    sortDir: () => (isNeg() ? "desc" : "asc"),
    internalTabs: () => [
      { id: "sph-neg", label: "SPH (-)" },
      { id: "sph-pos", label: "SPH (+)" },
    ],
    availableSides: () => axisSides(ctx.sheetTabs.value, "sph"),

    getRowId: (data) => String(to2(data.sph)),
    isEditableField: (field) => field.startsWith("add_"),

    cellToRowPatch: (cell) => ({
      rowId: String(to2(cell.sph)),
      field: `add_${norm(to2(cell.add))}_${String(cell.eye).toUpperCase()}`,
      value: Number(cell.existencias ?? 0),
    }),

    tooltipParts: (p) => {
      const m = parseAddEyeFromField(p.colDef.field) || {};
      return [
        { label: "Esfera", value: fmtSigned(p.data.sph) },
        { label: "Adición", value: m.add != null ? fmtSigned(m.add) : "" },
        { label: "Ojo", value: m.eye === "OD" ? "Derecho" : (m.eye === "OI" ? "Izquierdo" : "") },
      ];
    },
    // |SPH| (espejo del backend SPH_ADD: solo esfera)
    cellDistance: (p) => Math.abs(Number(p.data.sph) || 0),

    rebuildAxes() {
      const P = phys();
      const tab =
        ctx.sheetTabs.value.find((t) => t?.id === ctx.sphType.value) ||
        ctx.sheetTabs.value.find((t) => String(t?.id || "").includes("sph")) || null;
      const backendSph = Array.isArray(tab?.axis?.sph) ? tab.axis.sph : [];
      const backendAdd = Array.isArray(tab?.axis?.add) ? tab.axis.add : [];
      ctx.rowAxis.value = [...new Set(backendSph.map(to2))]
        .filter((s) => Number.isFinite(s) && s >= P.SPH.min && s <= P.SPH.max && (isNeg() ? s <= 0 : s >= 0))
        .sort((a, b) => (isNeg() ? b - a : a - b));
      ctx.allColValues.value = [...new Set(backendAdd.map(to2))]
        .filter((a) => Number.isFinite(a) && a >= P.ADD.min && a <= P.ADD.max)
        .sort((a, b) => a - b);
    },

    buildColumns() {
      return [
        {
          headerName: isNeg() ? "SPH (-)" : "SPH (+)",
          children: [{
            field: "sph", headerName: "SPH", pinned: "left", width: 90, minWidth: 86, maxWidth: 96,
            editable: false, sortable: false, filter: false,
            cellClass: ["ag-cell--compact", "ag-cell--numeric", "ag-cell--pinned"],
            headerClass: ["ag-header-cell--compact", "ag-header-cell--pinned"],
            valueFormatter: (p) => { const v = Number(p.value); return Number.isFinite(v) ? v.toFixed(2) : (p.value ?? ""); },
          }],
        },
        {
          headerName: "ADD (+)",
          children: ctx.allColValues.value.map((a) => ({
            headerName: fmtSigned(a), marryChildren: true,
            children: [addLeaf(a, "OD"), addLeaf(a, "OI")],
          })),
        },
      ];
    },

    buildFetchQuery(pageSphs) {
      const P = phys();
      return { sphMin: Math.min(...pageSphs), sphMax: Math.max(...pageSphs), addMin: P.ADD.min, addMax: P.ADD.max, eyes: "OD,OI", limit: ctx.fetchLimit };
    },

    normalizeItem: (i) => ({
      sph: to2(i.sph), add: to2(i.add), eye: String(i.eye || "OD").toUpperCase(),
      base_izq: to2(i.base_izq ?? 0), base_der: to2(i.base_der ?? 0), existencias: Number(i.existencias ?? 0), qr: i.qr ?? null,
    }),

    buildPivotPage(pageSphs, items, pending) {
      const addAll = ctx.allColValues.value;
      const eyes = ["OD", "OI"];
      const itemMap = new Map();
      const qrMap = new Map(); // qr passthrough (tooltip)
      items.forEach((it) => {
        itemMap.set(`${it.sph}|${to2(it.add)}|${it.eye}`, it.existencias);
        qrMap.set(`${it.sph}|${to2(it.add)}|${it.eye}`, it.qr ?? null);
      });
      const baseMap = new Map();
      items.forEach((it) => {
        if (!baseMap.has(it.sph)) baseMap.set(it.sph, { base_izq: to2(it.base_izq ?? 0), base_der: to2(it.base_der ?? 0) });
      });
      return pageSphs.map((sph) => {
        const bases = baseMap.get(sph) || { base_izq: 0, base_der: 0 };
        const row = { sph, base_izq: bases.base_izq, base_der: bases.base_der };
        addAll.forEach((add) => {
          eyes.forEach((eye) => {
            const field = `add_${norm(add)}_${eye}`;
            row[field] = itemMap.get(`${sph}|${to2(add)}|${eye}`) ?? 0;
            row[`${field}__qr`] = qrMap.get(`${sph}|${to2(add)}|${eye}`) ?? null;
            const pk = `${to2(sph)}|${to2(add)}|${eye}`;
            if (pending?.has(pk)) row[field] = pending.get(pk).existencias;
          });
        });
        return row;
      });
    },

    // ── Guardado por celda ──
    changeRecord(data, field, newVal, baseline) {
      const meta = parseAddEyeFromField(field);
      return {
        sph: to2(data.sph), add: to2(meta.add), eye: String(meta.eye).toUpperCase(),
        base_izq: to2(data.base_izq ?? 0), base_der: to2(data.base_der ?? 0), existencias: newVal, baseline,
      };
    },
    historyMeta(data, field) {
      const meta = parseAddEyeFromField(field);
      return {
        sph: to2(data.sph), add: to2(meta.add), eye: String(meta.eye).toUpperCase(),
        base_izq: to2(data.base_izq ?? 0), base_der: to2(data.base_der ?? 0),
      };
    },

    // ── Add row / column ──
    addRow(value) {
      const P = phys();
      const sph = to2(value);
      if (!Number.isFinite(sph)) return { error: "Ingresa SPH numérico", status: 400 };
      if (sph < P.SPH.min || sph > P.SPH.max) return { error: "SPH fuera de límites", status: 400 };
      if (ctx.rowAxis.value.includes(sph)) return { error: `SPH ${fmtSigned(sph)} ya existe`, status: 409 };
      return { rows: ctx.allColValues.value.flatMap((a) => [
        { sph, add: a, eye: "OD", existencias: 0 },
        { sph, add: a, eye: "OI", existencias: 0 },
      ]) };
    },
    addColumn(value) {
      const P = phys();
      const add = to2(value);
      if (!Number.isFinite(add)) return { error: "Ingresa ADD numérico", status: 400 };
      if (add < P.ADD.min || add > P.ADD.max) return { error: "ADD fuera de límites", status: 400 };
      if (ctx.allColValues.value.includes(add)) return { error: "Ya existe", status: 409 };
      return { rows: ctx.rowAxis.value.flatMap((sph) => [
        { sph, add, eye: "OD", existencias: 0 },
        { sph, add, eye: "OI", existencias: 0 },
      ]) };
    },
  };
}
