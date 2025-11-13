<!-- src/components/ag-grid/templates/AgGridBifocal.vue -->
<template>
  <div class="is-flex is-flex-direction-column" style="height: 100%;">
    <navtools
      v-model="formulaValue"
      @add-row="handleAddRow"
      @add-column="handleAddColumn"
    />
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
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import { AllCommunityModule, ModuleRegistry, themeQuartz, iconSetQuartzBold, colorSchemeLight } from "ag-grid-community";
import navtools from "@/components/ag-grid/navtools.vue";
import { fetchItems, saveChunk, getSheet } from "@/services/inventory";

ModuleRegistry.registerModules([AllCommunityModule]);

/* ===== Props ===== */
const props = defineProps({
  sheetId: { type: String, required: true },
  // 'sph-neg' | 'sph-pos' (TabsManager te lo pasa)
  sphType: { type: String, default: "sph-neg" },
});

/* ===== Tema / textos ===== */
const themeCustom = themeQuartz.withPart(iconSetQuartzBold, colorSchemeLight).withParams({
  accentColor: "#8e00d2", backgroundColor: "#FFF", borderColor: "#00000026", borderRadius: 8,
  columnBorder: true, fontFamily: "Satoshi", fontSize: 12, foregroundColor: "#000",
  headerBackgroundColor: "#FFF", headerFontSize: 12, headerFontWeight: 500, headerTextColor: "#7957d5",
  rowBorder: true, spacing: 5, wrapperBorder: true, wrapperBorderRadius: 4
});
const localeText = { noRowsToShow: "No hay filas para mostrar", loadingOoo: "Cargando..." };

/* ===== Helpers ===== */
const to2  = (n) => Number(parseFloat(n).toFixed(2));
const norm = (n) => String(to2(n)).replace(".", "_");
const isNum = (v) => /^-?\d+(\.\d+)?$/.test(String(v).trim());
const uniqSorted = (arr) => [...new Set(arr)].sort((a,b)=>a-b);
const frange = (start, end, step) => {
  const out=[]; if(!step) return out;
  if (start<=end) { for(let v=start; v<=end+1e-9; v+=step) out.push(to2(v)); }
  else { for(let v=start; v>=end-1e-9; v-=step) out.push(to2(v)); }
  return out;
};

/* ===== Estado ===== */
const gridApi = ref(null);
const rowData = ref([]);
const addCols = ref([]);          // se llena desde API (items o tabs)
const sheetTabs = ref([]);        // tabs del sheet (API)
const basesPorSph = ref(new Map());// {sph -> {base_izq, base_der}}

/* ===== Columnas (SPH | ADD(+): OD/OI) ===== */
const makeLeaf = (field, header) => ({
  field, headerName: header, editable: true,
  filter: "agNumberColumnFilter", minWidth: 80, maxWidth: 140, width: 110,
  resizable: true,
  valueSetter: (p) => {
    const v = p.newValue?.toString().trim();
    p.data[p.colDef.field] = isNum(v) ? Number(v) : 0;
    return true;
  }
});

const columns = computed(() => {
  const neg = props.sphType === "sph-neg";
  return [
    {
      headerName: neg ? "SPH (-)" : "SPH (+)",
      children: [{
        field: "sph",
        headerName: neg ? "(-)" : "(+)",
        pinned: "left",
        width: 90,
        editable: false,
        sortable: true,
        comparator: (a,b)=>a-b,
        filter: "agNumberColumnFilter",
      }]
    },
    {
      headerName: "ADD +",
      children: addCols.value.map(a => ({
        headerName: a.toFixed(2),
        marryChildren: true,
        children: [
          makeLeaf(`add_${norm(a)}_OD`, "OD"),
          makeLeaf(`add_${norm(a)}_OI`, "OI"),
        ]
      }))
    }
  ];
});

const defaultColDef = { resizable:true, sortable:true, filter:true, editable:true };
const getRowId = (p) => p.data.sph.toString();

/* ===== Carga desde API (tabs + items) ===== */
const rangeForTab = (tab) => tab === "sph-pos"
  ? { sphMin: 0, sphMax: 6 }       // incluye 0 como en tus capturas
  : { sphMin: -6, sphMax: 0 };

