<!-- src/components/ag-grid/templates/AgGridBifocal.vue -->
<template>
  <div class="is-flex is-flex-direction-column" style="height: 100%;">
    <navtools
      class="p-4"
      v-model="formulaValue"
      :dirty="dirty"
      :saving="saving"
      :total-rows="totalRows"
      :sheet-name="sheetName"
      :tipo-matriz="tipoMatriz"
      :material="material"
      :tratamientos="tratamientos"
      :last-saved-at="lastSavedAt"
      @add-row="handleAddRow"
      @add-column="handleAddColumn"
      @clear-filters="clearFilters"
      @reset-sort="resetSort"
      @toggle-filters="handleToggleFilters"
      @save-request="handleSave"
      @discard-changes="handleDiscard"
      @refresh="handleRefresh"
      @seed="handleSeed"
      @export="handleExport"
      @fx-input="onFxInput"
      @fx-commit="onFxCommit"
    />

    <!-- ✅ Leyenda natural (sin componentes extra) 
    <div class="stock-legend px-4 pb-2">
      <span class="stock-pill stock-pill--low">
        <i class="fas fa-exclamation-triangle mr-1"></i>
        Bajo stock (≤ {{ LOW_STOCK_THRESHOLD }})
      </span>
      <span class="stock-pill stock-pill--zero">
        <i class="fas fa-times-circle mr-1"></i>
        Sin stock (0)
      </span>
    </div>
    -->
    
    <div
      class="buefy-balham-light grid-shell"
      :class="{ 'grid-shell--switching': switchingView }"
      style="flex: 1 1 auto; display: flex; flex-direction: column; overflow: auto;"
    >
      <AgGridVue
        class="ag-grid-buefy"
        :columnDefs="columns"
        :rowData="rowData"
        :defaultColDef="defaultColDef"
        :getRowId="getRowId"
        :animateRows="true"
        :localeText="localeText"
        :theme="themeCustom"
        :rowHeight="30"
        :headerHeight="32"
        :suppressMovableColumns="true"
        :rowClassRules="rowClassRules"
        @cellClicked="onCellClicked"
        @cellValueChanged="onCellValueChanged"
        @grid-ready="onGridReady"
        style="width: 100%; height: 100%;"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  iconSetQuartzBold,
  colorSchemeLight,
  colorSchemeDark
} from "ag-grid-community";
import navtools from "@/components/ag-grid/navtools.vue";
import { fetchItems, saveChunk, getSheet, reseedSheet } from "@/services/inventory";

ModuleRegistry.registerModules([AllCommunityModule]);

const props = defineProps({
  sheetId: { type: String, required: true },
  sphType: { type: String, default: "sph-neg" }, // sph-neg | sph-pos
  actor: { type: Object, default: null }
});

/* ===================== ACK helpers ===================== */
const ackOk = (ack, message = "Ok", status = 200) => {
  if (typeof ack === "function") ack({ ok: true, status, message });
};
const ackErr = (ack, message = "Error", status = 400) => {
  if (typeof ack === "function") ack({ ok: false, status, message });
  else alert(message);
};
const msgFromErr = (e, fallback = "Error de servidor") =>
  e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;
const statusFromErr = (e) => e?.response?.status ?? 0;
const normalizeAxiosOk = (res) => {
  const status = res?.status ?? 200;
  const body = res?.data ?? null;
  if (body?.ok === false) return { ok: false, status, message: body?.message || "Operación rechazada" };
  return { ok: true, status, message: body?.message || "Operación exitosa" };
};

/* ===================== UI / Anim ===================== */
const switchingView = ref(false);
const raf = () =>
  new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });

/* === AG-Grid tema reactivo al dark mode === */
const _darkMode = ref(document.documentElement.getAttribute("data-theme") === "dark");
const _themeObserver = new MutationObserver(() => {
  _darkMode.value = document.documentElement.getAttribute("data-theme") === "dark";
});
onMounted(() => _themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }));
onBeforeUnmount(() => _themeObserver.disconnect());

