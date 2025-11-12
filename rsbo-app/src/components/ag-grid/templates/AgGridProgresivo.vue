<!-- src/components/ag-grid/templates/AgGridProgresivo.vue -->
<template>
  <div class="is-flex is-flex-direction-column" style="height: 100%;">
    <!-- 🔹 Barra superior (herramientas + fórmula) -->
    <navtools
      v-model="formulaValue"
      @add-row="handleAddRow"
      @add-column="handleAddColumn"
    />

    <!-- 🔹 Contenedor de tabla -->
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
import { ref, watch, computed, nextTick } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  iconSetQuartzBold,
  colorSchemeLight
} from "ag-grid-community";
import navtools from "@/components/ag-grid/navtools.vue";

// 🧩 Registro de módulos AG Grid
ModuleRegistry.registerModules([AllCommunityModule]);

// ===========================
// 🔹 Variables reactivas
// ===========================
const gridRef = ref(null);
const gridApi = ref(null);
const gridColumnApi = ref(null);
const rowData = ref([]);
const baseValues = ref([]);
const addCols = ref([0.75, 1.00, 1.25, 1.50, 1.75, 2.00]);

// ===========================
// 🎨 Tema Quartz personalizado
// ===========================
const themeCustom = themeQuartz
  .withPart(iconSetQuartzBold, colorSchemeLight)
  .withParams({
    accentColor: "#8e00d2",
    backgroundColor: "#FFF",
    borderColor: "#00000026",
    borderRadius: 8,
    browserColorScheme: "light",
    columnBorder: true,
    fontFamily: "Satoshi",
    fontSize: 12,
    foregroundColor: "#000",
    headerBackgroundColor: "#FFF",
    headerFontSize: 12,
    headerFontWeight: 500,
    headerRowBorder: false,
    headerTextColor: "#7957d5",
    headerVerticalPaddingScale: 1,
    iconSize: 14,
    rowBorder: true,
    spacing: 5,
    wrapperBorder: true,
    wrapperBorderRadius: 4
  });

// ===========================
// 🌐 Traducción española
// ===========================
const localeText = {
  noRowsToShow: "No hay filas para mostrar",
  loadingOoo: "Cargando...",
  filterOoo: "Filtrar...",
  applyFilter: "Aplicar filtro",
  clearFilter: "Limpiar filtro",
  cancelFilter: "Cancelar",
  resetFilter: "Reiniciar",
  equals: "Igual",
  notEqual: "Distinto",
  lessThan: "Menor que",
  greaterThan: "Mayor que",
  lessThanOrEqual: "Menor o igual",
  greaterThanOrEqual: "Mayor o igual",
  inRange: "En rango",
  contains: "Contiene",
  notContains: "No contiene",
  startsWith: "Empieza con",
  endsWith: "Termina con",
  blank: "Vacío",
  notBlank: "No vacío",
  columns: "Columnas",
  apply: "Aplicar",
  andCondition: "Y",
  orCondition: "O"
};

// ===========================
// 📊 Columnas dinámicas BASE / ADD
// ===========================
const norm = (n) => n.toString().replace(".", "_");

const columns = computed(() => [
  {
    headerName: "BASE",
    children: [
      {
        field: "base",
        headerName: "Base (°)",
        width: 90,
        pinned: "left",
        editable: false,
        resizable: false,
        sortable: true,
        comparator: (a, b) => a - b
      }
    ]
  },
  {
    headerName: "ADD (+)",
    children: addCols.value.map((a) => ({
      field: `add_${norm(a)}`,
      headerName: a.toFixed(2),
      editable: true,
      filter: "agNumberColumnFilter",
      minWidth: 80,
      maxWidth: 140,
      resizable: true,
      valueSetter: (params) => {
        const val = params.newValue?.toString().trim();
        if (!val) {
          params.data[params.colDef.field] = 0;
          return true;
        }
        if (/^\d+(\.\d+)?$/.test(val)) {
          params.data[params.colDef.field] = Number(val);
          return true;
        }
        return false;
      }
    }))
  }
]);

// ===========================
// 🔢 Generación de datos base
// ===========================
const generarBases = () => {
  const arr = [];
  for (let v = 0; v <= 10; v++) arr.push(v);
  return arr;
};

// Simula stock de inventario
const seedValue = (base, add) => {
  const val = Math.floor(((base + add * 10) * 13) % 60);
  return val < 0 ? 0 : val;
};

// Regenera toda la tabla
const regenerarDatos = () => {
  baseValues.value = generarBases();
  rowData.value = baseValues.value.map((b) => {
    const row = { base: b };
    addCols.value.forEach((a) => {
      row[`add_${norm(a)}`] = seedValue(b, a);
    });
    return row;
  });
};

// Inicializa tabla
watch(addCols, regenerarDatos, { immediate: true });

// ===========================
// ⚙️ Configuración general
// ===========================
const defaultColDef = {
  resizable: true,
  sortable: true,
  filter: true,
  editable: true
};

// ===========================
// ✏️ Interacción de celdas
// ===========================
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
      update: [
        {
          ...activeCell.data,
          [activeCell.colDef.field]: val
        }
      ]
    });
  }
});

// ===========================
// 🧮 AG Grid API
// ===========================
const getRowId = (p) => p.data.base.toString();

const onGridReady = (params) => {
  gridApi.value = params.api;
  gridColumnApi.value = params.columnApi;
};

// ===========================
// ➕ Métodos dinámicos
// ===========================
const handleAddRow = async (nuevoValor) => {
  const api = gridApi.value;
  if (!api) return;

  const val = parseFloat(nuevoValor);
  if (isNaN(val)) {
    alert("Ingresa un valor numérico");
    return;
  }
  if (rowData.value.find((r) => r.base === val)) {
    alert(`Base ${val}° ya existe`);
    return;
  }

  const nueva = { base: val };
  addCols.value.forEach((a) => {
    nueva[`add_${norm(a)}`] = 0;
  });

  api.applyTransaction({ add: [nueva] });

  await nextTick();
  setTimeout(() => {
    api.setSortModel([{ colId: "base", sort: "asc" }]);
    api.refreshClientSideRowModel("sort");
  }, 50);
};

const handleAddColumn = async (nuevoValor) => {
  const val = parseFloat(nuevoValor);
  if (isNaN(val)) return alert("Ingresa valor numérico");
  if (addCols.value.includes(val)) return alert(`Columna ADD ${val} ya existe`);

  addCols.value.push(val);
  addCols.value.sort((a, b) => a - b);

  rowData.value.forEach((r) => {
    r[`add_${norm(val)}`] = seedValue(r.base, val);
  });

  await nextTick();
  gridApi.value.refreshHeader();
  gridApi.value.redrawRows();
};
</script>
