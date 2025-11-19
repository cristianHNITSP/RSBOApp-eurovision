<!-- src/components/ag-grid/templates/AgGridProgresivo.vue -->
<template>
  <div class="is-flex is-flex-direction-column" style="height: 100%;">
    <navtools
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
  actor: { type: Object, default: null }
});

const gridApi = ref(null);
const rowData = ref([]);
const dirty = ref(false);
const saving = ref(false);
const lastSavedAt = ref(null);
const sheetMeta = ref(null);

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

const isNumeric = (v) =>
  /^-?\d+(\.\d+)?$/.test(String(v ?? "").trim());

const effectiveActor = computed(() => props.actor || null);
const totalRows = computed(() => rowData.value.length);
const sheetName = computed(
  () => sheetMeta.value?.nombre || sheetMeta.value?.name || "Hoja progresivo"
);
const tipoMatriz = computed(() => sheetMeta.value?.tipo_matriz || "BASE_ADD");
const material = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);

const norm = (n) => String(n).replace(".", "_");
const addValues = ref([]);
const eyes = ["OD", "OI"];

/* Columnas */
const columns = computed(() => [
  {
    headerName: "BASE",
    children: [
      {
        field: "base",
        headerName: "Base (°)",
        pinned: "left",
        width: 110,
        minWidth: 100,
        maxWidth: 120,
        editable: false,
        sortable: true,
        comparator: (a, b) => a - b,
        filter: "agNumberColumnFilter",
        resizable: false,
        cellClass: [
          "ag-cell--compact",
          "ag-cell--numeric",
          "ag-cell--pinned"
        ],
        headerClass: [
          "ag-header-cell--compact",
          "ag-header-cell--pinned"
        ]
      }
    ]
  },
  {
    headerName: "ADD (+)",
    children: addValues.value.map((add) => ({
      headerName: Number(add).toFixed(2),
      marryChildren: true,
      children: eyes.map((eye) => ({
        field: `add_${norm(add)}_${eye}`,
        headerName: eye,
        editable: true,
        minWidth: 90,
        maxWidth: 110,
        filter: "agNumberColumnFilter",
        cellClass: ["ag-cell--compact", "ag-cell--numeric"],
        headerClass: ["ag-header-cell--compact"],
        valueSetter: (p) => {
          const v = String(p.newValue ?? "").trim();
          p.data[`add_${norm(add)}_${eye}`] = isNumeric(v) ? Number(v) : 0;
          dirty.value = true;
          return true;
        }
      }))
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

const getRowId = (p) => `${p.data.base_izq}|${p.data.base_der}`;

/* Cargar (GET) y pivotear */
async function loadSheetMeta() {
  try {
    const { data } = await getSheet(props.sheetId);
    const payload = data?.data || data;
    sheetMeta.value = payload?.sheet || null;
  } catch (e) {
    console.error("[AgGridProgresivo] Error getSheet:", e?.response?.data || e);
  }
}

async function loadRows() {
  try {
    const { data } = await fetchItems(props.sheetId);
    const items = data?.data || [];

    const baseRowsKeys = [
      ...new Set(
        items.map(
          (i) =>
            `${Number(i.base_izq ?? 0)}|${Number(i.base_der ?? 0)}`
        )
      )
    ];

    const addList = [...new Set(items.map((i) => Number(i.add)))].sort(
      (a, b) => a - b
    );
    addValues.value = addList;

    const key = (bi, bd, add, eye) =>
      `${bi}|${bd}|${add}|${eye}`;
    const map = new Map(
      items.map((i) => [
        key(
          Number(i.base_izq ?? 0),
          Number(i.base_der ?? 0),
          Number(i.add),
          String(i.eye).toUpperCase()
        ),
        Number(i.existencias ?? 0)
      ])
    );

    rowData.value = baseRowsKeys.map((k) => {
      const [bi, bd] = k.split("|").map(Number);
      const row = { base_izq: bi, base_der: bd, base: bi };
      addList.forEach((add) => {
        row[`add_${norm(add)}_OD`] =
          map.get(key(bi, bd, add, "OD")) ?? 0;
        row[`add_${norm(add)}_OI`] =
          map.get(key(bi, bd, add, "OI")) ?? 0;
      });
      return row;
    });

    dirty.value = false;
    await nextTick();
  } catch (e) {
    console.error("[AgGridProgresivo] Error fetchItems:", e?.response?.data || e);
  }
}

async function loadAll() {
  await Promise.all([loadSheetMeta(), loadRows()]);
}

onMounted(loadAll);

/* Edición rápida */
const formulaValue = ref("");
let activeCell = null;

const onCellClicked = (p) => {
  activeCell = p;
  formulaValue.value = p.value;
};

const onCellValueChanged = (p) => {
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

  gridApi.value.applyTransaction({
    update: [{ ...activeCell.data, [field]: newVal }]
  });
  dirty.value = true;
});

const onGridReady = (p) => {
  gridApi.value = p.api;
};

/* Navtools */
const handleAddRow = (nuevoValor) => {
  const bi = Number(nuevoValor);
  if (Number.isNaN(bi)) {
    alert("Ingresa Base Izq numérica (usaremos Der=Izq por defecto)");
    return;
  }

  const exists = rowData.value.some(
    (r) => r.base_izq === bi && r.base_der === bi
  );
  if (exists) {
    alert(`Fila base ${bi}/${bi} ya existe`);
    return;
  }

  const row = { base_izq: bi, base_der: bi, base: bi };
  addValues.value.forEach((add) => {
    row[`add_${norm(add)}_OD`] = 0;
    row[`add_${norm(add)}_OI`] = 0;
  });

  gridApi.value?.applyTransaction({ add: [row] });
  dirty.value = true;
  nextTick(() => resetSort());
};

const handleAddColumn = (nuevoValor) => {
  const add = Number(nuevoValor);
  if (Number.isNaN(add)) {
    alert("Ingresa ADD numérico");
    return;
  }
  if (addValues.value.includes(add)) {
    alert(`ADD ${add} ya existe`);
    return;
  }

  addValues.value = [...addValues.value, add].sort((a, b) => a - b);
  rowData.value.forEach((r) => {
    r[`add_${norm(add)}_OD`] = 0;
    r[`add_${norm(add)}_OI`] = 0;
  });
  nextTick(() => {
    gridApi.value?.refreshHeader();
    gridApi.value?.redrawRows();
  });
  dirty.value = true;
};

/* Guardar */
async function handleSave() {
  if (!dirty.value) return;
  saving.value = true;
  try {
    const rows = [];
    rowData.value.forEach((r) => {
      const { base_izq, base_der } = r;
      addValues.value.forEach((add) => {
        rows.push({
          add,
          eye: "OD",
          base_izq,
          base_der,
          existencias: Number(r[`add_${norm(add)}_OD`] ?? 0)
        });
        rows.push({
          add,
          eye: "OI",
          base_izq,
          base_der,
          existencias: Number(r[`add_${norm(add)}_OI`] ?? 0)
        });
      });
    });

    await saveChunk(props.sheetId, rows, effectiveActor.value);
    dirty.value = false;
    lastSavedAt.value = new Date();
    await loadRows();
  } catch (e) {
    console.error("[AgGridProgresivo] Error saveChunk:", e?.response?.data || e);
  } finally {
    saving.value = false;
  }
}

/* Filtros / orden para navtools */
const clearFilters = () => {
  if (!gridApi.value || typeof gridApi.value.setFilterModel !== "function") {
    console.warn("[AgGridProgresivo] setFilterModel no disponible", gridApi.value);
    return;
  }
  gridApi.value.setFilterModel(null);
};

const resetSort = () => {
  if (!gridApi.value || typeof gridApi.value.setSortModel !== "function") {
    console.warn("[AgGridProgresivo] setSortModel no disponible", gridApi.value);
    return;
  }
  gridApi.value.setSortModel([{ colId: "base", sort: "asc" }]);
  gridApi.value.refreshClientSideRowModel("sort");
};

const handleToggleFilters = () => {
  clearFilters();
};

/* Otros handlers */
async function handleDiscard() {
  await loadRows();
  dirty.value = false;
}

async function handleRefresh() {
  await loadAll();
}

async function handleSeed() {
  try {
    saving.value = true;
    await reseedSheet(props.sheetId, effectiveActor.value);
    await loadAll();
    lastSavedAt.value = new Date();
  } catch (e) {
    console.error("[AgGridProgresivo] Error reseed:", e?.response?.data || e);
  } finally {
    saving.value = false;
  }
}

function handleExport() {
  if (!gridApi.value || typeof gridApi.value.exportDataAsCsv !== "function") {
    console.warn("[AgGridProgresivo] exportDataAsCsv no disponible", gridApi.value);
    return;
  }
  const nameSlug = sheetName.value.replace(/\s+/g, "_");
  gridApi.value.exportDataAsCsv({
    fileName: `${nameSlug || "progresivo"}.csv`
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