const themeCustom = computed(() => {
  const d = _darkMode.value;
  return themeQuartz
    .withPart(iconSetQuartzBold, d ? colorSchemeDark : colorSchemeLight)
    .withParams(d ? {
      accentColor: "#a788f0", backgroundColor: "#161b22", foregroundColor: "#e2e8f0",
      borderColor: "#2d3748", borderRadius: 10, wrapperBorder: true, wrapperBorderRadius: 10,
      columnBorder: true, rowBorder: true, headerBackgroundColor: "#1a1f2e",
      headerTextColor: "#c4b5fd", headerFontSize: 11, headerFontWeight: 600,
      fontFamily: "Satoshi, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: 12, spacing: 3, oddRowBackgroundColor: "#18202e",
    } : {
      accentColor: "#7957d5", backgroundColor: "#ffffff", foregroundColor: "#2d2242",
      borderColor: "#e5e5f0", borderRadius: 10, wrapperBorder: true, wrapperBorderRadius: 10,
      columnBorder: true, rowBorder: true, headerBackgroundColor: "#f5f3ff",
      headerTextColor: "#4527a0", headerFontSize: 11, headerFontWeight: 600,
      fontFamily: "Satoshi, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: 12, spacing: 3, oddRowBackgroundColor: "#fbfbff",
    });
});

const localeText = { noRowsToShow: "No hay filas para mostrar", loadingOoo: "Cargando..." };

/* ===================== Helpers numéricos ===================== */
const isNumeric = (v) => /^-?\d+(\.\d+)?$/.test(String(v ?? "").trim());
const to2 = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Number(num.toFixed(2));
};
const isQuarterStep = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return false;
  const scaled = num * 4;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
};

const norm = (n) => String(to2(n)).replace(".", "_");
const denorm = (s) => Number(String(s).replace("_", "."));
const uniqSorted = (arr) => [...new Set(arr)].sort((a, b) => a - b);

function sortSphForView(values) {
  const dir = props.sphType === "sph-neg" ? "desc" : "asc";
  return [...new Set(values)].sort((a, b) => (dir === "desc" ? b - a : a - b));
}

/** decimal-safe range builder (incluyente) */
function buildAxisRange(start, end, step = 0.25) {
  const s = Number(start);
  const e = Number(end);
  const st = Math.abs(Number(step) || 0.25);
  if (!Number.isFinite(s) || !Number.isFinite(e) || !Number.isFinite(st) || st <= 0) return [];

  const SCALE = 100;
  const toInt = (x) => Math.round(Number(x) * SCALE);
  const fromInt = (i) => Number((i / SCALE).toFixed(2));
  const si = toInt(s);
  const ei = toInt(e);
  const di = Math.max(1, toInt(st));

  const out = [];
  if (si === ei) return [fromInt(si)];

  const forward = si < ei;
  for (let i = si; forward ? i <= ei : i >= ei; forward ? (i += di) : (i -= di)) {
    out.push(fromInt(i));
    if (out.length > 8000) break;
  }
  return out;
}

const fmtSigned = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n ?? "");
  const s = num.toFixed(2);
  return num >= 0 ? `+${s}` : s;
};

/* ===================== Actor normalizado ===================== */
const effectiveActor = computed(() => {
  const src = props.actor || (typeof window !== "undefined" ? window.__currentUser : null) || null;
  if (!src) return null;
  const userId = src.userId || src.id || src._id || null;
  const name = src.name || src.email || "Usuario";
  return { userId, name };
});

/* ===================== Estado grid ===================== */
const gridApi = ref(null);
const rowData = ref([]);
const addCols = ref([]);
const sheetTabs = ref([]);
const sheetMeta = ref(null);
const physical = ref(null);
const basesPorSph = ref(new Map());

const dirty = ref(false);
const saving = ref(false);
const lastSavedAt = ref(null);

/** Buffer de cambios (sph, add, eye) */
const pendingChanges = ref(new Map());

