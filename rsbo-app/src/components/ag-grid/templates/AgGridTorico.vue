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
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, onActivated, onDeactivated, shallowRef } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import navtools from "@/components/ag-grid/navtools.vue";
import { useSheetApi } from "@/composables/useSheetApi";
import { useGridHistory } from "@/composables/useGridHistory";
import { useUnsavedGuard } from "@/composables/useUnsavedGuard";
import { labToast } from "@/composables/useLabToast";
import { exportAgGridToXlsx } from "@/composables/useExcelExport";
import {
  useAgGridBase, localeText,
  ackOk, ackErr, msgFromErr, statusFromErr, normalizeAxiosOk,
  numOr, isNumeric, to2, fmtSigned,
} from "@/composables/useAgGridBase";
import { useStockRules } from "@/composables/useStockRules";
import { useAgGridIncrementalColumns } from "@/composables/useAgGridIncrementalColumns";

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

const { fetchItems, saveChunk, reseedSheet, getSheet } = useSheetApi(() => props.apiType);

// ─── Helpers ─────────────────────────────────────────────────────
const norm    = (n) => String(to2(n)).replace(".", "_");
const denorm  = (s) => Number(String(s).replace("_", "."));

const parseCylFromField = (field) => field.startsWith("cyl_") ? denorm(field.slice(4)) : null;
const fmtCylHeader = (cDisp) => { const n = Number(cDisp); return Number.isFinite(n) ? (n === 0 ? "0.00" : `-${n.toFixed(2)}`) : ""; };
const isQuarterStep = (v) => { const n = Number(v); if (!Number.isFinite(n)) return false; return Math.abs(n * 4 - Math.round(n * 4)) < 1e-6; };

const raf   = () => new Promise(r => typeof requestAnimationFrame === "function" ? requestAnimationFrame(r) : setTimeout(r, 0));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Estado ─────────────────────────────────────────────────────
const gridApi        = shallowRef(null);
const dirty          = ref(false);
const saving         = ref(false);
const lastSavedAt    = ref(null);
const sheetMeta      = ref(null);
const sheetTabs      = ref([]);
const physicalLimits = ref(null);
const switchingView  = ref(false);
const loadingCols    = ref(false);
const pendingChanges = ref(new Map());

/** SPH axis para el grado+vista actual */
const sphAxis      = ref([]);
/** CYL axis completo (sin filtro de grado) */
const allCylValues = ref([]);
/** Todos los items del backend (todos los grados); no cambian al cambiar grado */
const itemsCache   = ref([]);
/** Grados disponibles */
const degreeValues   = ref([]);
const selectedDegree = ref(180);

/** rowCaches: Map<`sphType|degree`, Map<sph, rowObj>> — un cache por combinación vista+grado */
const rowCaches = new Map();
const getRowCache = () => {
  const k = `${props.sphType}|${selectedDegree.value}`;
  if (!rowCaches.has(k)) rowCaches.set(k, new Map());
  return rowCaches.get(k);
};

// ─── Grid history & unsaved guard ────────────────────────────────
const gridHistory = useGridHistory({ maxSize: 300 });

const _guardViewId = computed(() => `${props.sheetId}:torico:${props.sphType}:${selectedDegree.value}`);
const unsavedGuard = useUnsavedGuard({
  storageKey: () => _guardViewId.value,
  isDirty: () => dirty.value,
  getPending: () => Object.fromEntries(pendingChanges.value),
  onRestore(saved) {
    for (const [k, v] of Object.entries(saved)) pendingChanges.value.set(k, v);
    if (pendingChanges.value.size > 0) {
      dirty.value = true;
      labToast.warning(`Se restauraron ${pendingChanges.value.size} cambios sin guardar.`);
    }
  },
});

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
  const sphMin = numOr(SPH.min, -40);
  const sphMax = numOr(SPH.max,  40);
  const cylMin = numOr(CYL.min, -15);
  const cylMax = numOr(CYL.max,  15);
  return { sphMin, sphMax, cylMin, cylMax, cylAbsMax: Math.max(Math.abs(cylMin), Math.abs(cylMax)) };
});

// ─── Meta computed ────────────────────────────────────────────────
const effectiveActor = computed(() => {
  const src = props.actor || (typeof window !== "undefined" ? window.__currentUser : null) || null;
  if (!src) return null;
  return { userId: src.userId || src.id || src._id || null, name: src.name || src.email || "Usuario" };
});

