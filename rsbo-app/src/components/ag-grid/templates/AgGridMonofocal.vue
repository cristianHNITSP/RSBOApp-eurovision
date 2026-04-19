<!-- ============================================================
  AgGridMonofocal.vue  —  Matriz SPH × CYL (lentes de contacto)

  FILAS:     rowModelType="infinite" — SPH axis paginado
  COLUMNAS:  useAgGridIncrementalColumns — CYL values
  CACHÉ:     rowCache Map<sph, rowObj> con TODOS los CYL values
             → agregar columnas NO reinvoca getRows (anti-colisión)
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
        <div v-if="loadingCols || loadingRowsCount > 0 || DEV_MODE" class="grid-status-overlay">
          <!-- CARGA DE COLUMNAS - OCULTO POR REQUERIMIENTO. IMPORTANTE: NO BORRAR ESTE BLOQUE, ES ÚTIL PARA DEBUGGING FUTURO -->
          <!--
          <div class="status-badge status-badge--cols">
            <span class="status-badge__icon" :class="{ 'is-spinning': loadingCols }">⟳</span>
            <span class="status-badge__text">
              Columnas: {{ activeCylValues.length }} / {{ allCylValues.length }}
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
          :infiniteInitialRowCount="sphAxis.length || 10"
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
import { ref, computed, watch, nextTick, onMounted, onActivated, toRefs } from "vue";
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
import { norm, parseCylFromField, raf } from "@/components/ag-grid/utils/ag-grid-utils";

ModuleRegistry.registerModules([AllCommunityModule]);

const DEV_MODE      = import.meta.env.DEV;
const DEV_DELAY_MS  = 0;
const ROW_PAGE_SIZE  = DEV_MODE ? 4 : 10;
const COL_CHUNK_SIZE = DEV_MODE ? 3 : 8;

const LOG      = (...a) => DEV_MODE && console.log("[Monofocal]", ...a);
const LOG_ROWS = (...a) => DEV_MODE && console.log("[Monofocal][Rows]", ...a);

const props = defineProps({
  sheetId: { type: String, required: true },
  sphType: { type: String, default: "sph-neg" },
  actor:   { type: Object, default: null },
  apiType: { type: String, default: "inventory" },
});

const { getSheet, fetchItems, saveChunk, reseedSheet } = useSheetApi(() => props.apiType);
const { sheetId, sphType } = toRefs(props);

// ─── Integration ─────────────────────────────────────────────────
const integration = useAgGridIntegration({
  sheetId,
  sphType,
  guardKeyPrefix: "monofocal",
  onWsRefresh: () => _refreshCachedRows(),
});

const { gridApi, dirty, saving, lastSavedAt, switchingView, pendingChanges, gridHistory, unsavedGuard, suppressNextWsRefresh, postMessage } = integration;

// ─── State ───────────────────────────────────────────────────────
const sheetMeta      = ref(null);
const sheetTabs      = ref([]);
const physicalLimits = ref(null);
const sphAxis        = ref([]);
const allCylValues   = ref([]);
const rowCaches      = new Map();
const showVeil       = ref(true);

const getRowCache = () => {
  const k = props.sphType;
  if (!rowCaches.has(k)) rowCaches.set(k, new Map());
  return rowCaches.get(k);
};

// ─── Composables ─────────────────────────────────────────────────
const { themeCustom } = useAgGridBase();
const { stockRowClassRules, stockCellClassRules } = useStockRules(sheetMeta);

const colManager = useAgGridIncrementalColumns({
  allValues: allCylValues,
  gridApiRef: gridApi,
  colChunkSize: COL_CHUNK_SIZE,
  scrollThreshold: 150,
  devMode: DEV_MODE,
});
const { activeValues: activeCylValues, loading: loadingCols } = colManager;