const totalRows = computed(() => rowData.value.length);
const sheetName = computed(() => sheetMeta.value?.nombre || sheetMeta.value?.name || "Hoja bifocal");
const tipoMatriz = computed(() => sheetMeta.value?.tipo_matriz || "SPH_ADD");
const material = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);

/* ===================== ✅ UMBRAL DE BAJO STOCK (igual que Base) ===================== */
const LOW_STOCK_THRESHOLD = computed(() => {
  const s = sheetMeta.value || {};
  const raw =
    s?.lowStockThreshold ??
    s?.alerts?.lowStock ??
    s?.config?.lowStockThreshold ??
    2; // fallback
  const n = Number(raw);
  return Number.isFinite(n) ? n : 2;
});

const isZeroStock = (v) => Number(v ?? 0) <= 0;
const isLowStock = (v) => {
  const n = Number(v ?? 0);
  return n > 0 && n <= LOW_STOCK_THRESHOLD.value;
};

/**
 * ✅ Dado que una fila tiene MUCHAS celdas (OD/OI por ADD),
 * marcamos la fila si cualquiera está en 0 o bajo.
 */
function rowHasZeroStock(row) {
  if (!row) return false;
  for (const k of Object.keys(row)) {
    if (k.startsWith("add_")) {
      if (isZeroStock(row[k])) return true;
    }
  }
  return false;
}
function rowHasLowStock(row) {
  if (!row) return false;
  for (const k of Object.keys(row)) {
    if (k.startsWith("add_")) {
      if (isLowStock(row[k])) return true;
    }
  }
  return false;
}

/** ✅ Reglas a nivel fila (suaves, pero útiles) */
const rowClassRules = computed(() => ({
  "ag-row--stock-zero": (p) => rowHasZeroStock(p?.data),
  "ag-row--stock-low": (p) => !rowHasZeroStock(p?.data) && rowHasLowStock(p?.data)
}));

/* ===================== Límites físicos (source of truth) ===================== */
const PHYS = computed(() => {
  const p = physical.value || {};
  return {
    SPH: p.SPH || { min: -40, max: 40 },
    ADD: p.ADD || { min: 0, max: 8 }
  };
});

function inPhysSph(v) {
  const n = to2(v);
  return Number.isFinite(n) && n >= PHYS.value.SPH.min && n <= PHYS.value.SPH.max;
}
function inPhysAdd(v) {
  const n = to2(v);
  return Number.isFinite(n) && n >= PHYS.value.ADD.min && n <= PHYS.value.ADD.max;
}

/* ===================== Reglas SPH: plantilla vs fetch ===================== */
function getTabRanges() {
  const defaults =
    props.sphType === "sph-pos"
      ? { start: 0, end: 6, step: 0.25 }
      : { start: 0, end: -6, step: 0.25 };

  const tab = (sheetTabs.value || []).find((t) => t?.id === props.sphType);
  const r = tab?.ranges || {};
  const sphR = r.sph || {};

  const rawStart = Number(sphR.start ?? defaults.start);
  const rawEnd = Number(sphR.end ?? defaults.end);
  const rawStep = Math.abs(Number(sphR.step ?? defaults.step)) || 0.25;

  const displayStart = props.sphType === "sph-neg" ? Math.max(rawStart, rawEnd) : Math.min(rawStart, rawEnd);
  const displayEnd = props.sphType === "sph-neg" ? Math.min(rawStart, rawEnd) : Math.max(rawStart, rawEnd);

  return { displayStart, displayEnd, step: rawStep, tab };
}

function buildFetchQueryForView() {
  const sphMin = props.sphType === "sph-neg" ? PHYS.value.SPH.min : 0;
  const sphMax = props.sphType === "sph-neg" ? 0 : PHYS.value.SPH.max;
  return { sphMin, sphMax, addMin: PHYS.value.ADD.min, addMax: PHYS.value.ADD.max, eyes: "OD,OI" };
}

