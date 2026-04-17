<!-- ============================================================
  AgGridProgresivo.vue  —  Matriz (BASE_IZQ / BASE_DER) × ADD (OD/OI)

  FILAS:     rowModelType="infinite" — axis de pares base_izq|base_der
  COLUMNAS:  useAgGridIncrementalColumns — ADD values × OD/OI
  CACHÉ:     rowCache Map<`${bi}|${bd}`, rowObj> con TODOS los ADD values
  ============================================================ -->

<template>
  <div class="grid-page">
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

    <main class="grid-main">
      <div class="glass-shell" :class="{ 'glass-shell--switching': switchingView }">
        <div v-if="DEV_MODE" class="dev-col-badge">
          cols {{ activeAddValues.length }} / {{ allAddValues.length }}
          <span v-if="loadingCols" class="dev-col-badge__spin">⟳</span>
        </div>

        <AgGridVue
          class="ag-grid-glass"
          :columnDefs="columns"
          :rowModelType="'infinite'"
          :datasource="datasource"
          :defaultColDef="defaultColDef"
          :getRowId="getRowId"
          :animateRows="false"
          :localeText="localeText"
          :theme="themeCustom"
          :rowHeight="30"
          :headerHeight="32"
          :suppressMovableColumns="true"
          :rowClassRules="stockRowClassRules.value"
          :maxBlocksInCache="20"
          :cacheBlockSize="ROW_PAGE_SIZE"
          :infiniteInitialRowCount="rowAxis.length || 10"
          :suppressHorizontalScroll="false"
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
import { ref, computed, watch, nextTick, onMounted, toRefs } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import navtools from "@/components/ag-grid/navtools.vue";

// Composables & Utils
import { useSheetApi } from "@/composables/api/useSheetApi";
import { useStockRules } from "@/composables/ag-grid/useStockRules";
import { useAgGridBase, localeText, ackOk, ackErr, msgFromErr, statusFromErr, normalizeAxiosOk, isNumeric, to2, fmtSigned, numOr } from "@/composables/ag-grid/useAgGridBase";
import { useAgGridIncrementalColumns } from "@/composables/ag-grid/useAgGridIncrementalColumns";

import { useAgGridIntegration } from "@/composables/ag-grid/useAgGridIntegration";
import { useAgGridHandlers } from "@/composables/ag-grid/useAgGridHandlers";
import { useAgGridFormulaBar } from "@/composables/ag-grid/useAgGridFormulaBar";
import { useAgGridPivotLoader } from "@/composables/ag-grid/useAgGridPivotLoader";
import { norm, denorm, parseAddEyeFromField, raf } from "@/components/ag-grid/utils/ag-grid-utils";

ModuleRegistry.registerModules([AllCommunityModule]);

const DEV_MODE       = import.meta.env.DEV;
const DEV_DELAY_MS   = DEV_MODE ? 2000 : 0;
const ROW_PAGE_SIZE  = DEV_MODE ? 5 : 30;
const COL_CHUNK_SIZE = DEV_MODE ? 3 : 8;

const LOG      = (...a) => DEV_MODE && console.log("[Progresivo]", ...a);
const LOG_ROWS = (...a) => DEV_MODE && console.log("[Progresivo][Rows]", ...a);

const props = defineProps({
  sheetId: { type: String, required: true },
  sphType: { type: String, default: "base-pos" }, // base-neg | base-pos
  actor:   { type: Object, default: null },
  apiType: { type: String, default: "inventory" },
});

const { getSheet, fetchItems, saveChunk, reseedSheet } = useSheetApi(() => props.apiType);
const { sheetId, sphType } = toRefs(props);

// ─── Integration ─────────────────────────────────────────────────
const integration = useAgGridIntegration({
  sheetId,
  sphType,
  guardKeyPrefix: "progresivo",
  onWsRefresh: () => _refreshCachedRows(),
});

const { gridApi, dirty, saving, lastSavedAt, pendingChanges, gridHistory, unsavedGuard, suppressNextWsRefresh, postMessage } = integration;

