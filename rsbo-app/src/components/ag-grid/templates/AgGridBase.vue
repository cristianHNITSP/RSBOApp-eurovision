<!-- ============================================================
  AgGridBase.vue  —  Matriz BASE × Existencias

  FILAS:  rowModelType="infinite" — BASE axis paginado.
          Actualmente pocas filas, pero si en el futuro se agregan
          hasta ±40 D en pasos de 0.25 (321 valores) el modelo ya
          escala sin cambios.
  CACHÉ:  rowCache Map<base_string, rowObj>
  CSS:    Glassmorphism / No-Line Rule — misma familia que el resto.
  ============================================================ -->
<template>
  <div class="grid-page" :class="{ 'is-fullscreen': isFullscreen, 'ag-grid-fullscreen-container': isFullscreen }" ref="gridPageRef">
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
        :is-fullscreen="isFullscreen"
        :internal-tabs="internalTabs"
        :active-internal-tab="sphType"
        @toggle-fullscreen="toggleFullscreen(gridPageRef)"
        @update:internal="$emit('update:internal', $event)"
        @add-row="handleAddRow"
        @toggle-filters="handleToggleFilters"
        @clear-filters="clearFilters"
        @reset-sort="resetSort"
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
      <div
        class="glass-shell"
        :class="{ 'glass-shell--switching': switchingView }"
      >
        <div v-if="loadingRowsCount > 0 || DEV_MODE" class="grid-status-overlay">
          <!-- CARGA DE FILAS - OCULTO POR REQUERIMIENTO. IMPORTANTE: NO BORRAR ESTE BLOQUE, ES ÚTIL PARA DEBUGGING FUTURO -->
          <!--
          <div class="status-badge status-badge--rows">
            <span class="status-badge__icon" :class="{ 'is-spinning': loadingRowsCount > 0 }">⟳</span>
            <span class="status-badge__text">
              Filas: {{ rowsInCacheCount }} / {{ baseAxis.length }}
              <template v-if="loadingRowsCount > 0"> (cargando {{ loadingRowsCount }}...)</template>
            </span>
          </div>
          -->
        </div>

        <Transition name="veil">
          <div v-if="showVeil" class="grid-loading-veil">
            <div class="grid-loading-veil__spinner"></div>
            <span class="grid-loading-veil__label">Cargando planilla…</span>
          </div>
        </Transition>

        <AgGridVue
          v-if="sheetMeta"
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
          :infiniteInitialRowCount="baseAxis.length || 10"
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
import { ref, computed, watch, nextTick, onMounted, onActivated, toRefs } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import navtools from "@/components/ag-grid/navtools.vue";

// Composables & Utils
import { useSheetApi } from "@/composables/api/useSheetApi";
import { useStockRules } from "@/composables/ag-grid/useStockRules";
import { useAgGridBase, localeText, ackOk, ackErr, msgFromErr, statusFromErr, normalizeAxiosOk, numOr, isNumeric, to2, fmtSigned, isMultipleOfStep } from "@/composables/ag-grid/useAgGridBase";

import { useAgGridIntegration } from "@/composables/ag-grid/useAgGridIntegration";
import { useGridKeyboardShortcuts } from "@/composables/ag-grid/useGridKeyboardShortcuts";
import { useAgGridHandlers } from "@/composables/ag-grid/useAgGridHandlers";
import { useAgGridFormulaBar } from "@/composables/ag-grid/useAgGridFormulaBar";
import { useAgGridPivotLoader } from "@/composables/ag-grid/useAgGridPivotLoader";
import { raf } from "@/components/ag-grid/utils/ag-grid-utils";

ModuleRegistry.registerModules([AllCommunityModule]);

const DEV_MODE      = import.meta.env.DEV;
const DEV_DELAY_MS  = 0;
const ROW_PAGE_SIZE  = DEV_MODE ? 4 : 25;

const LOG      = (...a) => DEV_MODE && console.log("[Base]", ...a);
const LOG_ROWS = (...a) => DEV_MODE && console.log("[Base][Rows]", ...a);

const props = defineProps({
  sheetId: { type: String, required: true },
  sphType: { type: String, default: "base-pos" }, // base-neg | base-pos
  actor:   { type: Object, default: null },
  apiType: { type: String, default: "inventory" },
});

defineEmits(["update:internal"]);

const { getSheet, fetchItems, saveChunk, reseedSheet } = useSheetApi(() => props.apiType);

