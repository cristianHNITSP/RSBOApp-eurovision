<!-- ============================================================
  AgGridSheet.vue — Componente unificado para las 5 matrices.

  Reemplaza AgGridBase/Monofocal/Bifocal/Progresivo/Torico.
  Lo común vive aquí UNA vez; lo que difiere lo aporta el
  "descriptor" resuelto por tipo_matriz (descriptors/*).

  Client-Side Row Model NATIVO:
   - un único fetch por vista → pivot → rowData (sin datasource/bloques)
   - sin skeletons (filas siempre cargadas; overlay nativo en la carga)
   - paginación nativa (solo display, no pega al servidor)
   - Tórico: memo de hasta 3 grados (gridConfig.toricoLruSize)
  ============================================================ -->
<template>
  <div
    class="grid-page"
    :class="{ 'is-fullscreen': isFullscreen, 'ag-grid-fullscreen-container': isFullscreen, 'is-hibernating': isHibernating }"
    ref="gridPageRef"
  >
    <header class="grid-topbar">
      <navtools
        class="navtools-wrap"
        v-model="formulaValue"
        :auto-save="true"
        :dirty="false"
        :saving="saving"
        :total-rows="totalRows"
        :sheet-name="sheetName"
        :tipo-matriz="tipoMatrizLabel"
        :material="material"
        :tratamientos="tratamientos"
        :last-saved-at="lastSavedAt"
        :last-history-action="lastHistoryAction"
        :grid-can-undo="gridHistory.canUndo.value"
        :grid-can-redo="gridHistory.canRedo.value"
        :is-fullscreen="isFullscreen"
        :internal-tabs="internalTabs"
        :active-internal-tab="sphType"
        @toggle-fullscreen="toggleFullscreen(gridPageRef)"
        @update:internal="$emit('update:internal', $event)"
        @add-row="handleAddRow"
        @add-column="handleAddColumn"
        @toggle-filters="handleToggleFilters"
        @clear-filters="clearFilters"
        @reset-sort="resetSort"
        @save-request="onSaveRequest"
        @discard-changes="handleDiscard"
        @refresh="handleRefresh"
        @seed="handleSeed"
        @export="handleExport"
        @fx-input="onFxInput"
        @fx-commit="(val) => onFxCommit(val, { rowIdGetter: descriptor.getRowId })"
        @grid-undo="handleGridUndo"
        @grid-redo="handleGridRedo"
      />
    </header>

    <!-- Selector de grados (solo Tórico) -->
    <div v-if="descriptor && descriptor.ext?.degreeBar" class="degree-bar">
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
        <Transition name="veil">
          <div v-if="showVeil" class="grid-loading-veil">
            <div class="grid-loading-veil__spinner"></div>
            <span class="grid-loading-veil__label">Cargando planilla…</span>
          </div>
        </Transition>

        <AgGridVue
          v-if="sheetMeta && descriptor"
          class="ag-grid-glass"
          :columnDefs="columns"
          :rowData="gridRows"
          :defaultColDef="defaultColDef"
          :getRowId="getRowId"
          :animateRows="false"
          :localeText="localeText"
          :theme="themeCustom"
          :rowHeight="GRID_CONFIG.rowHeight"
          :headerHeight="GRID_CONFIG.headerHeight"
          :suppressMovableColumns="true"
          :rowClassRules="stockRowClassRules.value"
          :pagination="GRID_CONFIG.pagination"
          :paginationPageSize="GRID_CONFIG.paginationPageSize"
          :paginationPageSizeSelector="GRID_CONFIG.paginationPageSizeSelector"
          :suppressHorizontalScroll="false"
          :enableCellTextSelection="true"
          :tooltipShowDelay="400"
          :tooltipMouseTrack="true"
          :components="gridComponents"
          :context="gridContext"
          @cellClicked="onCellClicked"
          @cellValueChanged="onCellValueChanged"
          @grid-ready="onGridReady"
          style="width: 100%; height: 100%;"
        />
      </div>

      <!-- Footer con métricas de filas/columnas
      <div class="grid-footer">
        <span class="grid-footer__count">
          <span class="grid-footer__metric">Filas: {{ totalRows }}</span>
          <span class="grid-footer__sep">·</span>
          <span class="grid-footer__metric">Columnas: {{ colCount }}</span>
        </span>
      </div>
      --> 

    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, toRefs } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import navtools from "@/components/ag-grid/navtools.vue";

import { useVisualHibernation } from "@/composables/ag-grid/useVisualHibernation";
import { useSheetApi } from "@/composables/api/useSheetApi";
import { useStockRules } from "@/composables/ag-grid/useStockRules";
import {
  useAgGridBase, localeText, ackOk, ackErr, msgFromErr, statusFromErr, normalizeAxiosOk,
} from "@/composables/ag-grid/useAgGridBase";
import { useAgGridIntegration } from "@/composables/ag-grid/useAgGridIntegration";
import { useGridKeyboardShortcuts } from "@/composables/ag-grid/useGridKeyboardShortcuts";
import { useAgGridHandlers } from "@/composables/ag-grid/useAgGridHandlers";
import { useAgGridFormulaBar } from "@/composables/ag-grid/useAgGridFormulaBar";
import { labToast } from "@/composables/shared/useLabToast.js";
import { useSheetFocus } from "@/composables/inventory/useSheetFocus.js";

import { GRID_CONFIG } from "@/components/ag-grid/gridConfig";
import { norm } from "@/components/ag-grid/utils/ag-grid-utils";
import { resolveDescriptorFactory, GUARD_PREFIX } from "@/components/ag-grid/descriptors";
import { StockTooltip } from "@/components/ag-grid/StockTooltip";
import { stockBadge } from "@/composables/ag-grid/stockTiers";

ModuleRegistry.registerModules([AllCommunityModule]);

const props = defineProps({
  sheetId: { type: String, required: true },
  tipoMatriz: { type: String, required: true },
  sphType: { type: String, default: "sph-neg" },
  actor: { type: Object, default: null },
  apiType: { type: String, default: "inventory" },
});

const emit = defineEmits(["update:internal", "update:available-internal"]);

const { getSheet, fetchItems, saveChunk, saveCell } = useSheetApi(() => props.apiType);
const { sheetId, sphType } = toRefs(props);

// ─── Estado ──────────────────────────────────────────────────────
const sheetMeta = ref(null);
const sheetTabs = ref([]);
const physicalLimits = ref(null);
const rowAxis = ref([]);
const allColValues = ref([]);
const degreeValues = ref([]);
const selectedDegree = ref(180);
const showVeil = ref(true);
const gridRows = ref([]);

// ─── Integración (WS, guard, history, sync) ──────────────────────
const guardKeyPrefix = GUARD_PREFIX[props.tipoMatriz] || props.tipoMatriz.toLowerCase();
const integration = useAgGridIntegration({
  sheetId,
  sphType,
  guardKeyPrefix,
  onWsMessage: (type, payload) => onWsMessage(type, payload),
});
const {
  gridApi, saving, lastSavedAt, switchingView, gridHistory,
} = integration;

const gridPageRef = ref(null);
const { isHibernating } = useVisualHibernation(gridPageRef);

const { themeCustom, isFullscreen, toggleFullscreen } = useAgGridBase();
const { stockRowClassRules, stockCellClassRules } = useStockRules(sheetMeta);

const effectiveActor = computed(() => {
  const src = props.actor || (typeof window !== "undefined" ? window.__currentUser : null) || null;
  if (!src) return null;
  return { userId: src.userId || src.id || src._id || null, name: src.name || src.username || "Usuario" };
});

// ─── Auto-guardado por celda (óptimista + rollback) ─────────────
// Persiste UNA celda vía su endpoint PUT; si no existe (contactlenses+bifocal)
// cae a chunk-de-1-fila. La fila ya muestra el valor (óptimista vía valueSetter).
function flashCell(rowId, field) {
  const node = gridApi.value?.getRowNode(String(rowId));
  if (node) gridApi.value?.flashCells?.({ rowNodes: [node], columns: [field] });
}

function revertCell(rowId, field, oldValue) {
  const node = gridApi.value?.getRowNode(String(rowId));
  if (!node?.data) return;
  // setData (no setDataValue) para NO re-disparar cellValueChanged → sin loop
  node.setData({ ...node.data, [field]: Number(oldValue ?? 0) });
}

async function persistCell(record, { rowId, field, oldValue }) {
  const segment = descriptor.cellEndpoint?.(props.apiType);
  try {
    const res = segment
      ? await saveCell(props.sheetId, segment, record, effectiveActor.value)
      : await saveChunk(props.sheetId, [record], effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) throw new Error(ok.message);
    lastSavedAt.value = new Date();
    flashCell(rowId, field);
  } catch (e) {
    revertCell(rowId, field, oldValue);
    labToast.danger(msgFromErr(e, "No se pudo guardar la celda"));
  }
}

function autoSaveCell(data, field, newValue, oldValue) {
  if (!descriptor.isEditableField(field)) return;
  const newVal = Number(newValue ?? 0);
  const oldVal = Number(oldValue ?? 0);
  const rowId = descriptor.getRowId(data);
  // historial para deshacer
  if (!gridHistory.isApplying.value) {
    gridHistory.push({
      key: `${rowId}|${field}`,
      field,
      oldValue: oldVal,
      newValue: newVal,
      meta: descriptor.historyMeta ? descriptor.historyMeta(data, field) : {},
    });
  }
  persistCell(descriptor.changeRecord(data, field, newVal, oldVal), { rowId, field, oldValue: oldVal });
}

// ─── ctx + descriptor ────────────────────────────────────────────
const ctx = {
  sphType,
  physicalLimits,
  sheetMeta,
  sheetTabs,
  rowAxis,
  allColValues,
  degreeValues,
  selectedDegree,
  stockCellClassRules,
  effectiveActor,
  fetchLimit: GRID_CONFIG.fetchLimit,
};
const descriptor = resolveDescriptorFactory(props.tipoMatriz)?.(ctx) || null;

// ── Tooltip nativo (tarjeta de stock): coordenadas + estado por distancia al neutro ──
const gridComponents = { stockTooltip: StockTooltip };
const gridContext = {
  tooltipParts: (p) => (descriptor?.tooltipParts ? descriptor.tooltipParts(p) : []),
  stockStatus: (p) => {
    const dist = descriptor?.cellDistance ? descriptor.cellDistance(p) : 0;
    return stockBadge(p.value, dist); // { label, cls } según tiers del backend
  },
};

// ─── Meta computed ───────────────────────────────────────────────
const totalRows = computed(() => rowAxis.value.length);
const colCount = computed(() => (descriptor?.hasDynamicColumns ? allColValues.value.length : 1));
const sheetName = computed(() => sheetMeta.value?.nombre || sheetMeta.value?.name || "Hoja");
const tipoMatrizLabel = computed(() => sheetMeta.value?.tipo_matriz || props.tipoMatriz);
const material = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);
// Tabs internas DISPONIBLES: oculta el lado (+/−) que no tiene filas reales
// (el 0 no cuenta). Si aún no hay datos (ambos vacíos), se muestran todas.
const internalTabs = computed(() => {
  const all = descriptor ? descriptor.internalTabs() : [];
  if (!all.length || !descriptor?.availableSides) return all;
  const { hasNeg, hasPos } = descriptor.availableSides();
  if (!hasNeg && !hasPos) return all; // sin datos / hoja vacía → no filtrar
  return all.filter((t) =>
    /neg/.test(t.id) ? hasNeg : (/pos/.test(t.id) ? hasPos : true));
});

const getRowId = (p) => descriptor.getRowId(p.data);

// ─── Formula bar ─────────────────────────────────────────────────
const { formulaValue, onCellClicked, onCellValueChanged, onFxInput, onFxCommit } = useAgGridFormulaBar({
  gridApi,
  onMarkChanged: (data, field, newVal, oldVal) => autoSaveCell(data, field, newVal, oldVal),
  isEditableField: (field) => descriptor.isEditableField(field),
});

// ─── Columnas (todas, desde el eje) ──────────────────────────────
const columns = computed(() => (descriptor ? descriptor.buildColumns() : []));
const defaultColDef = {
  resizable: true, sortable: false, filter: false, floatingFilter: false, editable: true,
  minWidth: 90, maxWidth: 160, cellClass: "ag-cell--compact", headerClass: "ag-header-cell--compact",
};

// ─── Memo de vistas (Tórico: hasta N grados vivos) ───────────────
const viewMemo = new Map();
const memoOrder = [];
const viewToken = () =>
  descriptor?.ext?.degreeBar ? `${props.sphType}|${selectedDegree.value}` : `${props.sphType}`;

function rememberView(rows) {
  if (!descriptor?.ext?.lazyRowCache) return;
  const k = viewToken();
  viewMemo.set(k, rows);
  const i = memoOrder.indexOf(k); if (i >= 0) memoOrder.splice(i, 1);
  memoOrder.unshift(k);
  const max = descriptor.ext?.lruSize || GRID_CONFIG.toricoLruSize;
  while (memoOrder.length > max) viewMemo.delete(memoOrder.pop());
}
function clearMemo() { viewMemo.clear(); memoOrder.length = 0; }

// ─── Carga de la vista (un único fetch → pivot → rowData) ────────
async function loadView({ useMemo = true } = {}) {
  if (!descriptor) return;
  descriptor.rebuildAxes();

  if (useMemo && descriptor.ext?.lazyRowCache) {
    const cached = viewMemo.get(viewToken());
    if (cached) {
      gridRows.value = cached;
      showVeil.value = false;
      await nextTick(); resetSort();
      applyPendingFocus();
      return;
    }
  }

  if (!rowAxis.value.length) {
    gridRows.value = [];
    showVeil.value = false;
    return;
  }

  const reqSheetId = props.sheetId;
  const reqView = viewToken();
  showVeil.value = true;
  try {
    const { data } = await fetchItems(reqSheetId, descriptor.buildFetchQuery(rowAxis.value));
    if (props.sheetId !== reqSheetId || viewToken() !== reqView) return; // vista cambió: descartar
    const items = (data?.data || []).map(descriptor.normalizeItem);
    const rows = descriptor.buildPivotPage(rowAxis.value, items, null); // sin buffer: auto-guardado
    rememberView(rows);
    gridRows.value = rows;
    await nextTick(); resetSort();
    applyPendingFocus();
  } catch (e) {
    console.error("[AgGridSheet] loadView error:", e);
    gridRows.value = [];
  } finally {
    showVeil.value = false;
  }
}

// ─── Foco de celda (deep-link desde notificación) ────────────────
const sheetFocus = useSheetFocus();
// Reintentos máximos mientras se espera a que el lado pedido (sph±/base±) se
// active; pasado el tope se aplica best-effort en el lado actual.
const FOCUS_MAX_TRIES = 10;
let _focusRetry = null; // timer único de respaldo (evita peticiones colgadas)

/** Busca el nodo cuya fila (sph/base) coincide con las coords pedidas. */
function findFocusNode(coords) {
  const want = coords.sph ?? coords.base ?? coords.base_izq;
  if (want == null) return null;
  let found = null;
  gridApi.value?.forEachNode((node) => {
    const d = node.data || {};
    const prim = d.sph ?? d.base ?? d.base_izq;
    if (prim != null && Math.abs(Number(prim) - Number(want)) < 0.001) found = node;
  });
  return found;
}

/** colId tentativo de la columna alerta (cyl/add) o "existencias". */
function guessFocusCol(coords) {
  if (coords.cyl != null) return `cyl_${Math.abs(Number(coords.cyl)).toFixed(2)}`;
  if (coords.add != null) return `add_${Number(coords.add).toFixed(2)}`;
  return "existencias";
}

/** Formatea un valor dióptrico con signo (+2.00 / -2.50). */
function fmtSigned(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return String(n);
  return v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
}

/** Foco por dioptría según MODO (búsqueda):
 *   - row  → resalta toda la FILA (valor de fila ≈ sph/base).
 *   - col  → resalta toda la COLUMNA (cyl/add).
 *   - cell → enfoca la CELDA exacta (fila × columna) con scroll + foco + flash.
 *  `req = { mode, row, col }`. Si no existe en la vista → aviso. */
function applyDiopterFocus(req) {
  const mode = req?.mode || (req?.col != null && req?.row == null ? "col" : "row");
  const rowVal = req?.row != null ? Number(req.row) : null;
  const colVal = req?.col != null ? Number(req.col) : null;
  const near = (a, b) => Math.abs(Number(a) - Number(b)) < 0.001;
  const flashOpts = { flashDuration: 2200, fadeDuration: 700 };
  let hit = false;

  // Nodo fila cuyo primario (sph/base) ≈ valor.
  const findRowNode = (val) => {
    let node = null;
    gridApi.value.forEachNode((n) => {
      const d = n.data || {};
      const prim = d.sph ?? d.base ?? d.base_izq;
      if (prim != null && near(prim, val)) node = n;
    });
    return node;
  };
  // colId(s) reales de una columna por valor (cyl_<norm> / add_<norm>_OD|OI).
  const findCols = (val) => {
    const cands = [`cyl_${norm(val)}`, `cyl_${norm(Math.abs(val))}`, `add_${norm(val)}_OD`, `add_${norm(val)}_OI`, `add_${norm(val)}`];
    return [...new Set(cands)].filter((id) => gridApi.value.getColumn?.(id));
  };

  try {
    if (mode === "cell" && rowVal != null && colVal != null) {
      const node = findRowNode(rowVal);
      const cols = findCols(colVal);
      if (node && cols.length) {
        gridApi.value.ensureIndexVisible(node.rowIndex, "middle");
        gridApi.value.ensureColumnVisible(cols[0]);
        gridApi.value.setFocusedCell(node.rowIndex, cols[0]);
        gridApi.value.flashCells({ rowNodes: [node], columns: cols, ...flashOpts });
        hit = true;
      }
    } else if (mode === "col" && colVal != null) {
      const cols = findCols(colVal);
      if (cols.length) {
        gridApi.value.ensureColumnVisible(cols[0]);
        const all = [];
        gridApi.value.forEachNode((n) => all.push(n));
        gridApi.value.flashCells({ rowNodes: all, columns: cols, ...flashOpts });
        hit = true;
      }
    } else if (rowVal != null) {
      const node = findRowNode(rowVal);
      if (node) {
        gridApi.value.ensureIndexVisible(node.rowIndex, "middle");
        gridApi.value.flashCells({ rowNodes: [node], ...flashOpts });
        hit = true;
      }
    }
    const label = mode === "cell" ? `${fmtSigned(rowVal)} × ${fmtSigned(colVal)}`
      : fmtSigned(mode === "col" ? colVal : rowVal);
    if (hit) labToast.info(`Dioptría ${label} resaltada`);
    else labToast.warning(`La dioptría ${label} no existe en esta vista.`);
  } catch { /* noop */ }
  sheetFocus.consume(props.sheetId);
}

/** Si hay una petición de foco para ESTA planilla, hace scroll + flash de la dioptría. */
function applyPendingFocus() {
  const req = sheetFocus.peek();
  if (!req || String(req.sheetId) !== String(props.sheetId) || !gridApi.value) return;

  // Esperar al LADO correcto (sph±/base±) antes de aplicar/consumir. Si el lado
  // pedido aún no es el activo NO consumimos: pedimos el cambio de lado y dejamos
  // que el watch de sphType → loadView reintente ya en el lado correcto. El tope
  // + timer de respaldo evita que la petición quede colgada si ese lado no existe.
  if (req.side && req.side !== props.sphType) {
    req._tries = (req._tries || 0) + 1;
    if (req._tries === 1) emit("update:internal", req.side); // dispara el cambio de lado
    if (req._tries < FOCUS_MAX_TRIES) {
      if (!_focusRetry) {
        _focusRetry = setTimeout(() => { _focusRetry = null; applyPendingFocus(); }, 120);
      }
      return;
    }
    // Tope alcanzado: aplicar best-effort en el lado actual (puede avisar "no existe").
  }

  // Búsqueda de dioptría: foco por modo (row/col/cell).
  if (req.mode || req.row != null || req.col != null || req.diopter != null) {
    const dreq = req.mode ? req : { mode: "row", row: req.row ?? req.diopter, col: req.col };
    nextTick(() => applyDiopterFocus(dreq));
    return;
  }
  const coords = req.coords || {};
  // Eje (tórico): asegurar el grado correcto antes de enfocar (dispara recarga).
  if (descriptor?.ext?.degreeBar && coords.axis != null && Number(selectedDegree.value) !== Number(coords.axis)) {
    setDegree(Number(coords.axis));
    return;
  }
  nextTick(() => {
    const node = findFocusNode(coords);
    if (!node) {
      sheetFocus.consume(props.sheetId);
      labToast.warning("Esa dioptría ya no existe en la planilla.");
      return;
    }
    try {
      gridApi.value.ensureIndexVisible(node.rowIndex, "middle");
      const colId = guessFocusCol(coords);
      const hasCol = !!gridApi.value.getColumn?.(colId);
      if (hasCol) {
        gridApi.value.ensureColumnVisible(colId);
        gridApi.value.setFocusedCell(node.rowIndex, colId);
        gridApi.value.flashCells({ rowNodes: [node], columns: [colId] });
      } else {
        gridApi.value.flashCells({ rowNodes: [node] });
      }
    } catch { /* noop */ }
    sheetFocus.consume(props.sheetId);
  });
}

// Una petición nueva (sin recarga de vista) también dispara el foco.
watch(sheetFocus.reqRef, () => applyPendingFocus());

// Compat con useAgGridHandlers (refresh/discard): recargar la vista.
async function switchViewReload({ clearCache = true } = {}) {
  if (clearCache) clearMemo();
  await loadView({ useMemo: !clearCache });
}

async function loadSheetMeta() {
  try {
    const { data } = await getSheet(props.sheetId);
    const payload = data?.data || data;
    sheetMeta.value = payload?.sheet || null;
    sheetTabs.value = Array.isArray(payload?.tabs) ? payload.tabs : [];
    physicalLimits.value = payload?.physicalLimits || payload?.physical_limits || payload?.limits || null;
  } catch (e) {
    console.error("[AgGridSheet] getSheet error:", e?.response?.data || e);
  }
}

async function loadAll() {
  await loadSheetMeta();
  await loadView({ useMemo: false });
}

// ─── Handlers (save/discard/refresh/seed/export) ─────────────────
const { handleRefresh, handleSeed, handleExport } = useAgGridHandlers({
  props, integration, loadAll, switchViewReload, effectiveActor, sheetName,
});
// Auto-guardado: no hay "Guardar" manual. El botón solo informa; "descartar" recarga.
const onSaveRequest = (ack) => { ackOk(ack, "Los cambios se guardan automáticamente.", 200); };
const handleDiscard = () => handleRefresh();

// ─── WebSocket: parche por celda (sin refetch) ──────────────────
// Mutación in-place de node.data → mantiene gridRows/memo consistentes
// (mismas referencias de objeto). flash nativo como feedback.
function applyCellPatch(cell) {
  const patch = descriptor.cellToRowPatch?.(cell);
  if (!patch) return;                                  // otra vista/grado: no cargada aquí
  const { rowId, field, value } = patch;
  const node = gridApi.value?.getRowNode(String(rowId));
  if (!node?.data) return;                             // fila no visible en esta vista
  if (Number(node.data[field]) === Number(value)) return; // eco propio / sin cambio
  node.data[field] = Number(value);
  gridApi.value.refreshCells({ rowNodes: [node], columns: [field], force: true });
  flashCell(rowId, field);
}

function onWsMessage(type, payload) {
  if (type === "INV_CELL" && payload?.cell) {
    applyCellPatch(payload.cell);
  } else if (type === "INV_CELLS" && Array.isArray(payload?.cells)) {
    payload.cells.forEach(applyCellPatch);
  } else {
    // INV_RELOAD / órdenes de lab / legado → recargar la vista
    clearMemo();
    loadView({ useMemo: false });
    return;
  }
  // Tórico: otras vistas/grados cacheados pueden quedar viejos → refetch al revisitar
  if (descriptor?.ext?.lazyRowCache) clearMemo();
}

// ─── Undo / Redo (ahora ESCRIBE: aplica el valor a la fila y lo persiste) ──
// Última acción de historial aplicada → feedback visual en navtools (junto a "Guardado").
const lastHistoryAction = ref(null); // { type: "undo" | "redo", at: Date }

function applyGridHistoryOp(op, actionType) {
  if (!op) return;
  const value = Number(op.reversed ? op.oldValue : op.newValue);
  const rowId = String(op.key).split("|").slice(0, -1).join("|"); // key = `${rowId}|${field}`
  const node = gridApi.value?.getRowNode(rowId);
  if (!node?.data) return;
  // setData (no setDataValue) para NO re-disparar cellValueChanged → sin re-push ni doble save
  node.setData({ ...node.data, [op.field]: value });
  // persistir el valor revertido por su endpoint de celda
  persistCell(descriptor.changeRecord(node.data, op.field, value, value), { rowId, field: op.field, oldValue: op.reversed ? op.newValue : op.oldValue });
  lastHistoryAction.value = { type: actionType, at: new Date() };
}
const handleGridUndo = () => applyGridHistoryOp(gridHistory.undo(), "undo");
const handleGridRedo = () => applyGridHistoryOp(gridHistory.redo(), "redo");

useGridKeyboardShortcuts({
  onSave: () => {}, // auto-guardado: Ctrl+S no hace nada
  onUndo: handleGridUndo, onRedo: handleGridRedo,
  gridApi, dirty: computed(() => false), canUndo: gridHistory.canUndo, canRedo: gridHistory.canRedo,
  isActive: () => gridPageRef.value && gridPageRef.value.offsetParent !== null,
});

// ─── Add row / column (validación + rows del descriptor) ─────────
const handleAddRow = async (value, ack) => {
  if (!descriptor?.addRow) return ackErr(ack, "No soportado", 400);
  const r = descriptor.addRow(value);
  if (r.error) return ackErr(ack, r.error, r.status || 400);
  try {
    const res = await saveChunk(props.sheetId, r.rows, effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) throw new Error(ok.message);
    ackOk(ack, ok.message || "Fila agregada", ok.status);
    lastSavedAt.value = new Date();
    clearMemo(); await loadSheetMeta(); await loadView({ useMemo: false });
  } catch (e) { ackErr(ack, msgFromErr(e, "Error al agregar fila"), statusFromErr(e) || 500); }
};

const handleAddColumn = async (value, ack) => {
  if (!descriptor?.addColumn) return ackErr(ack, "No soportado", 400);
  const r = descriptor.addColumn(value);
  if (r.error) return ackErr(ack, r.error, r.status || 400);
  try {
    const res = await saveChunk(props.sheetId, r.rows, effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) throw new Error(ok.message);
    ackOk(ack, ok.message || "Columna agregada", ok.status);
    lastSavedAt.value = new Date();
    clearMemo(); await loadSheetMeta(); await loadView({ useMemo: false });
  } catch (e) { ackErr(ack, msgFromErr(e, "Error al agregar columna"), statusFromErr(e) || 500); }
};

// ─── Degree bar (solo Tórico) ────────────────────────────────────
async function selectDegree(deg) {
  if (deg === selectedDegree.value) return;
  gridHistory.clear();          // el historial es por-vista
  selectedDegree.value = deg;
  await loadView({ useMemo: true });
}

// ─── Grid lifecycle ──────────────────────────────────────────────
const onGridReady = async (p) => {
  gridApi.value = p.api;
  await nextTick();
  resetSort();
  // Si la vista terminó de cargar antes de que el grid estuviera listo, el
  // applyPendingFocus de loadView salió en vacío (sin gridApi). Reintentar aquí,
  // pero solo si ya hay filas (no consumir/avisar sobre un grid vacío).
  if (gridRows.value.length) applyPendingFocus();
};

const clearFilters = () => { if (gridApi.value) gridApi.value.setGridOption("filterModel", null); };
const resetSort = () => {
  if (!gridApi.value || !descriptor) return;
  gridApi.value.applyColumnState({
    defaultState: { sort: null },
    state: [{ colId: descriptor.sortColId, sort: descriptor.sortDir(props.sphType) }],
  });
};
const handleToggleFilters = () => clearFilters();

onMounted(async () => { await loadAll(); });
onBeforeUnmount(() => { if (_focusRetry) { clearTimeout(_focusRetry); _focusRetry = null; } });

watch(() => props.sphType, async () => {
  gridHistory.clear();          // el historial es por-vista
  await loadView({ useMemo: true });
});

// Avisar al padre qué lados (+/−) están disponibles y, si el lado activo quedó
// oculto (p.ej. hoja sin filas positivas), saltar al primero disponible.
watch(internalTabs, (tabs) => {
  emit("update:available-internal", tabs.map((t) => t.id));
  if (tabs.length && !tabs.some((t) => t.id === props.sphType)) {
    emit("update:internal", tabs[0].id);
  }
}, { immediate: true });
</script>

<style scoped>
@import "@/components/ag-grid/AgGridSheet.css";
</style>
