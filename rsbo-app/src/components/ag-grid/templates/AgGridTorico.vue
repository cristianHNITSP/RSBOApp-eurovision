<!-- ============================================================
  AgGridTorico.vue  —  Matriz SPH × CYL | Eje (grados)

  FILAS:     rowModelType="infinite" — SPH axis paginado
  COLUMNAS:  useAgGridIncrementalColumns — CYL values
  GRADOS:    selector de eje; al cambiar resetea datasource + cols
  CACHÉ:     itemsCache guarda TODOS los items del backend
             (all degrees); rowCache Map<sph,rowObj> por grado activo
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

    <!-- Selector de grados -->
    <div class="degree-bar">
      <span class="degree-bar__label">Eje (grados):</span>
      <div class="degree-bar__pills">
        <button
          v-for="deg in degreeValues"
          :key="deg"
          class="degree-pill"
          :class="{ 'degree-pill--active': deg === selectedDegree }"
          @click="selectDegree(deg)"
        >{{ deg }}°</button>
      </div>
    </div>

    <main class="grid-main">
      <div class="glass-shell" :class="{ 'glass-shell--switching': switchingView }">
        <div v-if="DEV_MODE" class="dev-col-badge">
          cols {{ activeCylValues.length }} / {{ allCylValues.length }} | eje {{ selectedDegree }}°
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
import { norm, denorm, parseCylFromField, raf } from "@/components/ag-grid/utils/ag-grid-utils";

ModuleRegistry.registerModules([AllCommunityModule]);

const DEV_MODE      = import.meta.env.DEV;
const DEV_DELAY_MS  = DEV_MODE ? 2000 : 0;
const ROW_PAGE_SIZE = DEV_MODE ? 5 : 30;
const COL_CHUNK_SIZE = DEV_MODE ? 3 : 8;

const LOG      = (...a) => DEV_MODE && console.log("[Torico]", ...a);
const LOG_ROWS = (...a) => DEV_MODE && console.log("[Torico][Rows]", ...a);

const props = defineProps({
  sheetId: { type: String, required: true },
  sphType: { type: String, default: "sph-neg" },
  actor:   { type: Object, default: null },
  apiType: { type: String, default: "contactlenses" },
});

const { getSheet, fetchItems, saveChunk, reseedSheet } = useSheetApi(() => props.apiType);
const { sheetId, sphType } = toRefs(props);

// ─── Integration ─────────────────────────────────────────────────
const integration = useAgGridIntegration({
  sheetId,
  sphType,
  guardKeyPrefix: "torico",
  onWsRefresh: () => _refreshCachedRows(),
});

const { gridApi, dirty, saving, lastSavedAt, pendingChanges, gridHistory, unsavedGuard, suppressNextWsRefresh, postMessage } = integration;

// ─── State ───────────────────────────────────────────────────────
const sheetMeta      = ref(null);
const sheetTabs      = ref([]);
const physicalLimits = ref(null);
const switchingView  = ref(false);
const loadingCols    = ref(false);
const sphAxis        = ref([]);
const allCylValues   = ref([]);
const itemsCache     = ref([]);
const degreeValues   = ref([]);
const selectedDegree = ref(180);
const rowCaches      = new Map();

const getRowCache = () => {
  const k = `${props.sphType}|${selectedDegree.value}`;
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
const activeCylValues = colManager.activeValues;

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
const sheetName = computed(() => sheetMeta.value?.nombre || sheetMeta.value?.name || "Hoja tórica");
const tipoMatriz = computed(() => sheetMeta.value?.tipo_matriz || "SPH_CYL_AXIS");
const material = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);

const getRowId = (p) => String(to2(p.data.sph));

