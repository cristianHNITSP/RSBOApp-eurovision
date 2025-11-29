<!-- src/components/ag-grid/templates/AgGridMonofocal.vue -->
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
  sphType: { type: String, default: "sph-neg" }, // sph-neg | sph-pos
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

/* ===================== Helpers numéricos ===================== */
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const numOr = (v, dflt) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
};
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
const fmtSigned = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n ?? "");
  const s = num.toFixed(2);
  return num >= 0 ? `+${s}` : s;
};
const isNumeric = (v) => /^-?\d+(\.\d+)?$/.test(String(v ?? "").trim());

/** decimal-safe axis builder (incluyente) */
function buildAxisRange(start, end, step = 0.25) {
  const s = Number(start);
  const e = Number(end);
  const st = Math.abs(Number(step) || 0.25);
  if (!Number.isFinite(s) || !Number.isFinite(e) || !Number.isFinite(st) || st <= 0) return [];

  const SCALE = 100;
  const toInt = (x) => Math.round(Number(x) * SCALE);
  const fromInt = (i) => Number((i / SCALE).toFixed(2));
  const si = toInt(s);
  const ei = toInt(e);
  const di = Math.max(1, toInt(st));

  const out = [];
  const forward = si < ei;
  for (let i = si; forward ? i <= ei : i >= ei; forward ? (i += di) : (i -= di)) {
    out.push(fromInt(i));
    if (out.length > 10000) break;
  }
  return out;
}

const norm = (n) => String(to2(n)).replace(".", "_");
const denorm = (s) => Number(String(s).replace("_", "."));
function parseCylFromField(field) {
  if (!field.startsWith("cyl_")) return null;
  return denorm(field.slice(4));
}

/* ===================== UI/Anim ===================== */
const switchingView = ref(false);
const raf = () =>
  new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });

/* ===================== Estado principal ===================== */
const gridApi = ref(null);
const rowData = ref([]);
const dirty = ref(false);
const saving = ref(false);
const lastSavedAt = ref(null);
const sheetMeta = ref(null);
const sheetTabs = ref([]);
const physicalLimits = ref(null);
const pendingChanges = ref(new Map());
const cylValues = ref([]);

/* ===================== theme / locale ===================== */
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

/* ===================== Actor normalizado ===================== */
const effectiveActor = computed(() => {
  const src = props.actor || (typeof window !== "undefined" ? window.__currentUser : null) || null;
  if (!src) return null;
  const userId = src.userId || src.id || src._id || null;
  const name = src.name || src.email || "Usuario";
  return { userId, name };
});

/* ===================== Meta computed ===================== */
const totalRows = computed(() => rowData.value.length);
const sheetName = computed(() => sheetMeta.value?.nombre || sheetMeta.value?.name || "Hoja monofocal (Esf/Cil)");
const tipoMatriz = computed(() => sheetMeta.value?.tipo_matriz || "SPH_CYL");
const material = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);

/**
 * ✅ FUENTE DE VERDAD: PHYSICAL_LIMITS desde backend
 */
const phys = computed(() => {
  const pl = physicalLimits.value || {};
  const SPH = pl.SPH || pl.sph || {};
  const CYL = pl.CYL || pl.cyl || {};
  const sphMin = numOr(SPH.min, -40);
  const sphMax = numOr(SPH.max, 40);
  const cylMin = numOr(CYL.min, -15);
  const cylMax = numOr(CYL.max, 15);
  const cylAbsMax = Math.max(Math.abs(cylMin), Math.abs(cylMax));
  return { sphMin, sphMax, cylMin, cylMax, cylAbsMax };
});

/* ===================== Grid defs ===================== */
function markCellChangedMonofocal(sph, cylDisplay, existencias) {
  const s = to2(sph);
  const cDisp = to2(Math.abs(Number(cylDisplay)));
  const cBackend = -cDisp;

  const key = `${s}|${cDisp}`;
  pendingChanges.value.set(key, {
    sph: s,
    cyl: cBackend,
    existencias: Number(existencias ?? 0)
  });
  dirty.value = true;
}