const totalRows   = computed(() => sphAxis.value.length);
const sheetName   = computed(() => sheetMeta.value?.nombre || sheetMeta.value?.name || "Hoja tórica (SPH/CYL/Eje)");
const tipoMatriz  = computed(() => sheetMeta.value?.tipo_matriz || "SPH_CYL_AXIS");
const material    = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);

// ─── Pending changes ─────────────────────────────────────────────
function markCellChanged(sph, cylDisplay, existencias, _oldValue) {
  const s = to2(sph);
  const cDisp = to2(Math.abs(Number(cylDisplay)));
  const cBackend = -cDisp;
  const deg = selectedDegree.value;
  const key = `${s}|${cDisp}|${deg}`;
  const field = `cyl_${norm(cDisp)}`;
  const prev = pendingChanges.value.get(key);
  const oldVal = _oldValue ?? prev?.existencias ?? 0;
  const newVal = Number(existencias ?? 0);

  pendingChanges.value.set(key, { sph: s, cyl: cBackend, axis: deg, existencias: newVal });
  dirty.value = true;

  if (!gridHistory.isApplying.value) {
    gridHistory.push({ key, field, oldValue: oldVal, newValue: newVal, meta: { sph: s, cylDisplay: cDisp, axis: deg } });
  }
}

// ─── Column defs ─────────────────────────────────────────────────
const columns = computed(() => [
  {
    headerName: `SPH ${props.sphType === "sph-neg" ? "(-)" : "(+)"}`,
    children: [{
      field: "sph",
      headerName: "SPH",
      width: 90, minWidth: 86, maxWidth: 96,
      pinned: "left", editable: false, sortable: true,
      comparator: (a, b) => Number(a) - Number(b),
      resizable: false, filter: "agNumberColumnFilter",
      cellClass: ["ag-cell--compact", "ag-cell--numeric", "ag-cell--pinned"],
      headerClass: ["ag-header-cell--compact", "ag-header-cell--pinned"],
      valueFormatter: (p) => { if (p.data?.__loading) return ""; const v = Number(p.value); return Number.isFinite(v) ? fmtSigned(v) : p.value ?? ""; },
      cellRenderer: (p) => p.data?.__loading ? '<span class="skeleton-cell"></span>' : (p.valueFormatted ?? String(p.value ?? "")),
    }],
  },
  {
    headerName: `CYL (-) | Eje ${selectedDegree.value}°`,
    children: activeCylValues.value.map(cDisp => ({
      field: `cyl_${norm(cDisp)}`,
      headerName: fmtCylHeader(cDisp),
      editable: (p) => !p.data?.__loading,
      filter: "agNumberColumnFilter",
      minWidth: 80, maxWidth: 110,
      resizable: true,
      cellClass: ["ag-cell--compact", "ag-cell--numeric"],
      headerClass: ["ag-header-cell--compact"],
      cellClassRules: {
        ...stockCellClassRules.value,
        "ag-cell--loading": (p) => !!p.data?.__loading,
      },
      cellRenderer: (p) => {
        if (p.data?.__loading) return '<span class="skeleton-cell skeleton-cell--cyl"></span>';
        const v = p.value;
        return v !== undefined && v !== null ? String(v) : "0";
      },
      valueSetter: (p) => {
        if (p.data?.__loading) return false;
        const v = String(p.newValue ?? "").trim();
        const newVal = isNumeric(v) ? Number(v) : 0;
        const oldVal = Number(p.oldValue ?? 0);
        p.data[p.colDef.field] = newVal;
        const _rc = getRowCache(); if (_rc.has(p.data.sph)) _rc.get(p.data.sph)[p.colDef.field] = newVal;
        markCellChanged(p.data.sph, cDisp, newVal, oldVal);
        return true;
      },
    })),
  },
]);

const defaultColDef = {
  resizable: true, sortable: true,
  filter: "agNumberColumnFilter", floatingFilter: true,
  editable: true, minWidth: 90, maxWidth: 150,
  cellClass: "ag-cell--compact", headerClass: "ag-header-cell--compact",
};

const getRowId = (p) => String(p.data.sph);

// ─── Fetch helpers ────────────────────────────────────────────────
function _buildFetchQueryForSphRange(pageSphs) {
  const P = phys.value;
  return { sphMin: Math.min(...pageSphs), sphMax: Math.max(...pageSphs), cylMin: P.cylMin, cylMax: 0, limit: 5000 };
}

