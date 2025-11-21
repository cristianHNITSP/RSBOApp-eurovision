<!-- src/components/ag-grid/templates/AgGridProgresivo.vue -->
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
  sphType: { type: String, default: "sph-neg" }, // compatibilidad
  actor: { type: Object, default: null }
});

console.log(
  "[AgGridProgresivo] creado",
  "sheetId:",
  props.sheetId
);

const gridApi = ref(null);
const rowData = ref([]);
const dirty = ref(false);
const saving = ref(false);
const lastSavedAt = ref(null);
const sheetMeta = ref(null);

/** Buffer de cambios (base_izq, base_der, add, eye) */
const pendingChanges = ref(new Map());

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
    "Hoja progresivo"
);
const tipoMatriz = computed(() => sheetMeta.value?.tipo_matriz || "BASE_ADD");
const material = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);

const norm = (n) => String(n).replace(".", "_");
const denorm = (s) => Number(String(s).replace("_", "."));
const addValues = ref([]);
const eyes = ["OD", "OI"];

watch(dirty, (v) =>
  console.log("[AgGridProgresivo] dirty cambió →", v)
);
watch(saving, (v) =>
  console.log("[AgGridProgresivo] saving cambió →", v)
);

/** Marca un cambio en progresivo */
function markCellChangedProgresivo({
  add,
  eye,
  base_izq,
  base_der,
  existencias
}) {
  const a = Number(add);
  const bi = Number(base_izq ?? 0);
  const bd = Number(base_der ?? 0);
  const key = `${bi}|${bd}|${a}|${eye}`;
  pendingChanges.value.set(key, {
    add: a,
    eye,
    base_izq: bi,
    base_der: bd,
    existencias: Number(existencias ?? 0)
  });
  dirty.value = true;
}

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
        ],
        valueFormatter: (p) => {
          const v = Number(p.value);
          return Number.isFinite(v) ? v.toFixed(2) : p.value ?? "";
        }
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
          const before = p.data[`add_${norm(add)}_${eye}`];
          const newVal = isNumeric(v) ? Number(v) : 0;
          p.data[`add_${norm(add)}_${eye}`] = newVal;

          markCellChangedProgresivo({
            add,
            eye,
            base_izq: p.data.base_izq ?? p.data.base,
            base_der: p.data.base_der ?? p.data.base,
            existencias: newVal
          });

          dirty.value = true;
          console.log(
            "[AgGridProgresivo] valueSetter",
            `add_${norm(add)}_${eye}`,
            "base:",
            p.data.base_izq,
            "/",
            p.data.base_der,
            "old=",
            before,
            "new=",
            p.data[`add_${norm(add)}_${eye}`]
          );
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
    console.log("[AgGridProgresivo] loadSheetMeta");
    const { data } = await getSheet(props.sheetId);
    const payload = data?.data || data;
    sheetMeta.value = payload?.sheet || null;
    console.log("[AgGridProgresivo] sheetMeta:", sheetMeta.value);
  } catch (e) {
    console.error(
      "[AgGridProgresivo] Error getSheet:",
      e?.response?.data || e
    );
  }
}

async function loadRows() {
  try {
    console.log("[AgGridProgresivo] loadRows");
    const { data } = await fetchItems(props.sheetId);
    const items = data?.data || [];
    console.log(
      "[AgGridProgresivo] items recibidos:",
      items.length
    );

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

    console.log(
      "[AgGridProgresivo] baseRowsKeys:",
      baseRowsKeys,
      "addList:",
      addList
    );

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

    console.log(
      "[AgGridProgresivo] filas construidas:",
      rowData.value.length
    );

    dirty.value = false;
    pendingChanges.value.clear();
    await nextTick();
  } catch (e) {
    console.error(
      "[AgGridProgresivo] Error fetchItems:",
      e?.response?.data || e
    );
  }
}

async function loadAll() {
  console.log("[AgGridProgresivo] loadAll sheetId:", props.sheetId);
  await Promise.all([loadSheetMeta(), loadRows()]);
}

onMounted(loadAll);

/* Edición rápida */
const formulaValue = ref("");
let activeCell = null;

const onCellClicked = (p) => {
  activeCell = p;
  formulaValue.value = p.value;
  console.log(
    "[AgGridProgresivo] cellClicked",
    "rowIndex=",
    p.rowIndex,
    "field=",
    p.colDef.field,
    "base:",
    p.data?.base_izq,
    "/",
    p.data?.base_der,
    "value=",
    p.value
  );
};

