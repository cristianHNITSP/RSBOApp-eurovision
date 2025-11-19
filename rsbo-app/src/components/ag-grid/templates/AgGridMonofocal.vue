<!-- src/components/ag-grid/templates/AgGridMonofocal.vue -->
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
  sphType: { type: String, default: "sph-neg" }, // "sph-neg" | "sph-pos"
  actor: { type: Object, default: null }
});

console.log(
  "[AgGridMonofocal] creado",
  "sheetId:",
  props.sheetId,
  "sphType:",
  props.sphType
);

const gridApi = ref(null);
const rowData = ref([]);
const dirty = ref(false);
const saving = ref(false);
const lastSavedAt = ref(null);
const sheetMeta = ref(null);

const isNumeric = (v) =>
  /^-?\d+(\.\d+)?$/.test(String(v ?? "").trim());

/* Tema */
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

const effectiveActor = computed(() => props.actor || null);

const totalRows = computed(() => rowData.value.length);
const sheetName = computed(
  () =>
    sheetMeta.value?.nombre ||
    sheetMeta.value?.name ||
    "Hoja monofocal (Esf/Cil)"
);
const tipoMatriz = computed(() => sheetMeta.value?.tipo_matriz || "SPH_CYL");
const material = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);

const norm = (n) => String(n).replace(".", "_");
const cylValues = ref([]);