// ─── State ───────────────────────────────────────────────────────
const sheetMeta      = ref(null);
const sheetTabs      = ref([]);
const physicalLimits = ref(null);
const switchingView  = ref(false);
const loadingCols    = ref(false);
const rowAxis        = ref([]); 
const allAddValues   = ref([]);
const rowCaches      = new Map();

const rowKey = (bi, bd) => `${to2(bi)}|${to2(bd)}`;
const getRowCache = () => {
  const k = props.sphType;
  if (!rowCaches.has(k)) rowCaches.set(k, new Map());
  return rowCaches.get(k);
};

// ─── Composables ─────────────────────────────────────────────────
const { themeCustom } = useAgGridBase();
const { stockRowClassRules, stockCellClassRules } = useStockRules(sheetMeta);

const colManager = useAgGridIncrementalColumns({
  allValues: allAddValues,
  gridApiRef: gridApi,
  colChunkSize: COL_CHUNK_SIZE,
  scrollThreshold: 150,
  devMode: DEV_MODE,
});
const activeAddValues = colManager.activeValues;

// ─── Límites ─────────────────────────────────────────────────────
const baseViewId = computed(() => String(props.sphType || "").toLowerCase().includes("neg") ? "base-neg" : "base-pos");
const phys = computed(() => {
  const pl = physicalLimits.value || {};
  return { baseMin: numOr(pl?.BASE?.min, -40), baseMax: numOr(pl?.BASE?.max, 40), addMin: numOr(pl?.ADD?.min, 0), addMax: numOr(pl?.ADD?.max, 8) };
});
const sortDirForView = computed(() => baseViewId.value === "base-neg" ? "desc" : "asc");

// ─── Meta computed ───────────────────────────────────────────────
const effectiveActor = computed(() => {
  const src = props.actor || (typeof window !== "undefined" ? window.__currentUser : null) || null;
  if (!src) return null;
  return { userId: src.userId || src.id || src._id || null, name: src.name || src.email || "Usuario" };
});

const totalRows = computed(() => rowAxis.value.length);
const sheetName = computed(() => sheetMeta.value?.nombre || sheetMeta.value?.name || "Hoja progresivo");
const tipoMatriz = computed(() => sheetMeta.value?.tipo_matriz || "BASE_ADD");
const material = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);

const getRowId = (p) => rowKey(p.data.base_izq ?? p.data.base, p.data.base_der ?? p.data.base);

// ─── Data Handlers ───────────────────────────────────────────────
function markChanged(data, field, newValue, _oldValue) {
  const meta = parseAddEyeFromField(field);
  if (!meta) return;
  const a = to2(meta.add);
  const bi = to2(data.base_izq ?? 0);
  const bd = to2(data.base_der ?? 0);
  const key = `${bi}|${bd}|${a}|${meta.eye}`;
  const prev = pendingChanges.value.get(key);
  const oldVal = _oldValue ?? prev?.existencias ?? 0;
  const newVal = Number(newValue ?? 0);

  pendingChanges.value.set(key, { add: a, eye: meta.eye, base_izq: bi, base_der: bd, existencias: newVal });
  dirty.value = true;

  if (!gridHistory.isApplying.value) {
    gridHistory.push({ key, field, oldValue: oldVal, newValue: newVal, meta: { add: a, eye: meta.eye, base_izq: bi, base_der: bd } });
  }
}

const { handleSave, handleDiscard, handleRefresh, handleSeed, handleExport } = useAgGridHandlers({
  props, integration, loadAll, switchViewReload, effectiveActor, sheetName,
});

const { formulaValue, onCellClicked, onCellValueChanged, onFxInput, onFxCommit } = useAgGridFormulaBar({
  gridApi,
  onMarkChanged: (data, field, newVal, oldVal) => markChanged(data, field, newVal, oldVal),
  isEditableField: (field) => field.startsWith("add_"),
});