// ─── Límites ─────────────────────────────────────────────────────
const phys = computed(() => {
  const pl = physicalLimits.value || {};
  const SPH = pl.SPH || pl.sph || {};
  const CYL = pl.CYL || pl.cyl || {};
  const cylAbsMax = Math.max(Math.abs(numOr(CYL.min, -15)), Math.abs(numOr(CYL.max, 15)));
  return { sphMin: numOr(SPH.min, -40), sphMax: numOr(SPH.max, 40), cylMin: numOr(CYL.min, -15), cylMax: numOr(CYL.max, 15), cylAbsMax };
});

// ─── Meta computed ───────────────────────────────────────────────
const effectiveActor = computed(() => {
  const src = props.actor || (typeof window !== "undefined" ? window.__currentUser : null) || null;
  if (!src) return null;
  return { userId: src.userId || src.id || src._id || null, name: src.name || src.email || "Usuario" };
});

const totalRows = computed(() => sphAxis.value.length);
const sheetName = computed(() => sheetMeta.value?.nombre || sheetMeta.value?.name || "Hoja monofocal");
const tipoMatriz = computed(() => sheetMeta.value?.tipo_matriz || "SPH_CYL");
const material = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);

const getRowId = (p) => String(to2(p.data.sph));

// ─── Data Handlers ───────────────────────────────────────────────
function markChanged(data, field, newValue, _oldValue) {
  const cDisp = parseCylFromField(field);
  if (cDisp === null) return;
  const s = to2(data.sph);
  const key = `${s}|${cDisp}`;
  const prev = pendingChanges.value.get(key);
  const oldVal = _oldValue ?? prev?.existencias ?? 0;
  const newVal = Number(newValue ?? 0);

  pendingChanges.value.set(key, { sph: s, cyl: -cDisp, existencias: newVal });
  dirty.value = true;

  if (!gridHistory.isApplying.value) {
    gridHistory.push({ key, field, oldValue: oldVal, newValue: newVal, meta: { sph: s, cyl: -cDisp } });
  }
}

const { handleSave, handleDiscard, handleRefresh, handleSeed, handleExport } = useAgGridHandlers({
  props, integration, loadAll, switchViewReload, effectiveActor, sheetName,
});

const { formulaValue, onCellClicked, onCellValueChanged, onFxInput, onFxCommit } = useAgGridFormulaBar({
  gridApi,
  onMarkChanged: (data, field, newVal, oldVal) => markChanged(data, field, newVal, oldVal),
  isEditableField: (field) => field.startsWith("cyl_"),
});

// ─── Columns ─────────────────────────────────────────────────────
const fmtCylHeader = (c) => { const n = Number(c); if (!Number.isFinite(n)) return ""; return n === 0 ? "0.00" : `-${n.toFixed(2)}`; };

const columns = computed(() => [
  {
    headerName: `SPH ${props.sphType === "sph-neg" ? "(-)" : "(+)"}`,
    children: [{
      field: "sph", headerName: "SPH", width: 90, minWidth: 86, maxWidth: 96, pinned: "left", editable: false, sortable: true,
      comparator: (a, b) => Number(a) - Number(b), filter: false, cellClass: ["ag-cell--compact", "ag-cell--numeric", "ag-cell--pinned"],
      headerClass: ["ag-header-cell--compact", "ag-header-cell--pinned"],
      valueFormatter: (p) => { if (p.data?.__loading) return ""; const v = Number(p.value); return Number.isFinite(v) ? fmtSigned(v) : (p.value ?? ""); },
      cellRenderer: (p) => p.data?.__loading ? '<span class="skeleton-cell"></span>' : (p.valueFormatted ?? String(p.value ?? "")),
    }],
  },
  {
    headerName: "CYL (-)",
    children: activeCylValues.value.map((cDisp) => ({
      field: `cyl_${norm(cDisp)}`, headerName: fmtCylHeader(cDisp), editable: (p) => !p.data?.__loading,
      filter: false, minWidth: 80, maxWidth: 110, resizable: true,
      cellClass: ["ag-cell--compact", "ag-cell--numeric"], headerClass: ["ag-header-cell--compact"],
      cellClassRules: { ...stockCellClassRules.value, "ag-cell--loading": (p) => !!p.data?.__loading },
      cellRenderer: (p) => p.data?.__loading ? '<span class="skeleton-cell skeleton-cell--cyl"></span>' : (p.value !== undefined && p.value !== null ? String(p.value) : "0"),
      valueSetter: (p) => {
        if (p.data?.__loading) return false;
        const newVal = isNumeric(p.newValue) ? Number(p.newValue) : 0;
        const oldVal = Number(p.oldValue ?? 0);
        p.data[p.colDef.field] = newVal;
        const _rc = getRowCache(); const _k = String(to2(p.data.sph)); if (_rc.has(_k)) _rc.get(_k)[p.colDef.field] = newVal;
        markChanged(p.data, p.colDef.field, newVal, oldVal);
        return true;
      },
    })),
  },
]);

