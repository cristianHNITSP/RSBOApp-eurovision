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
      <div
        class="glass-shell"
        :class="{ 'glass-shell--switching': switchingView }"
      >
        <div v-if="DEV_MODE" class="dev-row-badge">
          {{ baseAxis.length }} filas BASE
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
  numOr, isNumeric, to2, fmtSigned, isMultipleOfStep,
} from "@/composables/useAgGridBase";
import { useStockRules } from "@/composables/useStockRules";

ModuleRegistry.registerModules([AllCommunityModule]);

const DEV_MODE      = import.meta.env.DEV;
const DEV_DELAY_MS  = DEV_MODE ? 2000 : 0;
const ROW_PAGE_SIZE = DEV_MODE ? 5 : 30;

const LOG      = (...a) => DEV_MODE && console.log("[Base]", ...a);
const LOG_ROWS = (...a) => DEV_MODE && console.log("[Base][Rows]", ...a);

const props = defineProps({
  sheetId: { type: String, required: true },
  sphType: { type: String, default: "base-pos" }, // base-neg | base-pos
  actor:   { type: Object, default: null },
  apiType: { type: String, default: "inventory" },
});

const { fetchItems, saveChunk, reseedSheet, getSheet } = useSheetApi(() => props.apiType);

// ─── Helpers ─────────────────────────────────────────────────────
const BASE_STEP = 0.25;
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
const pendingChanges = ref(new Map());

/** Axis completo de BASE values (source of truth para rowCount) */
const baseAxis = ref([]);
/** rowCaches: Map<sphType, Map<String(base), row>> — un cache por vista (neg/pos) */
const rowCaches = new Map();
const getRowCache = () => {
  const k = props.sphType;
  if (!rowCaches.has(k)) rowCaches.set(k, new Map());
  return rowCaches.get(k);
};

// ─── Grid history & unsaved guard ────────────────────────────────
const gridHistory = useGridHistory({ maxSize: 300 });

const _guardViewId = computed(() => `${props.sheetId}:base:${props.sphType}`);
const unsavedGuard = useUnsavedGuard({
  storageKey: () => _guardViewId.value,
  isDirty: () => dirty.value,
  getPending: () => Object.fromEntries(pendingChanges.value),
  onRestore(saved) {
    let discarded = 0;
    for (const [k, v] of Object.entries(saved)) {
      const baseVal = to2(v?.base);
      if (!Number.isFinite(baseVal) || !isMultipleOfStep(baseVal, BASE_STEP)) { discarded++; continue; }
      pendingChanges.value.set(k, v);
      // Actualizar cache si la fila ya fue cargada
      const _rc = getRowCache(); if (_rc.has(k)) _rc.get(k).existencias = v.existencias;
    }
    if (discarded > 0) LOG(`onRestore: ${discarded} entrada(s) con base inválida descartadas.`);
    if (pendingChanges.value.size > 0) {
      dirty.value = true;
      labToast.warning(`Se restauraron ${pendingChanges.value.size} cambios sin guardar.`);
    }
  },
});

// ─── Composables ─────────────────────────────────────────────────
const { themeCustom } = useAgGridBase();
const { stockRowClassRules, stockCellClassRules } = useStockRules(sheetMeta);

// ─── Vista / límites ─────────────────────────────────────────────
const phys = computed(() => {
  const pl = physicalLimits.value || {};
  return {
    baseMin: to2(numOr(pl?.BASE?.min, -40)),
    baseMax: to2(numOr(pl?.BASE?.max,  40)),
  };
});

const baseViewId = computed(() =>
  String(props.sphType || "").toLowerCase().includes("neg") ? "base-neg" : "base-pos"
);
const baseFilterDisplay = computed(() =>
  baseViewId.value === "base-neg" ? (n) => Number(n) <= 0 : (n) => Number(n) >= 0
);
const baseFilterNewRow = computed(() =>
  baseViewId.value === "base-neg" ? (n) => Number(n) < 0 : (n) => Number(n) >= 0
);
const sortDirForView = computed(() => baseViewId.value === "base-neg" ? "desc" : "asc");