function _normalizeItem(i) {
  const sph = to2(i.sph);
  let cyl = to2(i.cyl);
  if (Number.isFinite(cyl) && cyl > 0) cyl = -Math.abs(cyl);
  return { sph, cyl, axis: Number(i.axis ?? 180), existencias: Number(i.existencias ?? 0) };
}

/**
 * Construye filas pivot para un bloque de SPH en el grado actual.
 * Usa itemsCache (ya filtrado por axis == selectedDegree) O items frescos.
 */
function _buildPivotPage(pageSphs, items) {
  const deg = selectedDegree.value;
  const cylAll = allCylValues.value;
  const degItems = items.filter(i => i.axis === deg);

  return pageSphs.map(sph => {
    const row = { sph };
    cylAll.forEach(cDisp => {
      const match = degItems.find(i => i.sph === sph && to2(Math.abs(i.cyl)) === cDisp);
      row[`cyl_${norm(cDisp)}`] = match?.existencias ?? 0;
    });
    // Aplicar cambios pendientes para este SPH y grado
    pendingChanges.value.forEach((change, key) => {
      const [sphStr, cylStr, degStr] = key.split("|");
      if (to2(Number(sphStr)) === sph && Number(degStr) === deg) {
        const field = `cyl_${norm(Number(cylStr))}`;
        if (field in row) row[field] = change.existencias;
      }
    });
    return row;
  });
}

// ─── Datasource ──────────────────────────────────────────────────
const datasource = computed(() => ({
  getRows({ startRow, endRow, successCallback }) {
    const axis = sphAxis.value;
    const pageSphs = axis.slice(startRow, endRow);
    LOG_ROWS(`getRows [${startRow}–${endRow}] ${pageSphs.length} SPH | eje ${selectedDegree.value}°`);

    if (!pageSphs.length) { successCallback([], axis.length); return; }

    // ── Cache-first: sin skeleton si todos los SPH ya están en caché ──
    const cache = getRowCache();
    if (pageSphs.every(s => cache.has(s))) {
      LOG_ROWS(`getRows [${startRow}–${endRow}]: cache hit total.`);
      successCallback(pageSphs.map(s => cache.get(s)), axis.length);
      return;
    }

    // FASE 1: placeholders
    const cylAll = allCylValues.value;
    const nullFields = Object.fromEntries(cylAll.map(c => [`cyl_${norm(c)}`, null]));
    const loadingRows = pageSphs.map(sph => ({ sph, __loading: true, ...nullFields }));
    successCallback(loadingRows, axis.length);
    LOG_ROWS(`FASE 1: ${loadingRows.length} placeholders.`);

    // FASE 2: async
    (async () => {
      try {
        if (DEV_DELAY_MS > 0) { LOG_ROWS(`delay ${DEV_DELAY_MS}ms...`); await sleep(DEV_DELAY_MS); }

        // Intentar usar itemsCache primero (evita re-fetch al cambiar grado)
        let items;
        const cacheCoversPage = pageSphs.every(sph => itemsCache.value.some(i => i.sph === sph));
        if (cacheCoversPage && itemsCache.value.length > 0) {
          items = itemsCache.value.filter(i => pageSphs.includes(i.sph));
          LOG_ROWS(`FASE 2: usando itemsCache (${items.length} items para ${pageSphs.length} SPH).`);
        } else {
          const query = _buildFetchQueryForSphRange(pageSphs);
          LOG_ROWS("FASE 2: fetch →", query);
          const { data } = await fetchItems(props.sheetId, query);
          items = (data?.data || []).map(_normalizeItem);
          // Mergear en itemsCache (evitar duplicados)
          const existingKeys = new Set(itemsCache.value.map(i => `${i.sph}|${i.cyl}|${i.axis}`));
          items.forEach(i => { if (!existingKeys.has(`${i.sph}|${i.cyl}|${i.axis}`)) itemsCache.value.push(i); });
          LOG_ROWS(`FASE 2: ${items.length} items recibidos.`);
        }

        const realRows = _buildPivotPage(pageSphs, items);
        realRows.forEach(row => getRowCache().set(row.sph, row));

        if (gridApi.value) {
          let n = 0;
          realRows.forEach(row => {
            const node = gridApi.value.getRowNode(String(row.sph));
            if (node) { node.setData(row); gridApi.value.refreshCells({ rowNodes: [node], force: true }); n++; }
          });
          LOG_ROWS(`FASE 2: ${n}/${realRows.length} nodos actualizados.`);
        }
      } catch (e) {
        console.error("[Torico][Rows] FASE 2 error:", e);
      }
    })();
  },
}));

