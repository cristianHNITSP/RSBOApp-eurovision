<!-- src/components/ag-grid/templates/AgGridMonofocal.vue -->
<template>
  <div class="grid-page">
    <!-- ✅ TOPBAR (sticky) -->
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

      <!-- ✅ Leyenda natural (sin componentes extra) 
      <div class="stock-legend pt-2">
        <span class="stock-pill stock-pill--low">
          <i class="fas fa-exclamation-triangle mr-1"></i>
          Bajo stock (≤ {{ LOW_STOCK_THRESHOLD }})
        </span>
        <span class="stock-pill stock-pill--zero">
          <i class="fas fa-times-circle mr-1"></i>
          Sin stock (0)
        </span>
      </div>
      -->
    </header>
    


    <!--GRID MAIN -->
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
  sphType: { type: String, default: "sph-neg" }, // sph-neg | sph-pos
  actor:   { type: Object, default: null },
  apiType: { type: String, default: "inventory" },
});

const { fetchItems, saveChunk, reseedSheet, getSheet } = useSheetApi(() => props.apiType);

const isQuarterStep = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return false;
  const scaled = num * 4;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
};

/* ✅ CYL headers: siempre “-” por columna (0.00 neutro) */
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

/* ── Unsaved changes guard ── */
const _guardViewId = computed(() => `${props.sheetId}:monofocal:${props.sphType}`);
const unsavedGuard = useUnsavedGuard({
  storageKey: () => _guardViewId.value,
  isDirty: () => dirty.value,
  getPending: () => Object.fromEntries(pendingChanges.value),
  onRestore(saved) {
    for (const [k, v] of Object.entries(saved)) {
      pendingChanges.value.set(k, v);
      // also update rowData if row exists
      const [sphStr, cylDispStr] = k.split('|');
      const sph = Number(sphStr);
      const cDisp = Number(cylDispStr);
      const row = rowData.value.find(r => to2(r.sph) === to2(sph));
      if (row) {
        const field = `cyl_${norm(cDisp)}`;
        row[field] = v.existencias;
        gridApi.value?.applyTransaction({ update: [row] });
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
const sheetName = computed(() => sheetMeta.value?.nombre || sheetMeta.value?.name || "Hoja monofocal (Esf/Cil)");
const tipoMatriz = computed(() => sheetMeta.value?.tipo_matriz || "SPH_CYL");
const material = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);

/* ===================== ✅ UMBRAL DE BAJO STOCK (escalable) ===================== */
const LOW_STOCK_THRESHOLD = computed(() => {
  const s = sheetMeta.value || {};
  const raw =
    s?.lowStockThreshold ??
    s?.alerts?.lowStock ??
    s?.config?.lowStockThreshold ??
    2; // fallback
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
    if (k.startsWith("cyl_")) {
      if (isZeroStock(row[k])) return true;
    }
  }
  return false;
}
function rowHasLowStock(row) {
  if (!row) return false;
  for (const k of Object.keys(row)) {
    if (k.startsWith("cyl_")) {
      if (isLowStock(row[k])) return true;
    }
  }
  return false;
}

const { themeCustom, rowClassRules } = useAgGridBase({ isZeroStock, isLowStock });

/**
 * ✅ FUENTE DE VERDAD: PHYSICAL_LIMITS desde backend
 */
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
function markCellChangedMonofocal(sph, cylDisplay, existencias, _oldValue) {
  const s = to2(sph);
  const cDisp = to2(Math.abs(Number(cylDisplay)));
  const cBackend = -cDisp;
  const field = `cyl_${norm(cDisp)}`;

  const key = `${s}|${cDisp}`;
  const prev = pendingChanges.value.get(key);
  const oldVal = _oldValue ?? prev?.existencias ?? 0;
  const newVal = Number(existencias ?? 0);

  pendingChanges.value.set(key, {
    sph: s,
    cyl: cBackend,
    existencias: newVal
  });
  dirty.value = true;

  // Push to grid history for undo/redo
  if (!gridHistory.isApplying.value) {
    gridHistory.push({
      key, field,
      oldValue: oldVal, newValue: newVal,
      meta: { sph: s, cyl: cBackend },
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
        width: 90,
        minWidth: 86,
        maxWidth: 96,
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
    headerName: "CYL (-)",
    children: cylValues.value.map((cDisp) => ({
      field: `cyl_${norm(cDisp)}`,
      headerName: fmtCylHeader(cDisp), // ✅ “-” por columna
      editable: true,
      filter: "agNumberColumnFilter",
      minWidth: 80,
      maxWidth: 110,
      resizable: true,
      cellClass: ["ag-cell--compact", "ag-cell--numeric"],
      headerClass: ["ag-header-cell--compact"],

      /* ✅ Marca la celda si está baja / en cero */
      cellClassRules: {
        "ag-cell--stock-zero": (p) => isZeroStock(p.value),
        "ag-cell--stock-low": (p) => isLowStock(p.value)
      },

      valueSetter: (p) => {
        const v = String(p.newValue ?? "").trim();
        const newVal = isNumeric(v) ? Number(v) : 0;
        const oldVal = Number(p.oldValue ?? 0);
        p.data[p.colDef.field] = newVal;
        markCellChangedMonofocal(p.data.sph, cDisp, newVal, oldVal);
        return true;
      }
    }))
  }
]);

const defaultColDef = {
  resizable: true,
  sortable: true,
  filter: "agNumberColumnFilter",
  floatingFilter: true,
  editable: true,
  minWidth: 90,
  maxWidth: 150,
  cellClass: "ag-cell--compact",
  headerClass: "ag-header-cell--compact"
};

const getRowId = (p) => p.data.sph?.toString();

/* ===================== Load meta ===================== */
async function loadSheetMeta() {
  try {
    const { data } = await getSheet(props.sheetId);
    const payload = data?.data || data;
    sheetMeta.value = payload?.sheet || null;
    sheetTabs.value = payload?.tabs || [];
    physicalLimits.value =
      payload?.physicalLimits || payload?.physical_limits || payload?.limits || null;
  } catch (e) {
    console.error("[AgGridMonofocal] Error getSheet:", e?.response?.data || e);
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
  const sphMin = isNeg ? P.sphMin : 0;
  const sphMax = isNeg ? 0 : P.sphMax;

  const cylMin = Math.min(P.cylMin, 0);
  const cylMax = 0;

  return { sphMin, sphMax, cylMin, cylMax, limit: 20000 };
}

async function loadRows() {
  const P = phys.value;
  const isNeg = props.sphType === "sph-neg";
  const tab = getTabForView();
  const qFetch = buildFetchQueryForView();

  const { data } = await fetchItems(props.sheetId, qFetch);
  const itemsRaw = data?.data || [];

  const items = itemsRaw
    .map((i) => {
      const sph = to2(i.sph);
      let cyl = to2(i.cyl);
      if (Number.isFinite(cyl) && cyl > 0) cyl = -Math.abs(cyl);
      const existencias = Number(i.existencias ?? 0);
      return { sph, cyl, existencias };
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
  const backendSph = Array.isArray(tab?.axis?.sph) ? tab.axis.sph : [];
  const backendCyl = Array.isArray(tab?.axis?.cyl) ? tab.axis.cyl : [];

  const sphAxis = [...new Set(backendSph.map(to2))]
    .filter((s) => Number.isFinite(s) && s >= P.sphMin && s <= P.sphMax)
    .filter((s) => isNeg ? s <= 0 : s >= 0)
    .sort((a, b) => isNeg ? b - a : a - b);

  cylValues.value = [...new Set(backendCyl.map(to2))]
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= P.cylAbsMax)
    .sort((a, b) => a - b);

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
  await nextTick();
  resetSort();
}

async function switchViewReload() {
  switchingView.value = true;
  await raf();
  try {
    await loadRows();
  } catch (e) {
    console.error("[AgGridMonofocal] Error fetchItems:", e?.response?.data || e);
  } finally {
    await raf();
    switchingView.value = false;
  }
}

async function loadAll() {
  await loadSheetMeta();
  await switchViewReload();
}

// ── WebSocket: actualiza stock en tiempo real al surtir/cancelar/resetear ──
const _WS_STOCK = new Set(["LAB_ORDER_SCAN", "LAB_ORDER_CANCEL", "LAB_ORDER_RESET"]);
function _onLabWs(e) {
  if (_WS_STOCK.has(e?.detail?.type)) loadRows();
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
    if (!Number.isNaN(cDisp)) markCellChangedMonofocal(p.data.sph, cDisp, p.data[p.colDef.field]);
  } else {
    dirty.value = true;
  }
};

/**
 * ✅ Base-style: FX input no “guarda”, FX commit sí “guarda”
 * - Monofocal: solo permite cyl_*
 */
function applyFxToGrid(val, { commit = false } = {}) {
  if (!activeCell || !gridApi.value) return;

  const field = activeCell.colDef?.field;
  if (!field || !field.startsWith("cyl_")) return;

  const cDisp = parseCylFromField(field);
  if (cDisp === null || Number.isNaN(cDisp)) return;

  const raw = String(val ?? "").trim();
  const newVal = isNumeric(raw) ? Number(raw) : 0;

  // live preview (sin ensuciar ni pending)
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

  markCellChangedMonofocal(updatedRow.sph, cDisp, newVal);

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
  const [sphStr, cylDispStr] = op.key.split('|');
  const sph = Number(sphStr);
  const row = rowData.value.find(r => to2(r.sph) === to2(sph));
  if (!row) return;
  const field = op.field;
  row[field] = value;
  gridApi.value?.applyTransaction({ update: [row] });
  gridApi.value?.refreshCells({ force: true });

  // update pendingChanges
  const cDisp = Number(cylDispStr);
  pendingChanges.value.set(op.key, { sph: to2(sph), cyl: -cDisp, existencias: value });
  dirty.value = pendingChanges.value.size > 0;
}
const handleGridUndo = () => applyGridHistoryOp(gridHistory.undo());
const handleGridRedo = () => applyGridHistoryOp(gridHistory.redo());

/* ===================== Grid hooks ===================== */
const onGridReady = (p) => {
  gridApi.value = p.api;
  nextTick(() => resetSort());
};

/* ===================== Add row/col (con ACK) ===================== */
const handleAddRow = async (nuevoValor, ack) => {
  const P = phys.value;
  const v = to2(nuevoValor);

  if (!Number.isFinite(v)) return ackErr(ack, "Ingresa un SPH numérico", 400);
  if (!isQuarterStep(v)) return ackErr(ack, "SPH debe ser múltiplo de 0.25 (…00, …25, …50, …75)", 400);
  if (v < P.sphMin || v > P.sphMax) return ackErr(ack, `SPH fuera de límites (${P.sphMin} a ${P.sphMax})`, 400);

  if (props.sphType === "sph-neg" && v >= 0) return ackErr(ack, "Vista SPH (-): SPH debe ser negativo (ej: -0.25)", 400);
  if (props.sphType === "sph-pos" && v < 0) return ackErr(ack, "Vista SPH (+): SPH debe ser 0 o positivo", 400);

  if (rowData.value.some((r) => to2(r.sph) === v)) return ackErr(ack, `SPH ${fmtSigned(v)} ya existe`, 409);

  // UI
  const nueva = { sph: v };
  cylValues.value.forEach((cDisp) => (nueva[`cyl_${norm(cDisp)}`] = 0));
  gridApi.value?.applyTransaction({ add: [nueva] });
  await nextTick();
  resetSort();

  try {
    // Persist mínimo (celda cyl=0) para extender plantilla
    const res = await saveChunk(props.sheetId, [{ sph: v, cyl: 0, existencias: 0 }], effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo agregar SPH", ok.status);

    ackOk(ack, ok.message || `SPH agregado: ${fmtSigned(v)}`, ok.status);

    lastSavedAt.value = new Date();
    await loadSheetMeta();
    await switchViewReload();
  } catch (e) {
    console.error("[AgGridMonofocal] ❌ Error al persistir SPH nuevo:", e?.response?.status, e?.response?.data || e);
    ackErr(ack, msgFromErr(e, "Error al guardar el nuevo SPH"), statusFromErr(e));
  }
};

const handleAddColumn = async (nuevoValor, ack) => {
  const P = phys.value;
  const raw = to2(nuevoValor);

  if (!Number.isFinite(raw)) return ackErr(ack, "Ingresa un CYL numérico", 400);
  if (!isQuarterStep(raw)) return ackErr(ack, "CYL debe ser múltiplo de 0.25 (…00, …25, …50, …75)", 400);
  if (raw >= 0) return ackErr(ack, "CYL debe ingresarse en negativo. Ej: -0.25, -1.00, -7.00", 400);

  const vDisp = to2(Math.abs(raw)); // aquí ya es seguro: raw es negativo
  if (vDisp === 0) return ackErr(ack, "CYL 0.00 ya existe (no se puede duplicar)", 409);
  if (vDisp > P.cylAbsMax) return ackErr(ack, `CYL fuera de límite (máx ${P.cylAbsMax})`, 400);
  if (cylValues.value.includes(vDisp)) return ackErr(ack, `CYL ${vDisp.toFixed(2)} ya existe`, 409);

  // UI
  cylValues.value = [...cylValues.value, vDisp].sort((a, b) => a - b);
  rowData.value.forEach((r) => (r[`cyl_${norm(vDisp)}`] = 0));

  await nextTick();
  gridApi.value?.refreshHeader();
  gridApi.value?.redrawRows();

  try {
    // Persist mínimo (celda sph=0) para extender CYL (meta.ranges)
    const res = await saveChunk(props.sheetId, [{ sph: 0, cyl: -vDisp, existencias: 0 }], effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo agregar CYL", ok.status);

    ackOk(ack, ok.message || `CYL agregado: -${vDisp.toFixed(2)}`, ok.status);

    lastSavedAt.value = new Date();
    await loadSheetMeta();
    await switchViewReload();
  } catch (e) {
    console.error("[AgGridMonofocal] ❌ Error al persistir CYL nuevo:", e?.response?.status, e?.response?.data || e);
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
  const sortDir = props.sphType === "sph-neg" ? "desc" : "asc"; // 0 arriba en ambas vistas
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
    console.error("[AgGridMonofocal] Error saveChunk:", e?.response?.data || e);
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
    console.error("[AgGridMonofocal] Error reseed:", e?.response?.data || e);
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
    filename: `reporte_inventario_${nameSlug || "monofocal"}_${posNeg}_${fecha}`,
    sheetName: String(sheetName.value || "Monofocal").slice(0, 31),
    title: `Inventario — ${sheetName.value || "Monofocal"} (${posNeg})`,
  });
}
</script>

<style scoped>
/* ✅ App-like shell */
.grid-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fbfbff;
}

/* ✅ Topbar “metodología nueva” */
.grid-topbar {
  position: sticky;
  top: 0;
  z-index: 15;
  padding: 0.75rem 0.75rem 0.35rem;
  background: rgba(251, 251, 255, 0.82);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.navtools-wrap {
  padding: 0 !important;
}

/* ✅ Leyenda */
.stock-legend {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}
.stock-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  line-height: 1;
  user-select: none;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(15, 23, 42, 0.03);
}
.stock-pill--low {
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.25);
}
.stock-pill--zero {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.22);
}

/* Main */
.grid-main {
  flex: 1 1 auto;
  padding: 0.5rem 0.75rem 0.75rem;
  overflow: hidden;
}

/* Card */
.buefy-balham-light {
  height: 100%;
  padding: 0.55rem;
  background-color: var(--ag-bg);
  border-radius: 0.9rem;
  box-shadow: 0 10px 22px rgba(17, 24, 39, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.06);
}

/* switching anim */
.grid-shell {
  height: 100%;
  transition: opacity 160ms ease,
    transform 200ms cubic-bezier(0.22, 0.61, 0.36, 1),
    filter 160ms ease;
  will-change: opacity, transform, filter;
}

.grid-shell--switching {
  opacity: 0;
  transform: translate3d(0, 8px, 0) scale(0.992);
  filter: blur(1.2px);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .grid-shell {
    transition: none !important;
  }
}

/* ag-grid cosmetics */
.ag-grid-buefy .ag-header-cell.ag-header-cell--compact {
  padding-inline: 6px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ag-grid-buefy .ag-cell.ag-cell--compact {
  padding-inline: 6px;
  line-height: 1.2;
  font-size: 0.75rem;
}

.ag-grid-buefy .ag-cell.ag-cell--numeric {
  justify-content: flex-end;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.ag-grid-buefy .ag-cell.ag-cell--pinned,
.ag-grid-buefy .ag-header-cell.ag-header-cell--pinned {
  background-color: #f5f3ff;
  font-weight: 600;
}

.ag-grid-buefy .ag-row-hover {
  background-color: #f3f0ff !important;
}

/* ===================== ✅ ALERTAS STOCK (fila + celda) ===================== */
/* fila (suave) */
.ag-grid-buefy :deep(.ag-row.ag-row--stock-low) {
  box-shadow: inset 3px 0 0 rgba(245, 158, 11, 0.75);
  background: rgba(245, 158, 11, 0.06);
}
.ag-grid-buefy :deep(.ag-row.ag-row--stock-zero) {
  box-shadow: inset 3px 0 0 rgba(239, 68, 68, 0.85);
  background: rgba(239, 68, 68, 0.06);
}

/* celda (más explícita) */
.ag-grid-buefy :deep(.ag-cell.ag-cell--stock-low) {
  font-weight: 700;
  background: rgba(245, 158, 11, 0.12);
  border-radius: 6px;
}
.ag-grid-buefy :deep(.ag-cell.ag-cell--stock-zero) {
  font-weight: 800;
  background: rgba(239, 68, 68, 0.12);
  border-radius: 6px;
}
</style>
