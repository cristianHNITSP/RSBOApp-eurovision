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

const { fetchItems, saveChunk, reseedSheet, getSheet } = useSheetApi(() => props.apiType);

// ─── Helpers ─────────────────────────────────────────────────────
const norm   = (n) => String(to2(n)).replace(".", "_");
const denorm = (s) => Number(String(s).replace("_", "."));

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

const rowKey  = (bi, bd) => `${to2(bi)}|${to2(bd)}`;
const eyes    = ["OD", "OI"];

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

/** Axis de pares base_izq|base_der (determina rowCount) */
const rowAxis = ref([]);          // array de strings `"bi|bd"`
/** ADD axis completo */
const allAddValues = ref([]);
/** rowCaches: Map<sphType, Map<`bi|bd`, rowObj>> — un cache por vista (neg/pos) */
const rowCaches = new Map();
const getRowCache = () => {
  const k = props.sphType;
  if (!rowCaches.has(k)) rowCaches.set(k, new Map());
  return rowCaches.get(k);
};

// ─── Grid history & unsaved guard ────────────────────────────────
const gridHistory = useGridHistory({ maxSize: 300 });

const _guardViewId = computed(() => `${props.sheetId}:progresivo:${props.sphType}`);
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
  allValues: allAddValues,
  gridApiRef: gridApi,
  colChunkSize: COL_CHUNK_SIZE,
  scrollThreshold: 150,
  devMode: DEV_MODE,
});
const activeAddValues = colManager.activeValues;

// ─── Vista / límites ─────────────────────────────────────────────
const baseViewId = computed(() =>
  String(props.sphType || "").toLowerCase().includes("neg") ? "base-neg" : "base-pos"
);

const phys = computed(() => {
  const pl = physicalLimits.value || {};
  return {
    baseMin: numOr(pl?.BASE?.min, -40),
    baseMax: numOr(pl?.BASE?.max,  40),
    addMin:  numOr(pl?.ADD?.min,    0),
    addMax:  numOr(pl?.ADD?.max,    8),
  };
});

const sortDirForView = computed(() => baseViewId.value === "base-neg" ? "desc" : "asc");

// ─── Meta computed ────────────────────────────────────────────────
const effectiveActor = computed(() => {
  const src = props.actor || (typeof window !== "undefined" ? window.__currentUser : null) || null;
  if (!src) return null;
  return { userId: src.userId || src.id || src._id || null, name: src.name || src.email || "Usuario" };
});

const totalRows   = computed(() => rowAxis.value.length);
const sheetName   = computed(() => sheetMeta.value?.nombre || sheetMeta.value?.name || "Hoja progresivo");
const tipoMatriz  = computed(() => sheetMeta.value?.tipo_matriz || "BASE_ADD");
const material    = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);

// ─── Pending changes ─────────────────────────────────────────────
function markCellChanged({ add, eye, base_izq, base_der, existencias, _oldValue }) {
  const a  = to2(add);
  const bi = to2(base_izq ?? 0);
  const bd = to2(base_der ?? 0);
  const key   = `${bi}|${bd}|${a}|${eye}`;
  const field = `add_${norm(a)}_${eye}`;
  const prev  = pendingChanges.value.get(key);
  const oldVal = _oldValue ?? prev?.existencias ?? 0;
  const newVal = Number(existencias ?? 0);

  pendingChanges.value.set(key, { add: a, eye, base_izq: bi, base_der: bd, existencias: newVal });
  dirty.value = true;

  if (!gridHistory.isApplying.value) {
    gridHistory.push({ key, field, oldValue: oldVal, newValue: newVal, meta: { add: a, eye, base_izq: bi, base_der: bd } });
  }
}