// ─── Meta computed ────────────────────────────────────────────────
const effectiveActor = computed(() => {
  const src = props.actor || (typeof window !== "undefined" ? window.__currentUser : null) || null;
  if (!src) return null;
  return { userId: src.userId || src.id || src._id || null, name: src.name || src.email || "Usuario" };
});

const totalRows   = computed(() => baseAxis.value.length);
const sheetName   = computed(() => sheetMeta.value?.nombre || sheetMeta.value?.name || "Hoja BASE");
const tipoMatriz  = computed(() => sheetMeta.value?.tipo_matriz || "BASE");
const material    = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);

// ─── Pending changes ─────────────────────────────────────────────
function markChanged({ base, existencias, _oldValue }) {
  const b = to2(base);
  const key = String(b);
  const prev = pendingChanges.value.get(key);
  const oldVal = _oldValue ?? prev?.existencias ?? 0;
  const newVal = Number(existencias ?? 0);

  pendingChanges.value.set(key, { base: b, existencias: newVal });
  dirty.value = true;

  if (!gridHistory.isApplying.value) {
    gridHistory.push({ key, field: "existencias", oldValue: oldVal, newValue: newVal, meta: { base: b } });
  }
}

// ─── Column defs ─────────────────────────────────────────────────
const columns = computed(() => [
  {
    headerName: "BASE",
    children: [{
      field: "base",
      headerName: "Base",
      pinned: "left",
      width: 140, minWidth: 130, maxWidth: 170,
      editable: false, sortable: true,
      comparator: (a, b) => Number(a) - Number(b),
      filter: "agNumberColumnFilter",
      resizable: false,
      cellClass: ["ag-cell--compact", "ag-cell--numeric", "ag-cell--pinned"],
      headerClass: ["ag-header-cell--compact", "ag-header-cell--pinned"],
      valueFormatter: (p) => { if (p.data?.__loading) return ""; return fmtSigned(p.value); },
      cellRenderer: (p) => p.data?.__loading
        ? '<span class="skeleton-cell"></span>'
        : (p.valueFormatted ?? String(p.value ?? "")),
    }],
  },
  {
    headerName: "EXISTENCIAS",
    children: [{
      field: "existencias",
      headerName: "Stock",
      editable: (p) => !p.data?.__loading,
      minWidth: 110, maxWidth: 140,
      filter: "agNumberColumnFilter",
      cellClass: ["ag-cell--compact", "ag-cell--numeric"],
      headerClass: ["ag-header-cell--compact"],
      cellClassRules: {
        ...stockCellClassRules.value,
        "ag-cell--loading": (p) => !!p.data?.__loading,
      },
      cellRenderer: (p) => {
        if (p.data?.__loading) return '<span class="skeleton-cell skeleton-cell--stock"></span>';
        const v = p.value;
        return v !== undefined && v !== null ? String(v) : "0";
      },
      valueSetter: (p) => {
        if (p.data?.__loading) return false;
        const raw = String(p.newValue ?? "").trim();
        const newVal = isNumeric(raw) ? Number(raw) : 0;
        const oldVal = Number(p.oldValue ?? 0);
        p.data.existencias = newVal;
        const key = String(to2(p.data.base));
        const _rc = getRowCache(); if (_rc.has(key)) _rc.get(key).existencias = newVal;
        markChanged({ base: p.data.base, existencias: newVal, _oldValue: oldVal });
        return true;
      },
    }],
  },
]);

const defaultColDef = {
  resizable: true, sortable: true,
  filter: "agNumberColumnFilter", floatingFilter: true,
  editable: true, minWidth: 90, maxWidth: 150,
  cellClass: "ag-cell--compact", headerClass: "ag-header-cell--compact",
};

