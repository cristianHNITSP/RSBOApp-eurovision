<!-- ============================================================
  AgGridBifocal.vue  —  Matriz SPH × ADD (OD/OI)

  FILAS:     rowModelType="infinite" — SPH axis paginado
  COLUMNAS:  useAgGridIncrementalColumns — ADD values × OD/OI
  CACHÉ:     rowCache Map<sph, rowObj> con TODOS los ADD values
             → agregar columnas NO reinvoca getRows (anti-colisión)
  ============================================================ -->
<template>
  <div class="grid-page" :class="{ 'is-fullscreen': isFullscreen, 'ag-grid-fullscreen-container': isFullscreen }" ref="gridPageRef">
    <header class="grid-topbar">
      <navtools class="navtools-wrap" v-model="formulaValue" :dirty="dirty" :saving="saving" :total-rows="totalRows"
        :sheet-name="sheetName" :tipo-matriz="tipoMatriz" :material="material" :tratamientos="tratamientos"
        :last-saved-at="lastSavedAt" :grid-can-undo="gridHistory.canUndo.value"
        :grid-can-redo="gridHistory.canRedo.value" :is-fullscreen="isFullscreen" :internal-tabs="internalTabs"
        :active-internal-tab="sphType" @toggle-fullscreen="toggleFullscreen(gridPageRef)"
        @update:internal="$emit('update:internal', $event)" @add-row="handleAddRow" @add-column="handleAddColumn"
        @toggle-filters="handleToggleFilters" @save-request="handleSave" @discard-changes="handleDiscard"
        @refresh="handleRefresh" @seed="handleSeed" @export="handleExport" @fx-input="onFxInput" @fx-commit="onFxCommit"
        @grid-undo="handleGridUndo" @grid-redo="handleGridRedo" />
    </header>

    <main class="grid-main">
      <div class="glass-shell" :class="{ 'glass-shell--switching': switchingView }">
        <div v-if="loadingCols || loadingRowsCount > 0 || DEV_MODE" class="grid-status-overlay">
          <!-- CARGA DE COLUMNAS - OCULTO POR REQUERIMIENTO. IMPORTANTE: NO BORRAR ESTE BLOQUE, ES ÚTIL PARA DEBUGGING FUTURO -->
          <!--
          <div class="status-badge status-badge--cols">
            <span class="status-badge__icon" :class="{ 'is-spinning': loadingCols }">⟳</span>
            <span class="status-badge__text">
              Columnas: {{ activeAddValues.length }} / {{ allAddValues.length }}
            </span>
          </div>
          -->
          <!-- CARGA DE FILAS - OCULTO POR REQUERIMIENTO. IMPORTANTE: NO BORRAR ESTE BLOQUE, ES ÚTIL PARA DEBUGGING FUTURO -->
          <!--
          <div class="status-badge status-badge--rows">
            <span class="status-badge__icon" :class="{ 'is-spinning': loadingRowsCount > 0 }">⟳</span>
            <span class="status-badge__text">
              Filas: {{ rowsInCacheCount }} / {{ sphAxis.length }}
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

        <AgGridVue v-if="sheetMeta" class="ag-grid-glass" :columnDefs="columns" :rowModelType="'infinite'"
          :datasource="datasource" :defaultColDef="defaultColDef" :getRowId="getRowId" :animateRows="false"
          :localeText="localeText" :theme="themeCustom" :rowHeight="30" :headerHeight="32"
          :suppressMovableColumns="true" :rowClassRules="stockRowClassRules.value" :maxBlocksInCache="20"
          :cacheBlockSize="ROW_PAGE_SIZE" :infiniteInitialRowCount="sphAxis.length || 10"
          :suppressHorizontalScroll="false" @cellClicked="onCellClicked" @cellValueChanged="onCellValueChanged"
          @grid-ready="onGridReady" style="width: 100%; height: 100%;" />
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
import { useAgGridBase, localeText, ackOk, ackErr, msgFromErr, statusFromErr, normalizeAxiosOk, isNumeric, to2, fmtSigned } from "@/composables/ag-grid/useAgGridBase";
import { useAgGridIncrementalColumns } from "@/composables/ag-grid/useAgGridIncrementalColumns";

