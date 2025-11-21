<!-- src/components/ag-grid/templates/AgGridBifocal.vue -->
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
  getSheet,
  reseedSheet
} from "@/services/inventory";

ModuleRegistry.registerModules([AllCommunityModule]);

const props = defineProps({
  sheetId: { type: String, required: true },
  sphType: { type: String, default: "sph-neg" },
  actor: { type: Object, default: null }
});

console.log(
  "[AgGridBifocal] creado",
  "sheetId:",
  props.sheetId,
  "sphType:",
  props.sphType
);

/* Tema / textos */
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

/* Helpers */
const to2 = (n) => Number(parseFloat(n).toFixed(2));
const norm = (n) => String(to2(n)).replace(".", "_");
const denorm = (s) => Number(String(s).replace("_", "."));
const isNumeric = (v) => /^-?\d+(\.\d+)?$/.test(String(v ?? "").trim());
const uniqSorted = (arr) => [...new Set(arr)].sort((a, b) => a - b);
const frange = (start, end, step) => {
  const out = [];
  if (!step) return out;
  if (start <= end) {
    for (let v = start; v <= end + 1e-9; v += step) out.push(to2(v));
  } else {
    for (let v = start; v >= end - 1e-9; v -= step) out.push(to2(v));
  }
  return out;
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

/* Estado */
const gridApi = ref(null);
const gridRef = ref(null);
const rowData = ref([]);
const addCols = ref([]);
const sheetTabs = ref([]);
const basesPorSph = ref(new Map());
const dirty = ref(false);
const saving = ref(false);
const lastSavedAt = ref(null);
const sheetMeta = ref(null);

/** Buffer de cambios (sph, add, eye) */
const pendingChanges = ref(new Map());

watch(dirty, (v) => {
  console.log("[AgGridBifocal] dirty cambió →", v);
});
watch(saving, (v) => {
  console.log("[AgGridBifocal] saving cambió →", v);
});

const totalRows = computed(() => rowData.value.length);
const sheetName = computed(
  () => sheetMeta.value?.nombre || sheetMeta.value?.name || "Hoja bifocal"
);
const tipoMatriz = computed(() => sheetMeta.value?.tipo_matriz || "SPH_ADD");
const material = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);

/** Registro de cambio de celda bifocal */
function markCellChangedBifocal({
  sph,
  add,
  eye,
  base_izq,
  base_der,
  existencias
}) {
  const s = Number(sph);
  const a = Number(add);
  const key = `${s}|${a}|${eye}`;
  pendingChanges.value.set(key, {
    sph: s,
    add: a,
    eye,
    base_izq: Number(base_izq ?? 0),
    base_der: Number(base_der ?? 0),
    existencias: Number(existencias ?? 0)
  });
  dirty.value = true;
}

/* Columnas */
const makeLeaf = (field, header, add, eye) => ({
  field,
  headerName: header,
  editable: true,
  filter: "agNumberColumnFilter",
  width: 96,
  minWidth: 80,
  maxWidth: 110,
  resizable: true,
  cellClass: ["ag-cell--compact", "ag-cell--numeric"],
  headerClass: ["ag-header-cell--compact"],
  valueSetter: (p) => {
    const v = String(p.newValue ?? "").trim();
    const before = p.data[p.colDef.field];
    const newVal = isNumeric(v) ? Number(v) : 0;
    p.data[p.colDef.field] = newVal;

    markCellChangedBifocal({
      sph: p.data.sph,
      add,
      eye,
      base_izq: p.data.base_izq,
      base_der: p.data.base_der,
      existencias: newVal
    });

    console.log(
      "[AgGridBifocal] valueSetter",
      p.colDef.field,
      "sph=",
      p.data.sph,
      "old=",
      before,
      "new=",
      p.data[p.colDef.field]
    );
    return true;
  }
});

