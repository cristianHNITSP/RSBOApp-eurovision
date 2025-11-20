<template>
  <div class="is-flex is-flex-direction-column" style="height: 100%;">
    <navtools className="p-4"
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
      @add-column="handleAddColumn"
      @clear-filters="clearFilters"
      @reset-sort="resetSort"
      @toggle-filters="handleToggleFilters"
      @save-request="handleSave"
      @discard-changes="handleDiscard"
      @refresh="handleRefresh"
      @seed="handleSeed"
      @export="handleExport"
    />

    <div
          class="buefy-balham-light"
          style="flex: 1 1 auto; display: flex; flex-direction: column; overflow: auto;"
    >
      <AgGridVue
        ref="gridRef"
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
import {
  fetchItems,
  saveChunk,
  reseedSheet,
  getSheet
} from "@/services/inventory";

ModuleRegistry.registerModules([AllCommunityModule]);

const props = defineProps({
  sheetId: { type: String, required: true },
  // En monofocal/bifocal usa sphType si aplica:
  sphType: { type: String, default: "sph-neg" },
  actor: { type: Object, default: null }
});

console.log("[AgGridBase] creado para sheetId:", props.sheetId);

const gridApi = ref(null);
const gridRef = ref(null);
const rowData = ref([]);
const dirty = ref(false);
const saving = ref(false);
const lastSavedAt = ref(null);
const sheetMeta = ref(null);

const isNumeric = (v) =>
  /^-?\d+(\.\d+)?$/.test(String(v ?? "").trim());

/* ========= TEMA QUARTZ + LOOK BUEFY ========= */
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

const localeText = {
  noRowsToShow: "No hay filas para mostrar",
  loadingOoo: "Cargando..."
};

// 🔹 Actor normalizado: siempre { userId, name }
const effectiveActor = computed(() => {
  const src =
    props.actor ||
    (typeof window !== "undefined" ? window.__currentUser : null) ||
    null;

  if (!src) return null;

  const userId = src.userId || src.id || src._id || null;
  const name = src.name || src.email || "Usuario";

  // Siempre mandamos estas dos propiedades para el backend
  return { userId, name };
});

const totalRows = computed(() => rowData.value.length);
const sheetName = computed(
  () => sheetMeta.value?.nombre || sheetMeta.value?.name || "Hoja monofocal (Base)"
);
const tipoMatriz = computed(() => sheetMeta.value?.tipo_matriz || "BASE");
const material = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);

/* ========= COLUMNAS ========= */
const columns = computed(() => [
  {
    headerName: "BASE (°)",
    field: "base",
    pinned: "left",
    width: 96,
    minWidth: 90,
    maxWidth: 105,
    resizable: false,
    editable: false,
    sortable: true,
    comparator: (a, b) => a - b,
    filter: "agNumberColumnFilter",
    cellClass: ["ag-cell--compact", "ag-cell--numeric", "ag-cell--pinned"],
    headerClass: ["ag-header-cell--compact", "ag-header-cell--pinned"]
  },
  {
    headerName: "Existencias",
    field: "existencias",
    editable: true,
    filter: "agNumberColumnFilter",
    width: 120,
    minWidth: 110,
    maxWidth: 140,
    resizable: true,
    cellClass: ["ag-cell--compact", "ag-cell--numeric"],
    headerClass: ["ag-header-cell--compact"],
    valueSetter: (p) => {
      const v = String(p.newValue ?? "").trim();
      const before = p.data.existencias;
      p.data.existencias = isNumeric(v) ? Number(v) : 0;
      dirty.value = true;
      console.log(
        "[AgGridBase] valueSetter existencias base=",
        p.data.base,
        "old=",
        before,
        "new=",
        p.data.existencias
      );
      return true;
    }
  }
]);

const defaultColDef = {
  resizable: true,
  sortable: true,
  filter: "agNumberColumnFilter",
  floatingFilter: true,
  editable: true,
  minWidth: 90,
  maxWidth: 160,
  cellClass: "ag-cell--compact",
  headerClass: "ag-header-cell--compact"
};

const getRowId = (p) => p.data.base?.toString();

/* ========= CARGA ========= */
async function loadSheetMeta() {
  try {
    console.log("[AgGridBase] loadSheetMeta");
    const { data } = await getSheet(props.sheetId);
    const payload = data?.data || data;
    sheetMeta.value = payload?.sheet || null;
    console.log("[AgGridBase] sheetMeta:", sheetMeta.value);
  } catch (e) {
    console.error("[AgGridBase] Error getSheet:", e?.response?.data || e);
  }
}

async function loadRows() {
  try {
    console.log("[AgGridBase] loadRows");
    const { data } = await fetchItems(props.sheetId);
    rowData.value = (data?.data || [])
      .map((it) => ({
        base: Number(it.base),
        existencias: Number(it.existencias ?? 0)
      }))
      .sort((a, b) => a.base - b.base);
    console.log(
      "[AgGridBase] loadRows resultado filas:",
      rowData.value.length
    );
  } catch (e) {
    console.error("[AgGridBase] Error fetchItems:", e?.response?.data || e);
  }
}

async function loadAll() {
  console.log("[AgGridBase] loadAll");
  await Promise.all([loadSheetMeta(), loadRows()]);
  dirty.value = false;
}

onMounted(loadAll);

/* ========= EDICIÓN RÁPIDA / FORMULA BAR ========= */
const formulaValue = ref("");
let activeCell = null;

const onCellClicked = (p) => {
  activeCell = p;
  formulaValue.value = p.value;
  console.log("[AgGridBase] cellClicked base=", p.data?.base, "value=", p.value);
};

