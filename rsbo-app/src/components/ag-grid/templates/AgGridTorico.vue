<!-- src/components/ag-grid/templates/AgGridTorico.vue -->
<template>
  <div class="grid-page">
    <!-- TOPBAR (sticky) -->
    <header class="grid-topbar">
      <navtools
        class="navtools-wrap"
        v-model="formulaValue"
        :dirty="dirty"
        :saving="saving"
        :total-rows="totalRows"
        :sheet-name="sheetName"
        :tipo-matriz="tipoMatriz"
        :material="material"
        :tratamientos="tratamientos"
        :last-saved-at="lastSavedAt"
        :grid-can-undo="gridHistory.canUndo.value"
        :grid-can-redo="gridHistory.canRedo.value"
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
        @grid-undo="handleGridUndo"
        @grid-redo="handleGridRedo"
      />
    </header>

    <!-- DEGREE SELECTOR -->
    <div class="degree-bar">
      <span class="degree-bar__label">Eje (grados):</span>
      <div class="degree-bar__pills">
        <button
          v-for="deg in degreeValues"
          :key="deg"
          class="degree-pill"
          :class="{ 'degree-pill--active': deg === selectedDegree }"
          @click="selectDegree(deg)"
        >
          {{ deg }}°
        </button>
      </div>
    </div>

    <!-- GRID MAIN -->
    <main class="grid-main">
      <div class="buefy-balham-light grid-shell" :class="{ 'grid-shell--switching': switchingView }">
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
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import {
  AllCommunityModule,
  ModuleRegistry,
} from "ag-grid-community";
import navtools from "@/components/ag-grid/navtools.vue";
import { useSheetApi } from "@/composables/useSheetApi";
import { useGridHistory } from "@/composables/useGridHistory";
import { useUnsavedGuard } from "@/composables/useUnsavedGuard";
import {
  useAgGridBase, localeText,
  ackOk, ackErr, msgFromErr, statusFromErr, normalizeAxiosOk,
  numOr, isNumeric, to2, fmtSigned, isMultipleOfStep,
} from "@/composables/useAgGridBase";
import { labToast } from "@/composables/useLabToast";
import { exportAgGridToXlsx } from "@/composables/useExcelExport";

ModuleRegistry.registerModules([AllCommunityModule]);

const props = defineProps({
  sheetId: { type: String, required: true },
  sphType: { type: String, default: "sph-neg" },
  actor:   { type: Object, default: null },
  apiType: { type: String, default: "contactlenses" },
});

const { fetchItems, saveChunk, reseedSheet, getSheet } = useSheetApi(() => props.apiType);

const isQuarterStep = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return false;
  const scaled = num * 4;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
};

const fmtCylHeader = (cDisp) => {
  const n = Number(cDisp);
  if (!Number.isFinite(n)) return "";
  return n === 0 ? "0.00" : `-${n.toFixed(2)}`;
};

const norm = (n) => String(to2(n)).replace(".", "_");
const denorm = (s) => Number(String(s).replace("_", "."));
function parseCylFromField(field) {
  if (!field.startsWith("cyl_")) return null;
  return denorm(field.slice(4));
}

/* ===================== UI/Anim ===================== */
const switchingView = ref(false);
const raf = () =>
  new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });

/* ===================== Estado principal ===================== */
const gridApi = ref(null);
const rowData = ref([]);
const dirty = ref(false);
const saving = ref(false);
const lastSavedAt = ref(null);
const sheetMeta = ref(null);
const sheetTabs = ref([]);
const physicalLimits = ref(null);
const pendingChanges = ref(new Map());
const cylValues = ref([]);

/* ── Grid-level undo/redo ── */
const gridHistory = useGridHistory({ maxSize: 300 });

/* === Degree selector === */
const degreeValues = ref([]);
const selectedDegree = ref(180);
const allItems = ref([]);

