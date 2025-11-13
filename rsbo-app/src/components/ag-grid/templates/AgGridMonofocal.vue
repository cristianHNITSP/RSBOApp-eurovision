<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import { AllCommunityModule, ModuleRegistry, themeQuartz, iconSetQuartzBold, colorSchemeLight } from "ag-grid-community";
import navtools from "@/components/ag-grid/navtools.vue";
import { fetchItems, saveChunk } from "@/services/inventory";
ModuleRegistry.registerModules([AllCommunityModule]);

const props = defineProps({
  sheetId: { type: String, required: true },
  sphType: { type: String, default: "sph-neg" } // "sph-neg" | "sph-pos"
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

const norm = (n) => String(n).replace(".", "_");
const cylValues = ref([]);

const columns = computed(() => [
  { headerName: `SPH ${props.sphType === "sph-neg" ? "(-)" : "(+)"}`,
    children: [{ field: "sph", headerName: "SPH", width: 90, pinned:"left", editable:false, sortable:true, comparator:(a,b)=>a-b }] },
  { headerName: "CYL (-)", children: cylValues.value.map(c => ({
      field: `cyl_${norm(c)}`, headerName: c.toString(), editable: true, filter:"agNumberColumnFilter",
      minWidth: 80, maxWidth: 120, resizable: true,
      valueSetter: (p) => { const v = p.newValue?.toString().trim(); p.data[p.colDef.field] = v && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : 0; dirty.value = true; return true; }
  })) }
]);

const defaultColDef = { resizable: true, sortable: true, filter: true, editable: true };
const getRowId = (p) => p.data.sph?.toString();

async function cargar() {
  // ⬇️ filtro por pestaña
  const query = props.sphType === "sph-pos"
    ? { sphMin: 0,  sphMax: 6, cylMin: -6, cylMax: 0 }
    : { sphMin: -6, sphMax: 0, cylMin: -6, cylMax: 0 };

  const { data } = await fetchItems(props.sheetId, query);
  const items = (data?.data || []);

  const sphList = [...new Set(items.map(i => Number(i.sph)))].sort((a,b)=>a-b);
  const cylList = [...new Set(items.map(i => Number(i.cyl)))].sort((a,b)=>a-b);
  cylValues.value = cylList;

  const key = (s,c) => `${s}|${c}`;
  const map = new Map(items.map(i => [key(Number(i.sph), Number(i.cyl)), Number(i.existencias ?? 0)]));

  rowData.value = sphList.map(sph => {
    const row = { sph };
    cylList.forEach(cyl => (row[`cyl_${norm(cyl)}`] = map.get(key(sph, cyl)) ?? 0));
    return row;
  });

  await nextTick();
  gridApi.value?.setSortModel([{ colId: "sph", sort: "asc" }]);
  gridApi.value?.refreshClientSideRowModel("sort");
}

onMounted(cargar);
watch(() => props.sphType, () => cargar());

// edición rápida / navtools / guardar (igual que ya tenías)
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

const handleAddRow = async (nuevoValor) => {
  const v = Number(nuevoValor);
  if (Number.isNaN(v)) return alert("Ingresa un SPH numérico");
  if (rowData.value.some(r => r.sph === v)) return alert(`SPH ${v} ya existe`);
  const nueva = { sph: v };
  cylValues.value.forEach(c => (nueva[`cyl_${norm(c)}`] = 0));
  gridApi.value?.applyTransaction({ add: [nueva] });
  dirty.value = true;
};
const handleAddColumn = async (nuevoValor) => {
  const v = Number(nuevoValor);
  if (Number.isNaN(v)) return alert("Ingresa un CYL numérico");
  if (cylValues.value.includes(v)) return alert(`CYL ${v} ya existe`);
  cylValues.value = [...cylValues.value, v].sort((a,b)=>a-b);
  rowData.value.forEach(r => (r[`cyl_${norm(v)}`] = 0));
  await nextTick(); gridApi.value?.refreshHeader(); gridApi.value?.redrawRows();
};

async function guardar() {
  if (!dirty.value) return;
  const rows = [];
  rowData.value.forEach(r => {
    const sph = r.sph;
    cylValues.value.forEach(cyl => {
      const field = `cyl_${norm(cyl)}`;
      const existencias = Number(r[field] ?? 0);
      rows.push({ sph, cyl, existencias });
    });
  });
  await saveChunk(props.sheetId, rows, { userId: "u123", name: "Cristian" });
  dirty.value = false;
  await cargar();
}
</script>

<template>
  <div class="is-flex is-flex-direction-column" style="height: 100%;">
    <navtools v-model="formulaValue" @add-row="handleAddRow" @add-column="handleAddColumn" />
    <div class="buefy-balham-light" style="flex:1 1 auto; display:flex; flex-direction:column; overflow:auto;">
      <AgGridVue
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