// ─── Metadata & ejes ─────────────────────────────────────────────
async function loadSheetMeta() {
  try {
    const { data } = await getSheet(props.sheetId);
    const payload = data?.data || data;
    sheetMeta.value = payload?.sheet || null;
    sheetTabs.value = payload?.tabs || [];
    physicalLimits.value = payload?.physicalLimits || payload?.physical_limits || payload?.limits || null;
    LOG("loadSheetMeta OK");
  } catch (e) {
    console.error("[Torico] Error getSheet:", e?.response?.data || e);
  }
}

function _getTabForView() {
  return (
    (sheetTabs.value || []).find(t => t?.id === props.sphType) ||
    (sheetTabs.value || []).find(t => String(t?.id || "").includes("sph")) ||
    null
  );
}

function _rebuildAxes(tab) {
  const P = phys.value;
  const isNeg = props.sphType === "sph-neg";
  const t = tab || _getTabForView();

  const backendSph = Array.isArray(t?.axis?.sph) ? t.axis.sph : [];
  const backendCyl = Array.isArray(t?.axis?.cyl) ? t.axis.cyl : [];
  const backendDeg = Array.isArray(t?.axis?.degrees) ? t.axis.degrees : [];

  // Grados
  const allDeg = [...new Set(backendDeg)]
    .filter(d => Number.isFinite(d) && d >= 10 && d <= 180 && d % 10 === 0)
    .sort((a, b) => b - a);
  degreeValues.value = allDeg;
  if (!degreeValues.value.includes(selectedDegree.value)) {
    selectedDegree.value = degreeValues.value[0] || 180;
  }

  // SPH axis para el grado/vista actual
  sphAxis.value = [...new Set(backendSph.map(to2))]
    .filter(s => Number.isFinite(s) && s >= P.sphMin && s <= P.sphMax && (isNeg ? s <= 0 : s >= 0))
    .sort((a, b) => isNeg ? b - a : a - b);

  // CYL axis completo
  allCylValues.value = [...new Set(backendCyl.map(to2))]
    .filter(n => Number.isFinite(n) && n >= 0 && n <= P.cylAbsMax)
    .sort((a, b) => a - b);

  LOG("_rebuildAxes:", { sph: sphAxis.value.length, cyl: allCylValues.value.length, deg: selectedDegree.value });
}

async function loadAll() {
  LOG("loadAll...");
  await loadSheetMeta();
  // Fetch completo de items (todos los grados) para poblar itemsCache
  await _fetchAllItems();
  await switchViewReload();
}

async function _fetchAllItems() {
  const P = phys.value;
  const isNeg = props.sphType === "sph-neg";
  const query = {
    sphMin: isNeg ? P.sphMin : 0,
    sphMax: isNeg ? 0 : P.sphMax,
    cylMin: P.cylMin, cylMax: 0,
    limit: 20000,
  };
  try {
    const { data } = await fetchItems(props.sheetId, query);
    itemsCache.value = (data?.data || []).map(_normalizeItem).filter(i => {
      if (!Number.isFinite(i.sph) || !Number.isFinite(i.cyl)) return false;
      if (i.sph < P.sphMin || i.sph > P.sphMax) return false;
      if (i.cyl > 0) return false;
      if (isNeg && i.sph > 0) return false;
      if (!isNeg && i.sph < 0) return false;
      return true;
    });
    LOG(`_fetchAllItems: ${itemsCache.value.length} items en caché.`);
  } catch (e) {
    console.error("[Torico] Error _fetchAllItems:", e);
  }
}

async function switchViewReload({ clearCache = true } = {}) {
  switchingView.value = true;
  await raf();
  try {
    _rebuildAxes();
    if (clearCache) {
      rowCaches.clear();
      colManager.reset();
    }

    if (gridApi.value) {
      gridApi.value.setGridOption("datasource", datasource.value);
      LOG("datasource reseteado.");
    }

    if (clearCache) {
      loadingCols.value = true;
      await colManager.init();
      loadingCols.value = false;
    } else {
      colManager.reattach();
    }
    LOG("switchViewReload completo.");
  } catch (e) {
    console.error("[Torico] switchViewReload error:", e);
  } finally {
    await raf();
    switchingView.value = false;
  }
}