const getRowId = (p) => String(to2(p.data.base));

// ─── Fetch helpers ────────────────────────────────────────────────
function _buildFetchQuery(pageBases) {
  return {
    baseMin: Math.min(...pageBases),
    baseMax: Math.max(...pageBases),
    limit: 5000,
  };
}

// ─── Datasource (infinite row model) ─────────────────────────────
const datasource = computed(() => ({
  getRows({ startRow, endRow, successCallback }) {
    const axis = baseAxis.value;
    const pageBases = axis.slice(startRow, endRow);
    LOG_ROWS(`getRows [${startRow}–${endRow}] BASE [${pageBases[0] ?? "?"}…${pageBases.at(-1) ?? "?"}] (${pageBases.length} filas)`);

    if (!pageBases.length) { successCallback([], axis.length); return; }

    // ── Cache-first: si todas las filas de la página ya están en caché → sin skeleton ──
    const cache = getRowCache();
    if (pageBases.every(b => cache.has(String(to2(b))))) {
      LOG_ROWS(`getRows [${startRow}–${endRow}]: cache hit total.`);
      successCallback(pageBases.map(b => cache.get(String(to2(b)))), axis.length);
      return;
    }

    // FASE 1: placeholders inmediatos
    const loadingRows = pageBases.map(base => ({ base, existencias: null, __loading: true }));
    successCallback(loadingRows, axis.length);
    LOG_ROWS(`FASE 1: ${loadingRows.length} placeholders enviados.`);

    // FASE 2: fetch real
    (async () => {
      try {
        if (DEV_DELAY_MS > 0) { LOG_ROWS(`FASE 2: delay ${DEV_DELAY_MS}ms...`); await sleep(DEV_DELAY_MS); }

        const query = _buildFetchQuery(pageBases);
        LOG_ROWS("FASE 2: query →", query);
        const { data } = await fetchItems(props.sheetId, query);
        const items = data?.data || [];

        const map = new Map(items.map(i => [String(to2(i.base)), Number(i.existencias ?? 0)]));
        LOG_ROWS(`FASE 2: ${items.length} items recibidos del backend.`);

        const realRows = pageBases.map(base => {
          const key = String(to2(base));
          const row = { base, existencias: map.get(key) ?? 0 };
          if (pendingChanges.value.has(key)) row.existencias = pendingChanges.value.get(key).existencias;
          return row;
        });

        // Guardar en caché (usa la referencia capturada ANTES del await, inmune a race condition de sphType)
        realRows.forEach(row => cache.set(String(to2(row.base)), row));

        // Actualizar nodos en el grid
        if (gridApi.value) {
          let n = 0;
          realRows.forEach(row => {
            const node = gridApi.value.getRowNode(String(to2(row.base)));
            if (node) { node.setData(row); gridApi.value.refreshCells({ rowNodes: [node], force: true }); n++; }
          });
          LOG_ROWS(`FASE 2: ${n}/${realRows.length} nodos actualizados.`);
        }
      } catch (e) {
        console.error("[Base][Rows] FASE 2 error:", e);
      }
    })();
  },
}));

// ─── Carga de metadata & axis ────────────────────────────────────
async function loadSheetMeta() {
  try {
    const { data } = await getSheet(props.sheetId);
    const payload = data?.data || data;
    sheetMeta.value = payload?.sheet || null;
    sheetTabs.value = Array.isArray(payload?.tabs) ? payload.tabs : [];
    physicalLimits.value = payload?.physicalLimits || payload?.physical_limits || null;
    LOG("loadSheetMeta OK");
  } catch (e) {
    console.error("[Base] Error getSheet:", e?.response?.data || e);
  }
}

function _getTabForView() {
  return (
    sheetTabs.value.find(t => t?.id === baseViewId.value) ||
    sheetTabs.value.find(t => String(t?.id || "").includes("base")) ||
    null
  );
}

