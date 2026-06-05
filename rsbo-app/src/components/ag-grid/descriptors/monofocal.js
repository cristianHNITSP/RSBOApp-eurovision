/**
 * descriptors/monofocal.js — Matriz SPH_CYL (2D): eje SPH × columnas CYL.
 * rowKey = sph. CYL se muestra en convención negativa (display = |cyl|).
 */
import { to2, fmtSigned, numOr } from "@/composables/ag-grid/useAgGridBase";
import { norm, parseCylFromField, fmtCylHeader } from "@/components/ag-grid/utils/ag-grid-utils";
import { numericLeaf, axisSides } from "./helpers";

export function createMonofocalDescriptor(ctx) {
  const isNeg = () => ctx.sphType.value === "sph-neg";
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
    tipoMatriz: "SPH_CYL",
    hasDynamicColumns: true,
    cellEndpoint: () => "sph-cyl",
    sortColId: "sph",
    sortDir: () => (isNeg() ? "desc" : "asc"),
    internalTabs: () => [
      { id: "sph-neg", label: "SPH (-)" },
      { id: "sph-pos", label: "SPH (+)" },
    ],
    availableSides: () => axisSides(ctx.sheetTabs.value, "sph"),

    getRowId: (data) => String(to2(data.sph)),
    isEditableField: (field) => field.startsWith("cyl_"),

    cellToRowPatch: (cell) => ({
      rowId: String(to2(cell.sph)),
      field: `cyl_${norm(Math.abs(to2(cell.cyl)))}`,
      value: Number(cell.existencias ?? 0),
    }),

    tooltipParts: (p) => {
      const c = parseCylFromField(p.colDef.field);
      return [
        { label: "Esfera", value: fmtSigned(p.data.sph) },
        { label: "Cilindro", value: c == null ? "" : fmtCylHeader(c) },
      ];
    },
    // |SPH| + |CYL| (espejo del backend SPH_CYL)
    cellDistance: (p) => Math.abs(Number(p.data.sph) || 0) + Math.abs(parseCylFromField(p.colDef.field) || 0),

    rebuildAxes() {
      const P = phys();
      const tab =
        ctx.sheetTabs.value.find((t) => t?.id === ctx.sphType.value) ||
        ctx.sheetTabs.value.find((t) => String(t?.id || "").includes("sph")) || null;
      const backendSph = Array.isArray(tab?.axis?.sph) ? tab.axis.sph : [];
      const backendCyl = Array.isArray(tab?.axis?.cyl) ? tab.axis.cyl : [];
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
          headerName: "CYL (-)",
          children: ctx.allColValues.value.map((cDisp) => numericLeaf(ctx, {
            field: `cyl_${norm(cDisp)}`, headerName: fmtCylHeader(cDisp), minWidth: 80, maxWidth: 110,
            cellDistance: this.cellDistance,
          })),
        },
      ];
    },

    buildFetchQuery(pageSphs) {
      return { sphMin: Math.min(...pageSphs), sphMax: Math.max(...pageSphs), cylMin: phys().cylMin, cylMax: 0, limit: ctx.fetchLimit };
    },

    normalizeItem: (i) => {
      let cyl = to2(i.cyl);
      if (Number.isFinite(cyl) && cyl > 0) cyl = -Math.abs(cyl);
      // === QR TEST START === (conservar `qr` por celda; quitar al desactivar la prueba)
      return { sph: to2(i.sph), cyl, existencias: Number(i.existencias ?? 0), qr: i.qr ?? null };
      // === QR TEST END ===
    },

    buildPivotPage(pageSphs, items, pending) {
      const cylAll = ctx.allColValues.value;
      const itemMap = new Map();
      const qrMap = new Map(); // === QR TEST === (mapa qr-por-celda)
      items.forEach((it) => {
        itemMap.set(`${it.sph}|${to2(Math.abs(it.cyl))}`, it.existencias);
        qrMap.set(`${it.sph}|${to2(Math.abs(it.cyl))}`, it.qr ?? null); // === QR TEST ===
      });
      return pageSphs.map((sph) => {
        const row = { sph };
        cylAll.forEach((cDisp) => {
          const field = `cyl_${norm(cDisp)}`;
          row[field] = itemMap.get(`${sph}|${cDisp}`) ?? 0;
          // === QR TEST START === (qr de la celda bajo `<field>__qr`; quitar al desactivar)
          row[`${field}__qr`] = qrMap.get(`${sph}|${cDisp}`) ?? null;
          // === QR TEST END ===
          const pk = `${to2(sph)}|${cDisp}`;
          if (pending?.has(pk)) row[field] = pending.get(pk).existencias;
        });
        return row;
      });
    },

    // ── Guardado por celda ──
    changeRecord(data, field, newVal, baseline) {
      const cDisp = parseCylFromField(field);
      return { sph: to2(data.sph), cyl: -cDisp, existencias: newVal, baseline };
    },
    historyMeta(data, field) {
      const cDisp = parseCylFromField(field);
      return { sph: to2(data.sph), cyl: -cDisp };
    },

    // ── Add row / column ──
    addRow(value) {
      const P = phys();
      const sph = to2(value);
      if (!Number.isFinite(sph)) return { error: "Ingresa SPH numérico", status: 400 };
      if (sph < P.sphMin || sph > P.sphMax) return { error: "SPH fuera de límites", status: 400 };
      if (ctx.rowAxis.value.includes(sph)) return { error: "SPH ya existe", status: 409 };
      return { rows: ctx.allColValues.value.map((c) => ({ sph, cyl: -c, existencias: 0 })) };
    },
    addColumn(value) {
      const P = phys();
      const cDisp = to2(value);
      if (!Number.isFinite(cDisp)) return { error: "Ingresa CYL numérico", status: 400 };
      if (cDisp < 0 || cDisp > P.cylAbsMax) return { error: "CYL fuera de límites", status: 400 };
      if (ctx.allColValues.value.includes(cDisp)) return { error: "CYL ya existe", status: 409 };
      return { rows: ctx.rowAxis.value.map((sph) => ({ sph, cyl: -cDisp, existencias: 0 })) };
    },
  };
}