/* ===================== Cambio de celda ===================== */
function markCellChangedBifocal({ sph, add, eye, base_izq, base_der, existencias }) {
  const s = to2(sph);
  const a = to2(add);
  const e = String(eye).toUpperCase();
  const key = `${s}|${a}|${e}`;

  pendingChanges.value.set(key, {
    sph: s,
    add: a,
    eye: e,
    base_izq: to2(base_izq ?? 0),
    base_der: to2(base_der ?? 0),
    existencias: Number(existencias ?? 0)
  });

  dirty.value = true;
}

/* ===================== Columnas ===================== */
function makeLeaf(field, header, add, eye) {
  return {
    field,
    headerName: header,
    editable: true,
    filter: "agNumberColumnFilter",
    minWidth: 90,
    maxWidth: 120,
    resizable: true,
    cellClass: ["ag-cell--compact", "ag-cell--numeric"],
    headerClass: ["ag-header-cell--compact"],

    /* ✅ Marca esta celda (OD/OI) si está baja / en cero */
    cellClassRules: {
      "ag-cell--stock-zero": (p) => isZeroStock(p.value),
      "ag-cell--stock-low": (p) => isLowStock(p.value)
    },

    valueSetter: (p) => {
      const raw = String(p.newValue ?? "").trim();
      const newVal = isNumeric(raw) ? Number(raw) : 0;
      p.data[p.colDef.field] = newVal;

      markCellChangedBifocal({
        sph: p.data.sph,
        add,
        eye,
        base_izq: p.data.base_izq,
        base_der: p.data.base_der,
        existencias: newVal
      });

      return true;
    }
  };
}

const columns = computed(() => {
  const neg = props.sphType === "sph-neg";
  return [
    {
      headerName: neg ? "SPH (-)" : "SPH (+)",
      children: [
        {
          field: "sph",
          headerName: "SPH",
          pinned: "left",
          width: 90,
          minWidth: 86,
          maxWidth: 96,
          resizable: false,
          editable: false,
          sortable: true,
          comparator: (a, b) => Number(a) - Number(b),
          filter: "agNumberColumnFilter",
          cellClass: ["ag-cell--compact", "ag-cell--numeric", "ag-cell--pinned"],
          headerClass: ["ag-header-cell--compact", "ag-header-cell--pinned"],
          valueFormatter: (p) => {
            const v = Number(p.value);
            return Number.isFinite(v) ? v.toFixed(2) : p.value ?? "";
          }
        }
      ]
    },
    {
      headerName: "ADD (+)",
      children: addCols.value.map((a) => ({
        headerName: fmtSigned(a),
        marryChildren: true,
        children: [makeLeaf(`add_${norm(a)}_OD`, "OD", a, "OD"), makeLeaf(`add_${norm(a)}_OI`, "OI", a, "OI")]
      }))
    }
  ];
});

const defaultColDef = {
  resizable: true,
  sortable: true,
  filter: "agNumberColumnFilter",
  floatingFilter: true,
  editable: true,
  minWidth: 90,
  maxWidth: 160,
  cellClass: "ag-cell--compact",
  headerClass: "ag-header-cell--compact"
};

const getRowId = (p) => String(p.data.sph);

/* ===================== Load (meta / rows) ===================== */
async function loadSheetMeta() {
  const { data } = await getSheet(props.sheetId);
  const payload = data?.data || data;
  sheetMeta.value = payload?.sheet || null;
  sheetTabs.value = Array.isArray(payload?.tabs) ? payload.tabs : [];
  physical.value = payload?.physicalLimits || null;
}