/** Cambiar grado: solo resetea datasource + cols, no re-fetcha backend */
async function selectDegree(deg) {
  if (deg === selectedDegree.value) return;
  LOG(`selectDegree: ${selectedDegree.value}° → ${deg}°`);

  if (dirty.value && pendingChanges.value.size > 0) unsavedGuard.persist();
  pendingChanges.value.clear();
  dirty.value = false;
  gridHistory.clear();

  selectedDegree.value = deg;
  colManager.reset();

  if (gridApi.value) {
    gridApi.value.setGridOption("datasource", datasource.value);
  }

  loadingCols.value = true;
  await colManager.init();
  loadingCols.value = false;

  await nextTick();
  resetSort();
  unsavedGuard.restore();
}

// ─── Cross-tab sync (BroadcastChannel) ────────────────────────────
let _broadcastCh = null;
let _suppressNextWsRefresh = false;
function _initBroadcast() {
  if (typeof BroadcastChannel === "undefined") return;
  _broadcastCh?.close();
  _broadcastCh = new BroadcastChannel(`rsbo:inv:${props.sheetId}`);
  _broadcastCh.onmessage = () => { _refreshCachedRows(); };
}
function _closeBroadcast() { _broadcastCh?.close(); _broadcastCh = null; }

// ─── Surgical row refresh (sin skeleton, sin flicker) ─────────────
async function _refreshCachedRows() {
  const cache = getRowCache();
  if (!cache.size || !gridApi.value) return;
  const pageSphs = [...cache.keys()];
  if (!pageSphs.length) return;
  try {
    const { data } = await fetchItems(props.sheetId, _buildFetchQueryForSphRange(pageSphs));
    const freshItems = (data?.data || []).map(_normalizeItem);
    // Actualizar itemsCache: reemplazar entradas para estos SPH
    itemsCache.value = [
      ...itemsCache.value.filter(i => !pageSphs.includes(i.sph)),
      ...freshItems,
    ];
    const realRows = _buildPivotPage(pageSphs, freshItems);
    realRows.forEach(row => {
      cache.set(row.sph, row);
      const node = gridApi.value?.getRowNode(String(row.sph));
      if (node) { node.setData(row); gridApi.value.refreshCells({ rowNodes: [node], force: true }); }
    });
    LOG(`_refreshCachedRows: ${realRows.length} filas actualizadas silenciosamente.`);
  } catch (e) { console.error("[Torico] _refreshCachedRows error:", e); }
}

// ─── WebSocket ────────────────────────────────────────────────────
const _WS_STOCK = new Set(["LAB_ORDER_SCAN", "LAB_ORDER_CANCEL", "LAB_ORDER_RESET", "INVENTORY_CHUNK_SAVED"]);
function _onLabWs(e) {
  if (!_WS_STOCK.has(e?.detail?.type)) return;
  const sheetIds = e.detail?.payload?.sheetIds;
  if (sheetIds && sheetIds.length > 0 && !sheetIds.includes(props.sheetId)) return;
  if (_suppressNextWsRefresh) { _suppressNextWsRefresh = false; return; }
  _refreshCachedRows();
}

onMounted(async () => {
  await loadAll();
  window.addEventListener("lab:ws", _onLabWs);
  _initBroadcast();
  unsavedGuard.restore();
});
onActivated(() => {
  window.addEventListener("lab:ws", _onLabWs);
  _initBroadcast();
  colManager.reattach();
  LOG("onActivated: reactivado desde KeepAlive.");
});
onDeactivated(() => {
  window.removeEventListener("lab:ws", _onLabWs);
  _closeBroadcast();
  LOG("onDeactivated: desactivado por KeepAlive.");
});
onBeforeUnmount(() => {
  window.removeEventListener("lab:ws", _onLabWs);
  _closeBroadcast();
});

watch(() => props.sheetId, async () => {
  _initBroadcast();
  if (dirty.value && pendingChanges.value.size > 0) unsavedGuard.persist();
  pendingChanges.value.clear();
  dirty.value = false;
  gridHistory.clear();
  itemsCache.value = [];
  await loadAll();
  unsavedGuard.restore();
});

watch(() => props.sphType, async () => {
  if (dirty.value && pendingChanges.value.size > 0) unsavedGuard.persist();
  pendingChanges.value.clear();
  dirty.value = false;
  gridHistory.clear();
  itemsCache.value = [];
  await _fetchAllItems();
  await switchViewReload({ clearCache: false });
  unsavedGuard.restore();
});

// ─── Formula bar ─────────────────────────────────────────────────
const formulaValue = ref("");
let activeCell = null;