const BASE_STEP = 0.25;
const { sheetId, sphType } = toRefs(props);

// ─── Integration ─────────────────────────────────────────────────
const integration = useAgGridIntegration({
  sheetId,
  sphType,
  guardKeyPrefix: "base",
  onWsRefresh: () => _refreshCachedRows(),
});

const { gridApi, dirty, saving, lastSavedAt, switchingView, pendingChanges, gridHistory, unsavedGuard, suppressNextWsRefresh, postMessage } = integration;

const gridPageRef = ref(null);

// ─── State ───────────────────────────────────────────────────────
const sheetMeta      = ref(null);
const sheetTabs      = ref([]);
const physicalLimits = ref(null);
const baseAxis       = ref([]);
const rowCaches      = new Map();
const showVeil       = ref(true);

const getRowCache = () => {
  const k = props.sphType;
  if (!rowCaches.has(k)) rowCaches.set(k, new Map());
  return rowCaches.get(k);
};

// ─── Composables ─────────────────────────────────────────────────
const { themeCustom, isFullscreen, toggleFullscreen } = useAgGridBase();
const { stockRowClassRules, stockCellClassRules } = useStockRules(sheetMeta);

// ─── Meta computed ───────────────────────────────────────────────
const effectiveActor = computed(() => {
  const src = props.actor || (typeof window !== "undefined" ? window.__currentUser : null) || null;
  if (!src) return null;
  return { userId: src.userId || src.id || src._id || null, name: src.name || src.username || "Usuario" };
});

const totalRows = computed(() => baseAxis.value.length);
const sheetName = computed(() => sheetMeta.value?.nombre || sheetMeta.value?.name || "Hoja BASE");
const tipoMatriz = computed(() => sheetMeta.value?.tipo_matriz || "BASE");
const material = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);

const internalTabs = computed(() => {
  const t = tipoMatriz.value;
  if (t === "BASE") {
    return [
      { id: "base-neg", label: "BASE (-)" },
      { id: "base-pos", label: "BASE (+)" }
    ];
  }
  return [];
});

const phys = computed(() => {
  const pl = physicalLimits.value || {};
  return {
    baseMin: to2(numOr(pl?.BASE?.min, -40)),
    baseMax: to2(numOr(pl?.BASE?.max,  40)),
  };
});

const baseViewId = computed(() => String(props.sphType || "").toLowerCase().includes("neg") ? "base-neg" : "base-pos");
const baseFilterDisplay = computed(() => baseViewId.value === "base-neg" ? (n) => Number(n) <= 0 : (n) => Number(n) >= 0);
const baseFilterNewRow = computed(() => baseViewId.value === "base-neg" ? (n) => Number(n) < 0 : (n) => Number(n) >= 0);
const sortDirForView = computed(() => baseViewId.value === "base-neg" ? "desc" : "asc");

const getRowId = (p) => String(to2(p.data.base));

// ─── Data Handlers ───────────────────────────────────────────────
function markChanged(data, field, newValue, _oldValue) {
  const base = data.base;
  const b = to2(base);
  const key = String(b);
  const prev = pendingChanges.value.get(key);
  const oldVal = _oldValue ?? prev?.existencias ?? 0;
  const newVal = Number(newValue ?? 0);
  const baseline = prev?.baseline ?? Number(oldVal ?? 0);

  pendingChanges.value.set(key, { base: b, existencias: newVal, baseline });
  dirty.value = true;

  if (!gridHistory.isApplying.value) {
    gridHistory.push({ key, field: "existencias", oldValue: oldVal, newValue: newVal, meta: { base: b } });
  }
}

const { handleSave, handleDiscard, handleRefresh, handleSeed, handleExport } = useAgGridHandlers({
  props, integration, loadAll, switchViewReload, effectiveActor, sheetName,
});

const { formulaValue, onCellClicked, onCellValueChanged, onFxInput, onFxCommit } = useAgGridFormulaBar({
  gridApi,
  onMarkChanged: (data, field, newVal, oldVal) => markChanged(data, field, newVal, oldVal),
  isEditableField: (field) => field === "existencias",
});