watch(dirty, (val) => {
  console.log("[AgGridMonofocal] dirty cambió →", val);
});
watch(saving, (val) => {
  console.log("[AgGridMonofocal] saving cambió →", val);
});

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
        comparator: (a, b) => a - b,
        resizable: false,
        filter: "agNumberColumnFilter",
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
    headerName: "CYL (-)",
    children: cylValues.value.map((c) => ({
      field: `cyl_${norm(c)}`,
      headerName: c.toString(),
      editable: true,
      filter: "agNumberColumnFilter",
      minWidth: 80,
      maxWidth: 110,
      resizable: true,
      cellClass: ["ag-cell--compact", "ag-cell--numeric"],
      headerClass: ["ag-header-cell--compact"],
      valueSetter: (p) => {
        const v = String(p.newValue ?? "").trim();
        const antes = p.data[p.colDef.field];
        p.data[p.colDef.field] = isNumeric(v) ? Number(v) : 0;
        dirty.value = true;
        console.log(
          "[AgGridMonofocal] valueSetter",
          p.colDef.field,
          "sph=",
          p.data.sph,
          "old=",
          antes,
          "new=",
          p.data[p.colDef.field]
        );
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

/* Cargar */
async function loadSheetMeta() {
  try {
    console.log("[AgGridMonofocal] loadSheetMeta");
    const { data } = await getSheet(props.sheetId);
    const payload = data?.data || data;
    sheetMeta.value = payload?.sheet || null;
    console.log("[AgGridMonofocal] sheetMeta:", sheetMeta.value);
  } catch (e) {
    console.error(
      "[AgGridMonofocal] Error getSheet:",
      e?.response?.data || e
    );
  }
}

async function loadRows() {
  const query =
    props.sphType === "sph-pos"
      ? { sphMin: 0, sphMax: 6, cylMin: -6, cylMax: 0 }
      : { sphMin: -6, sphMax: 0, cylMin: -6, cylMax: 0 };

  try {
    console.log("[AgGridMonofocal] loadRows query:", query);
    const { data } = await fetchItems(props.sheetId, query);
    const items = data?.data || [];
    console.log(
      "[AgGridMonofocal] items recibidos:",
      items.length
    );

    const sphList = [...new Set(items.map((i) => Number(i.sph)))].sort(
      (a, b) => a - b
    );
    const cylList = [...new Set(items.map((i) => Number(i.cyl)))].sort(
      (a, b) => a - b
    );
    cylValues.value = cylList;

    console.log(
      "[AgGridMonofocal] sphList:",
      sphList,
      "cylList:",
      cylList
    );

    const key = (s, c) => `${s}|${c}`;
    const map = new Map(
      items.map((i) => [
        key(Number(i.sph), Number(i.cyl)),
        Number(i.existencias ?? 0)
      ])
    );

    rowData.value = sphList.map((sph) => {
      const row = { sph };
      cylList.forEach((cyl) => {
        row[`cyl_${norm(cyl)}`] = map.get(key(sph, cyl)) ?? 0;
      });
      return row;
    });
    console.log(
      "[AgGridMonofocal] filas construidas:",
      rowData.value.length
    );

    dirty.value = false;
    await nextTick();
  } catch (e) {
    console.error(
      "[AgGridMonofocal] Error fetchItems:",
      e?.response?.data || e
    );
  }
}

async function loadAll() {
  console.log(
    "[AgGridMonofocal] loadAll",
    "sheetId:",
    props.sheetId,
    "sphType:",
    props.sphType
  );
  await Promise.all([loadSheetMeta(), loadRows()]);
}

onMounted(loadAll);
watch(
  () => [props.sheetId, props.sphType],
  () => {
    console.log(
      "[AgGridMonofocal] props cambiaron → recargar",
      "sheetId:",
      props.sheetId,
      "sphType:",
      props.sphType
    );
    loadAll();
  }
);

/* Edición rápida / navtools / guardar */
const formulaValue = ref("");
let activeCell = null;

const onCellClicked = (p) => {
  activeCell = p;
  formulaValue.value = p.value;
  console.log(
    "[AgGridMonofocal] cellClicked",
    "rowIndex=",
    p.rowIndex,
    "field=",
    p.colDef.field,
    "sph=",
    p.data?.sph,
    "value=",
    p.value
  );
};

const onCellValueChanged = (p) => {
  console.log(
    "[AgGridMonofocal] cellValueChanged",
    "rowIndex=",
    p.rowIndex,
    "field=",
    p.colDef.field,
    "sph=",
    p.data?.sph,
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
    "[AgGridMonofocal] formulaValue watch → update",
    "sph=",
    activeCell.data?.sph,
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
  console.log("[AgGridMonofocal] grid ready");
  gridApi.value = p.api;
};

/** 🔹 Guardamos SIEMPRE leyendo la data desde gridApi */
function collectRowsFromGrid() {
  const rows = [];
  if (!gridApi.value) {
    console.warn("[AgGridMonofocal] collectRowsFromGrid sin gridApi");
    return rows;
  }

  gridApi.value.forEachNode((node) => {
    const r = node.data;
    if (!r) return;

    const sph = Number(r.sph);
    cylValues.value.forEach((cyl) => {
      const field = `cyl_${norm(cyl)}`;
      const existencias = Number(r[field] ?? 0);
      rows.push({ sph, cyl, existencias });
    });
  });

  return rows;
}

const handleAddRow = async (nuevoValor) => {
  console.log("[AgGridMonofocal] handleAddRow nuevoValor:", nuevoValor);
  const v = Number(nuevoValor);
  if (Number.isNaN(v)) {
    alert("Ingresa un SPH numérico");
    return;
  }
  if (rowData.value.some((r) => r.sph === v)) {
    alert(`SPH ${v} ya existe`);
    return;
  }

  const nueva = { sph: v };
  cylValues.value.forEach((c) => (nueva[`cyl_${norm(c)}`] = 0));

  gridApi.value?.applyTransaction({ add: [nueva] });
  dirty.value = true;
  await nextTick();
  resetSort();
};

const handleAddColumn = async (nuevoValor) => {
  console.log(
    "[AgGridMonofocal] handleAddColumn nuevoValor:",
    nuevoValor
  );
  const v = Number(nuevoValor);
  if (Number.isNaN(v)) {
    alert("Ingresa un CYL numérico");
    return;
  }
  if (cylValues.value.includes(v)) {
    alert(`CYL ${v} ya existe`);
    return;
  }

  cylValues.value = [...cylValues.value, v].sort((a, b) => a - b);
  rowData.value.forEach((r) => (r[`cyl_${norm(v)}`] = 0));
  await nextTick();
  gridApi.value?.refreshHeader();
  gridApi.value?.redrawRows();
  dirty.value = true;
};

/* Filtros / orden para navtools */
const clearFilters = () => {
  if (!gridApi.value || typeof gridApi.value.setFilterModel !== "function") {
    console.warn(
      "[AgGridMonofocal] setFilterModel no disponible",
      gridApi.value
    );
    return;
  }
  console.log("[AgGridMonofocal] clearFilters");
  gridApi.value.setFilterModel(null);
};

const resetSort = () => {
  if (!gridApi.value || typeof gridApi.value.setSortModel !== "function") {
    console.warn(
      "[AgGridMonofocal] setSortModel no disponible",
      gridApi.value
    );
    return;
  }
  console.log("[AgGridMonofocal] resetSort por sph ASC");
  gridApi.value.setSortModel([{ colId: "sph", sort: "asc" }]);
  gridApi.value.refreshClientSideRowModel("sort");
};

const handleToggleFilters = () => {
  console.log("[AgGridMonofocal] handleToggleFilters → clearFilters");
  clearFilters();
};

/* Guardar / refresh / seed / export */
async function handleSave() {
  console.log(
    "[AgGridMonofocal] handleSave llamado. dirty:",
    dirty.value,
    "saving:",
    saving.value
  );
  if (!dirty.value) {
    console.log("[AgGridMonofocal] handleSave → no dirty, return");
    return;
  }
  if (!gridApi.value) {
    console.warn("[AgGridMonofocal] handleSave → sin gridApi, no se puede recolectar filas");
    return;
  }

  saving.value = true;
  try {
    const rows = collectRowsFromGrid();
    console.log(
      "[AgGridMonofocal] rows a enviar:",
      rows.length,
      "ej row[0]:",
      rows[0]
    );
    await saveChunk(props.sheetId, rows, effectiveActor.value);
    dirty.value = false;
    lastSavedAt.value = new Date();
    await loadRows();
  } catch (e) {
    console.error(
      "[AgGridMonofocal] Error saveChunk:",
      e?.response?.data || e
    );
  } finally {
    saving.value = false;
  }
}

async function handleDiscard() {
  console.log("[AgGridMonofocal] handleDiscard");
  await loadRows();
  dirty.value = false;
}

async function handleRefresh() {
  console.log("[AgGridMonofocal] handleRefresh");
  await loadAll();
}

async function handleSeed() {
  try {
    console.log("[AgGridMonofocal] handleSeed");
    saving.value = true;
    await reseedSheet(props.sheetId, effectiveActor.value);
    await loadRows();
    dirty.value = false;
    lastSavedAt.value = new Date();
  } catch (e) {
    console.error(
      "[AgGridMonofocal] Error reseed:",
      e?.response?.data || e
    );
  } finally {
    saving.value = false;
  }
}

function handleExport() {
  if (!gridApi.value || typeof gridApi.value.exportDataAsCsv !== "function") {
    console.warn(
      "[AgGridMonofocal] exportDataAsCsv no disponible",
      gridApi.value
    );
    return;
  }
  const nameSlug = sheetName.value.replace(/\s+/g, "_");
  const posNeg = props.sphType === "sph-pos" ? "pos" : "neg";
  console.log("[AgGridMonofocal] handleExport", nameSlug, posNeg);
  gridApi.value.exportDataAsCsv({
    fileName: `${nameSlug || "sph_cyl"}_${posNeg}.csv`
  });
}
</script>

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