// ─── Column defs ─────────────────────────────────────────────────
function makeAddLeaf(field, header, add, eye) {
  return {
    field, headerName: header,
    editable: (p) => !p.data?.__loading,
    filter: "agNumberColumnFilter",
    minWidth: 90, maxWidth: 110,
    resizable: true,
    cellClass: ["ag-cell--compact", "ag-cell--numeric"],
    headerClass: ["ag-header-cell--compact"],
    cellClassRules: {
      ...stockCellClassRules.value,
      "ag-cell--loading": (p) => !!p.data?.__loading,
    },
    cellRenderer: (p) => {
      if (p.data?.__loading) return '<span class="skeleton-cell skeleton-cell--add"></span>';
      const v = p.value;
      return v !== undefined && v !== null ? String(v) : "0";
    },
    valueSetter: (p) => {
      if (p.data?.__loading) return false;
      const raw = String(p.newValue ?? "").trim();
      const newVal = isNumeric(raw) ? Number(raw) : 0;
      const oldVal = Number(p.oldValue ?? 0);
      p.data[field] = newVal;
      const rk = rowKey(p.data.base_izq, p.data.base_der);
      const _rc = getRowCache(); if (_rc.has(rk)) _rc.get(rk)[field] = newVal;
      markCellChanged({ add, eye, base_izq: p.data.base_izq, base_der: p.data.base_der, existencias: newVal, _oldValue: oldVal });
      return true;
    },
  };
}

const columns = computed(() => [
  {
    headerName: "BASE",
    children: [{
      field: "base",
      headerName: "Base",
      pinned: "left",
      width: 120, minWidth: 110, maxWidth: 140,
      editable: false, sortable: true,
      comparator: (a, b) => Number(a) - Number(b),
      resizable: false, filter: "agNumberColumnFilter",
      cellClass: ["ag-cell--compact", "ag-cell--numeric", "ag-cell--pinned"],
      headerClass: ["ag-header-cell--compact", "ag-header-cell--pinned"],
      valueFormatter: (p) => {
        if (p.data?.__loading) return "";
        const bi = Number(p.data?.base_izq);
        const bd = Number(p.data?.base_der);
        if (!Number.isFinite(bi)) return p.value ?? "";
        return Number.isFinite(bd) && bd !== bi ? `${fmtSigned(bi)} / ${fmtSigned(bd)}` : fmtSigned(bi);
      },
      cellRenderer: (p) => p.data?.__loading ? '<span class="skeleton-cell"></span>' : (p.valueFormatted ?? String(p.value ?? "")),
    }],
  },
  {
    headerName: "ADD (+)",
    children: activeAddValues.value.map(add => ({
      headerName: fmtSigned(Number(add)),
      marryChildren: true,
      children: eyes.map(eye => makeAddLeaf(`add_${norm(add)}_${eye}`, eye === "OD" ? "Der." : "Izq.", add, eye)),
    })),
  },
]);

const defaultColDef = {
  resizable: true, sortable: true,
  filter: "agNumberColumnFilter", floatingFilter: true,
  editable: true, minWidth: 90, maxWidth: 150,
  cellClass: "ag-cell--compact", headerClass: "ag-header-cell--compact",
};

const getRowId = (p) => rowKey(p.data.base_izq ?? p.data.base, p.data.base_der ?? p.data.base);

// ─── Fetch helpers ────────────────────────────────────────────────
function _buildFetchQueryForPage(pageKeys) {
  const P = phys.value;
  const allBi = pageKeys.map(k => Number(k.split("|")[0]));
  return { addMin: P.addMin, addMax: P.addMax, baseMin: Math.min(...allBi), baseMax: Math.max(...allBi), limit: 5000 };
}

function _normalizeItem(i) {
  return {
    base_izq: to2(i.base_izq ?? 0),
    base_der: to2(i.base_der ?? 0),
    add: to2(i.add),
    eye: String(i.eye || "OD").toUpperCase(),
    existencias: Number(i.existencias ?? 0),
  };
}