// ─── Columns ─────────────────────────────────────────────────────
const columns = computed(() => [
  {
    headerName: "BASE",
    children: [{
      field: "base", headerName: "Base", pinned: "left", width: 140, minWidth: 130, maxWidth: 170,
      editable: false, sortable: false,
      filter: false, resizable: false,
      cellClass: ["ag-cell--compact", "ag-cell--numeric", "ag-cell--pinned"],
      headerClass: ["ag-header-cell--compact", "ag-header-cell--pinned"],
      valueFormatter: (p) => { if (p.data?.__loading) return ""; return fmtSigned(p.value); },
      cellRenderer: (p) => p.data?.__loading ? '<span class="skeleton-cell"></span>' : (p.valueFormatted ?? String(p.value ?? "")),
    }],
  },
  {
    headerName: "EXISTENCIAS",
    children: [{
      field: "existencias", headerName: "Stock", editable: (p) => !p.data?.__loading,
      minWidth: 110, maxWidth: 140, filter: false,
      cellClass: ["ag-cell--compact", "ag-cell--numeric"],
      headerClass: ["ag-header-cell--compact"],
      cellClassRules: { ...stockCellClassRules.value, "ag-cell--loading": (p) => !!p.data?.__loading },
      cellRenderer: (p) => p.data?.__loading ? '<span class="skeleton-cell skeleton-cell--stock"></span>' : (p.value !== undefined && p.value !== null ? String(p.value) : "0"),
      valueSetter: (p) => {
        if (p.data?.__loading) return false;
        const raw = String(p.newValue ?? "").trim();
        const newVal = isNumeric(raw) ? Number(raw) : 0;
        const oldVal = Number(p.oldValue ?? 0);
        p.data.existencias = newVal;
        const key = String(to2(p.data.base));
        const _rc = getRowCache(); if (_rc.has(key)) _rc.get(key).existencias = newVal;
        markChanged(p.data, "existencias", newVal, oldVal);
        return true;
      },
    }],
  },
]);

const defaultColDef = { resizable: true, sortable: false, filter: false, floatingFilter: false, editable: true, minWidth: 90, maxWidth: 150, cellClass: "ag-cell--compact", headerClass: "ag-header-cell--compact" };

// ─── Pivot Loader ────────────────────────────────────────────────
const { datasource, loadingRowsCount, rowsInCacheCount } = useAgGridPivotLoader({
  baseAxis, getRowCache, fetchItems, sheetId, viewId: sphType,
  buildFetchQuery: (pageBases) => ({ baseMin: Math.min(...pageBases), baseMax: Math.max(...pageBases), limit: 5000 }),
  normalizeItem: (i) => ({ base: to2(i.base), existencias: Number(i.existencias ?? 0) }),
  buildPivotPage: (pageBases, items, { loading, pendingChanges }) => {
    if (loading) return pageBases.map(base => ({ base, existencias: null, __loading: true }));
    const map = new Map(items.map(i => [String(to2(i.base)), i.existencias]));
    return pageBases.map(base => {
      const key = String(to2(base));
      const row = { base, existencias: map.get(key) ?? 0 };
      if (pendingChanges?.has(key)) row.existencias = pendingChanges.get(key).existencias;
      return row;
    });
  },
  gridApi, rowIdGetter: (r) => String(to2(r.base)), pendingChanges, DEV_DELAY_MS, LOG_ROWS,
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
  } catch (e) { console.error("[Base] Error getSheet:", e?.response?.data || e); }
}

function _rebuildAxis() {
  const P = phys.value;
  const tab = sheetTabs.value.find(t => t?.id === baseViewId.value) || sheetTabs.value.find(t => String(t?.id || "").includes("base")) || null;
  const backendAxis = Array.isArray(tab?.axis?.base) ? tab.axis.base : [];
  baseAxis.value = [...new Set(backendAxis.map(to2))].filter(b => Number.isFinite(b) && b >= P.baseMin && b <= P.baseMax && baseFilterDisplay.value(b)).sort((a, b) => sortDirForView.value === "desc" ? b - a : a - b);
}

async function switchViewReload({ clearCache = true } = {}) {
  integration.switchingView.value = true;
  _rebuildAxis();
  if (clearCache) rowCaches.clear();
  await raf();
  try {
    if (gridApi.value) gridApi.value.setGridOption("datasource", datasource.value);
  } finally { await raf(); integration.switchingView.value = false; }
}

async function loadAll() { try { await loadSheetMeta(); await switchViewReload(); } finally { showVeil.value = false; } }