async function loadRows() {
  const tabCfg = getTabRanges();
  const qFetch = buildFetchQueryForView();

  const { data: itemsRes } = await fetchItems(props.sheetId, qFetch);
  const itemsRaw = itemsRes?.data || [];

  const items = itemsRaw
    .map((i) => ({ ...i, sph: to2(i.sph), add: to2(i.add), existencias: Number(i.existencias ?? 0) }))
    .filter((i) => inPhysSph(i.sph) && inPhysAdd(i.add));

  const tab = tabCfg.tab;

  const addsFromTab = Array.isArray(tab?.ranges?.addCols)
    ? tab.ranges.addCols.map(to2).filter(inPhysAdd)
    : [];
  const addsFromData = items.map((i) => to2(i.add)).filter(inPhysAdd);
  addCols.value = uniqSorted([...addsFromTab, ...addsFromData]);

  basesPorSph.value = new Map();
  for (const it of items) {
    const sph = to2(it.sph);
    if (!basesPorSph.value.has(sph)) {
      basesPorSph.value.set(sph, { base_izq: to2(it.base_izq ?? 0), base_der: to2(it.base_der ?? 0) });
    }
  }

  const key = (sph, add, eye) => `${to2(sph)}|${to2(add)}|${String(eye).toUpperCase()}`;
  const map = new Map(items.map((i) => [key(i.sph, i.add, i.eye), Number(i.existencias ?? 0)]));

  let sphAxis = buildAxisRange(tabCfg.displayStart, tabCfg.displayEnd, tabCfg.step).map(to2);
  const sphFromData = items.map((i) => to2(i.sph)).filter(inPhysSph);

  const inView = (n) => (props.sphType === "sph-neg" ? n <= 0 : n >= 0);
  const sphFinal = sortSphForView([...sphAxis, ...sphFromData].filter(inView));

  if (!sphFinal.length) {
    const fallback = props.sphType === "sph-pos" ? buildAxisRange(0, 6, 0.25) : buildAxisRange(0, -6, 0.25);
    sphAxis = fallback.map(to2);
  }

  const axis = sphFinal.length ? sphFinal : sphAxis;

  rowData.value = axis.map((sph) => {
    const bases = basesPorSph.value.get(to2(sph)) || { base_izq: 0, base_der: 0 };
    const row = { sph: to2(sph), base_izq: bases.base_izq, base_der: bases.base_der };

    addCols.value.forEach((add) => {
      row[`add_${norm(add)}_OD`] = map.get(key(sph, add, "OD")) ?? 0;
      row[`add_${norm(add)}_OI`] = map.get(key(sph, add, "OI")) ?? 0;
    });

    return row;
  });

  dirty.value = false;
  pendingChanges.value.clear();
  await nextTick();
  resetSort();
}

async function switchViewReload() {
  switchingView.value = true;
  await raf();
  try {
    await loadRows();
  } finally {
    await raf();
    switchingView.value = false;
  }
}

async function loadAll() {
  await loadSheetMeta();
  await switchViewReload();
}

// ── WebSocket: actualiza stock en tiempo real al surtir/cancelar/resetear ──
const _WS_STOCK = new Set(["LAB_ORDER_SCAN", "LAB_ORDER_CANCEL", "LAB_ORDER_RESET"]);
function _onLabWs(e) {
  if (_WS_STOCK.has(e?.detail?.type)) loadRows();
}
onMounted(() => { loadAll(); window.addEventListener("lab:ws", _onLabWs); });
onBeforeUnmount(() => window.removeEventListener("lab:ws", _onLabWs));

watch(
  () => [props.sheetId, props.sphType],
  async () => {
    pendingChanges.value.clear();
    dirty.value = false;
    await loadAll();
  }
);

/* ===================== Fórmula / edición rápida ===================== */
const formulaValue = ref("");
let activeCell = null;

function parseAddEyeFromField(field) {
  if (!field.startsWith("add_")) return null;
  const tail = field.slice(4);
  const parts = tail.split("_");
  const eye = parts.pop();
  const numStr = parts.join("_");
  const add = denorm(numStr);
  if (Number.isNaN(add)) return null;
  return { add, eye };
}

const onCellClicked = (p) => {
  activeCell = p;
  formulaValue.value = p.value;
};

const onCellValueChanged = (p) => {
  if (activeCell && activeCell.rowIndex === p.rowIndex && activeCell.colDef.field === p.colDef.field) {
    formulaValue.value = p.newValue;
  }
  if (p.colDef.field.startsWith("add_")) {
    const meta = parseAddEyeFromField(p.colDef.field);
    if (meta) {
      markCellChangedBifocal({
        sph: p.data.sph,
        add: meta.add,
        eye: meta.eye,
        base_izq: p.data.base_izq,
        base_der: p.data.base_der,
        existencias: p.data[p.colDef.field]
      });
    }
  } else {
    dirty.value = true;
  }
};