import { useAgGridIntegration } from "@/composables/ag-grid/useAgGridIntegration";
import { useAgGridHandlers } from "@/composables/ag-grid/useAgGridHandlers";
import { useAgGridFormulaBar } from "@/composables/ag-grid/useAgGridFormulaBar";
import { useAgGridPivotLoader } from "@/composables/ag-grid/useAgGridPivotLoader";
import { norm, denorm, parseAddEyeFromField, raf } from "@/components/ag-grid/utils/ag-grid-utils";

ModuleRegistry.registerModules([AllCommunityModule]);

const DEV_MODE = import.meta.env.DEV;
const DEV_DELAY_MS = 0;
const ROW_PAGE_SIZE = DEV_MODE ? 4 : 10;
const COL_CHUNK_SIZE = DEV_MODE ? 3 : 8;

const LOG = (...a) => DEV_MODE && console.log("[Bifocal]", ...a);
const LOG_ROWS = (...a) => DEV_MODE && console.log("[Bifocal][Rows]", ...a);

const props = defineProps({
  sheetId: { type: String, required: true },
  sphType: { type: String, default: "sph-neg" },
  actor: { type: Object, default: null },
  apiType: { type: String, default: "inventory" },
});

defineEmits(["update:internal"]);

const { getSheet, fetchItems, saveChunk, reseedSheet } = useSheetApi(() => props.apiType);
const { sheetId, sphType } = toRefs(props);

// ─── Integration ─────────────────────────────────────────────────
const integration = useAgGridIntegration({
  sheetId,
  sphType,
  guardKeyPrefix: "bifocal",
  onWsRefresh: () => _refreshCachedRows(),
});

const { gridApi, dirty, saving, lastSavedAt, switchingView, pendingChanges, gridHistory, unsavedGuard, suppressNextWsRefresh, postMessage } = integration;

const gridPageRef = ref(null);

// ─── State ───────────────────────────────────────────────────────
const sheetMeta = ref(null);
const sheetTabs = ref([]);
const physical = ref(null);
const sphAxis = ref([]);
const allAddValues = ref([]);
const rowCaches = new Map();
const showVeil = ref(true);

const getRowCache = () => {
  const k = props.sphType;
  if (!rowCaches.has(k)) rowCaches.set(k, new Map());
  return rowCaches.get(k);
};

// ─── Composables ─────────────────────────────────────────────────
const { themeCustom, isFullscreen, toggleFullscreen } = useAgGridBase();
const { stockRowClassRules, stockCellClassRules } = useStockRules(sheetMeta);

const colManager = useAgGridIncrementalColumns({
  allValues: allAddValues,
  gridApiRef: gridApi,
  colChunkSize: COL_CHUNK_SIZE,
  scrollThreshold: 150,
  devMode: DEV_MODE,
});
const { activeValues: activeAddValues, loading: loadingCols } = colManager;

// ─── Límites ─────────────────────────────────────────────────────
const PHYS = computed(() => {
  const p = physical.value || {};
  return { SPH: p.SPH || { min: -40, max: 40 }, ADD: p.ADD || { min: 0, max: 8 } };
});

// ─── Meta computed ───────────────────────────────────────────────
const effectiveActor = computed(() => {
  const src = props.actor || (typeof window !== "undefined" ? window.__currentUser : null) || null;
  if (!src) return null;
  return { userId: src.userId || src.id || src._id || null, name: src.name || src.email || "Usuario" };
});

const totalRows = computed(() => sphAxis.value.length);
const sheetName = computed(() => sheetMeta.value?.nombre || sheetMeta.value?.name || "Hoja bifocal");
const tipoMatriz = computed(() => sheetMeta.value?.tipo_matriz || "SPH_ADD");
const material = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);

