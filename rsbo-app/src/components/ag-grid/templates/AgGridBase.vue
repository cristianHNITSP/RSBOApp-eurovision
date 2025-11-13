<template>
  <div class="is-flex is-flex-direction-column" style="height: 100%;">
    <navtools v-model="formulaValue" @add-row="handleAddRow" @add-column="handleAddColumn" />
    <div class="buefy-balham-light" style="flex:1 1 auto; display:flex; flex-direction:column; overflow:auto;">
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
    <div class="p-2 has-text-right">
      <button class="button is-primary is-small" @click="guardar">Guardar cambios</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import { AllCommunityModule, ModuleRegistry, themeQuartz, iconSetQuartzBold, colorSchemeLight } from "ag-grid-community";
import navtools from "@/components/ag-grid/navtools.vue";
import { fetchItems, saveChunk } from "@/services/inventory";
ModuleRegistry.registerModules([AllCommunityModule]);

const props = defineProps({
  sheetId: { type: String, required: true }
});

const gridApi = ref(null);
const rowData = ref([]);
const dirty = ref(false);

const themeCustom = themeQuartz.withPart(iconSetQuartzBold, colorSchemeLight).withParams({
  accentColor: "#8e00d2", backgroundColor: "#FFF", borderColor: "#00000026", borderRadius: 8,
  columnBorder: true, fontFamily: "Satoshi", fontSize: 12, foregroundColor: "#000",
  headerBackgroundColor: "#FFF", headerFontSize: 12, headerFontWeight: 500, headerTextColor: "#7957d5",
  rowBorder: true, spacing: 5, wrapperBorder: true, wrapperBorderRadius: 4
});

const localeText = { noRowsToShow: "No hay filas para mostrar", loadingOoo: "Cargando..." };

const columns = computed(() => [
  { headerName: "BASE", field: "base", pinned: "left", width: 120, editable: false, sortable: true, comparator: (a,b)=>a-b },
  { headerName: "EXISTENCIAS", field: "existencias", editable: true, filter: "agNumberColumnFilter", minWidth: 120, resizable: true,
    valueSetter: (p) => { const v = p.newValue?.toString().trim(); p.data.existencias = v && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : 0; dirty.value = true; return true; } }
]);

const defaultColDef = { resizable: true, sortable: true, filter: true, editable: true };
const getRowId = (p) => p.data.base?.toString();

async function cargar() {
  const { data } = await fetchItems(props.sheetId);
  rowData.value = (data?.data || []).map(it => ({ base: it.base, existencias: it.existencias ?? 0 }))
                                     .sort((a,b)=>a.base - b.base);
}

onMounted(cargar);

// edición rápida
const formulaValue = ref(""); let activeCell = null;
const onCellClicked = (p) => { activeCell = p; formulaValue.value = p.value; };
const onCellValueChanged = (p) => {
  if (activeCell && activeCell.rowIndex===p.rowIndex && activeCell.colDef.field===p.colDef.field) formulaValue.value = p.newValue;
  dirty.value = true;
};
watch(formulaValue, (val) => {
  if (!activeCell || !gridApi.value) return;
  gridApi.value.applyTransaction({ update: [{ ...activeCell.data, [activeCell.colDef.field]: val }] });
  dirty.value = true;
});
const onGridReady = (p) => (gridApi.value = p.api);

// navtools
const handleAddRow = async (nuevoValor) => {
  const v = Number(nuevoValor);
  if (Number.isNaN(v)) return alert("Ingresa una base numérica");
  if (rowData.value.some(r => r.base === v)) return alert(`Base ${v} ya existe`);
  gridApi.value?.applyTransaction({ add: [{ base: v, existencias: 0 }] });
  dirty.value = true;
  await nextTick(); gridApi.value?.setSortModel([{ colId: "base", sort: "asc" }]); gridApi.value?.refreshClientSideRowModel("sort");
};
const handleAddColumn = () => alert("Monofocal BASE no admite columnas dinámicas.");

// Guardar a backend
async function guardar() {
  if (!dirty.value) return;
  const rows = [];
  rowData.value.forEach(r => rows.push({ base: r.base, existencias: r.existencias }));
  await saveChunk(props.sheetId, rows, { userId: "u123", name: "Cristian" });
  dirty.value = false;
  // recarga para reflejar timestamps/trigger externos
  await cargar();
}
</script>