/* ── Unsaved changes guard ── */
const _guardViewId = computed(() => `${props.sheetId}:torico:${props.sphType}:${selectedDegree.value}`);
const unsavedGuard = useUnsavedGuard({
  storageKey: () => _guardViewId.value,
  isDirty: () => dirty.value,
  getPending: () => Object.fromEntries(pendingChanges.value),
  onRestore(saved) {
    for (const [k, v] of Object.entries(saved)) {
      pendingChanges.value.set(k, v);
      // Also update rowData if row exists
      const parts = k.split("|");
      if (parts.length >= 2) {
        const sph = to2(Number(parts[0]));
        const cDisp = to2(Number(parts[1]));
        const row = rowData.value.find(r => to2(r.sph) === sph);
        if (row) {
          const field = `cyl_${norm(cDisp)}`;
          row[field] = v.existencias;
          gridApi.value?.applyTransaction({ update: [row] });
        }
      }
    }
    if (pendingChanges.value.size > 0) {
      dirty.value = true;
      labToast.warning(`Se restauraron ${pendingChanges.value.size} cambios sin guardar.`);
    }
  },
});


/* ===================== Actor normalizado ===================== */
const effectiveActor = computed(() => {
  const src = props.actor || (typeof window !== "undefined" ? window.__currentUser : null) || null;
  if (!src) return null;
  const userId = src.userId || src.id || src._id || null;
  const name = src.name || src.email || "Usuario";
  return { userId, name };
});

/* ===================== Meta computed ===================== */
const totalRows = computed(() => rowData.value.length);
const sheetName = computed(() => sheetMeta.value?.nombre || sheetMeta.value?.name || "Hoja torica (SPH/CYL/Eje)");
const tipoMatriz = computed(() => sheetMeta.value?.tipo_matriz || "SPH_CYL_AXIS");
const material = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);

/* ===================== UMBRAL DE BAJO STOCK ===================== */
const LOW_STOCK_THRESHOLD = computed(() => {
  const s = sheetMeta.value || {};
  const raw = s?.lowStockThreshold ?? s?.alerts?.lowStock ?? s?.config?.lowStockThreshold ?? 2;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 2;
});

const isZeroStock = (v) => Number(v ?? 0) <= 0;
const isLowStock = (v) => {
  const n = Number(v ?? 0);
  return n > 0 && n <= LOW_STOCK_THRESHOLD.value;
};

function rowHasZeroStock(row) {
  if (!row) return false;
  for (const k of Object.keys(row)) {
    if (k.startsWith("cyl_") && isZeroStock(row[k])) return true;
  }
  return false;
}
function rowHasLowStock(row) {
  if (!row) return false;
  for (const k of Object.keys(row)) {
    if (k.startsWith("cyl_") && isLowStock(row[k])) return true;
  }
  return false;
}

const { themeCustom, rowClassRules } = useAgGridBase({ isZeroStock, isLowStock });

const phys = computed(() => {
  const pl = physicalLimits.value || {};
  const SPH = pl.SPH || pl.sph || {};
  const CYL = pl.CYL || pl.cyl || {};
  const sphMin = numOr(SPH.min, -40);
  const sphMax = numOr(SPH.max, 40);
  const cylMin = numOr(CYL.min, -15);
  const cylMax = numOr(CYL.max, 15);
  const cylAbsMax = Math.max(Math.abs(cylMin), Math.abs(cylMax));
  return { sphMin, sphMax, cylMin, cylMax, cylAbsMax };
});

/* ===================== Grid defs ===================== */
function markCellChanged(sph, cylDisplay, existencias, _oldValue) {
  const s = to2(sph);
  const cDisp = to2(Math.abs(Number(cylDisplay)));
  const cBackend = -cDisp;
  const deg = selectedDegree.value;

  const key = `${s}|${cDisp}|${deg}`;
  const prev = pendingChanges.value.get(key);
  const oldVal = _oldValue ?? prev?.existencias ?? 0;
  const newVal = Number(existencias ?? 0);

  pendingChanges.value.set(key, {
    sph: s,
    cyl: cBackend,
    axis: deg,
    existencias: newVal
  });
  dirty.value = true;

  // Push to grid history for undo/redo
  if (!gridHistory.isApplying.value) {
    gridHistory.push({
      key,
      field: `cyl_${norm(cDisp)}`,
      oldValue: oldVal,
      newValue: newVal,
      meta: { sph: s, cylDisplay: cDisp, axis: deg },
    });
  }
}