const internalTabs = computed(() => {
  const t = tipoMatriz.value;
  if (t === "SPH_ADD") {
    return [
      { id: "sph-neg", label: "SPH (-)" },
      { id: "sph-pos", label: "SPH (+)" }
    ];
  }
  return [];
});

const getRowId = (p) => String(to2(p.data.sph));

// ─── Data Handlers ───────────────────────────────────────────────
function markChanged(data, field, newValue, _oldValue) {
  const meta = parseAddEyeFromField(field);
  if (!meta) return;
  const s = to2(data.sph);
  const a = to2(meta.add);
  const e = String(meta.eye).toUpperCase();
  const key = `${s}|${a}|${e}`;
  const prev = pendingChanges.value.get(key);
  const oldVal = _oldValue ?? prev?.existencias ?? 0;
  const newVal = Number(newValue ?? 0);

  pendingChanges.value.set(key, { sph: s, add: a, eye: e, base_izq: to2(data.base_izq ?? 0), base_der: to2(data.base_der ?? 0), existencias: newVal });
  dirty.value = true;

  if (!gridHistory.isApplying.value) {
    gridHistory.push({ key, field, oldValue: oldVal, newValue: newVal, meta: { sph: s, add: a, eye: e, base_izq: to2(data.base_izq ?? 0), base_der: to2(data.base_der ?? 0) } });
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
    filter: false, minWidth: 90, maxWidth: 120,
    cellClass: ["ag-cell--compact", "ag-cell--numeric"],
    headerClass: ["ag-header-cell--compact"],
    cellClassRules: { ...stockCellClassRules.value, "ag-cell--loading": (p) => !!p.data?.__loading },
    cellRenderer: (p) => p.data?.__loading ? '<span class="skeleton-cell skeleton-cell--add"></span>' : (p.value !== undefined && p.value !== null ? String(p.value) : "0"),
    valueSetter: (p) => {
      if (p.data?.__loading) return false;
      const raw = String(p.newValue ?? "").trim();
      const newVal = isNumeric(raw) ? Number(raw) : 0;
      const oldVal = Number(p.oldValue ?? 0);
      p.data[field] = newVal;
      const _rc = getRowCache(); const _k = String(to2(p.data.sph)); if (_rc.has(_k)) _rc.get(_k)[field] = newVal;
      markChanged(p.data, field, newVal, oldVal);
      return true;
    },
  };
}

const columns = computed(() => {
  const neg = props.sphType === "sph-neg";
  return [
    {
      headerName: neg ? "SPH (-)" : "SPH (+)",
      children: [{
        field: "sph", headerName: "SPH", pinned: "left", width: 90, minWidth: 86, maxWidth: 96,
        editable: false, sortable: false,
        filter: false, cellClass: ["ag-cell--compact", "ag-cell--numeric", "ag-cell--pinned"],
        headerClass: ["ag-header-cell--compact", "ag-header-cell--pinned"],
        valueFormatter: (p) => { if (p.data?.__loading) return ""; const v = Number(p.value); return Number.isFinite(v) ? v.toFixed(2) : p.value ?? ""; },
        cellRenderer: (p) => p.data?.__loading ? '<span class="skeleton-cell"></span>' : (p.valueFormatted ?? String(p.value ?? "")),
      }],
    },
    {
      headerName: "ADD (+)",
      children: activeAddValues.value.map(a => ({
        headerName: fmtSigned(a), marryChildren: true,
        children: [makeAddLeaf(`add_${norm(a)}_OD`, "Der.", a, "OD"), makeAddLeaf(`add_${norm(a)}_OI`, "Izq.", a, "OI")],
      })),
    },
  ];
});

const defaultColDef = { resizable: true, sortable: false, filter: false, floatingFilter: false, editable: true, minWidth: 90, maxWidth: 160, cellClass: "ag-cell--compact", headerClass: "ag-header-cell--compact" };