function _rebuildAxis() {
  const P = phys.value;
  const tab = _getTabForView();
  const backendAxis = Array.isArray(tab?.axis?.base) ? tab.axis.base : [];

  baseAxis.value = [...new Set(backendAxis.map(to2))]
    .filter(b => Number.isFinite(b) && b >= P.baseMin && b <= P.baseMax && baseFilterDisplay.value(b))
    .sort((a, b) => sortDirForView.value === "desc" ? b - a : a - b);

  LOG("_rebuildAxis:", { filas: baseAxis.value.length, rango: `${baseAxis.value[0] ?? "?"} → ${baseAxis.value.at(-1) ?? "?"}` });
}

async function switchViewReload({ clearCache = true } = {}) {
  switchingView.value = true;
  await raf();
  try {
    _rebuildAxis();
    if (clearCache) rowCaches.clear();

    if (gridApi.value) {
      gridApi.value.setGridOption("datasource", datasource.value);
      LOG("datasource reseteado.");
    }
  } catch (e) {
    console.error("[Base] switchViewReload error:", e);
  } finally {
    await raf();
    switchingView.value = false;
  }
}

async function loadAll() {
  LOG("loadAll...");
  await loadSheetMeta();
  await switchViewReload();
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
  const bases = [...cache.keys()].map(k => to2(Number(k)));
  if (!bases.length) return;
  try {
    const { data } = await fetchItems(props.sheetId, _buildFetchQuery(bases));
    const items = data?.data || [];
    const map = new Map(items.map(i => [String(to2(i.base)), Number(i.existencias ?? 0)]));
    bases.forEach(base => {
      const key = String(to2(base));
      const row = cache.get(key);
      if (!row) return;
      row.existencias = map.get(key) ?? row.existencias;
      const node = gridApi.value?.getRowNode(key);
      if (node) { node.setData({ ...row }); gridApi.value.refreshCells({ rowNodes: [node], force: true }); }
    });
    LOG(`_refreshCachedRows: ${bases.length} filas actualizadas silenciosamente.`);
  } catch (e) { console.error("[Base] _refreshCachedRows error:", e); }
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

watch(() => props.sheetId, () => { _initBroadcast(); });

watch(() => props.sphType, async () => {
  if (dirty.value && pendingChanges.value.size > 0) unsavedGuard.persist();
  pendingChanges.value.clear();
  dirty.value = false;
  gridHistory.clear();
  await switchViewReload({ clearCache: false });
  unsavedGuard.restore();
});

// ─── Formula bar ─────────────────────────────────────────────────
const formulaValue = ref("");
let activeCell = null;

const onCellClicked = (p) => { activeCell = p; formulaValue.value = p.value; };
const onCellValueChanged = (p) => {
  if (activeCell && activeCell.rowIndex === p.rowIndex && activeCell.colDef.field === p.colDef.field) formulaValue.value = p.newValue;
  if (p.colDef.field === "existencias") markChanged({ base: p.data.base, existencias: p.data.existencias });
};

function applyFxToGrid(val, { commit = false } = {}) {
  if (!activeCell || !gridApi.value || activeCell.data?.__loading) return;
  const field = activeCell.colDef.field;
  if (field !== "existencias") return;
  const raw = String(val ?? "").trim();
  if (!commit) { if (raw === "" || !isNumeric(raw)) return; }
  const newVal = isNumeric(raw) ? Number(raw) : 0;
  if (!commit && Number(activeCell.data?.[field] ?? 0) === newVal) return;
  if (activeCell.data) activeCell.data[field] = newVal;
  if (!commit) {
    gridApi.value.refreshCells?.({ rowNodes: activeCell.node ? [activeCell.node] : undefined, columns: [field], force: true });
    return;
  }
  const updatedRow = { ...(activeCell.data || {}), [field]: newVal };
  const node = gridApi.value.getRowNode(String(to2(updatedRow.base)));
  if (node) { node.setData(updatedRow); gridApi.value.flashCells?.({ rowNodes: [node], columns: [field] }); }
  markChanged({ base: updatedRow.base, existencias: newVal });
}

const onFxInput  = (val) => applyFxToGrid(val, { commit: false });
const onFxCommit = (val) => applyFxToGrid(val, { commit: true });

// ─── Undo / Redo ─────────────────────────────────────────────────
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
  pendingChanges.value.set(key, { base, existencias: value });
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
  api.applyColumnState({ defaultState: { sort: null }, state: [{ colId: "base", sort: sortDirForView.value }] });
};

