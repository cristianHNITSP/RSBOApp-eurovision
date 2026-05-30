/**
 * descriptors/progresivo.js — Matriz BASE_ADD: eje pares (base_izq|base_der) × ADD×(OD/OI).
 * rowKey = `${to2(bi)}|${to2(bd)}`. Columnas agrupadas por ADD (Der./Izq.).
 */
import { to2, fmtSigned, numOr } from "@/composables/ag-grid/useAgGridBase";
import { norm, parseAddEyeFromField, getProgresivoRowKey as rowKey } from "@/components/ag-grid/utils/ag-grid-utils";
import { numericLeaf } from "./helpers";

export function createProgresivoDescriptor(ctx) {
  const baseViewId = () =>
    String(ctx.sphType.value || "").toLowerCase().includes("neg") ? "base-neg" : "base-pos";
  const isNeg = () => baseViewId() === "base-neg";
  const phys = () => {
    const pl = ctx.physicalLimits.value || {};
    return {
      baseMin: numOr(pl?.BASE?.min, -40), baseMax: numOr(pl?.BASE?.max, 40),
      addMin: numOr(pl?.ADD?.min, 0), addMax: numOr(pl?.ADD?.max, 8),
    };
  };
  const addLeaf = (add, eye) => numericLeaf(ctx, {
    field: `add_${norm(add)}_${eye}`, headerName: eye === "OD" ? "Der." : "Izq.",
    minWidth: 90, maxWidth: 110,
  });

  return {
    tipoMatriz: "BASE_ADD",
    hasDynamicColumns: true,
    // inventory → /progresivo/cell ; contactlenses → /multifocal/cell
    cellEndpoint: (apiType) => (apiType === "contactlenses" ? "multifocal" : "progresivo"),
    sortColId: "base",
    sortDir: () => (isNeg() ? "desc" : "asc"),
    internalTabs: () => [
      { id: "base-neg", label: "BASE (-)" },
      { id: "base-pos", label: "BASE (+)" },
    ],

    getRowId: (data) => rowKey(data.base_izq ?? data.base, data.base_der ?? data.base),
    isEditableField: (field) => field.startsWith("add_"),

    cellToRowPatch: (cell) => ({
      rowId: rowKey(cell.base_izq, cell.base_der),
      field: `add_${norm(to2(cell.add))}_${String(cell.eye).toUpperCase()}`,
      value: Number(cell.existencias ?? 0),
    }),

    tooltipParts: (p) => {
      const m = parseAddEyeFromField(p.colDef.field) || {};
      const bi = p.data.base_izq, bd = p.data.base_der;
      const base = bd != null && bd !== bi ? `${fmtSigned(bi)} / ${fmtSigned(bd)}` : fmtSigned(bi);
      return [
        { label: "Base", value: base },
        { label: "Adición", value: m.add != null ? fmtSigned(m.add) : "" },
        { label: "Ojo", value: m.eye === "OD" ? "Derecho" : (m.eye === "OI" ? "Izquierdo" : "") },
      ];
    },
    // |BASE_IZQ| + |BASE_DER| (espejo del backend BASE_ADD)
    cellDistance: (p) => Math.abs(Number(p.data.base_izq) || 0) + Math.abs(Number(p.data.base_der) || 0),

    rebuildAxes() {
      const P = phys();
      const tab =
        ctx.sheetTabs.value.find((t) => t?.id === baseViewId()) ||
        ctx.sheetTabs.value.find((t) => t?.id === "base-add") ||
        ctx.sheetTabs.value[0] || null;
      const defAddCols = Array.isArray(tab?.axis?.add) ? tab.axis.add.map(to2) : [];
      const defBases = Array.isArray(tab?.axis?.base) ? tab.axis.base.map(to2) : [];
      ctx.allColValues.value = [...new Set(defAddCols)]
        .filter((a) => Number.isFinite(a) && a >= P.addMin && a <= P.addMax)
        .sort((a, b) => a - b);
      const inView = isNeg() ? (b) => Number(b) <= 0 : (b) => Number(b) >= 0;
      const dir = isNeg() ? "desc" : "asc";
      ctx.rowAxis.value = [...new Set(
        defBases.filter((b) => b >= P.baseMin && b <= P.baseMax && inView(b)).map((b) => `${to2(b)}|${to2(b)}`)
      )].sort((a, b) => {
        const abi = Number(a.split("|")[0]); const bbi = Number(b.split("|")[0]);
        return dir === "desc" ? bbi - abi : abi - bbi;
      });
    },

    buildColumns() {
      return [
        {
          headerName: "BASE",
          children: [{
            field: "base", headerName: "Base", pinned: "left", width: 120, minWidth: 110, maxWidth: 140,
            editable: false, sortable: false, filter: false,
            comparator: (a, b) => Number(a) - Number(b),
            cellClass: ["ag-cell--compact", "ag-cell--numeric", "ag-cell--pinned"],
            headerClass: ["ag-header-cell--compact", "ag-header-cell--pinned"],
            valueFormatter: (p) => {
              if (p.data == null) return "";
              const bi = Number(p.data?.base_izq); const bd = Number(p.data?.base_der);
              return Number.isFinite(bd) && bd !== bi ? `${fmtSigned(bi)} / ${fmtSigned(bd)}` : fmtSigned(bi);
            },
          }],
        },
        {
          headerName: "ADD (+)",
          children: ctx.allColValues.value.map((add) => ({
            headerName: fmtSigned(Number(add)), marryChildren: true,
            children: ["OD", "OI"].map((eye) => addLeaf(add, eye)),
          })),
        },
      ];
    },

    buildFetchQuery(pageKeys) {
      const P = phys();
      const allBi = pageKeys.map((k) => Number(k.split("|")[0]));
      return { addMin: P.addMin, addMax: P.addMax, baseMin: Math.min(...allBi), baseMax: Math.max(...allBi), limit: ctx.fetchLimit };
    },

    normalizeItem: (i) => ({
      base_izq: to2(i.base_izq ?? 0), base_der: to2(i.base_der ?? 0), add: to2(i.add),
      eye: String(i.eye || "OD").toUpperCase(), existencias: Number(i.existencias ?? 0),
    }),

    buildPivotPage(pageKeys, items, pending) {
      const addAll = ctx.allColValues.value;
      const eyes = ["OD", "OI"];
      const itemMap = new Map();
      items.forEach((it) => itemMap.set(`${to2(it.base_izq)}|${to2(it.base_der)}|${to2(it.add)}|${it.eye}`, it.existencias));
      return pageKeys.map((rk) => {
        const [bi, bd] = rk.split("|").map(Number);
        const row = { base_izq: bi, base_der: bd, base: bi };
        addAll.forEach((add) => {
          eyes.forEach((eye) => {
            const field = `add_${norm(add)}_${eye}`;
            const pk = `${to2(bi)}|${to2(bd)}|${to2(add)}|${eye}`;
            row[field] = itemMap.get(pk) ?? 0;
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
        add: to2(meta.add), eye: meta.eye,
        base_izq: to2(data.base_izq ?? 0), base_der: to2(data.base_der ?? 0), existencias: newVal, baseline,
      };
    },
    historyMeta(data, field) {
      const meta = parseAddEyeFromField(field);
      return { add: to2(meta.add), eye: meta.eye, base_izq: to2(data.base_izq ?? 0), base_der: to2(data.base_der ?? 0) };
    },

    // ── Add row / column ──
    addRow(value) {
      const P = phys();
      const base = to2(value);
      if (!Number.isFinite(base)) return { error: "Ingresa BASE numérica", status: 400 };
      if (base < P.baseMin || base > P.baseMax) return { error: "BASE fuera de límites", status: 400 };
      if (ctx.rowAxis.value.includes(rowKey(base, base))) return { error: "BASE ya existe", status: 409 };
      return { rows: ctx.allColValues.value.flatMap((a) =>
        ["OD", "OI"].map((eye) => ({ base_izq: base, base_der: base, add: a, eye, existencias: 0 }))) };
    },
    addColumn(value) {
      const P = phys();
      const add = to2(value);
      if (!Number.isFinite(add)) return { error: "Ingresa ADD numérico", status: 400 };
      if (add < P.addMin || add > P.addMax) return { error: "ADD fuera de límites", status: 400 };
      if (ctx.allColValues.value.includes(add)) return { error: "ADD ya existe", status: 409 };
      return { rows: ctx.rowAxis.value.flatMap((rk) => {
        const [bi, bd] = rk.split("|").map(Number);
        return ["OD", "OI"].map((eye) => ({ base_izq: bi, base_der: bd, add, eye, existencias: 0 }));
      }) };
    },
  };
}