const columns = computed(() => [
  {
    headerName: `SPH ${props.sphType === "sph-neg" ? "(-)" : "(+)"}`,
    children: [
      {
        field: "sph",
        headerName: "SPH",
        width: 90, minWidth: 86, maxWidth: 96,
        pinned: "left",
        editable: false,
        sortable: true,
        comparator: (a, b) => Number(a) - Number(b),
        resizable: false,
        filter: "agNumberColumnFilter",
        cellClass: ["ag-cell--compact", "ag-cell--numeric", "ag-cell--pinned"],
        headerClass: ["ag-header-cell--compact", "ag-header-cell--pinned"],
        valueFormatter: (p) => {
          const v = Number(p.value);
          return Number.isFinite(v) ? fmtSigned(v) : p.value ?? "";
        }
      }
    ]
  },
  {
    headerName: `CYL (-) | Eje ${selectedDegree.value}\u00B0`,
    children: cylValues.value.map((cDisp) => ({
      field: `cyl_${norm(cDisp)}`,
      headerName: fmtCylHeader(cDisp),
      editable: true,
      filter: "agNumberColumnFilter",
      minWidth: 80, maxWidth: 110,
      resizable: true,
      cellClass: ["ag-cell--compact", "ag-cell--numeric"],
      headerClass: ["ag-header-cell--compact"],
      cellClassRules: {
        "ag-cell--stock-zero": (p) => isZeroStock(p.value),
        "ag-cell--stock-low": (p) => isLowStock(p.value)
      },
      valueSetter: (p) => {
        const v = String(p.newValue ?? "").trim();
        const newVal = isNumeric(v) ? Number(v) : 0;
        const oldVal = Number(p.oldValue ?? 0);
        p.data[p.colDef.field] = newVal;
        markCellChanged(p.data.sph, cDisp, newVal, oldVal);
        return true;
      }
    }))
  }
]);

const defaultColDef = {
  resizable: true, sortable: true,
  filter: "agNumberColumnFilter", floatingFilter: true,
  editable: true, minWidth: 90, maxWidth: 150,
  cellClass: "ag-cell--compact", headerClass: "ag-header-cell--compact"
};

const getRowId = (p) => p.data.sph?.toString();

/* ===================== Load meta ===================== */
async function loadSheetMeta() {
  try {
    const { data } = await getSheet(props.sheetId);
    const payload = data?.data || data;
    sheetMeta.value = payload?.sheet || null;
    sheetTabs.value = payload?.tabs || [];
    physicalLimits.value = payload?.physicalLimits || payload?.physical_limits || payload?.limits || null;
  } catch (e) {
    console.error("[AgGridTorico] Error getSheet:", e?.response?.data || e);
  }
}

function getTabForView() {
  return (
    (sheetTabs.value || []).find((t) => t?.id === props.sphType) ||
    (sheetTabs.value || []).find((t) => String(t?.id || "").includes("sph")) ||
    null
  );
}

function buildFetchQueryForView() {
  const P = phys.value;
  const isNeg = props.sphType === "sph-neg";
  return {
    sphMin: isNeg ? P.sphMin : 0,
    sphMax: isNeg ? 0 : P.sphMax,
    cylMin: Math.min(P.cylMin, 0),
    cylMax: 0,
    limit: 50000
  };
}