const handleToggleFilters = () => clearFilters();

// ─── Navtools handlers ────────────────────────────────────────────
const handleAddRow = async (nuevoValor, ack) => {
  const P = phys.value;
  const base = to2(nuevoValor);

  if (!Number.isFinite(base))
    return ackErr(ack, "Ingresa BASE numérica", 400);
  if (!isMultipleOfStep(base, BASE_STEP))
    return ackErr(ack, `BASE debe ser múltiplo de 0.25 D (ej: 0.25, 0.50…)`, 400);
  if (base < P.baseMin || base > P.baseMax)
    return ackErr(ack, `BASE fuera de límites (${P.baseMin} a ${P.baseMax})`, 400);
  if (!baseFilterNewRow.value(base))
    return ackErr(ack, baseViewId.value === "base-neg"
      ? "Esta vista es BASE (-): la BASE debe ser negativa"
      : "Esta vista es BASE (+): la BASE debe ser 0 o positiva", 400);
  if (baseAxis.value.includes(base))
    return ackErr(ack, `BASE ${fmtSigned(base)} ya existe`, 409);

  try {
    const res = await saveChunk(props.sheetId, [{ base, existencias: 0 }], effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) throw new Error(ok.message || "No se pudo agregar la fila");
    ackOk(ack, ok.message || `Fila agregada: BASE ${fmtSigned(base)}`, ok.status);
    lastSavedAt.value = new Date();
    // Reload meta → rebuild axis → reset datasource (la fila aparece sola)
    await loadSheetMeta();
    await switchViewReload();
  } catch (e) {
    ackErr(ack, msgFromErr(e, "Error al guardar la nueva BASE"), statusFromErr(e) || 500);
  }
};

async function handleSave(ack) {
  if (!dirty.value || pendingChanges.value.size === 0) { ackOk(ack, "No hay cambios por guardar.", 200); return; }
  saving.value = true;
  try {
    const rows = Array.from(pendingChanges.value.values())
      .filter(r => Number.isFinite(to2(r.base)) && isMultipleOfStep(to2(r.base), BASE_STEP));
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
    console.error("[Base] Error saveChunk:", e?.response?.data || e);
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
  getRowCache().clear();
  if (gridApi.value) gridApi.value.setGridOption("datasource", datasource.value);
}

async function handleRefresh() {
  await loadSheetMeta();
  await switchViewReload();
  pendingChanges.value.clear();
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
    ackOk(ack, ok.message || "Seed generado.", ok.status);
  } catch (e) {
    console.error("[Base] Error reseed:", e?.response?.data || e);
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
    filename: `reporte_inventario_${nameSlug || "base"}_${fecha}`,
    sheetName: String(sheetName.value || "Base").slice(0, 31),
    title: `Inventario — ${sheetName.value || "Base"}`,
  });
}
</script>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────── */
.grid-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.grid-topbar { flex:0 0 auto; position:sticky; top:0; z-index:30; }
.navtools-wrap { padding:0.5rem 0.75rem; }
.grid-main {
  flex:1 1 auto; min-height:0;
  padding:0 0.75rem 0.75rem;
  display:flex; flex-direction:column;
}