// ─── Data Handlers ───────────────────────────────────────────────
function markChanged(data, field, newValue, _oldValue) {
  const cDisp = parseCylFromField(field);
  if (cDisp === null) return;
  const s = to2(data.sph);
  const deg = selectedDegree.value;
  const key = `${s}|${cDisp}|${deg}`;
  const prev = pendingChanges.value.get(key);
  const oldVal = _oldValue ?? prev?.existencias ?? 0;
  const newVal = Number(newValue ?? 0);

  pendingChanges.value.set(key, { sph: s, cyl: -cDisp, axis: deg, existencias: newVal });
  dirty.value = true;

  if (!gridHistory.isApplying.value) {
    gridHistory.push({ key, field, oldValue: oldVal, newValue: newVal, meta: { sph: s, cylDisplay: cDisp, axis: deg } });
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
      comparator: (a, b) => Number(a) - Number(b), filter: "agNumberColumnFilter", cellClass: ["ag-cell--compact", "ag-cell--numeric", "ag-cell--pinned"],
      headerClass: ["ag-header-cell--compact", "ag-header-cell--pinned"],
      valueFormatter: (p) => { if (p.data?.__loading) return ""; const v = Number(p.value); return Number.isFinite(v) ? fmtSigned(v) : (p.value ?? ""); },
      cellRenderer: (p) => p.data?.__loading ? '<span class="skeleton-cell"></span>' : (p.valueFormatted ?? String(p.value ?? "")),
    }],
  },
  {
    headerName: `CYL (-) | Eje ${selectedDegree.value}°`,
    children: activeCylValues.value.map((cDisp) => ({
      field: `cyl_${norm(cDisp)}`, headerName: fmtCylHeader(cDisp), editable: (p) => !p.data?.__loading,
      filter: "agNumberColumnFilter", minWidth: 80, maxWidth: 110, resizable: true,
      cellClass: ["ag-cell--compact", "ag-cell--numeric"], headerClass: ["ag-header-cell--compact"],
      cellClassRules: { ...stockCellClassRules.value, "ag-cell--loading": (p) => !!p.data?.__loading },
      cellRenderer: (p) => p.data?.__loading ? '<span class="skeleton-cell skeleton-cell--cyl"></span>' : (p.value !== undefined && p.value !== null ? String(p.value) : "0"),
      valueSetter: (p) => {
        if (p.data?.__loading) return false;
        const newVal = isNumeric(p.newValue) ? Number(p.newValue) : 0;
        const oldVal = Number(p.oldValue ?? 0);
        p.data[p.colDef.field] = newVal;
        const _rc = getRowCache(); if (_rc.has(p.data.sph)) _rc.get(p.data.sph)[p.colDef.field] = newVal;
        markChanged(p.data, p.colDef.field, newVal, oldVal);
        return true;
      },
    })),
  },
]);

const defaultColDef = { resizable: true, sortable: true, filter: "agNumberColumnFilter", floatingFilter: true, editable: true, minWidth: 90, maxWidth: 150, cellClass: "ag-cell--compact", headerClass: "ag-header-cell--compact" };

