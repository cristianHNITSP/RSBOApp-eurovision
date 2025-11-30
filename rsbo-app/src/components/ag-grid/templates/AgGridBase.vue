<!-- src/components/ag-grid/templates/AgGridBase.vue -->
<template>
  <div class="is-flex is-flex-direction-column" style="height: 100%;">
    <navtools
      class="p-4"
      v-model="formulaValue"
      :dirty="dirty"
      :saving="saving"
      :total-rows="totalRows"
      :sheet-name="sheetName"
      :tipo-matriz="tipoMatriz"
      :material="material"
      :tratamientos="tratamientos"
      :last-saved-at="lastSavedAt"
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
    />

    <!-- ✅ Fade suave en cambio de vista -->
    <div
      class="buefy-balham-light grid-shell"
      :class="{ 'grid-shell--switching': switchingView }"
      style="flex: 1 1 auto; display:flex; flex-direction:column; overflow:auto;"
    >
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
        @cellClicked="onCellClicked"
        @cellValueChanged="onCellValueChanged"
        @grid-ready="onGridReady"
        style="width: 100%; height: 100%;"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  iconSetQuartzBold,
  colorSchemeLight
} from "ag-grid-community";
import navtools from "@/components/ag-grid/navtools.vue";
import { fetchItems, saveChunk, reseedSheet, getSheet } from "@/services/inventory";

ModuleRegistry.registerModules([AllCommunityModule]);

const props = defineProps({
  sheetId: { type: String, required: true },
  sphType: { type: String, default: "base-pos" }, // base-neg | base-pos
  actor: { type: Object, default: null }
});

/* ===================== ACK helpers ===================== */
const ackOk = (ack, message = "Ok", status = 200) => {
  if (typeof ack === "function") ack({ ok: true, status, message });
};
const ackErr = (ack, message = "Error", status = 400) => {
  if (typeof ack === "function") ack({ ok: false, status, message });
  else alert(message);
};
const msgFromErr = (e, fallback = "Error de servidor") =>
  e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;
const statusFromErr = (e) => e?.response?.status ?? 0;
const normalizeAxiosOk = (res) => {
  const status = res?.status ?? 200;
  const body = res?.data ?? null;
  if (body?.ok === false) return { ok: false, status, message: body?.message || "Operación rechazada" };
  return { ok: true, status, message: body?.message || "Operación exitosa" };
};

/* ===================== Helpers numéricos ===================== */
const numOr = (v, dflt) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
};

const gridApi = ref(null);
const rowData = ref([]);
const dirty = ref(false);
const saving = ref(false);
const lastSavedAt = ref(null);

const sheetMeta = ref(null);
const sheetTabs = ref([]);
const physicalLimits = ref(null);

const pendingChanges = ref(new Map());

/** ✅ transición suave al cambiar vista */
const switchingView = ref(false);
const raf = () =>
  new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });

const themeCustom = themeQuartz
  .withPart(iconSetQuartzBold, colorSchemeLight)
  .withParams({
    accentColor: "#7957d5",
    backgroundColor: "#ffffff",
    foregroundColor: "#2d2242",
    borderColor: "#e5e5f0",
    borderRadius: 10,
    wrapperBorder: true,
    wrapperBorderRadius: 10,
    columnBorder: true,
    rowBorder: true,
    headerBackgroundColor: "#f5f3ff",
    headerTextColor: "#4527a0",
    headerFontSize: 11,
    headerFontWeight: 600,
    fontFamily:
      "Satoshi, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 12,
    spacing: 3,
    oddRowBackgroundColor: "#fbfbff"
  });

const localeText = { noRowsToShow: "No hay filas para mostrar", loadingOoo: "Cargando..." };

const isNumeric = (v) => /^-?\d+(\.\d+)?$/.test(String(v ?? "").trim());
const to2 = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Number(num.toFixed(2));
};
const frange = (start, end, step) => {
  const out = [];
  const s = Number(start);
  const e = Number(end);
  const st = Math.abs(Number(step));
  if (!Number.isFinite(s) || !Number.isFinite(e) || !Number.isFinite(st) || st <= 0) return out;
  const eps = 1e-9;
  if (s <= e) for (let v = s; v <= e + eps; v += st) out.push(to2(v));
  else for (let v = s; v >= e - eps; v -= st) out.push(to2(v));
  return out;
};
const fmtSigned = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n ?? "");
  const s = num.toFixed(2);
  return num >= 0 ? `+${s}` : s;
};