/* ===================== Load & filter by degree ===================== */
async function loadAllItems() {
  const tab = getTabForView();
  const qFetch = buildFetchQueryForView();
  const P = phys.value;
  const isNeg = props.sphType === "sph-neg";

  const { data } = await fetchItems(props.sheetId, qFetch);
  const itemsRaw = data?.data || [];

  allItems.value = itemsRaw
    .map((i) => {
      const sph = to2(i.sph);
      let cyl = to2(i.cyl);
      if (Number.isFinite(cyl) && cyl > 0) cyl = -Math.abs(cyl);
      const axis = Number(i.axis ?? 180);
      const existencias = Number(i.existencias ?? 0);
      return { sph, cyl, axis, existencias };
    })
    .filter((i) => {
      if (!Number.isFinite(i.sph) || !Number.isFinite(i.cyl)) return false;
      if (i.sph < P.sphMin || i.sph > P.sphMax) return false;
      if (i.cyl < P.cylMin || i.cyl > P.cylMax) return false;
      if (isNeg && i.sph > 0) return false;
      if (!isNeg && i.sph < 0) return false;
      if (i.cyl > 0) return false;
      return true;
    });

  // Ejes 100% del backend — frontend solo reconstruye
  const backendDegrees = Array.isArray(tab?.axis?.degrees) ? tab.axis.degrees : [];
  const allDeg = [...new Set(backendDegrees)]
    .filter((d) => Number.isFinite(d) && d >= 10 && d <= 180 && d % 10 === 0)
    .sort((a, b) => b - a);
  degreeValues.value = allDeg;

  if (!degreeValues.value.includes(selectedDegree.value)) {
    selectedDegree.value = degreeValues.value[0] || 180;
  }

  // SPH / CYL ejes 100% del backend
  const backendSph = Array.isArray(tab?.axis?.sph) ? tab.axis.sph : [];
  const backendCyl = Array.isArray(tab?.axis?.cyl) ? tab.axis.cyl : [];

  const sphAxis = [...new Set(backendSph.map(to2))]
    .filter((s) => Number.isFinite(s) && s >= P.sphMin && s <= P.sphMax)
    .filter((s) => isNeg ? s <= 0 : s >= 0)
    .sort((a, b) => isNeg ? b - a : a - b);

  cylValues.value = [...new Set(backendCyl.map(to2))]
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= P.cylAbsMax)
    .sort((a, b) => a - b);

  buildRowsForDegree(sphAxis);
}

function buildRowsForDegree(sphAxisOverride) {
  const deg = selectedDegree.value;
  const isNeg = props.sphType === "sph-neg";
  const P = phys.value;

  const items = allItems.value.filter((i) => i.axis === deg);

  let sphAxis = sphAxisOverride;
  if (!sphAxis) {
    const tab = getTabForView();
    const backendSph = Array.isArray(tab?.axis?.sph) ? tab.axis.sph : [];
    sphAxis = [...new Set(backendSph.map(to2))]
      .filter((s) => Number.isFinite(s) && s >= P.sphMin && s <= P.sphMax)
      .filter((s) => isNeg ? s <= 0 : s >= 0)
      .sort((a, b) => isNeg ? b - a : a - b);
  }

  const key = (s, cDisp) => `${to2(s)}|${to2(cDisp)}`;
  const map = new Map(items.map((i) => [key(i.sph, Math.abs(i.cyl)), Number(i.existencias ?? 0)]));

  rowData.value = sphAxis.map((sph) => {
    const row = { sph: to2(sph) };
    cylValues.value.forEach((cDisp) => {
      row[`cyl_${norm(cDisp)}`] = map.get(key(sph, cDisp)) ?? 0;
    });
    return row;
  });

  dirty.value = false;
  pendingChanges.value.clear();
}

function selectDegree(deg) {
  if (deg === selectedDegree.value) return;
  // Persist unsaved changes for the OLD degree before switching
  if (dirty.value && pendingChanges.value.size > 0) {
    unsavedGuard.persist();
  }
  pendingChanges.value.clear();
  dirty.value = false;
  gridHistory.clear();

  selectedDegree.value = deg;
  buildRowsForDegree(null);
  nextTick(() => {
    resetSort();
    // Restore any saved changes for the NEW degree
    unsavedGuard.restore();
  });
}

async function switchViewReload() {
  switchingView.value = true;
  await raf();
  try {
    await loadAllItems();
  } catch (e) {
    console.error("[AgGridTorico] Error fetchItems:", e?.response?.data || e);
  } finally {
    await raf();
    switchingView.value = false;
  }
}

async function loadAll() {
  await loadSheetMeta();
  await switchViewReload();
}