// ─── Pivot Loader ────────────────────────────────────────────────
const { datasource } = useAgGridPivotLoader({
  baseAxis: sphAxis, getRowCache, fetchItems, sheetId,
  buildFetchQuery: (pageSphs) => ({ sphMin: Math.min(...pageSphs), sphMax: Math.max(...pageSphs), cylMin: phys.value.cylMin, cylMax: 0, limit: 5000 }),
  normalizeItem: (i) => { let cyl = to2(i.cyl); if (Number.isFinite(cyl) && cyl > 0) cyl = -Math.abs(cyl); return { sph: to2(i.sph), cyl, axis: Number(i.axis ?? 180), existencias: Number(i.existencias ?? 0) }; },
  buildPivotPage: (pageSphs, items, { loading, pendingChanges }) => {
    const deg = selectedDegree.value; const cylAll = allCylValues.value;
    if (loading) { return pageSphs.map(sph => ({ sph, __loading: true, ...Object.fromEntries(cylAll.map(c => [`cyl_${norm(c)}`, null])) })); }
    
    // Si tenemos items frescos, mergear en itemsCache
    if (items?.length > 0) {
      const existingKeys = new Set(itemsCache.value.map(i => `${i.sph}|${i.cyl}|${i.axis}`));
      items.forEach(i => { if (!existingKeys.has(`${i.sph}|${i.cyl}|${i.axis}`)) itemsCache.value.push(i); });
    }

    return pageSphs.map(sph => {
      const row = { sph };
      const degItems = itemsCache.value.filter(i => i.axis === deg);
      cylAll.forEach(cDisp => {
        const match = degItems.find(it => it.sph === sph && to2(Math.abs(it.cyl)) === cDisp);
        const field = `cyl_${norm(cDisp)}`;
        row[field] = match?.existencias ?? 0;
        const pk = `${to2(sph)}|${cDisp}|${deg}`;
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
  } catch (e) { console.error("[Torico] Error getSheet:", e?.response?.data || e); }
}

function _rebuildAxes() {
  const P = phys.value; const isNeg = props.sphType === "sph-neg";
  const t = (sheetTabs.value || []).find(t => t?.id === props.sphType) || (sheetTabs.value || []).find(t => String(t?.id || "").includes("sph")) || null;
  const backendSph = Array.isArray(t?.axis?.sph) ? t.axis.sph : [];
  const backendCyl = Array.isArray(t?.axis?.cyl) ? t.axis.cyl : [];
  const backendDeg = Array.isArray(t?.axis?.degrees) ? t.axis.degrees : [];

  degreeValues.value = [...new Set(backendDeg)].filter(d => Number.isFinite(d) && d >= 10 && d <= 180 && d % 10 === 0).sort((a, b) => b - a);
  if (!degreeValues.value.includes(selectedDegree.value)) selectedDegree.value = degreeValues.value[0] || 180;

  sphAxis.value = [...new Set(backendSph.map(to2))].filter(s => Number.isFinite(s) && s >= P.sphMin && s <= P.sphMax && (isNeg ? s <= 0 : s >= 0)).sort((a, b) => isNeg ? b - a : a - b);
  allCylValues.value = [...new Set(backendCyl.map(to2))].filter(n => Number.isFinite(n) && n >= 0 && n <= P.cylAbsMax).sort((a, b) => a - b);
}

async function _fetchAllItems() {
  const P = phys.value; const isNeg = props.sphType === "sph-neg";
  try {
    const { data } = await fetchItems(props.sheetId, { sphMin: isNeg ? P.sphMin : 0, sphMax: isNeg ? 0 : P.sphMax, cylMin: P.cylMin, cylMax: 0, limit: 20000 });
    itemsCache.value = (data?.data || []).map(i => { let cyl = to2(i.cyl); if (Number.isFinite(cyl) && cyl > 0) cyl = -Math.abs(cyl); return { sph: to2(i.sph), cyl, axis: Number(i.axis ?? 180), existencias: Number(i.existencias ?? 0) }; });
    LOG(`_fetchAllItems: ${itemsCache.value.length} items.`);
  } catch (e) { console.error("[Torico] Error _fetchAllItems:", e); }
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

async function selectDegree(deg) {
  if (deg === selectedDegree.value) return;
  if (dirty.value && pendingChanges.value.size > 0) unsavedGuard.persist();
  pendingChanges.value.clear(); dirty.value = false; gridHistory.clear();
  selectedDegree.value = deg; colManager.reset();
  if (gridApi.value) gridApi.value.setGridOption("datasource", datasource.value);
  loadingCols.value = true; await colManager.init(); loadingCols.value = false;
  await nextTick(); resetSort(); unsavedGuard.restore();
}

async function loadAll() { await loadSheetMeta(); await _fetchAllItems(); await switchViewReload(); }

async function _refreshCachedRows() {
  const cache = getRowCache(); if (!cache.size || !gridApi.value) return;
  const pageSphs = [...cache.keys()];
  try {
    const { data } = await fetchItems(props.sheetId, { sphMin: Math.min(...pageSphs), sphMax: Math.max(...pageSphs), cylMin: phys.value.cylMin, cylMax: 0, limit: 5000 });
    const fresh = (data?.data || []).map(i => { let cyl = to2(i.cyl); if (Number.isFinite(cyl) && cyl > 0) cyl = -Math.abs(cyl); return { sph: to2(i.sph), cyl, axis: Number(i.axis ?? 180), existencias: Number(i.existencias ?? 0) }; });
    itemsCache.value = [...itemsCache.value.filter(i => !pageSphs.includes(i.sph)), ...fresh];
    const realRows = _buildPivotPage(pageSphs, fresh, { loading: false, pendingChanges: pendingChanges.value });
    realRows.forEach(row => {
      cache.set(row.sph, row);
      const node = gridApi.value?.getRowNode(String(row.sph));
      if (node) { node.setData(row); gridApi.value.refreshCells({ rowNodes: [node], force: true }); }
    });
  } catch (e) { console.error("[Torico] _refreshCachedRows error:", e); }
}

function applyGridHistoryOp(op) {
  if (!op) return;
  const value = op.reversed ? op.oldValue : op.newValue;
  const [sphStr, cylDispStr, degStr] = op.key.split("|");
  const sph = to2(Number(sphStr));
  if (Number(degStr) !== selectedDegree.value) return; // Opcional: switch axis or ignore
  const cached = getRowCache().get(sph);
  if (cached) {
    cached[op.field] = value;
    const node = gridApi.value?.getRowNode(String(sph));
    if (node) { node.setData({ ...cached }); gridApi.value?.refreshCells({ rowNodes: [node], force: true }); }
  }
  pendingChanges.value.set(op.key, { sph, cyl: -Number(cylDispStr), axis: Number(degStr), existencias: value });
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
    const rows = allCylValues.value.flatMap(c => degreeValues.value.map(deg => ({ sph, cyl: -c, axis: deg, existencias: 0 })));
    const res = await saveChunk(props.sheetId, rows, effectiveActor.value);
    const ok = normalizeAxiosOk(res); if (!ok.ok) throw new Error(ok.message);
    ackOk(ack, ok.message || `Fila agregada`, ok.status);
    lastSavedAt.value = new Date(); itemsCache.value = []; await loadSheetMeta(); await _fetchAllItems(); await switchViewReload();
  } catch (e) { ackErr(ack, msgFromErr(e, "Error al agregar fila"), statusFromErr(e) || 500); }
};

const handleAddColumn = async (nuevoValor, ack) => {
  const P = phys.value; const cDisp = to2(Math.abs(Number(nuevoValor)));
  if (!Number.isFinite(cDisp)) return ackErr(ack, "Ingresa CYL numérico", 400);
  if (cDisp > P.cylAbsMax) return ackErr(ack, `CYL fuera de límites`, 400);
  if (allCylValues.value.includes(cDisp)) return ackErr(ack, `CYL ya existe`, 409);
  try {
    const rows = sphAxis.value.flatMap(sph => degreeValues.value.map(deg => ({ sph, cyl: -cDisp, axis: deg, existencias: 0 })));
    const res = await saveChunk(props.sheetId, rows, effectiveActor.value);
    const ok = normalizeAxiosOk(res); if (!ok.ok) throw new Error(ok.message);
    ackOk(ack, ok.message || `Columna agregada`, ok.status);
    lastSavedAt.value = new Date(); itemsCache.value = []; await loadSheetMeta(); await _fetchAllItems(); await switchViewReload();
  } catch (e) { ackErr(ack, msgFromErr(e, "Error al agregar columna"), statusFromErr(e) || 500); }
};

const onGridReady = async (p) => {
  gridApi.value = p.api; p.api.setGridOption("datasource", datasource.value);
  await nextTick(); resetSort(); colManager.reattach();
};

const clearFilters = () => { if (!gridApi.value) return; gridApi.value.setGridOption("filterModel", null); };
const resetSort = () => { if (!gridApi.value) return; gridApi.value.applyColumnState({ defaultState: { sort: null }, state: [{ colId: "sph", sort: props.sphType === "sph-neg" ? "desc" : "asc" }] }); };
const handleToggleFilters = () => clearFilters();

onMounted(async () => { await loadAll(); unsavedGuard.restore(); });
watch(() => props.sphType, async () => {
  if (dirty.value && pendingChanges.value.size > 0) unsavedGuard.persist();
  pendingChanges.value.clear(); dirty.value = false; gridHistory.clear();
  itemsCache.value = []; await _fetchAllItems(); await switchViewReload({ clearCache: false }); unsavedGuard.restore();
});
</script>

<style scoped>
@import "@/components/ag-grid/templates/AgGridBase.css";
</style>