const isMultipleOfStep = (value, step) => {
  const v = Number(value);
  const st = Number(step);
  if (!Number.isFinite(v) || !Number.isFinite(st) || st <= 0) return false;
  const abs = Math.abs(v);
  const mult = Math.round(abs / st);
  return Math.abs(mult * st - abs) < 1e-6;
};

/** ✅ BASE va en 0.50 */
const BASE_STEP = 0.50;

/* ======== LÍMITES FÍSICOS DESDE BACKEND ======== */
const phys = computed(() => {
  const pl = physicalLimits.value || {};
  const baseMin = numOr(pl?.BASE?.min, -40);
  const baseMax = numOr(pl?.BASE?.max, 40);
  return { baseMin: to2(baseMin), baseMax: to2(baseMax) };
});

const baseViewId = computed(() => {
  const t = String(props.sphType || "").toLowerCase();
  return t.includes("neg") ? "base-neg" : "base-pos";
});

/**
 * ✅ 0 arriba en ambas vistas
 * - MOSTRAR: neg incluye 0 (<=0), pos incluye 0 (>=0)
 * - AGREGAR: neg es estrictamente <0 para no duplicar 0
 */
const baseFilterDisplay = computed(() =>
  baseViewId.value === "base-neg" ? (n) => Number(n) <= 0 : (n) => Number(n) >= 0
);
const baseFilterNewRow = computed(() =>
  baseViewId.value === "base-neg" ? (n) => Number(n) < 0 : (n) => Number(n) >= 0
);

const sortDirForView = computed(() => (baseViewId.value === "base-neg" ? "desc" : "asc"));

const effectiveActor = computed(() => {
  const src = props.actor || (typeof window !== "undefined" ? window.__currentUser : null) || null;
  if (!src) return null;
  const userId = src.userId || src.id || src._id || null;
  const name = src.name || src.email || "Usuario";
  return { userId, name };
});

const totalRows = computed(() => rowData.value.length);
const sheetName = computed(() => sheetMeta.value?.nombre || sheetMeta.value?.name || "Hoja BASE");
const tipoMatriz = computed(() => sheetMeta.value?.tipo_matriz || "BASE");
const material = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);

function markChanged({ base, existencias }) {
  const b = to2(base);
  pendingChanges.value.set(String(b), { base: b, existencias: Number(existencias ?? 0) });
  dirty.value = true;
}

