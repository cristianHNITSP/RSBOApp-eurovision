<!-- src/components/ag-grid/templates/AgGridProgresivo.vue -->
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

const norm = (n) => String(n).replace(".", "_");
const addValues = ref([]); // columnas (ADD)
const eyes = ["OD","OI"];

/* ── SOLO VISTA: BASE (°) + ADD (+) → OD/OI ───────────────────────── */
const columns = computed(() => [
  {
    headerName: "BASE",
    children: [
      {
        field: "base",
        headerName: "Base ()",
        pinned: "left",
        width: 110,
        editable: false,
        sortable: true,
        comparator: (a, b) => a - b,
        filter: "agNumberColumnFilter",
      }
    ]
  },
  {
    headerName: "ADD (+)",
    children: addValues.value.map(add => ({
      headerName: Number(add).toFixed(2),
      marryChildren: true,
      children: [
        {
          field: `add_${norm(add)}_OD`,
          headerName: "OD",
          editable: true,
          minWidth: 90,
          valueSetter: (p) => {
            const v = p.newValue?.toString().trim();
            p.data[`add_${norm(add)}_OD`] = v && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : 0;
            dirty.value = true; return true;
          }
        },
        {
          field: `add_${norm(add)}_OI`,
          headerName: "OI",
          editable: true,
          minWidth: 90,
          valueSetter: (p) => {
            const v = p.newValue?.toString().trim();
            p.data[`add_${norm(add)}_OI`] = v && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : 0;
            dirty.value = true; return true;
          }
        }
      ]
    }))
  }
]);

const defaultColDef = { resizable: true, sortable: true, filter: true, editable: true };
const getRowId = (p) => `${p.data.base_izq}|${p.data.base_der}`;

/* ── Cargar (GET) y pivotear → incluye campo visual 'base' ─────────── */
async function cargar() {
  const { data } = await fetchItems(props.sheetId);
  const items = (data?.data || []);

  const baseRowsKeys = [...new Set(items.map(i => `${Number(i.base_izq ?? 0)}|${Number(i.base_der ?? 0)}`))];
  const addList = [...new Set(items.map(i => Number(i.add)))].sort((a,b)=>a-b);
  addValues.value = addList;

  const key = (bi, bd, add, eye) => `${bi}|${bd}|${add}|${eye}`;
  const map = new Map(items.map(i => [
    key(Number(i.base_izq ?? 0), Number(i.base_der ?? 0), Number(i.add), String(i.eye).toUpperCase()),
    Number(i.existencias ?? 0)
  ]));

  rowData.value = baseRowsKeys.map(k => {
    const [bi, bd] = k.split("|").map(Number);
    // 👇 campo visible para la vista estilo “Base (°)”
    const row = { base_izq: bi, base_der: bd, base: bi };
    addList.forEach(add => {
      row[`add_${norm(add)}_OD`] = map.get(key(bi, bd, add, "OD")) ?? 0;
      row[`add_${norm(add)}_OI`] = map.get(key(bi, bd, add, "OI")) ?? 0;
    });
    return row;
  });
  await nextTick();
}

onMounted(cargar);

/* ── Edición rápida (sin cambios de lógica) ───────────────────────── */
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

/* ── Navtools (solo agregan en memoria; se mantiene tu lógica) ────── */
const handleAddRow = (nuevoValor) => {
  const bi = Number(nuevoValor);
  if (Number.isNaN(bi)) return alert("Ingresa Base Izq numérica (usaremos Der=Izq por defecto)");
  const exists = rowData.value.some(r => r.base_izq === bi && r.base_der === bi);
  if (exists) return alert(`Fila base ${bi}/${bi} ya existe`);
  const row = { base_izq: bi, base_der: bi, base: bi };
  addValues.value.forEach(add => { row[`add_${norm(add)}_OD`] = 0; row[`add_${norm(add)}_OI`] = 0; });
  gridApi.value?.applyTransaction({ add: [row] });
  dirty.value = true;
};
const handleAddColumn = (nuevoValor) => {
  const add = Number(nuevoValor);
  if (Number.isNaN(add)) return alert("Ingresa ADD numérico");
  if (addValues.value.includes(add)) return alert(`ADD ${add} ya existe`);
  addValues.value = [...addValues.value, add].sort((a,b)=>a-b);
  rowData.value.forEach(r => { r[`add_${norm(add)}_OD`] = 0; r[`add_${norm(add)}_OI`] = 0; });
  nextTick(()=>{ gridApi.value?.refreshHeader(); gridApi.value?.redrawRows(); });
  dirty.value = true;
};

/* ── Guardar (intacto) ─────────────────────────────────────────────── */
async function guardar() {
  if (!dirty.value) return;
  const rows = [];
  rowData.value.forEach(r => {
    const { base_izq, base_der } = r;
    addValues.value.forEach(add => {
      rows.push({ add, eye:"OD", base_izq, base_der, existencias: Number(r[`add_${norm(add)}_OD`] ?? 0) });
      rows.push({ add, eye:"OI", base_izq, base_der, existencias: Number(r[`add_${norm(add)}_OI`] ?? 0) });
    });
  });
  await saveChunk(props.sheetId, rows, { userId: "u123", name: "Cristian" });
  dirty.value = false;
  await cargar();
}
</script>