async function cargar() {
  // 1) Tabs del sheet (para rangos sugeridos si BD está vacía)
  const meta = await getSheet(props.sheetId);
  sheetTabs.value = meta?.data?.data?.tabs || [];
  const tab = sheetTabs.value.find(t => t.id === props.sphType);

  // 2) Items según tab
  const { sphMin, sphMax } = rangeForTab(props.sphType);
  const { data } = await fetchItems(props.sheetId, { sphMin, sphMax, eyes: "OD,OI" });
  const items = (data?.data || []);

  // 3) Columnas ADD: prioriza lo que exista en BD; si no hay, usa tabs.ranges.addCols
  const addsFromData = uniqSorted(items.map(i => to2(i.add)).filter(v => !Number.isNaN(v)));
  const addsFromTab  = Array.isArray(tab?.ranges?.addCols) ? tab.ranges.addCols.map(to2).sort((a,b)=>a-b) : [];
  addCols.value = addsFromData.length ? addsFromData : addsFromTab;

  // 4) Base por SPH (si existe en BD) para conservarla al guardar
  basesPorSph.value = new Map();
  for (const it of items) {
    const sph = to2(it.sph);
    if (!basesPorSph.value.has(sph)) {
      basesPorSph.value.set(sph, {
        base_izq: to2(it.base_izq ?? 0),
        base_der: to2(it.base_der ?? 0),
      });
    }
  }

  // 5) Pivot: filas SPH, columnas ADD·OD/OI
  const map = new Map(items.map(i => [`${to2(i.sph)}|${to2(i.add)}|${String(i.eye).toUpperCase()}`, Number(i.existencias ?? 0)]));

  // SPH list: si BD no trae nada, genera con lo que diga el tab (o el rango por defecto del tab actual)
  let sphList = uniqSorted(items.map(i => to2(i.sph)));
  if (!sphList.length) {
    const rg = tab?.ranges?.sph;
    if (rg && typeof rg.start === "number" && typeof rg.end === "number" && typeof rg.step === "number") {
      // normaliza para incluir 0 si cae dentro
      const generated = frange(rg.start, rg.end, rg.step);
      if (!generated.includes(0) && ((rg.start<=0 && rg.end>=0) || (rg.start>=0 && rg.end<=0))) generated.push(0);
      sphList = uniqSorted(generated);
    } else {
      // fallback a rango del tab (incluye 0)
      const r = rangeForTab(props.sphType);
      sphList = uniqSorted(frange(r.sphMin, r.sphMax, 0.25));
    }
  }

  rowData.value = sphList.map(sph => {
    const bases = basesPorSph.value.get(sph) || { base_izq: 0, base_der: 0 };
    const row = { sph, base_izq: bases.base_izq, base_der: bases.base_der }; // campos ocultos para guardar
    addCols.value.forEach(add => {
      row[`add_${norm(add)}_OD`] = map.get(`${sph}|${add}|OD`) ?? 0;
      row[`add_${norm(add)}_OI`] = map.get(`${sph}|${add}|OI`) ?? 0;
    });
    return row;
  });

  await nextTick();
}

/* ===== Guardado (depivotea y manda /chunk) ===== */
async function guardar() {
  const rows = [];
  rowData.value.forEach(r => {
    const { sph, base_izq = 0, base_der = 0 } = r;
    addCols.value.forEach(add => {
      rows.push({ sph, add, eye: "OD", base_izq, base_der, existencias: Number(r[`add_${norm(add)}_OD`] ?? 0) });
      rows.push({ sph, add, eye: "OI", base_izq, base_der, existencias: Number(r[`add_${norm(add)}_OI`] ?? 0) });
    });
  });
  await saveChunk(props.sheetId, rows, { userId: "u123", name: "Cristian" });
  await cargar();
}

/* ===== Edición rápida (barra fórmula) ===== */
const formulaValue = ref(""); let activeCell = null;
const onCellClicked = (p) => { activeCell = p; formulaValue.value = p.value; };
const onCellValueChanged = (p) => { if (activeCell && activeCell.rowIndex===p.rowIndex && activeCell.colDef.field===p.colDef.field) formulaValue.value = p.newValue; };
watch(formulaValue, (val) => {
  if (!activeCell || !gridApi.value) return;
  gridApi.value.applyTransaction({ update: [{ ...activeCell.data, [activeCell.colDef.field]: isNum(val) ? Number(val) : 0 }] });
});

/* ===== Adders ===== */
const handleAddRow = async (nuevoValor) => {
  const sph = Number(nuevoValor);
  if (Number.isNaN(sph)) return alert("Ingresa un SPH numérico");
  if (rowData.value.some(r => r.sph === sph)) return alert(`SPH ${sph} ya existe`);
  const bases = basesPorSph.value.get(sph) || { base_izq: 0, base_der: 0 };
  const row = { sph, base_izq: bases.base_izq, base_der: bases.base_der };
  addCols.value.forEach(add => { row[`add_${norm(add)}_OD`] = 0; row[`add_${norm(add)}_OI`] = 0; });
  gridApi.value?.applyTransaction({ add: [row] });
  await nextTick();
  gridApi.value?.setSortModel([{ colId: "sph", sort: "asc" }]);
  gridApi.value?.refreshClientSideRowModel("sort");
};

const handleAddColumn = async (nuevoValor) => {
  const add = Number(nuevoValor);
  if (Number.isNaN(add)) return alert("Ingresa ADD numérico");
  if (addCols.value.includes(add)) return alert(`ADD ${add} ya existe`);
  addCols.value = uniqSorted([...addCols.value, add]);
  rowData.value.forEach(r => { r[`add_${norm(add)}_OD`] = 0; r[`add_${norm(add)}_OI`] = 0; });
  await nextTick(); gridApi.value?.refreshHeader(); gridApi.value?.redrawRows();
};

/* ===== Grid hooks ===== */
const onGridReady = (p) => (gridApi.value = p.api);
onMounted(cargar);
watch(() => [props.sheetId, props.sphType], cargar, { deep: true });

/* Exponer guardar() por si tu botón está afuera */
defineExpose({ guardar });
</script>