const columns = computed(() => [
  {
    headerName: `SPH ${props.sphType === "sph-neg" ? "(-)" : "(+)"}`,
    children: [
      {
        field: "sph",
        headerName: "SPH",
        width: 90,
        minWidth: 86,
        maxWidth: 96,
        pinned: "left",
        editable: false,
        sortable: true,
        comparator: (a, b) => Number(a) - Number(b),
        resizable: false,
        filter: "agNumberColumnFilter",
        cellClass: ["ag-cell--compact", "ag-cell--numeric", "ag-cell--pinned"],
        headerClass: ["ag-header-cell--compact", "ag-header-cell--pinned"],
        valueFormatter: (p) => {
          const v = Number(p.value);
          return Number.isFinite(v) ? fmtSigned(v) : p.value ?? "";
        }
      }
    ]
  },
  {
    headerName: "CYL (-)",
    children: cylValues.value.map((cDisp) => ({
      field: `cyl_${norm(cDisp)}`,
      headerName: Number(cDisp).toFixed(2),
      editable: true,
      filter: "agNumberColumnFilter",
      minWidth: 80,
      maxWidth: 110,
      resizable: true,
      cellClass: ["ag-cell--compact", "ag-cell--numeric"],
      headerClass: ["ag-header-cell--compact"],
      valueSetter: (p) => {
        const v = String(p.newValue ?? "").trim();
        const newVal = isNumeric(v) ? Number(v) : 0;
        p.data[p.colDef.field] = newVal;
        markCellChangedMonofocal(p.data.sph, cDisp, newVal);
        return true;
      }
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

const getRowId = (p) => p.data.sph?.toString();

/* ===================== Load meta ===================== */
async function loadSheetMeta() {
  try {
    const { data } = await getSheet(props.sheetId);
    const payload = data?.data || data;
    sheetMeta.value = payload?.sheet || null;
    sheetTabs.value = payload?.tabs || [];
    physicalLimits.value =
      payload?.physicalLimits || payload?.physical_limits || payload?.limits || null;
  } catch (e) {
    console.error("[AgGridMonofocal] Error getSheet:", e?.response?.data || e);
  }
}

function getTabForView() {
  const tab =
    (sheetTabs.value || []).find((t) => t?.id === props.sphType) ||
    (sheetTabs.value || []).find((t) => String(t?.id || "").includes("sph")) ||
    null;

  const r = tab?.ranges || {};
  const sphR = r.sph || {};
  const cylR = r.cyl || {};

  const sphStep = Math.abs(Number(sphR.step)) || 0.25;
  const cylStep = Math.abs(Number(cylR.step)) || 0.25;

  const tabSphEnd = Number(sphR.end);
  const tabCylStart = Number(cylR.start);

  return { tab, sphStep, cylStep, tabSphEnd, tabCylStart };
}

function buildFetchQueryForView() {
  const P = phys.value;
  const isNeg = props.sphType === "sph-neg";
  const sphMin = isNeg ? P.sphMin : 0;
  const sphMax = isNeg ? 0 : P.sphMax;

  const cylMin = Math.min(P.cylMin, 0);
  const cylMax = 0;

  return { sphMin, sphMax, cylMin, cylMax, limit: 20000 };
}

async function loadRows() {
  const P = phys.value;
  const isNeg = props.sphType === "sph-neg";
  const tabCfg = getTabForView();
  const qFetch = buildFetchQueryForView();

  const { data } = await fetchItems(props.sheetId, qFetch);
  const itemsRaw = data?.data || [];

  const items = itemsRaw
    .map((i) => {
      const sph = to2(i.sph);
      let cyl = to2(i.cyl);
      if (Number.isFinite(cyl) && cyl > 0) cyl = -Math.abs(cyl);
      const existencias = Number(i.existencias ?? 0);
      return { sph, cyl, existencias };
    })
    .filter((i) => {
      if (!Number.isFinite(i.sph) || !Number.isFinite(i.cyl)) return false;
      if (i.sph < P.sphMin || i.sph > P.sphMax) return false;
      if (i.cyl < P.cylMin || i.cyl > P.cylMax) return false;
      if (isNeg && i.sph > 0) return false;
      if (!isNeg && i.sph < 0) return false;
      if (i.cyl > 0) return false;
      return true;
    });

  const tabSphEnd = Number.isFinite(tabCfg.tabSphEnd) ? clamp(to2(tabCfg.tabSphEnd), P.sphMin, P.sphMax) : 0;
  const sphFromData = items.map((i) => i.sph);

  let sphEnd;
  if (isNeg) {
    const minData = sphFromData.length ? Math.min(...sphFromData) : 0;
    sphEnd = Math.min(0, tabSphEnd, minData);
    sphEnd = clamp(to2(sphEnd), P.sphMin, 0);
  } else {
    const maxData = sphFromData.length ? Math.max(...sphFromData) : 0;
    sphEnd = Math.max(0, tabSphEnd, maxData);
    sphEnd = clamp(to2(sphEnd), 0, P.sphMax);
  }

  const sphStep = tabCfg.sphStep || 0.25;
  const sphAxis = buildAxisRange(0, sphEnd, sphStep)
    .map(to2)
    .filter((s) => Number.isFinite(s) && s >= P.sphMin && s <= P.sphMax);

  const cylFromDataDisp = items
    .map((i) => to2(Math.abs(i.cyl)))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= P.cylAbsMax);

  const tabCylStart = Number.isFinite(tabCfg.tabCylStart) ? clamp(to2(tabCfg.tabCylStart), P.cylMin, P.cylMax) : 0;
  const tabAbs = to2(Math.abs(Math.min(tabCylStart, 0)));

  const dataAbs = cylFromDataDisp.length ? Math.max(...cylFromDataDisp) : 0;
  const cylAbs = clamp(to2(Math.max(tabAbs, dataAbs, 0)), 0, P.cylAbsMax);

  const cylStep = tabCfg.cylStep || 0.25;
  const cylAxisDisplay = buildAxisRange(0, cylAbs, cylStep)
    .map(to2)
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= P.cylAbsMax);

  cylValues.value = [...new Set(cylAxisDisplay)].sort((a, b) => a - b);

  const key = (s, cDisp) => `${to2(s)}|${to2(cDisp)}`;
  const map = new Map(
    items.map((i) => [key(i.sph, Math.abs(i.cyl)), Number(i.existencias ?? 0)])
  );

  rowData.value = sphAxis.map((sph) => {
    const row = { sph: to2(sph) };
    cylValues.value.forEach((cDisp) => {
      row[`cyl_${norm(cDisp)}`] = map.get(key(sph, cDisp)) ?? 0;
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
    console.error("[AgGridMonofocal] Error fetchItems:", e?.response?.data || e);
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
  () => [props.sheetId, props.sphType],
  async () => {
    pendingChanges.value.clear();
    dirty.value = false;
    await loadAll();
  }
);

/* ===================== Formula / quick edit ===================== */
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
  if (p.colDef.field.startsWith("cyl_")) {
    const cDisp = parseCylFromField(p.colDef.field);
    if (!Number.isNaN(cDisp)) markCellChangedMonofocal(p.data.sph, cDisp, p.data[p.colDef.field]);
  } else {
    dirty.value = true;
  }
};

watch(formulaValue, (val) => {
  if (!activeCell || !gridApi.value) return;

  const field = activeCell.colDef.field;
  const raw = String(val ?? "").trim();
  const newVal = isNumeric(raw) ? Number(raw) : 0;

  const updatedRow = { ...activeCell.data, [field]: newVal };
  gridApi.value.applyTransaction({ update: [updatedRow] });

  if (activeCell.data) activeCell.data[field] = newVal;

  if (field.startsWith("cyl_")) {
    const cDisp = parseCylFromField(field);
    if (!Number.isNaN(cDisp)) markCellChangedMonofocal(updatedRow.sph, cDisp, newVal);
  } else {
    dirty.value = true;
  }
});

/* ===================== Grid hooks ===================== */
const onGridReady = (p) => {
  gridApi.value = p.api;
  nextTick(() => resetSort());
};

/* ===================== Add row/col (con ACK) ===================== */
const handleAddRow = async (nuevoValor, ack) => {
  const P = phys.value;
  const v = to2(nuevoValor);

  if (!Number.isFinite(v)) return ackErr(ack, "Ingresa un SPH numérico", 400);
  if (!isQuarterStep(v)) return ackErr(ack, "SPH debe ser múltiplo de 0.25 (…00, …25, …50, …75)", 400);
  if (v < P.sphMin || v > P.sphMax) return ackErr(ack, `SPH fuera de límites (${P.sphMin} a ${P.sphMax})`, 400);

  if (props.sphType === "sph-neg" && v >= 0) return ackErr(ack, "Vista SPH (-): SPH debe ser negativo (ej: -0.25)", 400);
  if (props.sphType === "sph-pos" && v < 0) return ackErr(ack, "Vista SPH (+): SPH debe ser 0 o positivo", 400);

  if (rowData.value.some((r) => to2(r.sph) === v)) return ackErr(ack, `SPH ${fmtSigned(v)} ya existe`, 409);

  // UI
  const nueva = { sph: v };
  cylValues.value.forEach((cDisp) => (nueva[`cyl_${norm(cDisp)}`] = 0));
  gridApi.value?.applyTransaction({ add: [nueva] });
  await nextTick();
  resetSort();

  try {
    // Persist mínimo (celda cyl=0) para extender plantilla
    const res = await saveChunk(props.sheetId, [{ sph: v, cyl: 0, existencias: 0 }], effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo agregar SPH", ok.status);

    ackOk(ack, ok.message || `SPH agregado: ${fmtSigned(v)}`, ok.status);

    lastSavedAt.value = new Date();
    await loadSheetMeta();
    await switchViewReload();
  } catch (e) {
    console.error("[AgGridMonofocal] ❌ Error al persistir SPH nuevo:", e?.response?.status, e?.response?.data || e);
    ackErr(ack, msgFromErr(e, "Error al guardar el nuevo SPH"), statusFromErr(e));
  }
};

const handleAddColumn = async (nuevoValor, ack) => {
  const P = phys.value;
  const raw = to2(nuevoValor);

  if (!Number.isFinite(raw)) return ackErr(ack, "Ingresa un CYL numérico", 400);
  if (!isQuarterStep(raw)) return ackErr(ack, "CYL debe ser múltiplo de 0.25 (…00, …25, …50, …75)", 400);

  const vDisp = to2(Math.abs(raw));
  if (vDisp === 0) return ackErr(ack, "CYL 0.00 ya existe (no se puede duplicar)", 409);
  if (vDisp > P.cylAbsMax) return ackErr(ack, `CYL fuera de límite (máx ${P.cylAbsMax})`, 400);
  if (cylValues.value.includes(vDisp)) return ackErr(ack, `CYL ${vDisp.toFixed(2)} ya existe`, 409);

  // UI
  cylValues.value = [...cylValues.value, vDisp].sort((a, b) => a - b);
  rowData.value.forEach((r) => (r[`cyl_${norm(vDisp)}`] = 0));

  await nextTick();
  gridApi.value?.refreshHeader();
  gridApi.value?.redrawRows();

  try {
    // Persist mínimo (celda sph=0) para extender CYL (meta.ranges)
    const res = await saveChunk(props.sheetId, [{ sph: 0, cyl: -vDisp, existencias: 0 }], effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo agregar CYL", ok.status);

    ackOk(ack, ok.message || `CYL agregado: -${vDisp.toFixed(2)}`, ok.status);

    lastSavedAt.value = new Date();
    await loadSheetMeta();
    await switchViewReload();
  } catch (e) {
    console.error("[AgGridMonofocal] ❌ Error al persistir CYL nuevo:", e?.response?.status, e?.response?.data || e);
    ackErr(ack, msgFromErr(e, "Error al guardar el nuevo CYL"), statusFromErr(e));
  }
};

/* ===================== filters/sort/save ===================== */
const clearFilters = () => {
  if (!gridApi.value) return;
  const api = gridApi.value;
  if (typeof api.setFilterModel === "function") api.setFilterModel(null);
  else if (typeof api.setGridOption === "function") api.setGridOption("filterModel", null);
};

const resetSort = () => {
  const api = gridApi.value;
  if (!api) return;
  const sortDir = props.sphType === "sph-neg" ? "desc" : "asc"; // 0 arriba en ambas vistas
  if (typeof api.applyColumnState === "function") {
    api.applyColumnState({
      defaultState: { sort: null },
      state: [{ colId: "sph", sort: sortDir }]
    });
  } else if (typeof api.setSortModel === "function") {
    api.setSortModel([{ colId: "sph", sort: sortDir }]);
  }
};

const handleToggleFilters = () => clearFilters();

async function handleSave(ack) {
  if (!dirty.value || pendingChanges.value.size === 0) {
    ackOk(ack, "No hay cambios por guardar.", 200);
    return;
  }
  if (!gridApi.value) return ackErr(ack, "Grid no listo.", 400);

  saving.value = true;
  try {
    const rows = Array.from(pendingChanges.value.values());
    const res = await saveChunk(props.sheetId, rows, effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudieron guardar los cambios", ok.status);

    dirty.value = false;
    pendingChanges.value.clear();
    lastSavedAt.value = new Date();

    ackOk(ack, ok.message || "Cambios guardados.", ok.status);

    await loadSheetMeta();
    await switchViewReload();
  } catch (e) {
    console.error("[AgGridMonofocal] Error saveChunk:", e?.response?.data || e);
    ackErr(ack, msgFromErr(e, "Error al guardar cambios"), statusFromErr(e));
  } finally {
    saving.value = false;
  }
}

async function handleDiscard() {
  pendingChanges.value.clear();
  dirty.value = false;
  await switchViewReload();
}

async function handleRefresh() {
  pendingChanges.value.clear();
  await loadSheetMeta();
  await switchViewReload();
}

async function handleSeed(ack) {
  try {
    saving.value = true;
    const res = await reseedSheet(props.sheetId, effectiveActor.value);
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo generar seed", ok.status);

    await loadSheetMeta();
    await switchViewReload();
    dirty.value = false;
    pendingChanges.value.clear();
    lastSavedAt.value = new Date();
    ackOk(ack, ok.message || "Seed generado.", ok.status);
  } catch (e) {
    console.error("[AgGridMonofocal] Error reseed:", e?.response?.data || e);
    ackErr(ack, msgFromErr(e, "Error al generar seed"), statusFromErr(e));
  } finally {
    saving.value = false;
  }
}

function handleExport() {
  if (!gridApi.value || typeof gridApi.value.exportDataAsCsv !== "function") return;
  const nameSlug = sheetName.value.replace(/\s+/g, "_");
  const posNeg = props.sphType === "sph-pos" ? "pos" : "neg";
  gridApi.value.exportDataAsCsv({ fileName: `${nameSlug || "sph_cyl"}_${posNeg}.csv` });
}
</script>

<style scoped>
.buefy-balham-light {
  padding: 0.5rem 0.75rem 0.75rem;
  background-color: #ffffff;
  border-radius: 0.75rem;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.03);
}

.grid-shell {
  transition: opacity 160ms ease,
    transform 200ms cubic-bezier(0.22, 0.61, 0.36, 1),
    filter 160ms ease;
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