const onCellClicked = (p) => { activeCell = p; formulaValue.value = p.value; };
const onCellValueChanged = (p) => {
  if (activeCell && activeCell.rowIndex === p.rowIndex && activeCell.colDef.field === p.colDef.field) formulaValue.value = p.newValue;
  if (p.colDef.field.startsWith("cyl_")) {
    const cDisp = parseCylFromField(p.colDef.field);
    if (!Number.isNaN(cDisp)) markCellChanged(p.data.sph, cDisp, p.data[p.colDef.field]);
  }
};

function applyFxToGrid(val, { commit = false } = {}) {
  if (!activeCell || !gridApi.value || activeCell.data?.__loading) return;
  const field = activeCell.colDef?.field;
  if (!field || !field.startsWith("cyl_")) return;
  const cDisp = parseCylFromField(field);
  if (cDisp === null || Number.isNaN(cDisp)) return;
  const raw = String(val ?? "").trim();
  const newVal = isNumeric(raw) ? Number(raw) : 0;
  if (activeCell.data) activeCell.data[field] = newVal;
  if (!commit) {
    gridApi.value.refreshCells?.({ rowNodes: activeCell.node ? [activeCell.node] : undefined, columns: [field], force: true });
    return;
  }
  const updatedRow = { ...(activeCell.data || {}), [field]: newVal };
  const node = gridApi.value.getRowNode(String(updatedRow.sph));
  if (node) { node.setData(updatedRow); gridApi.value.flashCells?.({ rowNodes: [node], columns: [field] }); }
  markCellChanged(updatedRow.sph, cDisp, newVal);
}

const onFxInput  = (val) => applyFxToGrid(val, { commit: false });
const onFxCommit = (val) => applyFxToGrid(val, { commit: true });

// ─── Undo / Redo ─────────────────────────────────────────────────
function applyGridHistoryOp(op) {
  if (!op) return;
  const value = op.reversed ? op.oldValue : op.newValue;
  const [sphStr, cylDispStr] = op.key.split("|");
  const sph = to2(Number(sphStr));
  const cached = getRowCache().get(sph);
  if (cached) {
    cached[op.field] = value;
    const node = gridApi.value?.getRowNode(String(sph));
    if (node) { node.setData({ ...cached }); gridApi.value?.refreshCells({ rowNodes: [node], force: true }); }
  }
  pendingChanges.value.set(op.key, { sph, cyl: -Number(cylDispStr), axis: selectedDegree.value, existencias: value });
  dirty.value = pendingChanges.value.size > 0;
}
const handleGridUndo = () => applyGridHistoryOp(gridHistory.undo());
const handleGridRedo = () => applyGridHistoryOp(gridHistory.redo());

// ─── Grid ready ──────────────────────────────────────────────────
const onGridReady = async (p) => {
  gridApi.value = p.api;
  p.api.setGridOption("datasource", datasource.value);
  await nextTick();
  resetSort();
  colManager.reattach();
  LOG("onGridReady.");
};

// ─── Sort / Filter ────────────────────────────────────────────────
const clearFilters = () => {
  if (!gridApi.value) return;
  const api = gridApi.value;
  if (typeof api.setFilterModel === "function") api.setFilterModel(null);
  else if (typeof api.setGridOption === "function") api.setGridOption("filterModel", null);
};

const resetSort = () => {
  const api = gridApi.value;
  if (!api || typeof api.applyColumnState !== "function") return;
  api.applyColumnState({ defaultState: { sort: null }, state: [{ colId: "sph", sort: props.sphType === "sph-neg" ? "desc" : "asc" }] });
};

const handleToggleFilters = () => clearFilters();

// ─── Navtools handlers ────────────────────────────────────────────
const handleAddRow = async (nuevoValor, ack) => {
  const P = phys.value;
  const sph = to2(nuevoValor);
  if (!Number.isFinite(sph)) return ackErr(ack, "Ingresa SPH numérico", 400);
  if (!isQuarterStep(sph)) return ackErr(ack, "SPH debe ser múltiplo de 0.25 D", 400);
  if (sph < P.sphMin || sph > P.sphMax) return ackErr(ack, `SPH fuera de límites (${P.sphMin} a ${P.sphMax})`, 400);
  if (sphAxis.value.includes(sph)) return ackErr(ack, `SPH ${fmtSigned(sph)} ya existe`, 409);

  try {
    const rows = allCylValues.value.flatMap(cDisp =>
      degreeValues.value.map(deg => ({ sph, cyl: -cDisp, axis: deg, existencias: 0 }))
    );
    const res = await saveChunk(props.sheetId, rows, effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) throw new Error(ok.message);
    ackOk(ack, ok.message || `Fila SPH ${fmtSigned(sph)} agregada`, ok.status);
    lastSavedAt.value = new Date();
    itemsCache.value = [];
    await loadSheetMeta();
    await _fetchAllItems();
    await switchViewReload();
  } catch (e) {
    ackErr(ack, msgFromErr(e, "Error al agregar fila"), statusFromErr(e) || 500);
  }
};

