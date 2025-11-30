<!-- src/components/ag-grid/templates/AgGridProgresivo.vue -->
<template>
  <div class="is-flex is-flex-direction-column" style="height: 100%;">
    <navtools
      class="p-4"
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
      @fx-input="onFxInput"
      @fx-commit="onFxCommit"
    />

    <div
      class="buefy-balham-light grid-shell"
      :class="{ 'grid-shell--switching': switchingView }"
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
import { fetchItems, saveChunk, reseedSheet, getSheet } from "@/services/inventory";

ModuleRegistry.registerModules([AllCommunityModule]);

const props = defineProps({
  sheetId: { type: String, required: true },
  sphType: { type: String, default: "base-pos" }, // base-neg/base-pos
  actor: { type: Object, default: null }
});

/* ===================== ACK helpers ===================== */
const ackOk = (ack, message = "Ok", status = 200) => {
  if (typeof ack === "function") ack({ ok: true, status, message });
};
const ackErr = (ack, message = "Error", status = 400) => {
  if (typeof ack === "function") ack({ ok: false, status, message });
  else alert(message);
};
const msgFromErr = (e, fallback = "Error de servidor") =>
  e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;
const statusFromErr = (e) => e?.response?.status ?? 0;
const normalizeAxiosOk = (res) => {
  const status = res?.status ?? 200;
  const body = res?.data ?? null;
  if (body?.ok === false) return { ok: false, status, message: body?.message || "Operación rechazada" };
  return { ok: true, status, message: body?.message || "Operación exitosa" };
};

const numOr = (v, dflt) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
};

const gridApi = ref(null);
const rowData = ref([]);
const dirty = ref(false);
const saving = ref(false);
const lastSavedAt = ref(null);

const sheetMeta = ref(null);
const sheetTabs = ref([]);
const physicalLimits = ref(null);

/** Buffer de cambios (base_izq, base_der, add, eye) */
const pendingChanges = ref(new Map());

/** ✅ transición suave al cambiar vista */
const switchingView = ref(false);
const raf = () =>
  new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });

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

const localeText = { noRowsToShow: "No hay filas para mostrar", loadingOoo: "Cargando..." };
const isNumeric = (v) => /^-?\d+(\.\d+)?$/.test(String(v ?? "").trim());

const to2 = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Number(num.toFixed(2));
};

const isQuarterStep = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return false;
  const scaled = num * 4;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
};

const frange = (start, end, step) => {
  const out = [];
  const s = Number(start);
  const e = Number(end);
  const st = Number(step);
  if (!Number.isFinite(s) || !Number.isFinite(e) || !Number.isFinite(st) || st === 0) return out;
  const eps = 1e-9;
  if (s <= e) for (let v = s; v <= e + eps; v += st) out.push(to2(v));
  else for (let v = s; v >= e - eps; v -= st) out.push(to2(v));
  return out;
};

const fmtSigned = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n ?? "");
  const s = num.toFixed(2);
  return num >= 0 ? `+${s}` : s;
};

const baseViewId = computed(() => (String(props.sphType || "").toLowerCase().includes("neg") ? "base-neg" : "base-pos"));

/* ======== LÍMITES FÍSICOS DESDE BACKEND ======== */
const phys = computed(() => {
  const pl = physicalLimits.value || {};
  const baseMin = numOr(pl?.BASE?.min, -40);
  const baseMax = numOr(pl?.BASE?.max, 40);
  const addMin = numOr(pl?.ADD?.min, 0);
  const addMax = numOr(pl?.ADD?.max, 8);
  return { baseMin, baseMax, addMin, addMax };
});

/**
 * ✅ requisito: 0 arriba en ambas vistas
 * - display neg: incluye 0|0 (además de negatives)
 * - add row neg: sigue siendo <0 para no duplicar 0|0
 */
const baseFilterNewRow = computed(() => (baseViewId.value === "base-neg" ? (n) => Number(n) < 0 : (n) => Number(n) >= 0));
const sortDirForView = computed(() => (baseViewId.value === "base-neg" ? "desc" : "asc"));

const effectiveActor = computed(() => {
  const src = props.actor || (typeof window !== "undefined" ? window.__currentUser : null) || null;
  if (!src) return null;
  const userId = src.userId || src.id || src._id || null;
  const name = src.name || src.email || "Usuario";
  return { userId, name };
});