const onCellValueChanged = (p) => {
  console.log(
    "[AgGridProgresivo] cellValueChanged",
    "rowIndex=",
    p.rowIndex,
    "field=",
    p.colDef.field,
    "base:",
    p.data?.base_izq,
    "/",
    p.data?.base_der,
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
  if (p.colDef.field.startsWith("add_")) {
    const meta = parseAddEyeFromField(p.colDef.field);
    if (meta) {
      markCellChangedProgresivo({
        add: meta.add,
        eye: meta.eye,
        base_izq: p.data.base_izq ?? p.data.base,
        base_der: p.data.base_der ?? p.data.base,
        existencias: p.data[p.colDef.field]
      });
    }
  } else {
    dirty.value = true;
  }
};

function parseAddEyeFromField(field) {
  if (!field.startsWith("add_")) return null;
  const tail = field.slice(4); // 1_50_OD
  const parts = tail.split("_");
  const eye = parts.pop(); // OD/OI
  const numStr = parts.join("_");
  const add = denorm(numStr);
  if (Number.isNaN(add)) return null;
  return { add, eye };
}

watch(formulaValue, (val) => {
  if (!activeCell || !gridApi.value) return;
  const field = activeCell.colDef.field;
  const raw = String(val ?? "").trim();
  const newVal = isNumeric(raw) ? Number(raw) : 0;

  console.log(
    "[AgGridProgresivo] formulaValue watch → update",
    "base:",
    activeCell.data?.base_izq,
    "/",
    activeCell.data?.base_der,
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

  const meta = parseAddEyeFromField(field);
  if (meta) {
    markCellChangedProgresivo({
      add: meta.add,
      eye: meta.eye,
      base_izq: updatedRow.base_izq ?? updatedRow.base,
      base_der: updatedRow.base_der ?? updatedRow.base,
      existencias: newVal
    });
  } else {
    dirty.value = true;
  }
});

const onGridReady = (p) => {
  console.log("[AgGridProgresivo] grid ready");
  gridApi.value = p.api;
};

/** Guardamos leyendo desde lo que tiene la grilla */
function collectRowsFromGrid() {
  const rows = [];
  if (!gridApi.value) {
    console.warn("[AgGridProgresivo] collectRowsFromGrid sin gridApi");
    return rows;
  }

  gridApi.value.forEachNode((node) => {
    const r = node.data;
    if (!r) return;

    const base_izq = Number(r.base_izq ?? r.base ?? 0);
    const base_der = Number(r.base_der ?? r.base ?? 0);

    addValues.value.forEach((add) => {
      const keyOD = `add_${norm(add)}_OD`;
      const keyOI = `add_${norm(add)}_OI`;

      rows.push({
        add,
        eye: "OD",
        base_izq,
        base_der,
        existencias: Number(r[keyOD] ?? 0)
      });

      rows.push({
        add,
        eye: "OI",
        base_izq,
        base_der,
        existencias: Number(r[keyOI] ?? 0)
      });
    });
  });

  return rows;
}

/* Navtools */
const handleAddRow = async (nuevoValor) => {
  console.log(
    "[AgGridProgresivo] handleAddRow nuevoValor:",
    nuevoValor
  );
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
  await nextTick();
  resetSort();

  // Persistir inmediatamente todas las combinaciones (base nueva, cada add, OD/OI)
  try {
    const rowsToPersist = [];
    addValues.value.forEach((add) => {
      rowsToPersist.push({
        add,
        eye: "OD",
        base_izq: bi,
        base_der: bi,
        existencias: 0
      });
      rowsToPersist.push({
        add,
        eye: "OI",
        base_izq: bi,
        base_der: bi,
        existencias: 0
      });
    });

    if (rowsToPersist.length) {
      await saveChunk(props.sheetId, rowsToPersist, effectiveActor.value);
      console.log(
        "[AgGridProgresivo] Base nueva persistida en BD, filas:",
        rowsToPersist.length
      );
      lastSavedAt.value = new Date();
    }
  } catch (e) {
    console.error(
      "[AgGridProgresivo] Error al persistir base nueva:",
      e?.response?.data || e
    );
  }
};

const handleAddColumn = async (nuevoValor) => {
  console.log(
    "[AgGridProgresivo] handleAddColumn nuevoValor:",
    nuevoValor
  );
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
  await nextTick();
  gridApi.value?.refreshHeader();
  gridApi.value?.redrawRows();

  // Persistir inmediatamente todas las combinaciones (cada base, add nuevo, OD/OI)
  try {
    const rowsToPersist = [];
    rowData.value.forEach((r) => {
      const base_izq = Number(r.base_izq ?? r.base ?? 0);
      const base_der = Number(r.base_der ?? r.base ?? 0);

      rowsToPersist.push({
        add,
        eye: "OD",
        base_izq,
        base_der,
        existencias: 0
      });
      rowsToPersist.push({
        add,
        eye: "OI",
        base_izq,
        base_der,
        existencias: 0
      });
    });

    if (rowsToPersist.length) {
      await saveChunk(props.sheetId, rowsToPersist, effectiveActor.value);
      console.log(
        "[AgGridProgresivo] ADD nuevo persistido en BD, filas:",
        rowsToPersist.length
      );
      lastSavedAt.value = new Date();
    }
  } catch (e) {
    console.error(
      "[AgGridProgresivo] Error al persistir ADD nuevo:",
      e?.response?.data || e
    );
  }
};

/* Guardar */
async function handleSave() {
  console.log(
    "[AgGridProgresivo] handleSave llamado. dirty:",
    dirty.value,
    "saving:",
    saving.value,
    "pendingChanges:",
    pendingChanges.value.size
  );
  if (!dirty.value || pendingChanges.value.size === 0) {
    console.log("[AgGridProgresivo] handleSave → nada que guardar");
    return;
  }
  if (!gridApi.value) {
    console.warn("[AgGridProgresivo] handleSave → sin gridApi, no se puede recolectar filas");
    return;
  }

  saving.value = true;
  try {
    const rows = Array.from(pendingChanges.value.values());
    console.log(
      "[AgGridProgresivo] rows a enviar (chunk):",
      rows.length,
      "ej row[0]:",
      rows[0]
    );

    await saveChunk(props.sheetId, rows, effectiveActor.value);
    dirty.value = false;
    pendingChanges.value.clear();
    lastSavedAt.value = new Date();
    // No recargamos toda la hoja aquí
  } catch (e) {
    console.error(
      "[AgGridProgresivo] Error saveChunk:",
      e?.response?.data || e
    );
  } finally {
    saving.value = false;
  }
}

/* Filtros / orden para navtools */
const clearFilters = () => {
  if (!gridApi.value) return;
  const api = gridApi.value;
  console.log("[AgGridProgresivo] clearFilters");
  if (typeof api.setFilterModel === "function") {
    api.setFilterModel(null);
  } else if (typeof api.setGridOption === "function") {
    api.setGridOption("filterModel", null);
  }
};

const resetSort = () => {
  console.log("[AgGridProgresivo] resetSort por base ASC");

  const api = gridApi.value;
  if (!api) return;

  if (typeof api.applyColumnState === "function") {
    api.applyColumnState({
      defaultState: { sort: null },
      state: [{ colId: "base", sort: "asc" }],
    });
  } else if (typeof api.setSortModel === "function") {
    api.setSortModel([{ colId: "base", sort: "asc" }]);
  }
};


const handleToggleFilters = () => {
  console.log("[AgGridProgresivo] handleToggleFilters → clearFilters");
  clearFilters();
};

/* Otros handlers */
async function handleDiscard() {
  console.log("[AgGridProgresivo] handleDiscard");
  await loadRows();
  dirty.value = false;
  pendingChanges.value.clear();
}

async function handleRefresh() {
  console.log("[AgGridProgresivo] handleRefresh");
  await loadAll();
  pendingChanges.value.clear();
}

async function handleSeed() {
  try {
    console.log("[AgGridProgresivo] handleSeed");
    saving.value = true;
    await reseedSheet(props.sheetId, effectiveActor.value);
    await loadAll();
    lastSavedAt.value = new Date();
    pendingChanges.value.clear();
  } catch (e) {
    console.error(
      "[AgGridProgresivo] Error reseed:",
      e?.response?.data || e
    );
  } finally {
    saving.value = false;
  }
}

function handleExport() {
  if (!gridApi.value || typeof gridApi.value.exportDataAsCsv !== "function") {
    console.warn(
      "[AgGridProgresivo] exportDataAsCsv no disponible",
      gridApi.value
    );
    return;
  }
  const nameSlug = sheetName.value.replace(/\s+/g, "_");
  console.log("[AgGridProgresivo] handleExport", nameSlug);
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