// ─── Columns ─────────────────────────────────────────────────────
function makeAddLeaf(field, header, add, eye) {
  return {
    field, headerName: header, editable: (p) => !p.data?.__loading,
    filter: "agNumberColumnFilter", minWidth: 90, maxWidth: 110,
    cellClass: ["ag-cell--compact", "ag-cell--numeric"],
    headerClass: ["ag-header-cell--compact"],
    cellClassRules: { ...stockCellClassRules.value, "ag-cell--loading": (p) => !!p.data?.__loading },
    cellRenderer: (p) => p.data?.__loading ? '<span class="skeleton-cell skeleton-cell--add"></span>' : (p.value !== undefined && p.value !== null ? String(p.value) : "0"),
    valueSetter: (p) => {
      if (p.data?.__loading) return false;
      const newVal = isNumeric(p.newValue) ? Number(p.newValue) : 0;
      const oldVal = Number(p.oldValue ?? 0);
      p.data[field] = newVal;
      const rk = rowKey(p.data.base_izq, p.data.base_der);
      const _rc = getRowCache(); if (_rc.has(rk)) _rc.get(rk)[field] = newVal;
      markChanged(p.data, field, newVal, oldVal);
      return true;
    },
  };
}

const columns = computed(() => [
  {
    headerName: "BASE",
    children: [{
      field: "base", headerName: "Base", pinned: "left", width: 120, minWidth: 110, maxWidth: 140, editable: false, sortable: true,
      comparator: (a, b) => Number(a) - Number(b), filter: "agNumberColumnFilter", cellClass: ["ag-cell--compact", "ag-cell--numeric", "ag-cell--pinned"],
      headerClass: ["ag-header-cell--compact", "ag-header-cell--pinned"],
      valueFormatter: (p) => {
        if (p.data?.__loading) return "";
        const bi = Number(p.data?.base_izq), bd = Number(p.data?.base_der);
        return Number.isFinite(bd) && bd !== bi ? `${fmtSigned(bi)} / ${fmtSigned(bd)}` : fmtSigned(bi);
      },
      cellRenderer: (p) => p.data?.__loading ? '<span class="skeleton-cell"></span>' : (p.valueFormatted ?? String(p.value ?? "")),
    }],
  },
  {
    headerName: "ADD (+)",
    children: activeAddValues.value.map(add => ({
      headerName: fmtSigned(Number(add)), marryChildren: true,
      children: ["OD", "OI"].map(eye => makeAddLeaf(`add_${norm(add)}_${eye}`, eye === "OD" ? "Der." : "Izq.", add, eye)),
    })),
  },
]);

const defaultColDef = { resizable: true, sortable: true, filter: "agNumberColumnFilter", floatingFilter: true, editable: true, minWidth: 90, maxWidth: 150, cellClass: "ag-cell--compact", headerClass: "ag-header-cell--compact" };

// ─── Pivot Loader ────────────────────────────────────────────────
const { datasource } = useAgGridPivotLoader({
  baseAxis: rowAxis, getRowCache, fetchItems, sheetId,
  buildFetchQuery: (pageKeys) => { const allBi = pageKeys.map(k => Number(k.split("|")[0])); return { addMin: phys.value.addMin, addMax: phys.value.addMax, baseMin: Math.min(...allBi), baseMax: Math.max(...allBi), limit: 5000 }; },
  normalizeItem: (i) => ({ base_izq: to2(i.base_izq ?? 0), base_der: to2(i.base_der ?? 0), add: to2(i.add), eye: String(i.eye || "OD").toUpperCase(), existencias: Number(i.existencias ?? 0) }),
  buildPivotPage: (pageKeys, items, { loading, pendingChanges }) => {
    const addAll = allAddValues.value; const eyes = ["OD", "OI"];
    if (loading) {
      const nullFields = Object.fromEntries(addAll.flatMap(a => eyes.map(eye => [`add_${norm(a)}_${eye}`, null])));
      return pageKeys.map(rk => { const [bi, bd] = rk.split("|").map(Number); return { base_izq: bi, base_der: bd, base: bi, __loading: true, ...nullFields }; });
    }
    return pageKeys.map(rk => {
      const [bi, bd] = rk.split("|").map(Number); const row = { base_izq: bi, base_der: bd, base: bi };
      const pageItems = items.filter(i => i.base_izq === bi && i.base_der === bd);
      addAll.forEach(add => { eyes.forEach(eye => {
        const field = `add_${norm(add)}_${eye}`;
        const match = pageItems.find(i => i.add === add && i.eye === eye);
        row[field] = match?.existencias ?? 0;
        const pk = `${to2(bi)}|${to2(bd)}|${to2(add)}|${eye}`;
        if (pendingChanges?.has(pk)) row[field] = pendingChanges.get(pk).existencias;
      }); });
      return row;
    });
  },
  gridApi, rowIdGetter: (r) => rowKey(r.base_izq, r.base_der), pendingChanges, DEV_DELAY_MS, LOG_ROWS,
});

