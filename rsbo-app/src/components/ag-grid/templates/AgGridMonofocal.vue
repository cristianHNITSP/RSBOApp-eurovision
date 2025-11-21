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
  sphType: { type: String, default: "sph-neg" },
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
const sheetTabs = ref([]);

/** Buffer de cambios (sph, cyl) → existencias */
const pendingChanges = ref(new Map());

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

// Actor normalizado
const effectiveActor = computed(() => {
  const src =
    props.actor ||
    (typeof window !== "undefined" ? window.__currentUser : null) ||
    null;

  if (!src) return null;

  const userId = src.userId || src.id || src._id || null;
  const name = src.name || src.email || "Usuario";

  return { userId, name };
});

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
const denorm = (s) => Number(String(s).replace("_", "."));
const cylValues = ref([]);

watch(dirty, (val) => {
  console.log("[AgGridMonofocal] dirty cambió →", val);
});
watch(saving, (val) => {
  console.log("[AgGridMonofocal] saving cambió →", val);
});

/** Registra cambio de una celda sph/cyl */
function markCellChangedMonofocal(sph, cyl, existencias) {
  const s = Number(sph);
  const c = Number(cyl);
  const key = `${s}|${c}`;
  pendingChanges.value.set(key, {
    sph: s,
    cyl: c,
    existencias: Number(existencias ?? 0)
  });
  dirty.value = true;
}