// ─── Pivot Loader ────────────────────────────────────────────────
const { datasource, loadingRowsCount, rowsInCacheCount } = useAgGridPivotLoader({
  baseAxis: sphAxis, getRowCache, fetchItems, sheetId, viewId: sphType,
  buildFetchQuery: (pageSphs) => ({ sphMin: Math.min(...pageSphs), sphMax: Math.max(...pageSphs), addMin: PHYS.value.ADD.min, addMax: PHYS.value.ADD.max, eyes: "OD,OI", limit: 5000 }),
  normalizeItem: (i) => ({ sph: to2(i.sph), add: to2(i.add), eye: String(i.eye || "OD").toUpperCase(), base_izq: to2(i.base_izq ?? 0), base_der: to2(i.base_der ?? 0), existencias: Number(i.existencias ?? 0) }),
  buildPivotPage: (pageSphs, items, { loading, pendingChanges }) => {
    const addAll = allAddValues.value;
    const eyes = ["OD", "OI"];
    if (loading) {
      const nullFields = Object.fromEntries(addAll.flatMap(a => [`add_${norm(a)}_OD`, `add_${norm(a)}_OI`].map(f => [f, null])));
      return pageSphs.map(sph => ({ sph, base_izq: 0, base_der: 0, __loading: true, ...nullFields }));
    }
    return pageSphs.map(sph => {
      const sphItems = items.filter(i => i.sph === sph);
      const row = { sph, base_izq: to2(sphItems[0]?.base_izq ?? 0), base_der: to2(sphItems[0]?.base_der ?? 0) };
      addAll.forEach(add => {
        eyes.forEach(eye => {
          const field = `add_${norm(add)}_${eye}`;
          const match = sphItems.find(i => i.add === add && i.eye === eye);
          row[field] = match?.existencias ?? 0;
          const pk = `${to2(sph)}|${to2(add)}|${eye}`;
          if (pendingChanges?.has(pk)) row[field] = pendingChanges.get(pk).existencias;
        });
      });
      return row;
    });
  },
  gridApi, rowIdGetter: (r) => String(to2(r.sph)), pendingChanges, DEV_DELAY_MS, LOG_ROWS,
});

// ─── Loaders ─────────────────────────────────────────────────────
async function loadSheetMeta() {
  try {
    const { data } = await getSheet(props.sheetId);
    const payload = data?.data || data;
    sheetMeta.value = payload?.sheet || null;
    sheetTabs.value = Array.isArray(payload?.tabs) ? payload.tabs : [];
    physical.value = payload?.physicalLimits || null;
    LOG("loadSheetMeta OK");
  } catch (e) { console.error("[Bifocal] Error getSheet:", e?.response?.data || e); }
}

function _rebuildAxes() {
  const P = PHYS.value; const isNeg = props.sphType === "sph-neg";
  const tab = (sheetTabs.value || []).find(t => t?.id === props.sphType) || (sheetTabs.value || []).find(t => String(t?.id || "").includes("sph")) || null;
  const backendSph = Array.isArray(tab?.axis?.sph) ? tab.axis.sph : [];
  const backendAdd = Array.isArray(tab?.axis?.add) ? tab.axis.add : [];
  sphAxis.value = [...new Set(backendSph.map(to2))].filter(s => Number.isFinite(s) && s >= P.SPH.min && s <= P.SPH.max && (isNeg ? s <= 0 : s >= 0)).sort((a, b) => isNeg ? b - a : a - b);
  allAddValues.value = [...new Set(backendAdd.map(to2))].filter(a => Number.isFinite(a) && a >= P.ADD.min && a <= P.ADD.max).sort((a, b) => a - b);
}

async function switchViewReload({ clearCache = true } = {}) {
  switchingView.value = true;
  _rebuildAxes();
  if (clearCache) { rowCaches.clear(); colManager.reset(); }
  await raf();
  try {
    if (gridApi.value) gridApi.value.setGridOption("datasource", datasource.value);
    if (clearCache) { await colManager.init(); } else { colManager.reattach(); }
  } finally { await raf(); switchingView.value = false; }
}