/* ── Glassmorphism shell ─────────────────────────────────────── */
.glass-shell {
  flex:1 1 auto; min-height:0;
  border-radius:var(--radius-lg, 14px);
  backdrop-filter:blur(14px) saturate(1.4);
  -webkit-backdrop-filter:blur(14px) saturate(1.4);
  background:rgba(255, 255, 255, 0.06);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.12),
    var(--shadow-md, 0 4px 24px rgba(0, 0, 0, 0.14));
  overflow:hidden;
  transition:opacity 160ms ease, transform 200ms cubic-bezier(.22,.61,.36,1), filter 160ms ease;
  will-change:opacity, transform, filter;
  position:relative;
}
.glass-shell--switching {
  opacity:0;
  transform:translate3d(0, 8px, 0) scale(.992);
  filter:blur(1.2px);
  pointer-events:none;
}
@media (prefers-reduced-motion:reduce) { .glass-shell { transition:none !important; } }

/* ── Dev badge ───────────────────────────────────────────────── */
.dev-row-badge {
  position:absolute; top:6px; right:8px; z-index:10;
  background:rgba(99, 102, 241, .85); color:#fff;
  font-size:10px; font-family:monospace; padding:2px 7px;
  border-radius:999px; pointer-events:none;
}

/* ── No-line rule overrides ──────────────────────────────────── */
.ag-grid-glass :deep(.ag-root-wrapper) { border:none !important; }
.ag-grid-glass :deep(.ag-header)       { border-bottom:none !important; }
.ag-grid-glass :deep(.ag-row)          { border:none !important; }

/* ── Pinned column ───────────────────────────────────────────── */
.ag-grid-glass :deep(.ag-cell.ag-cell--pinned),
.ag-grid-glass :deep(.ag-header-cell.ag-header-cell--pinned) {
  background:rgba(121, 87, 213, .08); font-weight:600;
}

/* ── Hover ───────────────────────────────────────────────────── */
.ag-grid-glass :deep(.ag-row-hover) { background:rgba(121, 87, 213, .06) !important; }

/* ── Stock alerts ────────────────────────────────────────────── */
.ag-grid-glass :deep(.ag-row.ag-row--stock-low)  { box-shadow:inset 3px 0 0 rgba(139,92,246,.55);  background:rgba(139,92,246,.06); }
.ag-grid-glass :deep(.ag-row.ag-row--stock-zero) { box-shadow:inset 3px 0 0 rgba(99,102,241,.75);  background:rgba(99,102,241,.08); }
.ag-grid-glass :deep(.ag-cell.ag-cell--stock-low)  { font-weight:700; background:rgba(139,92,246,.12); border-radius:4px; }
.ag-grid-glass :deep(.ag-cell.ag-cell--stock-zero) { font-weight:800; background:rgba(99,102,241,.15); border-radius:4px; }

/* ── Skeleton shimmer ────────────────────────────────────────── */
.ag-grid-glass :deep(.skeleton-cell) {
  display:block; width:90%; height:10px; border-radius:4px; margin:auto;
  background:linear-gradient(90deg, rgba(148,163,184,.12) 25%, rgba(148,163,184,.28) 50%, rgba(148,163,184,.12) 75%);
  background-size:200% 100%;
  animation:shimmer 1.6s ease infinite;
}
.ag-grid-glass :deep(.skeleton-cell--stock) { width:60%; }
@keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }

/* ── Compact ─────────────────────────────────────────────────── */
.ag-grid-glass :deep(.ag-header-cell.ag-header-cell--compact) { padding-inline:6px; font-size:.7rem; text-transform:uppercase; letter-spacing:.04em; }
.ag-grid-glass :deep(.ag-cell.ag-cell--compact) { padding-inline:6px; line-height:1.2; font-size:.75rem; }
.ag-grid-glass :deep(.ag-cell.ag-cell--numeric) { justify-content:flex-end; text-align:right; font-variant-numeric:tabular-nums; }
</style>