// WebSocket: actualiza stock en tiempo real
const _WS_STOCK = new Set(["LAB_ORDER_SCAN", "LAB_ORDER_CANCEL", "LAB_ORDER_RESET"]);
function _onLabWs(e) {
  if (_WS_STOCK.has(e?.detail?.type)) loadAllItems();
}
onMounted(async () => {
  await loadAll();
  window.addEventListener("lab:ws", _onLabWs);
  // Restore unsaved changes from previous session/view
  unsavedGuard.restore();
});
onBeforeUnmount(() => window.removeEventListener("lab:ws", _onLabWs));

watch(
  () => [props.sheetId, props.sphType],
  async () => {
    // Persist unsaved changes for the OLD view before switching
    if (dirty.value && pendingChanges.value.size > 0) {
      unsavedGuard.persist();
    }
    pendingChanges.value.clear();
    dirty.value = false;
    gridHistory.clear();
    await loadAll();
    // Try to restore any saved changes for the NEW view
    unsavedGuard.restore();
  }
);

/* ===================== Formula / quick edit ===================== */
const formulaValue = ref("");
let activeCell = null;

const onCellClicked = (p) => {
  activeCell = p;
  formulaValue.value = p.value;
};

const onCellValueChanged = (p) => {
  if (activeCell && activeCell.rowIndex === p.rowIndex && activeCell.colDef.field === p.colDef.field) {
    formulaValue.value = p.newValue;
  }
  if (p.colDef.field.startsWith("cyl_")) {
    const cDisp = parseCylFromField(p.colDef.field);
    if (!Number.isNaN(cDisp)) markCellChanged(p.data.sph, cDisp, p.data[p.colDef.field]);
  } else {
    dirty.value = true;
  }
};

function applyFxToGrid(val, { commit = false } = {}) {
  if (!activeCell || !gridApi.value) return;

  const field = activeCell.colDef?.field;
  if (!field || !field.startsWith("cyl_")) return;

  const cDisp = parseCylFromField(field);
  if (cDisp === null || Number.isNaN(cDisp)) return;

  const raw = String(val ?? "").trim();
  const newVal = isNumeric(raw) ? Number(raw) : 0;

  if (activeCell.data) activeCell.data[field] = newVal;

  if (!commit) {
    gridApi.value.refreshCells?.({
      rowNodes: activeCell.node ? [activeCell.node] : undefined,
      columns: [field],
      force: true
    });
    return;
  }

  const updatedRow = { ...(activeCell.data || {}), [field]: newVal };
  gridApi.value.applyTransaction({ update: [updatedRow] });
  markCellChanged(updatedRow.sph, cDisp, newVal);
  gridApi.value.flashCells?.({
    rowNodes: activeCell.node ? [activeCell.node] : undefined,
    columns: [field]
  });
}

const onFxInput = (val) => applyFxToGrid(val, { commit: false });
const onFxCommit = (val) => applyFxToGrid(val, { commit: true });

/* ── Grid-level undo / redo ── */
function applyGridHistoryOp(op) {
  if (!op) return;
  const value = op.reversed ? op.oldValue : op.newValue;
  const { sph, cylDisplay, axis } = op.meta;
  const row = rowData.value.find(r => to2(r.sph) === to2(sph));
  if (!row) return;
  const field = `cyl_${norm(cylDisplay)}`;
  row[field] = value;
  gridApi.value?.applyTransaction({ update: [row] });
  gridApi.value?.refreshCells({ force: true });

  // update pendingChanges
  const cBackend = -to2(cylDisplay);
  pendingChanges.value.set(op.key, { sph: to2(sph), cyl: cBackend, axis, existencias: value });
  dirty.value = pendingChanges.value.size > 0;
}
const handleGridUndo = () => applyGridHistoryOp(gridHistory.undo());
const handleGridRedo = () => applyGridHistoryOp(gridHistory.redo());

/* ===================== Grid hooks ===================== */
const onGridReady = (p) => {
  gridApi.value = p.api;
  nextTick(() => resetSort());
};