async function loadAll() { try { await loadSheetMeta(); await switchViewReload(); } finally { showVeil.value = false; } }

async function _refreshCachedRows() {
  const cache = getRowCache(); if (!cache.size || !gridApi.value) return;
  const pageSphs = [...cache.keys()].map(k => to2(Number(k)));
  try {
    const { data } = await fetchItems(props.sheetId, { sphMin: Math.min(...pageSphs), sphMax: Math.max(...pageSphs), addMin: PHYS.value.ADD.min, addMax: PHYS.value.ADD.max, eyes: "OD,OI", limit: 5000 });
    const items = (data?.data || []).map(i => ({ sph: to2(i.sph), add: to2(i.add), eye: String(i.eye || "OD").toUpperCase(), existencias: Number(i.existencias ?? 0) }));
    pageSphs.forEach(sph => {
      const key = String(sph);
      const row = cache.get(key); if (!row) return;
      items.filter(i => i.sph === sph).forEach(i => { row[`add_${norm(i.add)}_${i.eye}`] = i.existencias; });
      const node = gridApi.value?.getRowNode(key);
      if (node) { node.setData({ ...row }); gridApi.value.refreshCells({ rowNodes: [node], force: true }); }
    });
  } catch (e) { console.error("[Bifocal] _refreshCachedRows error:", e); }
}

function applyGridHistoryOp(op) {
  if (!op) return;
  const value = op.reversed ? op.oldValue : op.newValue;
  const [sphStr] = op.key.split("|");
  const sph = to2(Number(sphStr));
  const cached = getRowCache().get(String(sph));
  if (cached) {
    cached[op.field] = value;
    const node = gridApi.value?.getRowNode(String(sph));
    if (node) { node.setData({ ...cached }); gridApi.value?.refreshCells({ rowNodes: [node], force: true }); }
  }
  pendingChanges.value.set(op.key, { ...op.meta, existencias: value });
  dirty.value = pendingChanges.value.size > 0;
}
const handleGridUndo = () => applyGridHistoryOp(gridHistory.undo());
const handleGridRedo = () => applyGridHistoryOp(gridHistory.redo());

const handleAddRow = async (nuevoValor, ack) => {
  const P = PHYS.value; const sph = to2(nuevoValor);
  if (!Number.isFinite(sph)) return ackErr(ack, "Ingresa SPH numérico", 400);
  if (sph < P.SPH.min || sph > P.SPH.max) return ackErr(ack, `SPH fuera de límites`, 400);
  if (sphAxis.value.includes(sph)) return ackErr(ack, `SPH ${fmtSigned(sph)} ya existe`, 409);
  try {
    const rows = allAddValues.value.flatMap(a => [{ sph, add: a, eye: "OD", existencias: 0 }, { sph, add: a, eye: "OI", existencias: 0 }]);
    const res = await saveChunk(props.sheetId, rows, effectiveActor.value);
    const ok = normalizeAxiosOk(res); if (!ok.ok) throw new Error(ok.message);
    ackOk(ack, ok.message || `Fila agregada`, ok.status);
    lastSavedAt.value = new Date(); await loadSheetMeta(); await switchViewReload();
  } catch (e) { ackErr(ack, msgFromErr(e, "Error al agregar fila"), statusFromErr(e) || 500); }
};

const handleAddColumn = async (nuevoValor, ack) => {
  const P = PHYS.value; const add = to2(nuevoValor);
  if (!Number.isFinite(add)) return ackErr(ack, "Ingresa ADD numérico", 400);
  if (add < P.ADD.min || add > P.ADD.max) return ackErr(ack, `ADD fuera de límites`, 400);
  if (allAddValues.value.includes(add)) return ackErr(ack, `Ya existe`, 409);
  try {
    const rows = sphAxis.value.flatMap(sph => [{ sph, add, eye: "OD", existencias: 0 }, { sph, add, eye: "OI", existencias: 0 }]);
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

const handleToggleFilters = () => { if (!gridApi.value) return; gridApi.value.setGridOption("filterModel", null); };

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