function _buildPivotPage(pageKeys, items) {
  const addAll = allAddValues.value;

  return pageKeys.map(rk => {
    const [bi, bd] = rk.split("|").map(Number);
    const row = { base_izq: bi, base_der: bd, base: bi };

    const pageItems = items.filter(i => i.base_izq === bi && i.base_der === bd);

    addAll.forEach(add => {
      eyes.forEach(eye => {
        const field = `add_${norm(add)}_${eye}`;
        const match = pageItems.find(i => i.add === add && i.eye === eye);
        row[field] = match?.existencias ?? 0;
      });
    });

    // Aplicar cambios pendientes
    pendingChanges.value.forEach((change, key) => {
      const [biStr, bdStr, addStr, eye] = key.split("|");
      if (to2(Number(biStr)) === bi && to2(Number(bdStr)) === bd) {
        const field = `add_${norm(Number(addStr))}_${eye}`;
        if (field in row) row[field] = change.existencias;
      }
    });

    return row;
  });
}

// ─── Datasource ──────────────────────────────────────────────────
const datasource = computed(() => ({
  getRows({ startRow, endRow, successCallback }) {
    const axis = rowAxis.value;
    const pageKeys = axis.slice(startRow, endRow);
    LOG_ROWS(`getRows [${startRow}–${endRow}] ${pageKeys.length} filas BASE`);

    if (!pageKeys.length) { successCallback([], axis.length); return; }

    // ── Cache-first: sin skeleton si todas las filas ya están en caché ──
    const cache = getRowCache();
    if (pageKeys.every(k => cache.has(k))) {
      LOG_ROWS(`getRows [${startRow}–${endRow}]: cache hit total.`);
      successCallback(pageKeys.map(k => cache.get(k)), axis.length);
      return;
    }

    // FASE 1: placeholders
    const addAll = allAddValues.value;
    const nullFields = Object.fromEntries(
      addAll.flatMap(a => eyes.map(eye => [`add_${norm(a)}_${eye}`, null]))
    );
    const loadingRows = pageKeys.map(rk => {
      const [bi, bd] = rk.split("|").map(Number);
      return { base_izq: bi, base_der: bd, base: bi, __loading: true, ...nullFields };
    });
    successCallback(loadingRows, axis.length);
    LOG_ROWS(`FASE 1: ${loadingRows.length} placeholders.`);

    // FASE 2: fetch real
    (async () => {
      try {
        if (DEV_DELAY_MS > 0) { LOG_ROWS(`delay ${DEV_DELAY_MS}ms...`); await sleep(DEV_DELAY_MS); }

        const query = _buildFetchQueryForPage(pageKeys);
        LOG_ROWS("FASE 2: query →", query);
        const { data } = await fetchItems(props.sheetId, query);
        const items = (data?.data || []).map(_normalizeItem);
        LOG_ROWS(`FASE 2: ${items.length} items recibidos.`);

        const realRows = _buildPivotPage(pageKeys, items);
        realRows.forEach(row => getRowCache().set(rowKey(row.base_izq, row.base_der), row));

        if (gridApi.value) {
          let n = 0;
          realRows.forEach(row => {
            const rk = rowKey(row.base_izq, row.base_der);
            const node = gridApi.value.getRowNode(rk);
            if (node) { node.setData(row); gridApi.value.refreshCells({ rowNodes: [node], force: true }); n++; }
          });
          LOG_ROWS(`FASE 2: ${n}/${realRows.length} nodos actualizados.`);
        }
      } catch (e) {
        console.error("[Progresivo][Rows] FASE 2 error:", e);
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
    sheetTabs.value = Array.isArray(payload?.tabs) ? payload.tabs : [];
    physicalLimits.value = payload?.physicalLimits || payload?.physical_limits || null;
    LOG("loadSheetMeta OK");
  } catch (e) {
    console.error("[Progresivo] Error getSheet:", e?.response?.data || e);
  }
}

function _getTab() {
  return (
    sheetTabs.value.find(t => t?.id === baseViewId.value) ||
    sheetTabs.value.find(t => t?.id === "base-add") ||
    sheetTabs.value[0] ||
    null
  );
}

function _rebuildAxes() {
  const P = phys.value;
  const tab = _getTab();

  const defAddCols = Array.isArray(tab?.axis?.add) ? tab.axis.add.map(to2) : [];
  const defBases   = Array.isArray(tab?.axis?.base) ? tab.axis.base.map(to2) : [];

  allAddValues.value = [...new Set(defAddCols)]
    .filter(a => Number.isFinite(a) && a >= P.addMin && a <= P.addMax)
    .sort((a, b) => a - b);

  const inView = baseViewId.value === "base-neg" ? (b) => Number(b) <= 0 : (b) => Number(b) >= 0;
  const sortDir = sortDirForView.value;

  const baseKeys = [...new Set(
    defBases
      .filter(b => b >= P.baseMin && b <= P.baseMax && inView(b))
      .map(b => `${to2(b)}|${to2(b)}`)
  )].sort((a, b) => {
    const [abi] = a.split("|").map(Number);
    const [bbi] = b.split("|").map(Number);
    return sortDir === "desc" ? bbi - abi : abi - bbi;
  });

  rowAxis.value = baseKeys;
  LOG("_rebuildAxes:", { rows: rowAxis.value.length, addCols: allAddValues.value.length });
}

async function loadAll() {
  LOG("loadAll...");
  await loadSheetMeta();
  await switchViewReload();
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
    console.error("[Progresivo] switchViewReload error:", e);
  } finally {
    await raf();
    switchingView.value = false;
  }
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
  const pageKeys = [...cache.keys()];
  if (!pageKeys.length) return;
  try {
    const { data } = await fetchItems(props.sheetId, _buildFetchQueryForPage(pageKeys));
    const items = (data?.data || []).map(_normalizeItem);
    const realRows = _buildPivotPage(pageKeys, items);
    realRows.forEach(row => {
      const rk = rowKey(row.base_izq, row.base_der);
      cache.set(rk, row);
      const node = gridApi.value?.getRowNode(rk);
      if (node) { node.setData(row); gridApi.value.refreshCells({ rowNodes: [node], force: true }); }
    });
    LOG(`_refreshCachedRows: ${realRows.length} filas actualizadas silenciosamente.`);
  } catch (e) { console.error("[Progresivo] _refreshCachedRows error:", e); }
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
  if (p.colDef.field.startsWith("add_")) {
    const meta = parseAddEyeFromField(p.colDef.field);
    if (meta) markCellChanged({ add: meta.add, eye: meta.eye, base_izq: p.data.base_izq ?? p.data.base, base_der: p.data.base_der ?? p.data.base, existencias: p.data[p.colDef.field] });
  }
};

function applyFxToGrid(val, { commit = false } = {}) {
  if (!activeCell || !gridApi.value || activeCell.data?.__loading) return;
  const field = activeCell.colDef?.field;
  if (!field || !field.startsWith("add_")) return;
  const meta = parseAddEyeFromField(field);
  if (!meta) return;
  const raw = String(val ?? "").trim();
  const newVal = isNumeric(raw) ? Number(raw) : 0;
  if (activeCell.data) activeCell.data[field] = newVal;
  if (!commit) {
    gridApi.value.refreshCells?.({ rowNodes: activeCell.node ? [activeCell.node] : undefined, columns: [field], force: true });
    return;
  }
  const updatedRow = { ...(activeCell.data || {}), [field]: newVal };
  const rk = rowKey(updatedRow.base_izq ?? updatedRow.base, updatedRow.base_der ?? updatedRow.base);
  const node = gridApi.value.getRowNode(rk);
  if (node) { node.setData(updatedRow); gridApi.value.flashCells?.({ rowNodes: [node], columns: [field] }); }
  markCellChanged({ add: meta.add, eye: meta.eye, base_izq: updatedRow.base_izq ?? updatedRow.base, base_der: updatedRow.base_der ?? updatedRow.base, existencias: newVal });
}

const onFxInput  = (val) => applyFxToGrid(val, { commit: false });
const onFxCommit = (val) => applyFxToGrid(val, { commit: true });

// ─── Undo / Redo ─────────────────────────────────────────────────
function applyGridHistoryOp(op) {
  if (!op) return;
  const value = op.reversed ? op.oldValue : op.newValue;
  const [biStr, bdStr] = op.key.split("|");
  const bi = to2(Number(biStr));
  const bd = to2(Number(bdStr));
  const rk = rowKey(bi, bd);
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
  api.applyColumnState({ defaultState: { sort: null }, state: [{ colId: "base", sort: sortDirForView.value }] });
};

const handleToggleFilters = () => clearFilters();

// ─── Navtools handlers ────────────────────────────────────────────
const handleAddRow = async (nuevoValor, ack) => {
  const P = phys.value;
  const base = to2(nuevoValor);
  if (!Number.isFinite(base)) return ackErr(ack, "Ingresa BASE numérica", 400);
  if (base < P.baseMin || base > P.baseMax) return ackErr(ack, `BASE fuera de límites (${P.baseMin} a ${P.baseMax})`, 400);
  const rk = rowKey(base, base);
  if (rowAxis.value.includes(rk)) return ackErr(ack, `BASE ${fmtSigned(base)} ya existe`, 409);

  try {
    const rows = allAddValues.value.flatMap(a => eyes.map(eye => ({ base_izq: base, base_der: base, add: a, eye, existencias: 0 })));
    const res = await saveChunk(props.sheetId, rows, effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) throw new Error(ok.message);
    ackOk(ack, ok.message || `Fila BASE ${fmtSigned(base)} agregada`, ok.status);
    lastSavedAt.value = new Date();
    await loadSheetMeta();
    await switchViewReload();
  } catch (e) {
    ackErr(ack, msgFromErr(e, "Error al agregar fila"), statusFromErr(e) || 500);
  }
};

const handleAddColumn = async (nuevoValor, ack) => {
  const P = phys.value;
  const add = to2(nuevoValor);
  if (!Number.isFinite(add)) return ackErr(ack, "Ingresa ADD numérico", 400);
  if (add < P.addMin || add > P.addMax) return ackErr(ack, `ADD fuera de límites (${P.addMin} a ${P.addMax})`, 400);
  if (allAddValues.value.includes(add)) return ackErr(ack, `ADD ${fmtSigned(add)} ya existe`, 409);

  try {
    const rows = rowAxis.value.flatMap(rk => {
      const [bi, bd] = rk.split("|").map(Number);
      return eyes.map(eye => ({ base_izq: bi, base_der: bd, add, eye, existencias: 0 }));
    });
    const res = await saveChunk(props.sheetId, rows, effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) throw new Error(ok.message);
    ackOk(ack, ok.message || `Columna ADD ${fmtSigned(add)} agregada`, ok.status);
    lastSavedAt.value = new Date();
    await loadSheetMeta();
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
    console.error("[Progresivo] Error saveChunk:", e?.response?.data || e);
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
    filename: `reporte_inventario_${nameSlug || "progresivo"}_${fecha}`,
    sheetName: String(sheetName.value || "Progresivo").slice(0, 31),
    title: `Inventario — ${sheetName.value || "Progresivo"}`,
  });
}
</script>

<style scoped>
.grid-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.grid-topbar { flex:0 0 auto; position:sticky; top:0; z-index:30; }
.navtools-wrap { padding:0.5rem 0.75rem; }
.grid-main { flex:1 1 auto; min-height:0; padding:0 0.75rem 0.75rem; display:flex; flex-direction:column; }

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
.ag-grid-glass :deep(.skeleton-cell--add) { width:70%; }
@keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }

.ag-grid-glass :deep(.ag-header-cell.ag-header-cell--compact) { padding-inline:6px; font-size:.7rem; text-transform:uppercase; letter-spacing:.04em; }
.ag-grid-glass :deep(.ag-cell.ag-cell--compact) { padding-inline:6px; line-height:1.2; font-size:.75rem; }
.ag-grid-glass :deep(.ag-cell.ag-cell--numeric) { justify-content:flex-end; text-align:right; font-variant-numeric:tabular-nums; }
</style>