const columns = computed(() => {
  const neg = props.sphType === "sph-neg";

  return [
    {
      headerName: neg ? "SPH (-)" : "SPH (+)",
      children: [
        {
          field: "sph",
          headerName: neg ? "SPH -" : "SPH +",
          pinned: "left",
          width: 90,
          minWidth: 86,
          maxWidth: 96,
          resizable: false,
          editable: false,
          sortable: true,
          comparator: (a, b) => a - b,
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
      headerName: "ADD +",
      children: addCols.value.map((a) => ({
        headerName: a.toFixed(2),
        marryChildren: true,
        children: [
          makeLeaf(`add_${norm(a)}_OD`, "OD", a, "OD"),
          makeLeaf(`add_${norm(a)}_OI`, "OI", a, "OI")
        ]
      }))
    }
  ];
});

const defaultColDef = {
  resizable: true,
  sortable: true,
  filter: "agNumberColumnFilter",
  floatingFilter: true,
  editable: true,
  minWidth: 90,
  maxWidth: 160,
  cellClass: "ag-cell--compact",
  headerClass: "ag-header-cell--compact"
};

const getRowId = (p) => p.data.sph.toString();

/* Rango SPH por tab (backend) o fallback */
const rangeForTabFallback = (tabId) =>
  tabId === "sph-pos" ? { sphMin: 0, sphMax: 6 } : { sphMin: -6, sphMax: 0 };

function getSphRangeFromTabsOrFallback(tabId) {
  const fallback = rangeForTabFallback(tabId);
  const tab = sheetTabs.value.find((t) => t.id === tabId);

  if (!tab || !tab.ranges || !tab.ranges.sph) return fallback;

  const rs = tab.ranges.sph;
  const sphStart = Number(rs.start ?? fallback.sphMin);
  const sphEnd = Number(rs.end ?? fallback.sphMax);

  return {
    sphMin: Math.min(sphStart, sphEnd),
    sphMax: Math.max(sphStart, sphEnd)
  };
}

/* Carga desde API (meta + tabs + items) */
async function loadAll() {
  try {
    console.log(
      "[AgGridBifocal] loadAll",
      "sheetId:",
      props.sheetId,
      "sphType:",
      props.sphType
    );
    const { data } = await getSheet(props.sheetId);
    const metaData = data?.data || data;
    sheetMeta.value = metaData?.sheet || null;
    sheetTabs.value = metaData?.tabs || [];
    console.log("[AgGridBifocal] sheetMeta:", sheetMeta.value);
    console.log("[AgGridBifocal] tabs:", sheetTabs.value);

    const tab = sheetTabs.value.find((t) => t.id === props.sphType);

    const { sphMin, sphMax } = getSphRangeFromTabsOrFallback(props.sphType);
    console.log(
      "[AgGridBifocal] fetchItems rango SPH:",
      sphMin,
      "→",
      sphMax
    );
    const { data: itemsRes } = await fetchItems(props.sheetId, {
      sphMin,
      sphMax,
      eyes: "OD,OI"
    });
    const items = itemsRes?.data || [];
    console.log("[AgGridBifocal] items recibidos:", items.length);

    const addsFromData = uniqSorted(
      items.map((i) => to2(i.add)).filter((v) => !Number.isNaN(v))
    );
    const addsFromTab = Array.isArray(tab?.ranges?.addCols)
      ? tab.ranges.addCols.map(to2).sort((a, b) => a - b)
      : [];
    addCols.value = addsFromData.length ? addsFromData : addsFromTab;
    console.log(
      "[AgGridBifocal] ADDs (data):",
      addsFromData,
      "| (tab):",
      addsFromTab
    );

    basesPorSph.value = new Map();
    for (const it of items) {
      const sph = to2(it.sph);
      if (!basesPorSph.value.has(sph)) {
        basesPorSph.value.set(sph, {
          base_izq: to2(it.base_izq ?? 0),
          base_der: to2(it.base_der ?? 0)
        });
      }
    }

    const map = new Map(
      items.map((i) => [
        `${to2(i.sph)}|${to2(i.add)}|${String(i.eye).toUpperCase()}`,
        Number(i.existencias ?? 0)
      ])
    );

    let sphList = uniqSorted(items.map((i) => to2(i.sph)));
    if (!sphList.length) {
      const rg = tab?.ranges?.sph;
      if (
        rg &&
        typeof rg.start === "number" &&
        typeof rg.end === "number" &&
        typeof rg.step === "number"
      ) {
        const generated = frange(rg.start, rg.end, rg.step);
        if (
          !generated.includes(0) &&
          ((rg.start <= 0 && rg.end >= 0) ||
            (rg.start >= 0 && rg.end <= 0))
        ) {
          generated.push(0);
        }
        sphList = uniqSorted(generated);
      } else {
        const r = rangeForTabFallback(props.sphType);
        sphList = uniqSorted(frange(r.sphMin, r.sphMax, 0.25));
      }
    }
    console.log("[AgGridBifocal] sphList final:", sphList);

    rowData.value = sphList.map((sph) => {
      const bases = basesPorSph.value.get(sph) || {
        base_izq: 0,
        base_der: 0
      };
      const row = {
        sph,
        base_izq: bases.base_izq,
        base_der: bases.base_der
      };
      addCols.value.forEach((add) => {
        row[`add_${norm(add)}_OD`] =
          map.get(`${sph}|${add}|OD`) ?? 0;
        row[`add_${norm(add)}_OI`] =
          map.get(`${sph}|${add}|OI`) ?? 0;
      });
      return row;
    });

    console.log(
      "[AgGridBifocal] filas construidas:",
      rowData.value.length
    );

    dirty.value = false;
    pendingChanges.value.clear();
    await nextTick();
  } catch (e) {
    console.error(
      "[AgGridBifocal] Error loadAll:",
      e?.response?.data || e
    );
  }
}

onMounted(loadAll);
watch(
  () => [props.sheetId, props.sphType],
  () => {
    console.log(
      "[AgGridBifocal] props cambiaron → loadAll",
      "sheetId:",
      props.sheetId,
      "sphType:",
      props.sphType
    );
    loadAll();
  },
  { deep: true }
);

/* Guardado */
async function handleSave() {
  console.log(
    "[AgGridBifocal] handleSave llamado. dirty:",
    dirty.value,
    "saving:",
    saving.value,
    "pendingChanges:",
    pendingChanges.value.size
  );
  if (!dirty.value || pendingChanges.value.size === 0) {
    console.log("[AgGridBifocal] handleSave → nada que guardar");
    return;
  }
  if (!gridApi.value) {
    console.warn("[AgGridBifocal] handleSave → sin gridApi, no se puede recolectar filas");
    return;
  }

  saving.value = true;
  try {
    const rows = Array.from(pendingChanges.value.values());
    console.log(
      "[AgGridBifocal] rows a enviar (chunk):",
      rows.length,
      "ej row[0]:",
      rows[0]
    );

    await saveChunk(props.sheetId, rows, effectiveActor.value);
    dirty.value = false;
    pendingChanges.value.clear();
    lastSavedAt.value = new Date();
    // Ya no recargamos toda la hoja aquí
  } catch (e) {
    console.error(
      "[AgGridBifocal] Error saveChunk:",
      e?.response?.data || e
    );
  } finally {
    saving.value = false;
  }
}

/* Edición rápida (barra fórmula) */
const formulaValue = ref("");
let activeCell = null;

const onCellClicked = (p) => {
  activeCell = p;
  formulaValue.value = p.value;
  console.log(
    "[AgGridBifocal] cellClicked",
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
    "[AgGridBifocal] cellValueChanged",
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
  if (p.colDef.field.startsWith("add_")) {
    const meta = parseAddEyeFromField(p.colDef.field);
    if (meta) {
      markCellChangedBifocal({
        sph: p.data.sph,
        add: meta.add,
        eye: meta.eye,
        base_izq: p.data.base_izq,
        base_der: p.data.base_der,
        existencias: p.data[p.colDef.field]
      });
    }
  } else {
    dirty.value = true;
  }
};

function parseAddEyeFromField(field) {
  if (!field.startsWith("add_")) return null;
  // add_1_50_OD -> ["1","50","OD"]
  const tail = field.slice(4);
  const parts = tail.split("_");
  const eye = parts.pop();
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
    "[AgGridBifocal] formulaValue watch → update",
    "sph=",
    activeCell.data?.sph,
    "field=",
    field,
    "newVal=",
    newVal
  );

  const updatedRow = { ...activeCell.data, [field]: newVal };
  gridApi.value.applyTransaction({
    update: [
      updatedRow
    ]
  });
  if (activeCell.data) {
    activeCell.data[field] = newVal;
  }

  const meta = parseAddEyeFromField(field);
  if (meta) {
    markCellChangedBifocal({
      sph: updatedRow.sph,
      add: meta.add,
      eye: meta.eye,
      base_izq: updatedRow.base_izq,
      base_der: updatedRow.base_der,
      existencias: newVal
    });
  } else {
    dirty.value = true;
  }
});

/* Adders */
const handleAddRow = async (nuevoValor) => {
  console.log("[AgGridBifocal] handleAddRow nuevoValor:", nuevoValor);
  const sph = Number(nuevoValor);
  if (Number.isNaN(sph)) {
    alert("Ingresa un SPH numérico");
    return;
  }
  if (rowData.value.some((r) => r.sph === sph)) {
    alert(`SPH ${sph} ya existe`);
    return;
  }

  const bases = basesPorSph.value.get(sph) || {
    base_izq: 0,
    base_der: 0
  };
  const row = {
    sph,
    base_izq: bases.base_izq,
    base_der: bases.base_der
  };
  addCols.value.forEach((add) => {
    row[`add_${norm(add)}_OD`] = 0;
    row[`add_${norm(add)}_OI`] = 0;
  });

  gridApi.value?.applyTransaction({ add: [row] });
  await nextTick();
  resetSort();

  // Persistir inmediatamente todas las combinaciones (sph nuevo, cada add, OD/OI)
  try {
    const rowsToPersist = [];
    addCols.value.forEach((add) => {
      rowsToPersist.push({
        sph,
        add,
        eye: "OD",
        base_izq: bases.base_izq,
        base_der: bases.base_der,
        existencias: 0
      });
      rowsToPersist.push({
        sph,
        add,
        eye: "OI",
        base_izq: bases.base_izq,
        base_der: bases.base_der,
        existencias: 0
      });
    });

    if (rowsToPersist.length) {
      await saveChunk(props.sheetId, rowsToPersist, effectiveActor.value);
      console.log(
        "[AgGridBifocal] SPH nuevo persistido en BD, filas:",
        rowsToPersist.length
      );
      lastSavedAt.value = new Date();
    }
  } catch (e) {
    console.error(
      "[AgGridBifocal] Error al persistir SPH nuevo:",
      e?.response?.data || e
    );
  }
};

const handleAddColumn = async (nuevoValor) => {
  console.log(
    "[AgGridBifocal] handleAddColumn nuevoValor:",
    nuevoValor
  );
  const add = Number(nuevoValor);
  if (Number.isNaN(add)) {
    alert("Ingresa ADD numérico");
    return;
  }
  if (addCols.value.includes(add)) {
    alert(`ADD ${add} ya existe`);
    return;
  }

  addCols.value = uniqSorted([...addCols.value, add]);
  rowData.value.forEach((r) => {
    r[`add_${norm(add)}_OD`] = 0;
    r[`add_${norm(add)}_OI`] = 0;
  });
  await nextTick();
  gridApi.value?.refreshHeader();
  gridApi.value?.redrawRows();

  // Persistir inmediatamente todas las combinaciones (cada sph, add nuevo, OD/OI)
  try {
    const rowsToPersist = [];
    rowData.value.forEach((r) => {
      const sph = Number(r.sph);
      const base_izq = Number(r.base_izq ?? 0);
      const base_der = Number(r.base_der ?? 0);

      rowsToPersist.push({
        sph,
        add,
        eye: "OD",
        base_izq,
        base_der,
        existencias: 0
      });
      rowsToPersist.push({
        sph,
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
        "[AgGridBifocal] ADD nuevo persistido en BD, filas:",
        rowsToPersist.length
      );
      lastSavedAt.value = new Date();
    }
  } catch (e) {
    console.error(
      "[AgGridBifocal] Error al persistir ADD nuevo:",
      e?.response?.data || e
    );
  }
};

/* Grid hooks */
const onGridReady = (p) => {
  console.log("[AgGridBifocal] grid ready");
  gridApi.value = p.api;
};

function collectRowsFromGrid() {
  const rows = [];
  if (!gridApi.value) {
    console.warn("[AgGridBifocal] collectRowsFromGrid sin gridApi");
    return rows;
  }

  gridApi.value.forEachNode((node) => {
    const r = node.data;
    if (!r) return;

    const sph = Number(r.sph);
    const base_izq = Number(r.base_izq ?? 0);
    const base_der = Number(r.base_der ?? 0);

    addCols.value.forEach((add) => {
      const fieldOD = `add_${norm(add)}_OD`;
      const fieldOI = `add_${norm(add)}_OI`;

      rows.push({
        sph,
        add,
        eye: "OD",
        base_izq,
        base_der,
        existencias: Number(r[fieldOD] ?? 0)
      });

      rows.push({
        sph,
        add,
        eye: "OI",
        base_izq,
        base_der,
        existencias: Number(r[fieldOI] ?? 0)
      });
    });
  });

  return rows;
}

/* Filtros / orden */
const clearFilters = () => {
  if (!gridApi.value) return;
  const api = gridApi.value;
  console.log("[AgGridBifocal] clearFilters");
  if (typeof api.setFilterModel === "function") {
    api.setFilterModel(null);
  }
};

const resetSort = () => {
  console.log("[AgGridBifocal] resetSort por sph ASC");

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
  console.log("[AgGridBifocal] handleToggleFilters → clearFilters");
  clearFilters();
};

/* Otros handlers */
async function handleDiscard() {
  console.log("[AgGridBifocal] handleDiscard");
  await loadAll();
  dirty.value = false;
  pendingChanges.value.clear();
}

async function handleRefresh() {
  console.log("[AgGridBifocal] handleRefresh");
  await loadAll();
  pendingChanges.value.clear();
}

async function handleSeed() {
  try {
    console.log("[AgGridBifocal] handleSeed");
    saving.value = true;
    await reseedSheet(props.sheetId, effectiveActor.value);
    await loadAll();
    lastSavedAt.value = new Date();
    pendingChanges.value.clear();
  } catch (e) {
    console.error(
      "[AgGridBifocal] Error reseed:",
      e?.response?.data || e
    );
  } finally {
    saving.value = false;
  }
}

function handleExport() {
  if (!gridApi.value || typeof gridApi.value.exportDataAsCsv !== "function") {
    console.warn(
      "[AgGridBifocal] exportDataAsCsv no disponible",
      gridApi.value
    );
    return;
  }
  const nameSlug = sheetName.value.replace(/\s+/g, "_");
  const posNeg = props.sphType === "sph-pos" ? "pos" : "neg";
  console.log("[AgGridBifocal] handleExport", nameSlug, posNeg);
  gridApi.value.exportDataAsCsv({
    fileName: `${nameSlug || "bifocal"}_${posNeg}.csv`
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
        ref="gridRef"
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