/* ===================== Add row/col ===================== */
const handleAddRow = async (nuevoValor, ack) => {
  const P = phys.value;
  const v = to2(nuevoValor);

  if (!Number.isFinite(v)) return ackErr(ack, "Ingresa un SPH numerico", 400);
  if (!isQuarterStep(v)) return ackErr(ack, "SPH debe ser multiplo de 0.25", 400);
  if (v < P.sphMin || v > P.sphMax) return ackErr(ack, `SPH fuera de limites (${P.sphMin} a ${P.sphMax})`, 400);

  if (props.sphType === "sph-neg" && v >= 0) return ackErr(ack, "Vista SPH (-): SPH debe ser negativo", 400);
  if (props.sphType === "sph-pos" && v < 0) return ackErr(ack, "Vista SPH (+): SPH debe ser 0 o positivo", 400);

  if (rowData.value.some((r) => to2(r.sph) === v)) return ackErr(ack, `SPH ${fmtSigned(v)} ya existe`, 409);

  const nueva = { sph: v };
  cylValues.value.forEach((cDisp) => (nueva[`cyl_${norm(cDisp)}`] = 0));
  gridApi.value?.applyTransaction({ add: [nueva] });
  await nextTick();
  resetSort();

  try {
    const res = await saveChunk(props.sheetId, [{ sph: v, cyl: 0, axis: selectedDegree.value, existencias: 0 }], effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo agregar SPH", ok.status);
    ackOk(ack, ok.message || `SPH agregado: ${fmtSigned(v)}`, ok.status);
    lastSavedAt.value = new Date();
    await loadSheetMeta();
    await switchViewReload();
  } catch (e) {
    console.error("[AgGridTorico] Error al persistir SPH:", e?.response?.data || e);
    ackErr(ack, msgFromErr(e, "Error al guardar el nuevo SPH"), statusFromErr(e));
  }
};

const handleAddColumn = async (nuevoValor, ack) => {
  const P = phys.value;
  const raw = to2(nuevoValor);

  if (!Number.isFinite(raw)) return ackErr(ack, "Ingresa un CYL numerico", 400);
  if (raw >= 0) return ackErr(ack, "CYL debe ingresarse en negativo. Ej: -0.75", 400);

  const vDisp = to2(Math.abs(raw));
  if (vDisp === 0) return ackErr(ack, "CYL 0.00 ya existe", 409);
  if (vDisp > P.cylAbsMax) return ackErr(ack, `CYL fuera de limite (max ${P.cylAbsMax})`, 400);
  if (cylValues.value.includes(vDisp)) return ackErr(ack, `CYL ${vDisp.toFixed(2)} ya existe`, 409);

  cylValues.value = [...cylValues.value, vDisp].sort((a, b) => a - b);
  rowData.value.forEach((r) => (r[`cyl_${norm(vDisp)}`] = 0));

  await nextTick();
  gridApi.value?.refreshHeader();
  gridApi.value?.redrawRows();

  try {
    const res = await saveChunk(props.sheetId, [{ sph: 0, cyl: -vDisp, axis: selectedDegree.value, existencias: 0 }], effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo agregar CYL", ok.status);
    ackOk(ack, ok.message || `CYL agregado: -${vDisp.toFixed(2)}`, ok.status);
    lastSavedAt.value = new Date();
    await loadSheetMeta();
    await switchViewReload();
  } catch (e) {
    console.error("[AgGridTorico] Error al persistir CYL:", e?.response?.data || e);
    ackErr(ack, msgFromErr(e, "Error al guardar el nuevo CYL"), statusFromErr(e));
  }
};

/* ===================== filters/sort/save ===================== */
const clearFilters = () => {
  if (!gridApi.value) return;
  const api = gridApi.value;
  if (typeof api.setFilterModel === "function") api.setFilterModel(null);
  else if (typeof api.setGridOption === "function") api.setGridOption("filterModel", null);
};

const resetSort = () => {
  const api = gridApi.value;
  if (!api) return;
  const sortDir = props.sphType === "sph-neg" ? "desc" : "asc";
  if (typeof api.applyColumnState === "function") {
    api.applyColumnState({
      defaultState: { sort: null },
      state: [{ colId: "sph", sort: sortDir }]
    });
  } else if (typeof api.setSortModel === "function") {
    api.setSortModel([{ colId: "sph", sort: sortDir }]);
  }
};

const handleToggleFilters = () => clearFilters();

async function handleSave(ack) {
  if (!dirty.value || pendingChanges.value.size === 0) {
    ackOk(ack, "No hay cambios por guardar.", 200);
    return;
  }
  if (!gridApi.value) return ackErr(ack, "Grid no listo.", 400);

  saving.value = true;
  try {
    const rows = Array.from(pendingChanges.value.values());
    const res = await saveChunk(props.sheetId, rows, effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudieron guardar los cambios", ok.status);

    dirty.value = false;
    pendingChanges.value.clear();
    lastSavedAt.value = new Date();
    gridHistory.clear();
    unsavedGuard.clearStorage();

    ackOk(ack, ok.message || "Cambios guardados.", ok.status);
    await loadSheetMeta();
    await switchViewReload();
  } catch (e) {
    console.error("[AgGridTorico] Error saveChunk:", e?.response?.data || e);
    ackErr(ack, msgFromErr(e, "Error al guardar cambios"), statusFromErr(e));
  } finally {
    saving.value = false;
  }
}

async function handleDiscard() {
  pendingChanges.value.clear();
  dirty.value = false;
  gridHistory.clear();
  unsavedGuard.clearStorage();
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
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo generar seed", ok.status);

    await loadSheetMeta();
    await switchViewReload();
    dirty.value = false;
    pendingChanges.value.clear();
    lastSavedAt.value = new Date();
    ackOk(ack, ok.message || "Seed generado.", ok.status);
  } catch (e) {
    console.error("[AgGridTorico] Error reseed:", e?.response?.data || e);
    ackErr(ack, msgFromErr(e, "Error al generar seed"), statusFromErr(e));
  } finally {
    saving.value = false;
  }
}

async function handleExport() {
  if (!gridApi.value) return;
  const nameSlug = sheetName.value.replace(/\s+/g, "_");
  const posNeg = props.sphType === "sph-pos" ? "pos" : "neg";
  const fecha = new Date().toISOString().slice(0, 10);
  await exportAgGridToXlsx(gridApi.value, {
    filename: `reporte_inventario_${nameSlug || "torico"}_${posNeg}_${selectedDegree.value}deg_${fecha}`,
    sheetName: String(sheetName.value || "Torico").slice(0, 31),
    title: `Inventario — ${sheetName.value || "Torico"} (${posNeg}, ${selectedDegree.value}°)`,
  });
}
</script>

<style scoped>
.grid-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface, #fbfbff);
}

.grid-topbar {
  position: sticky;
  top: 0;
  z-index: 15;
  padding: 0.75rem 0.75rem 0.35rem;
  background: var(--surface-glass, rgba(251, 251, 255, 0.82));
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border, rgba(15, 23, 42, 0.06));
}

.navtools-wrap {
  padding: 0 !important;
}

/* ── Degree selector bar ── */
.degree-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  background: var(--surface-raised, #f5f3ff);
  border-bottom: 1px solid var(--border, rgba(15, 23, 42, 0.06));
  overflow-x: auto;
  flex-shrink: 0;
}

.degree-bar__label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
  white-space: nowrap;
}

.degree-bar__pills {
  display: flex;
  gap: 0.25rem;
  flex-wrap: nowrap;
}

.degree-pill {
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  border: 1px solid var(--border, #e5e5f0);
  background: var(--surface, #fff);
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.degree-pill:hover {
  border-color: var(--c-primary, #7957d5);
  color: var(--c-primary, #7957d5);
}

.degree-pill--active {
  background: var(--c-primary, #7957d5);
  border-color: var(--c-primary, #7957d5);
  color: #fff;
}

.degree-pill--active:hover {
  color: #fff;
}

/* ── Grid shell ── */
.grid-main {
  flex: 1 1 0;
  min-height: 0;
  padding: 0.5rem;
}

.grid-shell {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  overflow: hidden;
  transition: opacity 0.18s;
}
.grid-shell--switching {
  opacity: 0.45;
  pointer-events: none;
}
</style>