// ─── Loaders ─────────────────────────────────────────────────────
async function loadSheetMeta() {
  try {
    const { data } = await getSheet(props.sheetId);
    const payload = data?.data || data;
    sheetMeta.value = payload?.sheet || null;
    sheetTabs.value = Array.isArray(payload?.tabs) ? payload.tabs : [];
    physicalLimits.value = payload?.physicalLimits || payload?.physical_limits || null;
    LOG("loadSheetMeta OK");
  } catch (e) { console.error("[Progresivo] Error getSheet:", e?.response?.data || e); }
}

function _rebuildAxes() {
  const P = phys.value;
  const tab = sheetTabs.value.find(t => t?.id === baseViewId.value) || sheetTabs.value.find(t => t?.id === "base-add") || sheetTabs.value[0] || null;
  const defAddCols = Array.isArray(tab?.axis?.add) ? tab.axis.add.map(to2) : [];
  const defBases   = Array.isArray(tab?.axis?.base) ? tab.axis.base.map(to2) : [];
  allAddValues.value = [...new Set(defAddCols)].filter(a => Number.isFinite(a) && a >= P.addMin && a <= P.addMax).sort((a, b) => a - b);
  const inView = baseViewId.value === "base-neg" ? (b) => Number(b) <= 0 : (b) => Number(b) >= 0;
  const sortDir = sortDirForView.value;
  rowAxis.value = [...new Set(defBases.filter(b => b >= P.baseMin && b <= P.baseMax && inView(b)).map(b => `${to2(b)}|${to2(b)}`))].sort((a, b) => {
    const [abi] = a.split("|").map(Number), [bbi] = b.split("|").map(Number);
    return sortDir === "desc" ? bbi - abi : abi - bbi;
  });
}

async function switchViewReload({ clearCache = true } = {}) {
  switchingView.value = true; await raf();
  try {
    _rebuildAxes();
    if (clearCache) { rowCaches.clear(); colManager.reset(); }
    if (gridApi.value) gridApi.value.setGridOption("datasource", datasource.value);
    if (clearCache) { loadingCols.value = true; await colManager.init(); loadingCols.value = false; } else { colManager.reattach(); }
  } finally { await raf(); switchingView.value = false; }
}

async function loadAll() { await loadSheetMeta(); await switchViewReload(); }

async function _refreshCachedRows() {
  const cache = getRowCache(); if (!cache.size || !gridApi.value) return;
  const pageKeys = [...cache.keys()];
  try {
    const { data } = await fetchItems(props.sheetId, { addMin: phys.value.addMin, addMax: phys.value.addMax, baseMin: Math.min(...pageKeys.map(k => Number(k.split("|")[0]))), baseMax: Math.max(...pageKeys.map(k => Number(k.split("|")[0]))), limit: 5000 });
    const items = (data?.data || []).map(i => ({ base_izq: to2(i.base_izq ?? 0), base_der: to2(i.base_der ?? 0), add: to2(i.add), eye: String(i.eye || "OD").toUpperCase(), existencias: Number(i.existencias ?? 0) }));
    pageKeys.forEach(rk => {
      const row = cache.get(rk); if (!row) return;
      const [bi, bd] = rk.split("|").map(Number);
      items.filter(i => i.base_izq === bi && i.base_der === bd).forEach(i => { row[`add_${norm(i.add)}_${i.eye}`] = i.existencias; });
      const node = gridApi.value?.getRowNode(rk);
      if (node) { node.setData({ ...row }); gridApi.value.refreshCells({ rowNodes: [node], force: true }); }
    });
  } catch (e) { console.error("[Progresivo] _refreshCachedRows error:", e); }
}