/**
 * ✅ Base-style: FX input no “guarda”, FX commit sí “guarda”
 * - Bifocal: solo permite add_*
 */
function applyFxToGrid(val, { commit = false } = {}) {
  if (!activeCell || !gridApi.value) return;

  const field = activeCell.colDef?.field;
  if (!field || !field.startsWith("add_")) return;

  const meta = parseAddEyeFromField(field);
  if (!meta) return;

  const raw = String(val ?? "").trim();
  const newVal = isNumeric(raw) ? Number(raw) : 0;

  // live preview (sin ensuciar ni pending)
  if (activeCell.data) activeCell.data[field] = newVal;

  if (!commit) {
    gridApi.value.refreshCells?.({
      rowNodes: activeCell.node ? [activeCell.node] : undefined,
      columns: [field],
      force: true
    });
    return;
  }

  // commit: transacción + pending change
  const updatedRow = { ...(activeCell.data || {}), [field]: newVal };
  gridApi.value.applyTransaction({ update: [updatedRow] });

  markCellChangedBifocal({
    sph: updatedRow.sph,
    add: meta.add,
    eye: meta.eye,
    base_izq: updatedRow.base_izq,
    base_der: updatedRow.base_der,
    existencias: newVal
  });

  gridApi.value.flashCells?.({
    rowNodes: activeCell.node ? [activeCell.node] : undefined,
    columns: [field]
  });
}

const onFxInput = (val) => applyFxToGrid(val, { commit: false });
const onFxCommit = (val) => applyFxToGrid(val, { commit: true });

/* ===================== Grid hooks ===================== */
const onGridReady = (p) => {
  gridApi.value = p.api;
  nextTick(() => resetSort());
};