const columns = computed(() => [
  {
    headerName: "BASE",
    children: [
      {
        field: "base",
        headerName: "Base",
        pinned: "left",
        width: 140,
        minWidth: 130,
        maxWidth: 170,
        editable: false,
        sortable: true,
        comparator: (a, b) => Number(a) - Number(b),
        filter: "agNumberColumnFilter",
        resizable: false,
        cellClass: ["ag-cell--compact", "ag-cell--numeric", "ag-cell--pinned"],
        headerClass: ["ag-header-cell--compact", "ag-header-cell--pinned"],
        valueFormatter: (p) => fmtSigned(p.value)
      }
    ]
  },
  {
    headerName: "EXISTENCIAS",
    children: [
      {
        field: "existencias",
        headerName: "Stock",
        editable: true,
        minWidth: 110,
        maxWidth: 140,
        filter: "agNumberColumnFilter",
        cellClass: ["ag-cell--compact", "ag-cell--numeric"],
        headerClass: ["ag-header-cell--compact"],
        valueSetter: (p) => {
          const raw = String(p.newValue ?? "").trim();
          const newVal = isNumeric(raw) ? Number(raw) : 0;
          p.data.existencias = newVal;
          markChanged({ base: p.data.base, existencias: newVal });
          return true;
        }
      }
    ]
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

const getRowId = (p) => String(to2(p.data.base));

async function loadSheetMeta() {
  try {
    const { data } = await getSheet(props.sheetId);
    const payload = data?.data || data;

    sheetMeta.value = payload?.sheet || null;
    sheetTabs.value = Array.isArray(payload?.tabs) ? payload.tabs : [];
    physicalLimits.value = payload?.physicalLimits || payload?.physical_limits || null;
  } catch (e) {
    console.error("[AgGridBase] Error getSheet:", e?.response?.data || e);
  }
}

/**
 * ✅ Determina el rango “a mostrar” por vista:
 * - usa tabs del backend (meta.ranges)
 * - fallback a seed mínima
 * - clamp por físicos
 */
function getViewRange() {
  const P = phys.value;

  const tab =
    sheetTabs.value.find((t) => t?.id === baseViewId.value) ||
    sheetTabs.value.find((t) => String(t?.id || "").includes("base")) ||
    null;

  const r = tab?.ranges?.base && typeof tab.ranges.base === "object" ? tab.ranges.base : null;

  const rawA = r ? Number(r.start) : NaN;
  const rawB = r ? Number(r.end) : NaN;

  let min = Number.isFinite(rawA) && Number.isFinite(rawB) ? Math.min(rawA, rawB) : NaN;
  let max = Number.isFinite(rawA) && Number.isFinite(rawB) ? Math.max(rawA, rawB) : NaN;

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 8;
  }

  min = to2(Math.max(P.baseMin, min));
  max = to2(Math.min(P.baseMax, max));

  if (baseViewId.value === "base-neg") {
    const viewMin = to2(Math.min(min, 0, -BASE_STEP)); // asegura vista neg existente
    return { viewMin, viewMax: 0 };
  }
  const viewMax = to2(Math.max(max, 0));
  return { viewMin: 0, viewMax };
}

/** Pedimos items por límites físicos, filtramos por vista al render */
function buildItemsQueryForView() {
  const P = phys.value;
  if (baseViewId.value === "base-neg") return { baseMin: P.baseMin, baseMax: 0 };
  return { baseMin: 0, baseMax: P.baseMax };
}

async function loadRows() {
  const P = phys.value;
  const { viewMin, viewMax } = getViewRange();

  // ✅ seed visible (BASE_STEP = 0.50)
  const seedBases =
    baseViewId.value === "base-neg"
      ? frange(0, viewMin, BASE_STEP)
      : frange(0, viewMax, BASE_STEP);

  const { data } = await fetchItems(props.sheetId, buildItemsQueryForView());
  const items = data?.data || [];

  const itemBases = items
    .map((i) => to2(i.base))
    .filter((b) => b >= P.baseMin && b <= P.baseMax);

  const merged = [...seedBases, ...itemBases]
    .map(to2)
    .filter((b) => b >= P.baseMin && b <= P.baseMax)
    .filter((b) => baseFilterDisplay.value(b));

  const baseListUnique = [...new Set(merged)];

  baseListUnique.sort((a, b) =>
    sortDirForView.value === "desc" ? b - a : a - b
  );

  const map = new Map(items.map((i) => [String(to2(i.base)), Number(i.existencias ?? 0)]));

  rowData.value = baseListUnique.map((b) => ({
    base: b,
    existencias: map.get(String(b)) ?? 0
  }));

  dirty.value = false;
  pendingChanges.value.clear();
  await nextTick();
  resetSort();
}

async function loadAll() {
  await loadSheetMeta();
  await switchViewReload();
}

async function switchViewReload() {
  switchingView.value = true;
  await raf();
  try {
    await loadRows();
  } catch (e) {
    console.error("[AgGridBase] Error fetchItems:", e?.response?.data || e);
  } finally {
    await raf();
    switchingView.value = false;
  }
}

onMounted(loadAll);

watch(
  () => props.sphType,
  async () => {
    pendingChanges.value.clear();
    dirty.value = false;
    await switchViewReload();
  }
);

/* ===================== edición rápida (formula bar) ===================== */
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
  if (p.colDef.field === "existencias") {
    markChanged({ base: p.data.base, existencias: p.data.existencias });
  }
};

// ✅ APLICAR FX SOLO CUANDO EL USUARIO ESCRIBE / CONFIRMA
const applyFxToGrid = (val, { commit = false } = {}) => {
  if (!activeCell || !gridApi.value) return;

  const field = activeCell.colDef.field;
  if (field !== "existencias") return; // solo stock

  const raw = String(val ?? "").trim();

  // live: no forzamos 0 mientras escribe (evita "salto" a 0 con '' o '-')
  if (!commit) {
    if (raw === "") return;
    if (!isNumeric(raw)) return;
  }

  const newVal = isNumeric(raw) ? Number(raw) : 0;
  const current = Number(activeCell.data?.[field] ?? 0);
  if (!commit && current === newVal) return;

  const updatedRow = { ...activeCell.data, [field]: newVal };
  gridApi.value.applyTransaction({ update: [updatedRow] });

  if (activeCell.data) activeCell.data[field] = newVal;
  markChanged({ base: updatedRow.base, existencias: newVal });
};

const onFxInput = (val) => applyFxToGrid(val, { commit: false });
const onFxCommit = (val) => applyFxToGrid(val, { commit: true });

const onGridReady = (p) => {
  gridApi.value = p.api;
};

/* ===================== NAVTOOLS handlers (con ACK) ===================== */
const handleAddRow = async (nuevoValor, ack) => {
  const P = phys.value;
  const base = to2(nuevoValor);

  if (!Number.isFinite(base)) return ackErr(ack, "Ingresa BASE numérica", 400);

  // ✅ BASE es paso 0.50
  if (!isMultipleOfStep(base, BASE_STEP)) {
    return ackErr(
      ack,
      `BASE debe ser múltiplo de ${BASE_STEP.toFixed(2)} (…00, …50). Ej: -1.00, -0.50, +0.00, +0.50, +1.00`,
      400
    );
  }

  if (base < P.baseMin || base > P.baseMax) {
    return ackErr(ack, `BASE fuera de límites (${P.baseMin} a ${P.baseMax})`, 400);
  }

  if (!baseFilterNewRow.value(base)) {
    return ackErr(
      ack,
      baseViewId.value === "base-neg"
        ? "Esta vista es BASE (-): la BASE debe ser negativa (ej: -0.50)"
        : "Esta vista es BASE (+): la BASE debe ser 0 o positiva",
      400
    );
  }

  const exists = rowData.value.some((r) => to2(r.base) === base);
  if (exists) return ackErr(ack, `BASE ${fmtSigned(base)} ya existe`, 409);

  // UI optimista
  const row = { base, existencias: 0 };
  gridApi.value?.applyTransaction({ add: [row] });
  await nextTick();
  resetSort();

  try {
    // ✅ Persistir: IMPORTANTE que el backend acepte crear celdas con existencias=0
    const res = await saveChunk(props.sheetId, [{ base, existencias: 0 }], effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) throw new Error(ok.message || "No se pudo agregar la fila");

    ackOk(ack, ok.message || `Fila agregada: BASE ${fmtSigned(base)}`, ok.status);
    lastSavedAt.value = new Date();

    await loadSheetMeta();     // refresca meta/tabs (rangos extendidos)
    await switchViewReload();  // vuelve a pedir items (ya debería venir -1, 8.5, etc)
  } catch (e) {
    // rollback UI (si falla)
    gridApi.value?.applyTransaction({ remove: [row] });
    await nextTick();
    ackErr(ack, msgFromErr(e, "Error al guardar la nueva BASE"), statusFromErr(e) || 500);
  }
};

async function handleSave(ack) {
  if (!dirty.value || pendingChanges.value.size === 0) {
    ackOk(ack, "No hay cambios por guardar.", 200);
    return;
  }
  saving.value = true;
  try {
    const rows = Array.from(pendingChanges.value.values());
    const res = await saveChunk(props.sheetId, rows, effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo guardar", ok.status);

    dirty.value = false;
    pendingChanges.value.clear();
    lastSavedAt.value = new Date();

    ackOk(ack, ok.message || "Cambios guardados.", ok.status);

    await loadSheetMeta();
    await switchViewReload();
  } catch (e) {
    console.error("[AgGridBase] Error saveChunk:", e?.response?.data || e);
    ackErr(ack, msgFromErr(e, "Error al guardar cambios"), statusFromErr(e));
  } finally {
    saving.value = false;
  }
}

const clearFilters = () => {
  if (!gridApi.value) return;
  const api = gridApi.value;
  if (typeof api.setFilterModel === "function") api.setFilterModel(null);
  else if (typeof api.setGridOption === "function") api.setGridOption("filterModel", null);
};

const resetSort = () => {
  const api = gridApi.value;
  if (!api) return;
  const dir = sortDirForView.value;
  if (typeof api.applyColumnState === "function") {
    api.applyColumnState({ defaultState: { sort: null }, state: [{ colId: "base", sort: dir }] });
  } else if (typeof api.setSortModel === "function") {
    api.setSortModel([{ colId: "base", sort: dir }]);
  }
};

const handleToggleFilters = () => clearFilters();

async function handleDiscard() {
  await switchViewReload();
  dirty.value = false;
  pendingChanges.value.clear();
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
    console.error("[AgGridBase] Error reseed:", e?.response?.data || e);
    ackErr(ack, msgFromErr(e, "Error al generar seed"), statusFromErr(e));
  } finally {
    saving.value = false;
  }
}

function handleExport() {
  if (!gridApi.value || typeof gridApi.value.exportDataAsCsv !== "function") return;
  const nameSlug = sheetName.value.replace(/\s+/g, "_");
  gridApi.value.exportDataAsCsv({ fileName: `${nameSlug || "base"}.csv` });
}
</script>

<style scoped>
.buefy-balham-light {
  padding: 0.5rem 0.75rem 0.75rem;
  background-color: #ffffff;
  border-radius: 0.75rem;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.03);
}

/* ✅ transición suave al cambiar vista */
.grid-shell {
  transition: opacity 160ms ease, transform 200ms cubic-bezier(0.22, 0.61, 0.36, 1), filter 160ms ease;
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
</style>