function applyGridHistoryOp(op) {
  if (!op) return;
  const value = op.reversed ? op.oldValue : op.newValue;
  const [biStr, bdStr] = op.key.split("|");
  const rk = rowKey(Number(biStr), Number(bdStr));
  const cached = getRowCache().get(rk);
  if (cached) {
    cached[op.field] = value;
    const node = gridApi.value?.getRowNode(rk);
    if (node) { node.setData({ ...cached }); gridApi.value?.refreshCells({ rowNodes: [node], force: true }); }
  }
  pendingChanges.value.set(op.key, { ...op.meta, existencias: value });
  dirty.value = pendingChanges.value.size > 0;
}
const handleGridUndo = () => applyGridHistoryOp(gridHistory.undo());
const handleGridRedo = () => applyGridHistoryOp(gridHistory.redo());

const handleAddRow = async (nuevoValor, ack) => {
  const P = phys.value; const base = to2(nuevoValor);
  if (!Number.isFinite(base)) return ackErr(ack, "Ingresa BASE numérica", 400);
  if (base < P.baseMin || base > P.baseMax) return ackErr(ack, `BASE fuera de límites`, 400);
  if (rowAxis.value.includes(rowKey(base, base))) return ackErr(ack, `BASE ya existe`, 409);
  try {
    const rows = allAddValues.value.flatMap(a => ["OD", "OI"].map(eye => ({ base_izq: base, base_der: base, add: a, eye, existencias: 0 })));
    const res = await saveChunk(props.sheetId, rows, effectiveActor.value);
    const ok = normalizeAxiosOk(res); if (!ok.ok) throw new Error(ok.message);
    ackOk(ack, ok.message || `Fila agregada`, ok.status);
    lastSavedAt.value = new Date(); await loadSheetMeta(); await switchViewReload();
  } catch (e) { ackErr(ack, msgFromErr(e, "Error al agregar fila"), statusFromErr(e) || 500); }
};

const handleAddColumn = async (nuevoValor, ack) => {
  const P = phys.value; const add = to2(nuevoValor);
  if (!Number.isFinite(add)) return ackErr(ack, "Ingresa ADD numérico", 400);
  if (add < P.addMin || add > P.addMax) return ackErr(ack, `ADD fuera de límites`, 400);
  if (allAddValues.value.includes(add)) return ackErr(ack, `ADD ya existe`, 409);
  try {
    const rows = rowAxis.value.flatMap(rk => { const [bi, bd] = rk.split("|").map(Number); return ["OD", "OI"].map(eye => ({ base_izq: bi, base_der: bd, add, eye, existencias: 0 })); });
    const res = await saveChunk(props.sheetId, rows, effectiveActor.value);
    const ok = normalizeAxiosOk(res); if (!ok.ok) throw new Error(ok.message);
    ackOk(ack, ok.message || `Columna agregada`, ok.status);
    lastSavedAt.value = new Date(); await loadSheetMeta(); await switchViewReload();
  } catch (e) { ackErr(ack, msgFromErr(e, "Error al agregar columna"), statusFromErr(e) || 500); }
};

const onGridReady = async (p) => {
  gridApi.value = p.api; p.api.setGridOption("datasource", datasource.value);
  await nextTick(); resetSort(); colManager.reattach();
};

const clearFilters = () => { if (!gridApi.value) return; gridApi.value.setGridOption("filterModel", null); };
const resetSort = () => { if (!gridApi.value) return; gridApi.value.applyColumnState({ defaultState: { sort: null }, state: [{ colId: "base", sort: sortDirForView.value }] }); };
const handleToggleFilters = () => clearFilters();

onMounted(async () => { await loadAll(); unsavedGuard.restore(); });
watch(() => props.sphType, async () => {
  if (dirty.value && pendingChanges.value.size > 0) unsavedGuard.persist();
  pendingChanges.value.clear(); dirty.value = false; gridHistory.clear();
  await switchViewReload({ clearCache: false }); unsavedGuard.restore();
});
</script>

<style scoped>
@import "@/components/ag-grid/templates/AgGridBase.css";
</style>