/* ===================== Add row/col (con ACK) ===================== */
const handleAddRow = async (nuevoValor, ack) => {
  const sph = to2(nuevoValor);

  if (!Number.isFinite(sph)) return ackErr(ack, "Ingresa un SPH numérico", 400);
  if (!inPhysSph(sph)) return ackErr(ack, `SPH fuera de límites físicos (${PHYS.value.SPH.min} a ${PHYS.value.SPH.max})`, 400);
  if (!isQuarterStep(sph)) return ackErr(ack, "SPH debe ser múltiplo de 0.25 (…00, …25, …50, …75)", 400);
  if (rowData.value.some((r) => to2(r.sph) === sph)) return ackErr(ack, `SPH ${sph.toFixed(2)} ya existe`, 409);

  const isNegView = props.sphType === "sph-neg";
  if (isNegView && sph > 0) return ackErr(ack, "Vista SPH (-): SPH debe ser 0 o negativo", 400);
  if (!isNegView && sph < 0) return ackErr(ack, "Vista SPH (+): SPH debe ser 0 o positivo", 400);

  const bases = basesPorSph.value.get(sph) || { base_izq: 0, base_der: 0 };

  const row = { sph, base_izq: bases.base_izq, base_der: bases.base_der };
  addCols.value.forEach((add) => {
    row[`add_${norm(add)}_OD`] = 0;
    row[`add_${norm(add)}_OI`] = 0;
  });

  gridApi.value?.applyTransaction({ add: [row] });
  await nextTick();
  resetSort();

  try {
    const rowsToPersist = [];
    addCols.value.forEach((add) => {
      rowsToPersist.push({ sph, add, eye: "OD", base_izq: bases.base_izq, base_der: bases.base_der, existencias: 0 });
      rowsToPersist.push({ sph, add, eye: "OI", base_izq: bases.base_izq, base_der: bases.base_der, existencias: 0 });
    });

    if (!rowsToPersist.length) {
      ackOk(ack, "Fila agregada (sin columnas ADD aún).", 200);
      return;
    }

    const res = await saveChunk(props.sheetId, rowsToPersist, effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo agregar la fila", ok.status);

    ackOk(ack, ok.message || `Fila agregada: SPH ${fmtSigned(sph)}`, ok.status);

    lastSavedAt.value = new Date();
    await switchViewReload();
  } catch (e) {
    console.error("[AgGridBifocal] Error al persistir SPH nuevo:", e?.response?.data || e);
    ackErr(ack, msgFromErr(e, "Error al guardar el nuevo SPH"), statusFromErr(e));
  }
};

const handleAddColumn = async (nuevoValor, ack) => {
  const add = to2(nuevoValor);

  if (!Number.isFinite(add)) return ackErr(ack, "Ingresa ADD numérico", 400);
  if (!inPhysAdd(add)) return ackErr(ack, `ADD fuera de límites físicos (${PHYS.value.ADD.min} a ${PHYS.value.ADD.max})`, 400);
  if (!isQuarterStep(add)) return ackErr(ack, "ADD debe ser múltiplo de 0.25 (…00, …25, …50, …75)", 400);
  if (addCols.value.includes(add)) return ackErr(ack, `ADD ${fmtSigned(add)} ya existe`, 409);

  addCols.value = uniqSorted([...addCols.value, add]);
  rowData.value.forEach((r) => {
    r[`add_${norm(add)}_OD`] = 0;
    r[`add_${norm(add)}_OI`] = 0;
  });

  await nextTick();
  gridApi.value?.refreshHeader();
  gridApi.value?.redrawRows();

  try {
    const rowsToPersist = [];
    rowData.value.forEach((r) => {
      const sph = to2(r.sph);
      const base_izq = to2(r.base_izq ?? 0);
      const base_der = to2(r.base_der ?? 0);
      rowsToPersist.push({ sph, add, eye: "OD", base_izq, base_der, existencias: 0 });
      rowsToPersist.push({ sph, add, eye: "OI", base_izq, base_der, existencias: 0 });
    });

    if (!rowsToPersist.length) {
      ackOk(ack, "Columna agregada.", 200);
      return;
    }

    const res = await saveChunk(props.sheetId, rowsToPersist, effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo agregar la columna", ok.status);

    ackOk(ack, ok.message || `Columna ADD agregada: ${fmtSigned(add)}`, ok.status);

    lastSavedAt.value = new Date();
    await switchViewReload();
  } catch (e) {
    console.error("[AgGridBifocal] Error al persistir ADD nuevo:", e?.response?.data || e);
    ackErr(ack, msgFromErr(e, "Error al guardar el nuevo ADD"), statusFromErr(e));
  }
};

/* ===================== Save / refresh / discard / seed / export ===================== */
async function handleSave(ack) {
  if (!dirty.value || pendingChanges.value.size === 0) {
    ackOk(ack, "No hay cambios por guardar.", 200);
    return;
  }

  saving.value = true;
  try {
    const rows = Array.from(pendingChanges.value.values());
    const res = await saveChunk(props.sheetId, rows, effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo guardar", ok.status);

    dirty.value = false;
    pendingChanges.value.clear();
    lastSavedAt.value = new Date();

    ackOk(ack, ok.message || "Cambios guardados.", ok.status);

    await switchViewReload();
  } catch (e) {
    console.error("[AgGridBifocal] Error saveChunk:", e?.response?.data || e);
    ackErr(ack, msgFromErr(e, "Error al guardar cambios"), statusFromErr(e));
  } finally {
    saving.value = false;
  }
}

async function handleDiscard() {
  pendingChanges.value.clear();
  dirty.value = false;
  await switchViewReload();
}

async function handleRefresh() {
  pendingChanges.value.clear();
  await loadSheetMeta();
  await switchViewReload();
}

async function handleSeed(ack) {
  try {
    saving.value = true;
    const res = await reseedSheet(props.sheetId, effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo hacer seed", ok.status);

    await loadSheetMeta();
    await switchViewReload();
    lastSavedAt.value = new Date();
    pendingChanges.value.clear();
    dirty.value = false;
    ackOk(ack, ok.message || "Seed generado.", ok.status);
  } catch (e) {
    console.error("[AgGridBifocal] Error reseed:", e?.response?.data || e);
    ackErr(ack, msgFromErr(e, "Error al generar seed"), statusFromErr(e));
  } finally {
    saving.value = false;
  }
}

function handleExport() {
  if (!gridApi.value || typeof gridApi.value.exportDataAsCsv !== "function") return;
  const nameSlug = sheetName.value.replace(/\s+/g, "_");
  const posNeg = props.sphType === "sph-pos" ? "pos" : "neg";
  gridApi.value.exportDataAsCsv({ fileName: `${nameSlug || "bifocal"}_${posNeg}.csv` });
}

/* ===================== Filters / sort ===================== */
const clearFilters = () => {
  if (!gridApi.value) return;
  const api = gridApi.value;
  if (typeof api.setFilterModel === "function") api.setFilterModel(null);
  else if (typeof api.setGridOption === "function") api.setGridOption("filterModel", null);
};

const resetSort = () => {
  const api = gridApi.value;
  if (!api) return;
  const dir = props.sphType === "sph-neg" ? "desc" : "asc"; // 0 arriba en ambas
  if (typeof api.applyColumnState === "function") {
    api.applyColumnState({
      defaultState: { sort: null },
      state: [{ colId: "sph", sort: dir }]
    });
  } else if (typeof api.setSortModel === "function") {
    api.setSortModel([{ colId: "sph", sort: dir }]);
  }
};

const handleToggleFilters = () => clearFilters();
</script>

<style scoped>
.buefy-balham-light {
  padding: 0.5rem 0.75rem 0.75rem;
  background-color: var(--ag-bg);
  border-radius: 0.75rem;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.03);
}

.grid-shell {
  transition: opacity 160ms ease,
    transform 200ms cubic-bezier(0.22, 0.61, 0.36, 1),
    filter 160ms ease;
  will-change: opacity, transform, filter;
}
.grid-shell--switching {
  opacity: 0;
  transform: translate3d(0, 8px, 0) scale(0.992);
  filter: blur(1.2px);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .grid-shell {
    transition: none !important;
  }
}

.stock-legend {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}
.stock-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  line-height: 1;
  user-select: none;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(15, 23, 42, 0.03);
}
.stock-pill--low {
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.25);
}
.stock-pill--zero {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.22);
}