const onCellValueChanged = (p) => {
  console.log(
    "[AgGridBase] cellValueChanged base=",
    p.data?.base,
    "old=",
    p.oldValue,
    "new=",
    p.newValue
  );
  if (
    activeCell &&
    activeCell.rowIndex === p.rowIndex &&
    activeCell.colDef.field === p.colDef.field
  ) {
    formulaValue.value = p.newValue;
  }
  dirty.value = true;
};

watch(formulaValue, (val) => {
  if (!activeCell || !gridApi.value) return;
  const field = activeCell.colDef.field;
  const raw = String(val ?? "").trim();
  const newVal = isNumeric(raw) ? Number(raw) : raw;

  console.log(
    "[AgGridBase] formulaValue watch → update",
    "base=",
    activeCell.data?.base,
    "field=",
    field,
    "newVal=",
    newVal
  );

  gridApi.value.applyTransaction({
    update: [{ ...activeCell.data, [field]: newVal }]
  });
  dirty.value = true;
});

const onGridReady = (p) => {
  console.log("[AgGridBase] grid ready");
  gridApi.value = p.api;
};

/** 🔹 SIEMPRE guardamos leyendo lo que tiene realmente la grilla */
function collectRowsFromGrid() {
  const rows = [];
  if (!gridApi.value) {
    console.warn("[AgGridBase] collectRowsFromGrid sin gridApi");
    return rows;
  }

  gridApi.value.forEachNode((node) => {
    const d = node.data;
    if (!d) return;

    rows.push({
      base: Number(d.base),
      existencias: Number(d.existencias ?? 0)
    });
  });

  return rows;
}

/* ========= NAVTOOLS: estructura ========= */
const handleAddRow = async (nuevoValor) => {
  console.log("[AgGridBase] handleAddRow nuevoValor:", nuevoValor);
  const v = Number(nuevoValor);
  if (Number.isNaN(v)) {
    alert("Ingresa una base numérica");
    return;
  }
  if (rowData.value.some((r) => r.base === v)) {
    alert(`Base ${v} ya existe`);
    return;
  }

  gridApi.value?.applyTransaction({
    add: [{ base: v, existencias: 0 }]
  });
  dirty.value = true;

  await nextTick();
  resetSort();
};

const handleAddColumn = () =>
  alert("Esta hoja no admite columnas dinámicas.");

/* Filtros / orden */
const clearFilters = () => {
  if (!gridApi.value || typeof gridApi.value.setFilterModel !== "function") {
    console.warn("[AgGridBase] setFilterModel no disponible", gridApi.value);
    return;
  }
  console.log("[AgGridBase] clearFilters");
  gridApi.value.setFilterModel(null);
};

const resetSort = () => {
  if (!gridApi.value || typeof gridApi.value.setSortModel !== "function") {
    console.warn("[AgGridBase] setSortModel no disponible", gridApi.value);
    return;
  }
  console.log("[AgGridBase] resetSort por base ASC");
  gridApi.value.setSortModel([{ colId: "base", sort: "asc" }]);
  gridApi.value.refreshClientSideRowModel("sort");
};

const handleToggleFilters = () => {
  console.log("[AgGridBase] handleToggleFilters → clearFilters");
  clearFilters();
};

/* ========= GUARDAR / REFRESH / SEED / EXPORT ========= */
async function handleSave() {
  console.log(
    "[AgGridBase] handleSave llamado. dirty:",
    dirty.value,
    "saving:",
    saving.value
  );
  if (!dirty.value) {
    console.log("[AgGridBase] handleSave → no dirty, return");
    return;
  }
  if (!gridApi.value) {
    console.warn("[AgGridBase] handleSave → sin gridApi, no se puede recolectar filas");
    return;
  }

  saving.value = true;
  try {
    const rows = collectRowsFromGrid();
    console.log(
      "[AgGridBase] handleSave enviando rows:",
      rows.length,
      "ejemplo row[0]:",
      rows[0]
    );
    await saveChunk(props.sheetId, rows, effectiveActor.value);
    dirty.value = false;
    lastSavedAt.value = new Date();
    await loadRows();
  } catch (e) {
    console.error("[AgGridBase] Error saveChunk:", e?.response?.data || e);
  } finally {
    saving.value = false;
  }
}

async function handleDiscard() {
  console.log("[AgGridBase] handleDiscard");
  await loadRows();
  dirty.value = false;
}

async function handleRefresh() {
  console.log("[AgGridBase] handleRefresh");
  await loadAll();
}

async function handleSeed() {
  try {
    console.log("[AgGridBase] handleSeed");
    saving.value = true;
    await reseedSheet(props.sheetId, effectiveActor.value);
    await loadRows();
    dirty.value = false;
    lastSavedAt.value = new Date();
  } catch (e) {
    console.error("[AgGridBase] Error reseed:", e?.response?.data || e);
  } finally {
    saving.value = false;
  }
}

function handleExport() {
  if (!gridApi.value || typeof gridApi.value.exportDataAsCsv !== "function") {
    console.warn("[AgGridBase] exportDataAsCsv no disponible", gridApi.value);
    return;
  }
  const nameSlug = sheetName.value.replace(/\s+/g, "_");
  console.log("[AgGridBase] handleExport file:", nameSlug);
  gridApi.value.exportDataAsCsv({
    fileName: `${nameSlug || "base"}.csv`
  });
}
</script>

<style scoped>
.buefy-balham-light {
  padding: 0.5rem 0.75rem 0.75rem;
  background-color: #ffffff;
  border-radius: 0.75rem;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.03);
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