const handleAddColumn = async (nuevoValor, ack) => {
  const P = phys.value;
  const cDisp = to2(Math.abs(Number(nuevoValor)));
  if (!Number.isFinite(cDisp)) return ackErr(ack, "Ingresa CYL numérico", 400);
  if (cDisp > P.cylAbsMax) return ackErr(ack, `CYL fuera de límites (0 a ${P.cylAbsMax})`, 400);
  if (allCylValues.value.includes(cDisp)) return ackErr(ack, `CYL -${cDisp.toFixed(2)} ya existe`, 409);

  try {
    const rows = sphAxis.value.flatMap(sph =>
      degreeValues.value.map(deg => ({ sph, cyl: -cDisp, axis: deg, existencias: 0 }))
    );
    const res = await saveChunk(props.sheetId, rows, effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) throw new Error(ok.message);
    ackOk(ack, ok.message || `Columna CYL -${cDisp.toFixed(2)} agregada`, ok.status);
    lastSavedAt.value = new Date();
    itemsCache.value = [];
    await loadSheetMeta();
    await _fetchAllItems();
    await switchViewReload();
  } catch (e) {
    ackErr(ack, msgFromErr(e, "Error al agregar columna"), statusFromErr(e) || 500);
  }
};

async function handleSave(ack) {
  if (!dirty.value || pendingChanges.value.size === 0) { ackOk(ack, "No hay cambios por guardar.", 200); return; }
  saving.value = true;
  try {
    const rows = Array.from(pendingChanges.value.values());
    const res = await saveChunk(props.sheetId, rows, effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo guardar", ok.status);
    dirty.value = false;
    pendingChanges.value.clear();
    lastSavedAt.value = new Date();
    gridHistory.clear();
    unsavedGuard.clearStorage();
    ackOk(ack, ok.message || "Cambios guardados.", ok.status);
    _suppressNextWsRefresh = true;
    _broadcastCh?.postMessage({ type: "ROWS_CHANGED" });
  } catch (e) {
    console.error("[Torico] Error saveChunk:", e?.response?.data || e);
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
  rowCaches.clear();
  if (gridApi.value) gridApi.value.setGridOption("datasource", datasource.value);
}

async function handleRefresh() {
  itemsCache.value = [];
  await loadSheetMeta();
  await _fetchAllItems();
  await switchViewReload();
  pendingChanges.value.clear();
}

async function handleSeed(ack) {
  try {
    saving.value = true;
    const res = await reseedSheet(props.sheetId, effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo hacer seed", ok.status);
    itemsCache.value = [];
    await loadSheetMeta();
    await _fetchAllItems();
    await switchViewReload();
    lastSavedAt.value = new Date();
    pendingChanges.value.clear();
    ackOk(ack, ok.message || "Seed generado.", ok.status);
  } catch (e) {
    ackErr(ack, msgFromErr(e, "Error al generar seed"), statusFromErr(e));
  } finally {
    saving.value = false;
  }
}

async function handleExport() {
  if (!gridApi.value) return;
  const nameSlug = sheetName.value.replace(/\s+/g, "_");
  const fecha = new Date().toISOString().slice(0, 10);
  await exportAgGridToXlsx(gridApi.value, {
    filename: `reporte_inventario_${nameSlug || "torico"}_${fecha}`,
    sheetName: String(sheetName.value || "Torico").slice(0, 31),
    title: `Inventario — ${sheetName.value || "Tórico"}`,
  });
}
</script>

<style scoped>
.grid-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.grid-topbar { flex:0 0 auto; position:sticky; top:0; z-index:30; }
.navtools-wrap { padding:0.5rem 0.75rem; }
.grid-main { flex:1 1 auto; min-height:0; padding:0 0.75rem 0.75rem; display:flex; flex-direction:column; }

/* ── Degree bar ──────────────────────────────────────────────── */
.degree-bar {
  flex:0 0 auto;
  display:flex; align-items:center; gap:0.5rem;
  padding:0.35rem 0.75rem;
  border-bottom:1px solid rgba(121,87,213,.12);
}
.degree-bar__label { font-size:0.72rem; font-weight:600; color:var(--c-muted,#888); text-transform:uppercase; letter-spacing:.05em; }
.degree-bar__pills { display:flex; flex-wrap:wrap; gap:0.25rem; }
.degree-pill {
  padding:0.2rem 0.55rem; border-radius:999px; border:1px solid rgba(121,87,213,.25);
  background:transparent; font-size:0.72rem; cursor:pointer; color:inherit;
  transition:background .15s,border-color .15s,color .15s;
}
.degree-pill:hover { background:rgba(121,87,213,.08); border-color:rgba(121,87,213,.4); }
.degree-pill--active { background:rgba(121,87,213,.18); border-color:rgba(121,87,213,.6); font-weight:700; }

/* ── Glass shell ─────────────────────────────────────────────── */
.glass-shell {
  flex:1 1 auto; min-height:0;
  border-radius:var(--radius-lg,14px);
  backdrop-filter:blur(14px) saturate(1.4); -webkit-backdrop-filter:blur(14px) saturate(1.4);
  background:rgba(255,255,255,0.06);
  box-shadow:0 0 0 1px rgba(255,255,255,0.12),var(--shadow-md,0 4px 24px rgba(0,0,0,.14));
  overflow:hidden;
  transition:opacity 160ms ease,transform 200ms cubic-bezier(.22,.61,.36,1),filter 160ms ease;
  position:relative;
}
.glass-shell--switching { opacity:0; transform:translate3d(0,8px,0) scale(.992); filter:blur(1.2px); pointer-events:none; }
@media(prefers-reduced-motion:reduce){ .glass-shell{transition:none!important;} }

.dev-col-badge {
  position:absolute; top:6px; right:8px; z-index:10;
  background:rgba(99,102,241,.85); color:#fff;
  font-size:10px; font-family:monospace; padding:2px 7px;
  border-radius:999px; pointer-events:none;
}
.dev-col-badge__spin { margin-left:4px; display:inline-block; animation:spin .8s linear infinite; }
@keyframes spin { to{transform:rotate(360deg);} }

.ag-grid-glass :deep(.ag-root-wrapper) { border:none!important; }
.ag-grid-glass :deep(.ag-header)       { border-bottom:none!important; }
.ag-grid-glass :deep(.ag-row)          { border:none!important; }

.ag-grid-glass :deep(.ag-cell.ag-cell--pinned),
.ag-grid-glass :deep(.ag-header-cell.ag-header-cell--pinned) { background:rgba(121,87,213,.08); font-weight:600; }
.ag-grid-glass :deep(.ag-row-hover) { background:rgba(121,87,213,.06)!important; }

.ag-grid-glass :deep(.ag-row.ag-row--stock-low)  { box-shadow:inset 3px 0 0 rgba(139,92,246,.55); background:rgba(139,92,246,.06); }
.ag-grid-glass :deep(.ag-row.ag-row--stock-zero) { box-shadow:inset 3px 0 0 rgba(99,102,241,.75); background:rgba(99,102,241,.08); }
.ag-grid-glass :deep(.ag-cell.ag-cell--stock-low)  { font-weight:700; background:rgba(139,92,246,.12); border-radius:4px; }
.ag-grid-glass :deep(.ag-cell.ag-cell--stock-zero) { font-weight:800; background:rgba(99,102,241,.15); border-radius:4px; }

.ag-grid-glass :deep(.skeleton-cell) {
  display:block; width:90%; height:10px; border-radius:4px; margin:auto;
  background:linear-gradient(90deg,rgba(148,163,184,.12) 25%,rgba(148,163,184,.28) 50%,rgba(148,163,184,.12) 75%);
  background-size:200% 100%; animation:shimmer 1.6s ease infinite;
}
.ag-grid-glass :deep(.skeleton-cell--cyl) { width:70%; }
@keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }

.ag-grid-glass :deep(.ag-header-cell.ag-header-cell--compact) { padding-inline:6px; font-size:.7rem; text-transform:uppercase; letter-spacing:.04em; }
.ag-grid-glass :deep(.ag-cell.ag-cell--compact) { padding-inline:6px; line-height:1.2; font-size:.75rem; }
.ag-grid-glass :deep(.ag-cell.ag-cell--numeric) { justify-content:flex-end; text-align:right; font-variant-numeric:tabular-nums; }
</style>