async function _refreshCachedRows() {
  const cache = getRowCache();
  if (!cache.size || !gridApi.value) return;
  const bases = [...cache.keys()].map(k => to2(Number(k)));
  try {
    const { data } = await fetchItems(props.sheetId, { baseMin: Math.min(...bases), baseMax: Math.max(...bases), limit: 5000 });
    const items = (data?.data || []).map(i => ({ base: to2(i.base), existencias: Number(i.existencias ?? 0) }));
    const map = new Map(items.map(i => [String(to2(i.base)), i.existencias]));
    bases.forEach(base => {
      const key = String(to2(base));
      const row = cache.get(key);
      if (!row) return;
      row.existencias = map.get(key) ?? row.existencias;
      const node = gridApi.value?.getRowNode(key);
      if (node) { node.setData({ ...row }); gridApi.value.refreshCells({ rowNodes: [node], force: true }); }
    });
  } catch (e) { console.error("[Base] _refreshCachedRows error:", e); }
}

function applyGridHistoryOp(op) {
  if (!op) return;
  const value = op.reversed ? op.oldValue : op.newValue;
  const base = to2(Number(op.key));
  const key = String(base);
  const cached = getRowCache().get(key);
  if (cached) {
    cached.existencias = value;
    const node = gridApi.value?.getRowNode(key);
    if (node) { node.setData({ ...cached }); gridApi.value?.refreshCells({ rowNodes: [node], force: true }); }
  }
  const prev = pendingChanges.value.get(key);
  const baseline = prev?.baseline ?? Number(op.oldValue ?? 0);
  pendingChanges.value.set(key, { base, existencias: value, baseline });
  dirty.value = pendingChanges.value.size > 0;
}
const handleGridUndo = () => applyGridHistoryOp(gridHistory.undo());
const handleGridRedo = () => applyGridHistoryOp(gridHistory.redo());

useGridKeyboardShortcuts({
  onSave: handleSave,
  onUndo: handleGridUndo,
  onRedo: handleGridRedo,
  gridApi: gridApi,
  dirty: dirty,
  canUndo: gridHistory.canUndo,
  canRedo: gridHistory.canRedo,
  isActive: () => gridPageRef.value && gridPageRef.value.offsetParent !== null
});

const handleAddRow = async (nuevoValor, ack) => {
  const P = phys.value; const base = to2(nuevoValor);
  if (!Number.isFinite(base)) return ackErr(ack, "Ingresa BASE numérica", 400);
  if (!isMultipleOfStep(base, BASE_STEP)) return ackErr(ack, `BASE debe ser múltiplo de 0.25 D`, 400);
  if (base < P.baseMin || base > P.baseMax) return ackErr(ack, `BASE fuera de límites`, 400);
  if (!baseFilterNewRow.value(base)) return ackErr(ack, baseViewId.value === "base-neg" ? "Debe ser negativa" : "Debe ser 0 o positiva", 400);
  if (baseAxis.value.includes(base)) return ackErr(ack, `Ya existe`, 409);
  try {
    const res = await saveChunk(props.sheetId, [{ base, existencias: 0 }], effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) throw new Error(ok.message);
    ackOk(ack, ok.message || `Fila agregada`, ok.status);
    lastSavedAt.value = new Date();
    await loadAll();
  } catch (e) { ackErr(ack, msgFromErr(e, "Error al guardar"), statusFromErr(e) || 500); }
};

const onGridReady = async (p) => {
  gridApi.value = p.api;
  p.api.setGridOption("datasource", datasource.value);
  await nextTick();
  resetSort();
};

const clearFilters = () => { if (!gridApi.value) return; gridApi.value.setGridOption("filterModel", null); };
const resetSort = () => { if (!gridApi.value) return; gridApi.value.applyColumnState({ defaultState: { sort: null }, state: [{ colId: "base", sort: sortDirForView.value }] }); };
const handleToggleFilters = () => clearFilters();

let _hasMounted = false;
onMounted(async () => { await loadAll(); unsavedGuard.restore(); _hasMounted = true; });
onActivated(() => { if (_hasMounted) unsavedGuard.restore(); });
watch(() => props.sphType, async () => {
  if (dirty.value && pendingChanges.value.size > 0) unsavedGuard.persist();
  pendingChanges.value.clear(); dirty.value = false; gridHistory.clear();
  showVeil.value = true;
  try { await switchViewReload({ clearCache: false }); } finally { showVeil.value = false; }
  unsavedGuard.restore();
});
</script>

<style scoped>
@import "@/components/ag-grid/templates/AgGridBase.css";
</style>
