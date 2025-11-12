<!-- rsbo-app/src/components/ag-grid/templates/AgGridMonofocal.vue -->
<template>
  <div class="is-flex is-flex-direction-column" style="height: 100%;">
    <navtools
      v-model="formulaValue"
      @add-row="handleAddRow"
      @add-column="handleAddColumn"
    />

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
import { ref, watch, defineProps, computed, nextTick } from "vue";
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

const gridRef = ref(null);
const gridApi = ref(null);
const gridColumnApi = ref(null);

const props = defineProps({
  // Controlado desde TabsManager: "sph-neg" | "sph-pos"
  sphType: { type: String, default: "sph-neg" },
  cylMin: { type: Number, default: -2 },
  cylMax: { type: Number, default: 0 },
  cylStep: { type: Number, default: 0.25 }
});

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
  loading: "Cargando...",
  apply: "Aplicar",
  andCondition: "Y",
  orCondition: "O"
};

const sphValues = ref([]);
const cylValues = ref([]);
const rowData = ref([]);

const norm = (n) => n.toString().replace(".", "_");

// Columnas dinámicas SPH ± / CYL -
const columns = computed(() => [
  {
    headerName: `SPH ${props.sphType === "sph-neg" ? "(-)" : "(+)"}`,
    children: [
      {
        field: "sph",
        headerName: "SPH",
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
    headerName: "CYL (-)",
    children: cylValues.value.map((c) => ({
      field: `cyl_${norm(c)}`,
      headerName: c.toString(),
      editable: true,
      filter: "agNumberColumnFilter",
      minWidth: 80,
      maxWidth: 120,
      resizable: true,
      valueSetter: (params) => {
        const val = params.newValue?.toString().trim();
        if (!val) {
          params.data[params.colDef.field] = 0;
          return true;
        }
        if (/^-?\d+(\.\d+)?$/.test(val)) {
          params.data[params.colDef.field] = Number(val);
          return true;
        }
        return false;
      }
    }))
  }
]);

const generarRango = (min, max, step) => {
  const arr = [];
  for (let v = min; v <= max + 1e-6; v += step) {
    arr.push(Number(v.toFixed(2)));
  }
  return arr;
};

const generarSphPorTipo = (tipo) => {
  const arr = [];
  if (tipo === "sph-neg") {
    for (let v = 0; v >= -6; v -= 0.25) arr.push(Number(v.toFixed(2)));
  } else {
    for (let v = 0.25; v <= 6; v += 0.25) arr.push(Number(v.toFixed(2)));
  }
  return arr;
};

// Semilla determinística (ejemplo)
const seedValue = (sph, cyl) => {
  const base =
    Math.abs(Math.round(sph * 100)) + Math.abs(Math.round(cyl * 100));
  if (base % 2 !== 0) return 0;
  return (base % 40) + 5;
};

const regenerarDatos = (tipo) => {
  sphValues.value = generarSphPorTipo(tipo);
  cylValues.value = generarRango(props.cylMin, props.cylMax, props.cylStep);

  rowData.value = sphValues.value.map((sph) => {
    const row = { sph };
    cylValues.value.forEach((c) => {
      row[`cyl_${norm(c)}`] = seedValue(sph, c);
    });
    return row;
  });

  if (gridApi.value) {
    nextTick(() => {
      gridApi.value.setSortModel([{ colId: "sph", sort: "asc" }]);
      gridApi.value.refreshClientSideRowModel("sort");
    });
  }
};

watch(
  () => [props.sphType, props.cylMin, props.cylMax, props.cylStep],
  () => regenerarDatos(props.sphType),
  { immediate: true }
);

const defaultColDef = {
  resizable: true,
  sortable: true,
  filter: true,
  editable: true
};

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

const getRowId = (p) => p.data.sph.toString();

const onGridReady = (params) => {
  gridApi.value = params.api;
  gridColumnApi.value = params.columnApi;
};

const handleAddRow = async (nuevoValor) => {
  const api = gridApi.value;
  if (!api) return;

  const val = parseFloat(nuevoValor);
  if (isNaN(val)) {
    alert("Ingresa un valor numérico");
    return;
  }
  if (rowData.value.find((r) => r.sph === val)) {
    alert(`Fila SPH ${val} ya existe`);
    return;
  }

  const nueva = { sph: val };
  cylValues.value.forEach((c) => {
    nueva[`cyl_${norm(c)}`] = 0;
  });

  api.applyTransaction({ add: [nueva] });

  await nextTick();
  api.setSortModel([{ colId: "sph", sort: "asc" }]);
  api.refreshClientSideRowModel("sort");
};

const handleAddColumn = async (nuevoValor) => {
  const api = gridApi.value;
  if (!api) return;

  const val = parseFloat(nuevoValor);
  if (isNaN(val)) {
    alert("Ingresa un valor numérico");
    return;
  }
  if (cylValues.value.includes(val)) {
    alert(`Columna CYL ${val} ya existe`);
    return;
  }

  cylValues.value.push(val);
  cylValues.value.sort((a, b) => a - b);

  const field = `cyl_${norm(val)}`;
  rowData.value.forEach((r) => {
    r[field] = 0;
  });

  await nextTick();
  gridApi.value?.refreshHeader();
  gridApi.value?.redrawRows();
};
</script>