const defaultColDef = { resizable: true, sortable: true, filter: false, floatingFilter: false, editable: true, minWidth: 90, maxWidth: 150, cellClass: "ag-cell--compact", headerClass: "ag-header-cell--compact" };

// ─── Pivot Loader ────────────────────────────────────────────────
const { datasource, loadingRowsCount, rowsInCacheCount } = useAgGridPivotLoader({
  baseAxis: sphAxis, getRowCache, fetchItems, sheetId, viewId: sphType,
  buildFetchQuery: (pageSphs) => ({ sphMin: Math.min(...pageSphs), sphMax: Math.max(...pageSphs), cylMin: phys.value.cylMin, cylMax: 0, limit: 5000 }),
  normalizeItem: (i) => { let cyl = to2(i.cyl); if (Number.isFinite(cyl) && cyl > 0) cyl = -Math.abs(cyl); return { sph: to2(i.sph), cyl, existencias: Number(i.existencias ?? 0) }; },
  buildPivotPage: (pageSphs, items, { loading, pendingChanges }) => {
    const cylAll = allCylValues.value;
    if (loading) { return pageSphs.map(sph => ({ sph, __loading: true, ...Object.fromEntries(cylAll.map(c => [`cyl_${norm(c)}`, null])) })); }
    return pageSphs.map(sph => {
      const row = { sph };
      cylAll.forEach(cDisp => {
        const match = items.find(it => it.sph === sph && to2(Math.abs(it.cyl)) === cDisp);
        const field = `cyl_${norm(cDisp)}`;
        row[field] = match?.existencias ?? 0;
        const pk = `${to2(sph)}|${cDisp}`;
        if (pendingChanges?.has(pk)) row[field] = pendingChanges.get(pk).existencias;
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
    sheetTabs.value = payload?.tabs || [];
    physicalLimits.value = payload?.physicalLimits || payload?.physical_limits || payload?.limits || null;
    LOG("loadSheetMeta OK");
  } catch (e) { console.error("[Monofocal] Error getSheet:", e?.response?.data || e); }
}

function _rebuildAxes() {
  const P = phys.value; const isNeg = props.sphType === "sph-neg";
  const tab = (sheetTabs.value || []).find(t => t?.id === props.sphType) || (sheetTabs.value || []).find(t => String(t?.id || "").includes("sph")) || null;
  const backendSph = Array.isArray(tab?.axis?.sph) ? tab.axis.sph : [];
  const backendCyl = Array.isArray(tab?.axis?.cyl) ? tab.axis.cyl : [];
  sphAxis.value = [...new Set(backendSph.map(to2))].filter(s => Number.isFinite(s) && s >= P.sphMin && s <= P.sphMax && (isNeg ? s <= 0 : s >= 0)).sort((a, b) => isNeg ? b - a : a - b);
  allCylValues.value = [...new Set(backendCyl.map(to2))].filter(n => Number.isFinite(n) && n >= 0 && n <= P.cylAbsMax).sort((a, b) => a - b);
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
    const { data } = await fetchItems(props.sheetId, { sphMin: Math.min(...pageSphs), sphMax: Math.max(...pageSphs), cylMin: phys.value.cylMin, cylMax: 0, limit: 5000 });
    const items = (data?.data || []).map(i => { let cyl = to2(i.cyl); if (Number.isFinite(cyl) && cyl > 0) cyl = -Math.abs(cyl); return { sph: to2(i.sph), cyl, existencias: Number(i.existencias ?? 0) }; });
    pageSphs.forEach(sph => {
      const key = String(sph);
      const row = cache.get(key); if (!row) return;
      items.filter(it => it.sph === sph).forEach(it => { row[`cyl_${norm(Math.abs(it.cyl))}`] = it.existencias; });
      const node = gridApi.value?.getRowNode(key);
      if (node) { node.setData({ ...row }); gridApi.value.refreshCells({ rowNodes: [node], force: true }); }
    });
  } catch (e) { console.error("[Monofocal] _refreshCachedRows error:", e); }
}

function applyGridHistoryOp(op) {
  if (!op) return;
  const value = op.reversed ? op.oldValue : op.newValue;
  const [sphStr, cylDispStr] = op.key.split("|");
  const sph = to2(Number(sphStr));
  const cached = getRowCache().get(String(sph));
  if (cached) {
    cached[op.field] = value;
    const node = gridApi.value?.getRowNode(String(sph));
    if (node) { node.setData({ ...cached }); gridApi.value?.refreshCells({ rowNodes: [node], force: true }); }
  }
  pendingChanges.value.set(op.key, { sph, cyl: -Number(cylDispStr), existencias: value });
  dirty.value = pendingChanges.value.size > 0;
}
const handleGridUndo = () => applyGridHistoryOp(gridHistory.undo());
const handleGridRedo = () => applyGridHistoryOp(gridHistory.redo());

const handleAddRow = async (nuevoValor, ack) => {
  const P = phys.value; const sph = to2(nuevoValor);
  if (!Number.isFinite(sph)) return ackErr(ack, "Ingresa SPH numérico", 400);
  if (sph < P.sphMin || sph > P.sphMax) return ackErr(ack, `SPH fuera de límites`, 400);
  if (sphAxis.value.includes(sph)) return ackErr(ack, `SPH ya existe`, 409);
  try {
    const rows = allCylValues.value.flatMap(c => [{ sph, cyl: -c, existencias: 0 }]);
    const res = await saveChunk(props.sheetId, rows, effectiveActor.value);
    const ok = normalizeAxiosOk(res); if (!ok.ok) throw new Error(ok.message);
    ackOk(ack, ok.message || `Fila agregada`, ok.status);
    lastSavedAt.value = new Date(); await loadSheetMeta(); await switchViewReload();
  } catch (e) { ackErr(ack, msgFromErr(e, "Error al agregar fila"), statusFromErr(e) || 500); }
};

const handleAddColumn = async (nuevoValor, ack) => {
  const P = phys.value; const cDisp = to2(nuevoValor);
  if (!Number.isFinite(cDisp)) return ackErr(ack, "Ingresa CYL numérico", 400);
  if (cDisp < 0 || cDisp > P.cylAbsMax) return ackErr(ack, `CYL fuera de límites`, 400);
  if (allCylValues.value.includes(cDisp)) return ackErr(ack, `CYL ya existe`, 409);
  try {
    const rows = sphAxis.value.flatMap(sph => [{ sph, cyl: -cDisp, existencias: 0 }]);
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
const resetSort = () => { if (!gridApi.value) return; gridApi.value.applyColumnState({ defaultState: { sort: null }, state: [{ colId: "sph", sort: props.sphType === "sph-neg" ? "desc" : "asc" }] }); };
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