const totalRows = computed(() => rowData.value.length);
const sheetName = computed(() => sheetMeta.value?.nombre || sheetMeta.value?.name || "Hoja progresivo");
const tipoMatriz = computed(() => sheetMeta.value?.tipo_matriz || "BASE_ADD");
const material = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);

const norm = (n) => String(n).replace(".", "_");
const denorm = (s) => Number(String(s).replace("_", "."));

const addValues = ref([]);
const eyes = ["OD", "OI"];

function markCellChangedProgresivo({ add, eye, base_izq, base_der, existencias }) {
  const a = to2(add);
  const bi = to2(base_izq ?? 0);
  const bd = to2(base_der ?? 0);
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

const columns = computed(() => [
  {
    headerName: "BASE",
    children: [
      {
        field: "base",
        headerName: "Base",
        pinned: "left",
        width: 120,
        minWidth: 110,
        maxWidth: 140,
        editable: false,
        sortable: true,
        comparator: (a, b) => Number(a) - Number(b),
        filter: "agNumberColumnFilter",
        resizable: false,
        cellClass: ["ag-cell--compact", "ag-cell--numeric", "ag-cell--pinned"],
        headerClass: ["ag-header-cell--compact", "ag-header-cell--pinned"],
        valueFormatter: (p) => {
          const bi = Number(p.data?.base_izq);
          const bd = Number(p.data?.base_der);
          if (!Number.isFinite(bi)) return p.value ?? "";
          if (Number.isFinite(bd) && bd !== bi) return `${fmtSigned(bi)} / ${fmtSigned(bd)}`;
          return fmtSigned(bi);
        }
      }
    ]
  },
  {
    headerName: "ADD (+)",
    children: addValues.value.map((add) => ({
      headerName: fmtSigned(Number(add)),
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
          const newVal = isNumeric(v) ? Number(v) : 0;
          p.data[`add_${norm(add)}_${eye}`] = newVal;

          markCellChangedProgresivo({
            add,
            eye,
            base_izq: p.data.base_izq ?? p.data.base,
            base_der: p.data.base_der ?? p.data.base,
            existencias: newVal
          });

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

async function loadSheetMeta() {
  try {
    const { data } = await getSheet(props.sheetId);
    const payload = data?.data || data;

    sheetMeta.value = payload?.sheet || null;
    sheetTabs.value = Array.isArray(payload?.tabs) ? payload.tabs : [];
    physicalLimits.value = payload?.physicalLimits || payload?.physical_limits || null;
  } catch (e) {
    console.error("[AgGridProgresivo] Error getSheet:", e?.response?.data || e);
  }
}

function parseAddEyeFromField(field) {
  if (!field.startsWith("add_")) return null;
  const tail = field.slice(4);
  const parts = tail.split("_");
  const eye = parts.pop();
  const numStr = parts.join("_");
  const add = denorm(numStr);
  if (Number.isNaN(add)) return null;
  return { add, eye };
}

async function loadRows() {
  const P = phys.value;

  const { data } = await fetchItems(props.sheetId, { addMin: P.addMin, addMax: P.addMax });
  const items = data?.data || [];

  const tab =
    sheetTabs.value.find((t) => t?.id === baseViewId.value) ||
    sheetTabs.value.find((t) => t?.id === "base-add") ||
    sheetTabs.value[0] ||
    null;

  const defAddCols = Array.isArray(tab?.ranges?.addCols) ? tab.ranges.addCols.map(to2) : [];
  const defBaseRange = tab?.ranges?.base || null;

  const defBasesAll = defBaseRange
    ? frange(defBaseRange.start, defBaseRange.end, defBaseRange.step ?? 0.25)
    : [];

  const defBases = defBasesAll
    .map(to2)
    .filter((b) => b >= P.baseMin && b <= P.baseMax)
    .filter((b) => (baseViewId.value === "base-neg" ? Number(b) <= 0 : Number(b) >= 0));

  const isZeroKey = (bi, bd) => to2(bi) === 0 && to2(bd) === 0;

  const itemBaseKeys = [
    ...new Set(
      items
        .map((i) => `${to2(i.base_izq ?? 0)}|${to2(i.base_der ?? 0)}`)
        .filter((k) => {
          const [bi, bd] = k.split("|").map(Number);

          if (!(bi >= P.baseMin && bi <= P.baseMax && bd >= P.baseMin && bd <= P.baseMax)) return false;

          const anyNeg = bi < 0 || bd < 0;

          if (isZeroKey(bi, bd)) return true;

          return baseViewId.value === "base-neg" ? anyNeg : !anyNeg;
        })
    )
  ];

  const defaultBaseKeys = defBases.map((b) => `${to2(b)}|${to2(b)}`);

  const baseRowsKeys = [...new Set([...defaultBaseKeys, ...itemBaseKeys])].sort((a, b) => {
    if (a === "0|0") return -1;
    if (b === "0|0") return 1;

    const [abi, abd] = a.split("|").map(Number);
    const [bbi, bbd] = b.split("|").map(Number);

    const dir = sortDirForView.value === "desc" ? -1 : 1;
    return abi === bbi ? dir * (abd - bbd) : dir * (abi - bbi);
  });

  const itemAdds = [...new Set(items.map((i) => to2(i.add)))].filter((a) => a >= P.addMin && a <= P.addMax);
  const addList = [...new Set([...defAddCols, ...itemAdds])]
    .map(to2)
    .filter((a) => a >= P.addMin && a <= P.addMax)
    .sort((a, b) => a - b);

  addValues.value = addList;

  const key = (bi, bd, add, eye) => `${to2(bi)}|${to2(bd)}|${to2(add)}|${String(eye).toUpperCase()}`;
  const map = new Map(
    items
      .filter((i) => {
        const bi = to2(i.base_izq ?? 0);
        const bd = to2(i.base_der ?? 0);
        const a = to2(i.add);
        return bi >= P.baseMin && bi <= P.baseMax && bd >= P.baseMin && bd <= P.baseMax && a >= P.addMin && a <= P.addMax;
      })
      .map((i) => [key(i.base_izq ?? 0, i.base_der ?? 0, i.add, i.eye), Number(i.existencias ?? 0)])
  );

  rowData.value = baseRowsKeys.map((k) => {
    const [bi, bd] = k.split("|").map(Number);
    const row = { base_izq: bi, base_der: bd, base: bi };
    addList.forEach((add) => {
      row[`add_${norm(add)}_OD`] = map.get(key(bi, bd, add, "OD")) ?? 0;
      row[`add_${norm(add)}_OI`] = map.get(key(bi, bd, add, "OI")) ?? 0;
    });
    return row;
  });

  dirty.value = false;
  pendingChanges.value.clear();
  await nextTick();
  resetSort();
}

async function switchViewReload() {
  switchingView.value = true;
  await raf();
  try {
    await loadRows();
  } catch (e) {
    console.error("[AgGridProgresivo] Error fetchItems:", e?.response?.data || e);
  } finally {
    await raf();
    switchingView.value = false;
  }
}

async function loadAll() {
  await loadSheetMeta();
  await switchViewReload();
}

onMounted(loadAll);

watch(
  () => props.sphType,
  async () => {
    pendingChanges.value.clear();
    dirty.value = false;
    await switchViewReload();
  }
);

/* Edición rápida */
const formulaValue = ref("");
let activeCell = null;

const onCellClicked = (p) => {
  activeCell = p;
  formulaValue.value = p.value;
};

const onCellValueChanged = (p) => {
  if (activeCell && activeCell.rowIndex === p.rowIndex && activeCell.colDef.field === p.colDef.field) {
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
  }
};

/**
 * ✅ Base-style: FX input no “guarda”, FX commit sí “guarda”
 * - Progresivo: solo permite add_*
 */
function applyFxToGrid(val, { commit = false } = {}) {
  if (!activeCell || !gridApi.value) return;

  const field = activeCell.colDef?.field;
  if (!field || !field.startsWith("add_")) return;

  const meta = parseAddEyeFromField(field);
  if (!meta) return;

  const raw = String(val ?? "").trim();
  const newVal = isNumeric(raw) ? Number(raw) : 0;

  if (activeCell.data) activeCell.data[field] = newVal;

  if (!commit) {
    gridApi.value.refreshCells?.({
      rowNodes: activeCell.node ? [activeCell.node] : undefined,
      columns: [field],
      force: true
    });
    return;
  }

  const updatedRow = { ...(activeCell.data || {}), [field]: newVal };
  gridApi.value.applyTransaction({ update: [updatedRow] });

  markCellChangedProgresivo({
    add: meta.add,
    eye: meta.eye,
    base_izq: updatedRow.base_izq ?? updatedRow.base,
    base_der: updatedRow.base_der ?? updatedRow.base,
    existencias: newVal
  });

  gridApi.value.flashCells?.({
    rowNodes: activeCell.node ? [activeCell.node] : undefined,
    columns: [field]
  });
}

const onFxInput = (val) => applyFxToGrid(val, { commit: false });
const onFxCommit = (val) => applyFxToGrid(val, { commit: true });

const onGridReady = (p) => {
  gridApi.value = p.api;
};

/* ===================== Navtools (con ACK) ===================== */
const handleAddRow = async (nuevoValor, ack) => {
  const P = phys.value;
  const bi = to2(nuevoValor);

  if (!Number.isFinite(bi)) return ackErr(ack, "Ingresa BASE numérica (Der=Izq por defecto)", 400);
  if (!isQuarterStep(bi)) return ackErr(ack, "BASE debe ser múltiplo de 0.25 (…00, …25, …50, …75)", 400);
  if (bi < P.baseMin || bi > P.baseMax) return ackErr(ack, `BASE fuera de límites (${P.baseMin} a ${P.baseMax})`, 400);

  if (!baseFilterNewRow.value(bi)) {
    return ackErr(
      ack,
      baseViewId.value === "base-neg"
        ? "Esta vista es BASE (-): la BASE debe ser negativa (ej: -0.25)"
        : "Esta vista es BASE (+): la BASE debe ser 0 o positiva",
      400
    );
  }

  const exists = rowData.value.some((r) => to2(r.base_izq) === bi && to2(r.base_der) === bi);
  if (exists) return ackErr(ack, `Fila base ${fmtSigned(bi)} ya existe`, 409);

  const row = { base_izq: bi, base_der: bi, base: bi };
  addValues.value.forEach((add) => {
    row[`add_${norm(add)}_OD`] = 0;
    row[`add_${norm(add)}_OI`] = 0;
  });

  gridApi.value?.applyTransaction({ add: [row] });
  await nextTick();
  resetSort();

  try {
    const rowsToPersist = [];
    addValues.value.forEach((add) => {
      rowsToPersist.push({ add, eye: "OD", base_izq: bi, base_der: bi, existencias: 0 });
      rowsToPersist.push({ add, eye: "OI", base_izq: bi, base_der: bi, existencias: 0 });
    });

    if (!rowsToPersist.length) {
      ackOk(ack, "Fila agregada (sin ADD aún).", 200);
      return;
    }

    const res = await saveChunk(props.sheetId, rowsToPersist, effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo agregar la fila", ok.status);

    ackOk(ack, ok.message || `Fila agregada: BASE ${fmtSigned(bi)}`, ok.status);

    lastSavedAt.value = new Date();
    await switchViewReload();
  } catch (e) {
    console.error("[AgGridProgresivo] Error al persistir base nueva:", e?.response?.data || e);
    ackErr(ack, msgFromErr(e, "Error al guardar la nueva BASE"), statusFromErr(e));
  }
};

const handleAddColumn = async (nuevoValor, ack) => {
  const P = phys.value;
  const add = to2(nuevoValor);

  if (!Number.isFinite(add)) return ackErr(ack, "Ingresa ADD numérico", 400);
  if (!isQuarterStep(add)) return ackErr(ack, "ADD debe ser múltiplo de 0.25 (…00, …25, …50, …75)", 400);
  if (add < P.addMin || add > P.addMax) return ackErr(ack, `ADD fuera de límites (${P.addMin} a ${P.addMax})`, 400);
  if (addValues.value.includes(add)) return ackErr(ack, `ADD ${fmtSigned(add)} ya existe`, 409);

  addValues.value = [...addValues.value, add].sort((a, b) => a - b);
  rowData.value.forEach((r) => {
    r[`add_${norm(add)}_OD`] = 0;
    r[`add_${norm(add)}_OI`] = 0;
  });

  await nextTick();
  gridApi.value?.refreshHeader();
  gridApi.value?.redrawRows();

  try {
    const rowsToPersist = [];
    rowData.value.forEach((r) => {
      const base_izq = to2(r.base_izq ?? r.base ?? 0);
      const base_der = to2(r.base_der ?? r.base ?? 0);
      rowsToPersist.push({ add, eye: "OD", base_izq, base_der, existencias: 0 });
      rowsToPersist.push({ add, eye: "OI", base_izq, base_der, existencias: 0 });
    });

    if (!rowsToPersist.length) {
      ackOk(ack, "Columna agregada.", 200);
      return;
    }

    const res = await saveChunk(props.sheetId, rowsToPersist, effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo agregar la columna", ok.status);

    ackOk(ack, ok.message || `Columna ADD agregada: ${fmtSigned(add)}`, ok.status);

    lastSavedAt.value = new Date();
    await switchViewReload();
  } catch (e) {
    console.error("[AgGridProgresivo] Error al persistir ADD nuevo:", e?.response?.data || e);
    ackErr(ack, msgFromErr(e, "Error al guardar el nuevo ADD"), statusFromErr(e));
  }
};

async function handleSave(ack) {
  if (!dirty.value || pendingChanges.value.size === 0) {
    ackOk(ack, "No hay cambios por guardar.", 200);
    return;
  }
  saving.value = true;
  try {
    const rows = Array.from(pendingChanges.value.values());
    const res = await saveChunk(props.sheetId, rows, effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo guardar", ok.status);

    dirty.value = false;
    pendingChanges.value.clear();
    lastSavedAt.value = new Date();

    ackOk(ack, ok.message || "Cambios guardados.", ok.status);

    await switchViewReload();
  } catch (e) {
    console.error("[AgGridProgresivo] Error saveChunk:", e?.response?.data || e);
    ackErr(ack, msgFromErr(e, "Error al guardar cambios"), statusFromErr(e));
  } finally {
    saving.value = false;
  }
}

const clearFilters = () => {
  if (!gridApi.value) return;
  const api = gridApi.value;
  if (typeof api.setFilterModel === "function") api.setFilterModel(null);
  else if (typeof api.setGridOption === "function") api.setGridOption("filterModel", null);
};

const resetSort = () => {
  const api = gridApi.value;
  if (!api) return;
  const dir = sortDirForView.value;
  if (typeof api.applyColumnState === "function") {
    api.applyColumnState({ defaultState: { sort: null }, state: [{ colId: "base", sort: dir }] });
  } else if (typeof api.setSortModel === "function") {
    api.setSortModel([{ colId: "base", sort: dir }]);
  }
};

const handleToggleFilters = () => clearFilters();

async function handleDiscard() {
  await switchViewReload();
  dirty.value = false;
  pendingChanges.value.clear();
}

async function handleRefresh() {
  await loadSheetMeta();
  await switchViewReload();
  pendingChanges.value.clear();
}

async function handleSeed(ack) {
  try {
    saving.value = true;
    const res = await reseedSheet(props.sheetId, effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo generar seed", ok.status);

    await loadSheetMeta();
    await switchViewReload();
    lastSavedAt.value = new Date();
    pendingChanges.value.clear();
    ackOk(ack, ok.message || "Seed generado.", ok.status);
  } catch (e) {
    console.error("[AgGridProgresivo] Error reseed:", e?.response?.data || e);
    ackErr(ack, msgFromErr(e, "Error al generar seed"), statusFromErr(e));
  } finally {
    saving.value = false;
  }
}

function handleExport() {
  if (!gridApi.value || typeof gridApi.value.exportDataAsCsv !== "function") return;
  const nameSlug = sheetName.value.replace(/\s+/g, "_");
  gridApi.value.exportDataAsCsv({ fileName: `${nameSlug || "progresivo"}.csv` });
}
</script>

<style scoped>
.buefy-balham-light {
  padding: 0.5rem 0.75rem 0.75rem;
  background-color: #ffffff;
  border-radius: 0.75rem;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.03);
}

/* ✅ transición suave al cambiar vista */
.grid-shell {
  transition: opacity 160ms ease, transform 200ms cubic-bezier(0.22, 0.61, 0.36, 1), filter 160ms ease;
  will-change: opacity, transform, filter;
}
.grid-shell--switching {
  opacity: 0;
  transform: translate3d(0, 8px, 0) scale(0.992);
  filter: blur(1.2px);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .grid-shell {
    transition: none !important;
  }
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
