<!-- src/components/ag-grid/templates/AgGridMonofocal.vue -->
<template>
  <div class="is-flex is-flex-direction-column" style="height: 100%;">
    <!-- Barra superior -->
    <navtools
      v-model="formulaValue"
      @add-row="handleAddRow"
      @add-column="handleAddColumn"
    />

    <!-- Contenedor del grid -->
    <div
      class="buefy-balham-light"
      style="flex: 1 1 auto; display: flex; flex-direction: column; overflow: auto;"
    >
      <AgGridVue
        ref="gridRef"
        :columnDefs="columns"
        :rowData="rowData"
        :defaultColDef="defaultColDef"
        :getRowId="getRowId"
        :animateRows="true"
        :localeText="localeText"
        :theme="themeCustom"
        @cellClicked="onCellClicked"
        @cellValueChanged="onCellValueChanged"
        @grid-ready="onGridReady"
        style="width: 100%; height: 100%;"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, computed, nextTick, watch } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  iconSetQuartzBold,
  colorSchemeLight
} from "ag-grid-community";
import navtools from "@/components/ag-grid/navtools.vue";

ModuleRegistry.registerModules([AllCommunityModule]);

// ==============================
// ⚙️ Props
// ==============================
const props = defineProps({
  // Bases iniciales
  initialBases: { type: Array, default: () => [2, 4, 6, 8] }
});

// ==============================
// 🔧 Estado interno
// ==============================
const gridRef = ref(null);
const gridApi = ref(null);
const gridColumnApi = ref(null);

// ==============================
// 🎨 Tema Quartz personalizado
// ==============================
const themeCustom = themeQuartz
  .withPart(iconSetQuartzBold, colorSchemeLight)
  .withParams({
    accentColor: "#8e00d2",
    backgroundColor: "#FFF",
    borderColor: "#00000026",
    borderRadius: 8,
    columnBorder: true,
    fontFamily: "Satoshi",
    fontSize: 12,
    foregroundColor: "#000",
    headerBackgroundColor: "#FFF",
    headerFontSize: 12,
    headerFontWeight: 500,
    headerTextColor: "#7957d5",
    rowBorder: true,
    spacing: 5,
    wrapperBorder: true,
    wrapperBorderRadius: 4
  });

// ==============================
// 🌐 Localización
// ==============================
const localeText = {
  noRowsToShow: "No hay filas para mostrar",
  loadingOoo: "Cargando..."
};

// ==============================
// 📊 Columnas simples BASE / EXISTENCIAS
// ==============================
const columns = computed(() => [
  {
    headerName: "BASE",
    field: "base",
    pinned: "left",
    width: 120,
    editable: false,
    sortable: true,
    comparator: (a, b) => a - b
  },
  {
    headerName: "EXISTENCIAS",
    field: "existencias",
    editable: true,
    filter: "agNumberColumnFilter",
    minWidth: 120,
    resizable: true,
    valueSetter: (params) => {
      const val = params.newValue?.toString().trim();
      if (!val) {
        params.data.existencias = 0;
        return true;
      }
      if (/^-?\d+(\.\d+)?$/.test(val)) {
        params.data.existencias = Number(val);
        return true;
      }
      return false;
    }
  }
]);

// ==============================
// 🔹 Datos simulados
// ==============================
const seedData = {
  2: 120,
  4: 80,
  6: 50,
  8: 30
};

const rowData = ref(
  props.initialBases.map((b) => ({
    base: b,
    existencias: seedData[b] ?? 0
  }))
);

// ==============================
// ⚙️ Config
// ==============================
const defaultColDef = {
  resizable: true,
  sortable: true,
  filter: true,
  editable: true
};

// ==============================
// ✏️ Edición y sincronización
// ==============================
const formulaValue = ref("");
let activeCell = null;

const onCellClicked = (params) => {
  activeCell = params;
  formulaValue.value = params.value;
};

const onCellValueChanged = (params) => {
  if (
    activeCell &&
    activeCell.rowIndex === params.rowIndex &&
    activeCell.colDef.field === params.colDef.field
  ) {
    formulaValue.value = params.newValue;
  }
};

watch(formulaValue, (val) => {
  if (activeCell && gridApi.value) {
    gridApi.value.applyTransaction({
      update: [{ ...activeCell.data, [activeCell.colDef.field]: val }]
    });
  }
});

// ==============================
// 🧮 AG Grid API
// ==============================
const getRowId = (p) => p.data.base.toString();
const onGridReady = (params) => {
  gridApi.value = params.api;
  gridColumnApi.value = params.columnApi;
};

// ==============================
// ➕ Funciones dinámicas
// ==============================
const handleAddRow = async (nuevoValor) => {
  const api = gridApi.value;
  if (!api) return;

  const val = parseFloat(nuevoValor);
  if (isNaN(val)) {
    alert("Ingresa una base numérica");
    return;
  }
  if (rowData.value.find((r) => r.base === val)) {
    alert(`Base ${val} ya existe`);
    return;
  }

  const nueva = { base: val, existencias: 0 };
  api.applyTransaction({ add: [nueva] });

  await nextTick();
  setTimeout(() => {
    api.setSortModel([{ colId: "base", sort: "asc" }]);
    api.refreshClientSideRowModel("sort");
  }, 50);
};

// No se usa agregar columna, pero mantenemos compatibilidad
const handleAddColumn = () => {
  alert("No se pueden agregar columnas en este tipo de planilla (solo BASE y EXISTENCIAS).");
};
</script>
