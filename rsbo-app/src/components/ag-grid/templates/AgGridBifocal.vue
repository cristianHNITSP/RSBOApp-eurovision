<template>
  <div class="is-flex is-flex-direction-column" style="height: 100%;">
    <!-- Barra de herramientas -->
    <navtools 
      v-model="formulaValue" 
      @add-row="handleAddRow" 
      @add-column="handleAddColumn" 
    />

    <div class="buefy-balham-light" style="flex: 1 1 auto; display: flex; flex-direction: column; overflow: auto;">
      <!-- AG Grid -->
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
import { AllCommunityModule, ModuleRegistry, themeQuartz, iconSetQuartzBold, colorSchemeLight } from "ag-grid-community";
import navtools from '@/components/ag-grid/navtools.vue';

// 🧩 Registrar módulos
ModuleRegistry.registerModules([AllCommunityModule]);

const gridRef = ref(null);       // referencia Vue
const gridApi = ref(null);       // API nativa
const gridColumnApi = ref(null);

// Props
const props = defineProps({
  sphType: { type: String, default: 'sph-neg' }
});

// Tema personalizado
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

// Traducciones
const localeText = {
  noRowsToShow: 'No hay filas para mostrar',
  loadingOoo: 'Cargando...',
  filterOoo: 'Filtrar...',
  applyFilter: 'Aplicar filtro',
  clearFilter: 'Limpiar filtro',
  cancelFilter: 'Cancelar',
  resetFilter: 'Reiniciar',
  equals: 'Igual',
  notEqual: 'Distinto',
  lessThan: 'Menor que',
  greaterThan: 'Mayor que',
  lessThanOrEqual: 'Menor o igual',
  greaterThanOrEqual: 'Mayor o igual',
  inRange: 'En rango',
  contains: 'Contiene',
  notContains: 'No contiene',
  startsWith: 'Empieza con',
  endsWith: 'Termina con',
  blank: 'Vacío',
  notBlank: 'No vacío',
  columns: 'Columnas',
  loading: 'Cargando...',
  apply: 'Aplicar',
  andCondition: 'Y',
  orCondition: 'O'
};

// Columnas dinámicas
const addCols = ref([1, 1.2, 1.5, 1.7, 3]);
const columns = computed(() => {
  const isNegative = props.sphType === 'sph-neg';
  const sphHeader = isNegative ? "SPH (-)" : "SPH (+)";
  const esfericaSymbol = isNegative ? "(-)" : "(+)";
  return [
    {
      headerName: sphHeader,
      children: [
        {
          field: "esferica",
          headerName: esfericaSymbol,
          width: 90,
          pinned: "left",
          editable: false,
          resizable: false,
          sortable: true,
          comparator: (a,b)=>a-b
        }
      ]
    },
    {
      headerName: "ADD +",
      children: addCols.value.map(c => ({
        field: `add_${c.toString().replace(".", "_")}`,
        headerName: c.toString(),
        editable: true,
        filter: "agNumberColumnFilter",
        minWidth: 80,
        maxWidth: 140,
        width: 120,
        resizable: true,
        valueSetter: params => {
          const val = params.newValue?.toString().trim();
          if(!val){params.data[params.colDef.field]=0; return true;}
          if(/^\d+(\.\d+)?$/.test(val)){params.data[params.colDef.field]=Number(val); return true;}
          return false;
        }
      }))
    }
  ];
});

// Datos iniciales
const rowData = ref([]);

// Generar valores esféricos
const generarEsfericas = (tipo)=>{
  const arr=[];
  if(tipo==='sph-neg'){for(let v=0;v>=-6;v-=0.25) arr.push(Number(v.toFixed(2))); }
  else if(tipo==='sph-pos'){for(let v=1;v<=6;v+=0.25) arr.push(Number(v.toFixed(2))); }
  return arr;
};

// Generar datos
const regenerarDatos = (tipo)=>{
  const esf = generarEsfericas(tipo);
  rowData.value = esf.map(esf=>{
    const row = { esferica: esf };
    addCols.value.forEach(c=>row[`add_${c.toString().replace(".","_")}`]=Math.floor(Math.random()*1000));
    return row;
  });
};

// Watch SPH
watch(()=>props.sphType, n=>regenerarDatos(n), {immediate:true});

// Default config
const defaultColDef = {resizable:true, sortable:true, filter:true, editable:true};

// Barra de fórmulas
const formulaValue = ref('');
let activeCell = null;
const onCellClicked = params=>{activeCell=params; formulaValue.value=params.value;};
const onCellValueChanged = params=>{
  if(activeCell && activeCell.rowIndex===params.rowIndex && activeCell.colDef.field===params.colDef.field){
    formulaValue.value=params.newValue;
  }
};
watch(formulaValue, val=>{
  if(activeCell) activeCell.api.applyTransaction({update:[{...activeCell.data,[activeCell.colDef.field]:val}]});
});

// Row ID único
const getRowId = p=>p.data.esferica.toString();

// Grid ready
const onGridReady = params=>{
  gridApi.value = params.api;
  gridColumnApi.value = params.columnApi;
};

// Agregar fila
const handleAddRow = async (nuevoValor) => {
  const api = gridApi.value;
  if (!api) return;

  const val = parseFloat(nuevoValor);
  if (isNaN(val)) { alert("Ingresa un valor numérico"); return; }
  if (rowData.value.find(r => r.esferica === val)) { alert(`Fila ${val} ya existe`); return; }

  const nueva = { esferica: val };
  addCols.value.forEach(c => nueva[`add_${c.toString().replace(".", "_")}`] = 0);

  // 🔹 Aplicar transacción
  api.applyTransaction({ add: [nueva] });

  // 🔹 Esperar a que se renderice y luego ordenar
  await nextTick();
  setTimeout(() => {
    // aplicar el sort model
    api.setSortModel([{ colId: 'esferica', sort: props.sphType === 'sph-neg' ? 'desc' : 'asc' }]);
    // forzar que la grid reordene correctamente
    api.refreshClientSideRowModel('sort');
    api.refreshCells({ force: true });
  }, 50);
};


// Agregar columna
const handleAddColumn = async (nuevoValor)=>{
  const val = parseFloat(nuevoValor);
  if(isNaN(val)){alert("Ingresa valor numérico"); return;}
  if(addCols.value.includes(val)){alert(`Columna ${val} ya existe`); return;}

  addCols.value.push(val); addCols.value.sort((a,b)=>a-b);

  const field=`add_${val.toString().replace('.','_')}`;
  rowData.value.forEach(r=>r[field]=0);

  await nextTick();
  gridApi.value?.refreshHeader();
  gridApi.value?.redrawRows();
};
</script>