/* Columnas */
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
        ],
        valueFormatter: (p) => {
          const v = Number(p.value);
          return Number.isFinite(v) ? v.toFixed(2) : p.value ?? "";
        }
      }
    ]
  },
  {
    headerName: "CYL (-)",
    children: cylValues.value.map((c) => ({
      field: `cyl_${norm(c)}`,
      headerName: Number(c).toFixed(2),
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
        const newVal = isNumeric(v) ? Number(v) : 0;
        p.data[p.colDef.field] = newVal;

        markCellChangedMonofocal(p.data.sph, c, newVal);

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

/* Cargar meta + tabs */
async function loadSheetMeta() {
  try {
    console.log("[AgGridMonofocal] loadSheetMeta");
    const { data } = await getSheet(props.sheetId);
    const payload = data?.data || data;
    sheetMeta.value = payload?.sheet || null;
    sheetTabs.value = payload?.tabs || [];
    console.log("[AgGridMonofocal] sheetMeta:", sheetMeta.value);
    console.log("[AgGridMonofocal] sheetTabs:", sheetTabs.value);
  } catch (e) {
    console.error(
      "[AgGridMonofocal] Error getSheet:",
      e?.response?.data || e
    );
  }
}

/* Rango SPH/CYL a partir de tabs del backend */
function buildQueryFromTabs() {
  const defaultNeg = { sphMin: -6, sphMax: 0, cylMin: -6, cylMax: 0 };
  const defaultPos = { sphMin: 0, sphMax: 6, cylMin: -6, cylMax: 0 };

  const tabs = sheetTabs.value || [];
  const tab = tabs.find((t) => t.id === props.sphType);

  if (!tab || !tab.ranges) {
    return props.sphType === "sph-pos" ? defaultPos : defaultNeg;
  }

  const r = tab.ranges || {};
  const sphStart = Number(
    r.sph?.start ??
      (props.sphType === "sph-pos" ? defaultPos.sphMin : defaultNeg.sphMin)
  );
  const sphEnd = Number(
    r.sph?.end ??
      (props.sphType === "sph-pos" ? defaultPos.sphMax : defaultNeg.sphMax)
  );
  const cylStart = Number(r.cyl?.start ?? defaultNeg.cylMin);
  const cylEnd = Number(r.cyl?.end ?? defaultNeg.cylMax);

  const sphMin = Math.min(sphStart, sphEnd);
  const sphMax = Math.max(sphStart, sphEnd);
  const cylMin = Math.min(cylStart, cylEnd);
  const cylMax = Math.max(cylStart, cylEnd);

  return { sphMin, sphMax, cylMin, cylMax };
}

/* Cargar filas */
async function loadRows() {
  const query = buildQueryFromTabs();

  try {
    console.log("[AgGridMonofocal] loadRows query:", query);
    const { data } = await fetchItems(props.sheetId, query);
    const items = data?.data || [];
    console.log("[AgGridMonofocal] items recibidos:", items.length);

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
    pendingChanges.value.clear();
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
  await loadSheetMeta();
  await loadRows();
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

/* Edición rápida / fórmula */
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
  if (p.colDef.field.startsWith("cyl_")) {
    const cyl = denorm(p.colDef.field.slice(4));
    markCellChangedMonofocal(p.data.sph, cyl, p.data[p.colDef.field]);
  } else {
    dirty.value = true;
  }
};

function parseCylFromField(field) {
  if (!field.startsWith("cyl_")) return null;
  return denorm(field.slice(4));
}

watch(formulaValue, (val) => {
  if (!activeCell || !gridApi.value) return;
  const field = activeCell.colDef.field;
  const raw = String(val ?? "").trim();
  const newVal = isNumeric(raw) ? Number(raw) : 0;

  console.log(
    "[AgGridMonofocal] formulaValue watch → update",
    "sph=",
    activeCell.data?.sph,
    "field=",
    field,
    "newVal=",
    newVal
  );

  const updatedRow = { ...activeCell.data, [field]: newVal };
  gridApi.value.applyTransaction({
    update: [updatedRow]
  });
  if (activeCell.data) {
    activeCell.data[field] = newVal;
  }

  if (field.startsWith("cyl_")) {
    const cyl = parseCylFromField(field);
    if (!Number.isNaN(cyl)) {
      markCellChangedMonofocal(updatedRow.sph, cyl, newVal);
    }
  } else {
    dirty.value = true;
  }
});

const onGridReady = (p) => {
  console.log("[AgGridMonofocal] grid ready");
  gridApi.value = p.api;
};

/* Guardar desde la grilla */
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

/* Navtools: add row/col */
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
  await nextTick();
  resetSort();

  // Persistir inmediatamente todas las combinaciones sph nuevo + cada cyl existente
  try {
    const rowsToPersist = cylValues.value.map((cyl) => ({
      sph: v,
      cyl,
      existencias: 0
    }));
    if (rowsToPersist.length) {
      await saveChunk(props.sheetId, rowsToPersist, effectiveActor.value);
      console.log(
        "[AgGridMonofocal] Nuevas filas SPH persistidas en BD, filas:",
        rowsToPersist.length
      );
      lastSavedAt.value = new Date();
    }
  } catch (e) {
    console.error(
      "[AgGridMonofocal] Error al persistir SPH nuevo:",
      e?.response?.data || e
    );
  }
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

  // Persistir inmediatamente todas las combinaciones sph existente + nuevo cyl
  try {
    const rowsToPersist = rowData.value.map((r) => ({
      sph: Number(r.sph),
      cyl: v,
      existencias: 0
    }));
    if (rowsToPersist.length) {
      await saveChunk(props.sheetId, rowsToPersist, effectiveActor.value);
      console.log(
        "[AgGridMonofocal] Nueva columna CYL persistida en BD, filas:",
        rowsToPersist.length
      );
      lastSavedAt.value = new Date();
    }
  } catch (e) {
    console.error(
      "[AgGridMonofocal] Error al persistir CYL nuevo:",
      e?.response?.data || e
    );
  }
};

/* Filtros / sort */
const clearFilters = () => {
  if (!gridApi.value) return;
  const api = gridApi.value;
  console.log("[AgGridMonofocal] clearFilters");
  if (typeof api.setFilterModel === "function") {
    api.setFilterModel(null);
  } else if (typeof api.setGridOption === "function") {
    api.setGridOption("filterModel", null);
  }
};

const resetSort = () => {
  console.log("[AgGridMonofocal] resetSort por sph ASC");

  const api = gridApi.value;
  if (!api) return;

  if (typeof api.applyColumnState === "function") {
    api.applyColumnState({
      defaultState: { sort: null },
      state: [{ colId: "sph", sort: "asc" }],
    });
  } else if (typeof api.setSortModel === "function") {
    api.setSortModel([{ colId: "sph", sort: "asc" }]);
  }
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
    saving.value,
    "pendingChanges:",
    pendingChanges.value.size
  );
  if (!dirty.value || pendingChanges.value.size === 0) {
    console.log("[AgGridMonofocal] handleSave → nada que guardar");
    return;
  }
  if (!gridApi.value) {
    console.warn("[AgGridMonofocal] handleSave → sin gridApi, no se puede recolectar filas");
    return;
  }

  saving.value = true;
  try {
    const rows = Array.from(pendingChanges.value.values());
    console.log(
      "[AgGridMonofocal] rows a enviar (chunk):",
      rows.length,
      "ej row[0]:",
      rows[0]
    );
    await saveChunk(props.sheetId, rows, effectiveActor.value);
    dirty.value = false;
    pendingChanges.value.clear();
    lastSavedAt.value = new Date();
    // Ya no recargamos toda la estructura aquí
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
  pendingChanges.value.clear();
}

async function handleRefresh() {
  console.log("[AgGridMonofocal] handleRefresh");
  await loadAll();
  pendingChanges.value.clear();
}

async function handleSeed() {
  try {
    console.log("[AgGridMonofocal] handleSeed");
    saving.value = true;
    await reseedSheet(props.sheetId, effectiveActor.value);
    await loadAll();
    dirty.value = false;
    pendingChanges.value.clear();
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
    <navtools class="p-4"
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