.ag-grid-buefy .ag-header-cell.ag-header-cell--compact {
  padding-inline: 6px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ag-grid-buefy .ag-cell.ag-cell--compact {
  padding-inline: 6px;
  line-height: 1.2;
  font-size: 0.75rem;
}

.ag-grid-buefy .ag-cell.ag-cell--numeric {
  justify-content: flex-end;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.ag-grid-buefy .ag-cell.ag-cell--pinned,
.ag-grid-buefy .ag-header-cell.ag-header-cell--pinned {
  background-color: #f5f3ff;
  font-weight: 600;
}

.ag-grid-buefy .ag-row-hover {
  background-color: #f3f0ff !important;
}

/* ===================== ✅ ALERTAS STOCK (fila + celda) ===================== */
/* fila (suave) */
.ag-grid-buefy :deep(.ag-row.ag-row--stock-low) {
  box-shadow: inset 3px 0 0 rgba(245, 158, 11, 0.75);
  background: rgba(245, 158, 11, 0.06);
}
.ag-grid-buefy :deep(.ag-row.ag-row--stock-zero) {
  box-shadow: inset 3px 0 0 rgba(239, 68, 68, 0.85);
  background: rgba(239, 68, 68, 0.06);
}

/* celda (más explícita) */
.ag-grid-buefy :deep(.ag-cell.ag-cell--stock-low) {
  font-weight: 700;
  background: rgba(245, 158, 11, 0.12);
  border-radius: 6px;
}
.ag-grid-buefy :deep(.ag-cell.ag-cell--stock-zero) {
  font-weight: 800;
  background: rgba(239, 68, 68, 0.12);
  border-radius: 6px;
}
</style>
