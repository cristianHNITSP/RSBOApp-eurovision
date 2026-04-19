<!-- src/components/ag-grid/templates/GlassTable.vue -->
<!--
  Vista alternativa "Glassmorphism" para inventario.
  Muestra los mismos datos que los AG-Grid templates pero en una tabla Buefy
  estilizada con glass-effect, ideal para revisión rápida y edición ligera.
-->
<template>
  <div class="gt-root">

    <!-- ── Toolbar compacta ── -->
    <div class="gt-bar">
      <div class="gt-bar__left">
        <span class="gt-pill">
          <b-icon icon="layer-group" size="is-small" />
          {{ tipoHuman }}
        </span>
        <span v-if="sheetName" class="gt-bar__name">{{ sheetName }}</span>
        <b-tag v-if="material" type="is-light" size="is-small">{{ material }}</b-tag>
        <span v-if="totalItems > 0" class="gt-bar__count">{{ totalItems }} registros</span>
      </div>
      <div class="gt-bar__right">
        <b-input v-model="searchQuery" placeholder="Buscar…" icon="search" size="is-small" class="gt-search" clearable />
        <b-select v-model="stockFilter" size="is-small">
          <option value="all">Todos</option>
          <option value="with-stock">Con stock</option>
          <option value="no-stock">Sin stock</option>
          <option value="low-stock">Bajo stock</option>
        </b-select>
        <b-button v-if="dirty" size="is-small" type="is-primary" icon-left="save" :loading="saving" @click="handleSave">Guardar</b-button>
        <b-button v-if="dirty" size="is-small" type="is-light" icon-left="undo" @click="handleDiscard" />
        <b-button size="is-small" type="is-light" icon-left="sync" :loading="loading" @click="handleRefresh" />
        <b-button size="is-small" type="is-light" icon-left="file-export" @click="handleExport" />
      </div>
    </div>

    <!-- ── Tabla (misma estructura que Optica.vue) ── -->
    <div class="table-glass glass-card">
      <b-table
        :data="sortedData"
        :loading="loading"
        :striped="true"
        :hoverable="true"
        :mobile-cards="true"
        paginated
        :per-page="10"
        pagination-simple
        pagination-size="is-small"
        v-model:currentPage="currentPage"
        :backend-sorting="true"
        :default-sort="activeSortField"
        :default-sort-direction="activeSortDir"
        @sort="onSort"
        sort-icon="arrow-up"
        sort-icon-size="is-small"
      >
        <b-table-column
          v-for="col in visibleColumns"
          :key="col.field"
          :field="col.field"
          :label="col.label"
          :sortable="col.sortable !== false"
          :numeric="col.numeric"
          v-slot="{ row }"
        >
          <!-- Editable: existencias -->
          <template v-if="col.editable">
            <strong :class="stockClass(row[col.field])">
              <input
                class="gt-stock-input"
                :class="{ 'gt-stock--changed': isCellChanged(row) }"
                type="number"
                :value="row[col.field]"
                min="0"
                @change="onCellEdit(row, col.field, $event)"
                @focus="$event.target.select()"
              />
            </strong>
          </template>

          <!-- Ojo -->
          <template v-else-if="col.field === 'eye'">
            <b-tag :type="row.eye === 'OD' ? 'is-info' : 'is-success'" size="is-small">
              {{ row.eye === 'OD' ? 'Derecho' : row.eye === 'OI' ? 'Izquierdo' : row.eye }}
            </b-tag>
          </template>

          <!-- Coordenada numérica -->
          <template v-else-if="col.isCoord">
            <span class="sku-mono">
              {{ col.formatter ? col.formatter(row[col.field]) : row[col.field] }}
            </span>
          </template>

          <!-- Metadata: tag (material, tratamiento) -->
          <template v-else-if="col.isMeta && col.isTag">
            <b-tag type="is-light" size="is-small">{{ row[col.field] }}</b-tag>
          </template>

          <!-- Metadata: precio -->
          <template v-else-if="col.field === '_precio'">
            {{ fmtPrice(row[col.field]) }}
          </template>

          <!-- Metadata: caducidad -->
          <template v-else-if="col.field === '_caducidad'">
            {{ fmtDate(row[col.field]) }}
          </template>

          <!-- Metadata: SKU / lote (monospace) -->
          <template v-else-if="col.field === '_sku' || col.field === '_lote'">
            <span class="sku-mono">{{ row[col.field] || "—" }}</span>
          </template>

          <!-- Genérico -->
          <template v-else>
            {{ row[col.field] }}
          </template>
        </b-table-column>

        <template #empty>
          <div class="has-text-centered has-text-grey py-5">No hay datos para mostrar.</div>
        </template>
      </b-table>
    </div>

    <!-- ── Dirty float ── -->
    <Teleport :to="teleportTarget">
      <Transition name="gt-dirty-slide">
        <div v-if="dirty && !saving" class="gt-dirty-float">
          <b-icon icon="exclamation-triangle" size="is-small" />
          <span>Cambios sin guardar</span>
          <b-button size="is-small" type="is-primary" icon-left="save" @click="handleSave">Guardar</b-button>
          <b-button size="is-small" type="is-light" icon-left="undo" @click="handleDiscard">Descartar</b-button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useSheetApi } from "@/composables/useSheetApi";
import { labToast } from "@/composables/useLabToast";
import { exportToXlsx } from "@/composables/useExcelExport";

const props = defineProps({
  sheetId:    { type: String, required: true },
  sphType:    { type: String, default: "sph-neg" },
  actor:      { type: Object, default: null },
  apiType:    { type: String, default: "inventory" },
});

const { fetchItems, saveChunk, getSheet } = useSheetApi(() => props.apiType);

/* ─── State ─── */
const allItems    = ref([]);
const sheetMeta   = ref(null);
const loading     = ref(true);
const saving      = ref(false);
const dirty       = ref(false);
const searchQuery = ref("");
const stockFilter = ref("all");
const currentPage = ref(1);
const pendingChanges = ref(new Map());

/* ─── Computed ─── */
const tipoMatriz   = computed(() => sheetMeta.value?.tipo_matriz || "");
const sheetName    = computed(() => sheetMeta.value?.nombre || "");
const material     = computed(() => sheetMeta.value?.material || "");
const totalItems   = computed(() => allItems.value.length);

const LOW_STOCK_THRESHOLD = computed(() => {
  const meta = sheetMeta.value;
  if (meta?.lowStockThreshold) return meta.lowStockThreshold;
  return 5;
});

const isLowStock = (v) => {
  const n = Number(v ?? 0);
  return n > 0 && n <= LOW_STOCK_THRESHOLD.value;
};

const tipoHuman = computed(() => ({
  BASE:         "Monofocal (Base)",
  SPH_CYL:      "Monofocal (Esf/Cil)",
  SPH_ADD:      "Bifocal (SPH + ADD)",
  BASE_ADD:     "Progresivo (BASE + ADD)",
  SPH_CYL_AXIS: "Tórico (SPH + CYL + Eje)",
}[tipoMatriz.value] || tipoMatriz.value));

const to2 = (n) => {
  const num = Number(n);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
};

const fmtSigned = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n ?? "");
  const s = num.toFixed(2);
  return num >= 0 ? `+${s}` : s;
};

/* ─── Side filter ─── */
const sideFilter = computed(() => {
  const t = String(props.sphType || "").toLowerCase();
  if (t.includes("neg")) return (n) => Number(n) <= 0;
  if (t.includes("pos")) return (n) => Number(n) >= 0;
  return () => true;
});

/* ─── Metadata de la planilla (se inyecta en cada fila) ─── */
const sheetSku        = computed(() => sheetMeta.value?.sku || "");
const tratamiento     = computed(() => sheetMeta.value?.tratamiento || "");
const variante        = computed(() => sheetMeta.value?.variante || "");
const marcaNombre     = computed(() => sheetMeta.value?.marca?.name || "");
const proveedorNombre = computed(() => sheetMeta.value?.proveedor?.name || "");
const precioVenta     = computed(() => sheetMeta.value?.precioVenta ?? null);
const loteProducto    = computed(() => sheetMeta.value?.loteProducto || "");
const fechaCaducidad  = computed(() => sheetMeta.value?.fechaCaducidad || "");

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const fmtPrice = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return "—";
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 });
};

/* ─── Column definitions per tipo_matriz ─── */
/* Orden: coordenadas → ojo → metadata de planilla → existencias (siempre al final) */
const visibleColumns = computed(() => {
  const tipo = tipoMatriz.value;
  const m = sheetMeta.value;

  // 1) Columnas de coordenadas (primero: dioptrías, grados, etc.)
  let coordCols = [];
  if (tipo === "BASE") {
    coordCols = [
      { field: "base", label: "Base", numeric: true, sortable: true, isCoord: true, formatter: fmtSigned },
    ];
  } else if (tipo === "SPH_CYL" || tipo === "SPH_CYL_AXIS") {
    coordCols = [
      { field: "sph", label: "Esférica (SPH)", numeric: true, sortable: true, isCoord: true, formatter: fmtSigned },
      { field: "cyl", label: "Cilíndrica (CYL)", numeric: true, sortable: true, isCoord: true, formatter: fmtSigned },
    ];
    if (tipo === "SPH_CYL_AXIS") {
      coordCols.push({ field: "axis", label: "Eje (°)", numeric: true, sortable: true, isCoord: true });
    }
  } else if (tipo === "SPH_ADD") {
    coordCols = [
      { field: "sph", label: "Esférica (SPH)", numeric: true, sortable: true, isCoord: true, formatter: fmtSigned },
      { field: "add", label: "Adición (ADD)", numeric: true, sortable: true, isCoord: true, formatter: fmtSigned },
      { field: "eye", label: "Ojo", sortable: true },
    ];
  } else if (tipo === "BASE_ADD") {
    coordCols = [
      { field: "base_izq", label: "Base Izq", numeric: true, sortable: true, isCoord: true, formatter: fmtSigned },
      { field: "base_der", label: "Base Der", numeric: true, sortable: true, isCoord: true, formatter: fmtSigned },
      { field: "add", label: "Adición (ADD)", numeric: true, sortable: true, isCoord: true, formatter: fmtSigned },
      { field: "eye", label: "Ojo", sortable: true },
    ];
  }

  // 2) Columnas de metadata de la planilla (solo si tienen valor)
  const metaCols = [];
  if (m?.sku)              metaCols.push({ field: "_sku",         label: "SKU",         isMeta: true });
  if (m?.material)         metaCols.push({ field: "_material",    label: "Material",    isMeta: true, isTag: true });
  if (m?.tratamiento)      metaCols.push({ field: "_tratamiento", label: "Tratamiento", isMeta: true, isTag: true });
  if (m?.variante)         metaCols.push({ field: "_variante",    label: "Variante",    isMeta: true });
  if (m?.marca?.name)      metaCols.push({ field: "_marca",       label: "Marca",       isMeta: true, sortable: true });
  if (m?.proveedor?.name)  metaCols.push({ field: "_proveedor",   label: "Proveedor",   isMeta: true });
  if (m?.precioVenta > 0)  metaCols.push({ field: "_precio",      label: "Precio",      isMeta: true, numeric: true });
  if (m?.loteProducto)     metaCols.push({ field: "_lote",        label: "Lote",        isMeta: true });
  if (m?.fechaCaducidad)   metaCols.push({ field: "_caducidad",   label: "Caducidad",   isMeta: true });

  // 3) Existencias al final (siempre)
  const stockCol = { field: "existencias", label: "Stock", numeric: true, sortable: true, editable: true };

  return [...coordCols, ...metaCols, stockCol];
});

/* ─── Sort state (neutros siempre primero) ─── */
const activeSortField = ref("sph");
const activeSortDir   = ref("desc");

// Campo primario de coordenada para detectar neutros (sph=0, base=0, etc.)
const primaryCoordField = computed(() => {
  const tipo = tipoMatriz.value;
  if (tipo === "BASE") return "base";
  if (tipo === "BASE_ADD") return "base_izq";
  return "sph";
});

function onSort(field, dir) {
  activeSortField.value = field;
  activeSortDir.value   = dir;
}

const sortedData = computed(() => {
  const data = [...filteredData.value];
  const field  = activeSortField.value;
  const isAsc  = activeSortDir.value === "asc";
  const pf     = primaryCoordField.value;

  data.sort((a, b) => {
    // Neutros en coordenada primaria siempre van primero
    const aN = Number(a[pf] ?? 0) === 0;
    const bN = Number(b[pf] ?? 0) === 0;
    if (aN && !bN) return -1;
    if (!aN && bN) return 1;

    // Ordenamiento normal por la columna activa
    const av = Number(a[field] ?? 0);
    const bv = Number(b[field] ?? 0);
    if (Number.isFinite(av) && Number.isFinite(bv)) return isAsc ? av - bv : bv - av;
    return isAsc
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  return data;
});

/* ─── Data transformation ─── */
function flattenCells(doc) {
  const tipo = doc.tipo_matriz || tipoMatriz.value;
  const cells = doc.cells || {};
  const rows = [];

  if (tipo === "BASE") {
    for (const [k, cell] of Object.entries(cells)) {
      const base = to2(parseKeyNum(k));
      if (!sideFilter.value(base)) continue;
      rows.push({ _key: k, base, existencias: Number(cell.existencias ?? 0), sku: cell.sku, codebar: cell.codebar });
    }
  } else if (tipo === "SPH_CYL") {
    for (const [k, cell] of Object.entries(cells)) {
      const [sph, cyl] = k.split("|").map(parseKeyNum);
      if (!sideFilter.value(sph)) continue;
      rows.push({ _key: k, sph: to2(sph), cyl: to2(cyl), existencias: Number(cell.existencias ?? 0), sku: cell.sku });
    }
  } else if (tipo === "SPH_CYL_AXIS") {
    for (const [k, cell] of Object.entries(cells)) {
      const parts = k.split("|").map(parseKeyNum);
      const [sph, cyl, axis] = parts;
      if (!sideFilter.value(sph)) continue;
      rows.push({ _key: k, sph: to2(sph), cyl: to2(cyl), axis: Number(axis), existencias: Number(cell.existencias ?? 0), sku: cell.sku });
    }
  } else if (tipo === "SPH_ADD") {
    for (const [k, cell] of Object.entries(cells)) {
      const parts = k.split("|");
      const sph = parseKeyNum(parts[0]);
      const add = parseKeyNum(parts[1]);
      if (!sideFilter.value(sph)) continue;
      // OD/OI
      for (const eye of ["OD", "OI"]) {
        const node = cell[eye] || cell;
        rows.push({ _key: `${k}|${eye}`, sph: to2(sph), add: to2(add), eye, existencias: Number(node.existencias ?? 0), sku: node.sku });
      }
    }
  } else if (tipo === "BASE_ADD") {
    for (const [k, cell] of Object.entries(cells)) {
      const parts = k.split("|");
      const base_izq = parseKeyNum(parts[0]);
      const base_der = parseKeyNum(parts[1]);
      const add = parseKeyNum(parts[2]);
      for (const eye of ["OD", "OI"]) {
        const node = cell[eye] || cell;
        rows.push({ _key: `${k}|${eye}`, base_izq: to2(base_izq), base_der: to2(base_der), add: to2(add), eye, existencias: Number(node.existencias ?? 0), sku: node.sku });
      }
    }
  }

  return rows;
}

function parseKeyNum(s) {
  if (s == null) return 0;
  return Number(String(s).replace(/_/g, "."));
}

/* ─── Filter ─── */
const filteredData = computed(() => {
  let data = allItems.value;

  // text search
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    data = data.filter((row) =>
      visibleColumns.value.some((col) => {
        const val = row[col.field];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }

  // stock filter
  if (stockFilter.value === "with-stock") {
    data = data.filter(r => Number(r.existencias ?? 0) > 0);
  } else if (stockFilter.value === "no-stock") {
    data = data.filter(r => Number(r.existencias ?? 0) === 0);
  } else if (stockFilter.value === "low-stock") {
    data = data.filter(r => isLowStock(r.existencias));
  }

  return data;
});

/* ─── Cell editing ─── */
function onCellEdit(row, field, event) {
  const newVal = Number(event.target.value ?? 0);
  const oldVal = Number(row[field] ?? 0);
  if (newVal === oldVal) return;

  row[field] = newVal;
  pendingChanges.value.set(row._key, { ...row, existencias: newVal });
  dirty.value = true;
}

function isCellChanged(row) {
  return pendingChanges.value.has(row._key);
}

function stockClass(val) {
  const n = Number(val ?? 0);
  if (n === 0) return "has-text-danger";
  if (n <= LOW_STOCK_THRESHOLD.value) return "has-text-warning";
  return "";
}

/* ─── Data loading ─── */
async function loadAll() {
  loading.value = true;
  try {
    const [metaRes, itemsRes] = await Promise.all([
      getSheet(props.sheetId),
      fetchItems(props.sheetId, { limit: 20000 }),
    ]);

    const meta = metaRes?.data?.data ?? metaRes?.data ?? {};
    sheetMeta.value = meta.sheet ?? meta;

    const raw = itemsRes?.data?.data ?? itemsRes?.data ?? [];
    // Backend returns { ok: true, data: [flat row objects] }
    // After axios: itemsRes.data.data = flat array of { sph, cyl, existencias, ... }
    // Metadata de la planilla para inyectar en cada fila
    const sm = sheetMeta.value || {};
    const metaFields = {
      _sku:         sm.sku || "",
      _material:    sm.material || "",
      _tratamiento: sm.tratamiento || "",
      _variante:    sm.variante || "",
      _marca:       sm.marca?.name || "",
      _proveedor:   sm.proveedor?.name || "",
      _precio:      sm.precioVenta ?? null,
      _lote:        sm.loteProducto || "",
      _caducidad:   sm.fechaCaducidad || "",
    };

    if (Array.isArray(raw)) {
      allItems.value = raw
        .filter((r) => sideFilter.value(r.sph ?? r.base ?? r.base_izq ?? 0))
        .map((r) => ({ ...r, ...metaFields, _key: buildKey(r) }));
    } else if (raw.cells || raw.doc?.cells) {
      // Raw cells map from a matrix doc (fallback)
      const doc = raw.doc || raw;
      allItems.value = flattenCells({ ...doc, tipo_matriz: sheetMeta.value?.tipo_matriz })
        .map((r) => ({ ...r, ...metaFields }));
    } else {
      allItems.value = [];
    }

    // Inicializar sort según tipo de planilla y signo (sph-neg → desc, sph-pos → asc)
    const tipo = sheetMeta.value?.tipo_matriz || "";
    activeSortField.value = tipo === "BASE" ? "base" : tipo === "BASE_ADD" ? "base_izq" : "sph";
    const t = String(props.sphType || "").toLowerCase();
    activeSortDir.value = t.includes("pos") ? "asc" : "desc";
  } catch (e) {
    console.error("[GlassTable] loadAll error:", e);
    labToast.danger("Error al cargar los datos de la planilla.");
  } finally {
    loading.value = false;
  }
}

function buildKey(row) {
  const tipo = tipoMatriz.value;
  if (tipo === "BASE") return String(to2(row.base));
  if (tipo === "SPH_CYL") return `${to2(row.sph)}|${to2(row.cyl)}`;
  if (tipo === "SPH_CYL_AXIS") return `${to2(row.sph)}|${to2(row.cyl)}|${row.axis}`;
  if (tipo === "SPH_ADD") return `${to2(row.sph)}|${to2(row.add)}|${row.eye || "OD"}`;
  if (tipo === "BASE_ADD") return `${to2(row.base_izq)}|${to2(row.base_der)}|${to2(row.add)}|${row.eye || "OD"}`;
  return String(Math.random());
}

/* ─── Actions ─── */
async function handleSave() {
  if (!dirty.value || pendingChanges.value.size === 0) return;
  saving.value = true;
  try {
    const rows = Array.from(pendingChanges.value.values());
    await saveChunk(props.sheetId, rows, props.actor || { userId: "unknown", name: "—" });
    dirty.value = false;
    pendingChanges.value.clear();
    labToast.success("Cambios guardados correctamente.");
    await loadAll();
  } catch (e) {
    console.error("[GlassTable] save error:", e);
    labToast.danger("Error al guardar los cambios.");
  } finally {
    saving.value = false;
  }
}

async function handleDiscard() {
  dirty.value = false;
  pendingChanges.value.clear();
  labToast.warning("Cambios descartados.");
  await loadAll();
}

async function handleRefresh() {
  await loadAll();
}

async function handleExport() {
  const cols = visibleColumns.value;
  const columns = cols.map(c => ({
    key: c.field,
    label: c.label,
    width: c.field === '_precio' ? 14 : c.field === '_caducidad' ? 16 : undefined,
    align: c.field === 'existencias' ? "center" : undefined,
    transform: c.field === '_precio'
      ? (r) => fmtPrice(r[c.field])
      : c.field === '_caducidad'
      ? (r) => fmtDate(r[c.field])
      : undefined,
  }));
  const rows = sortedData.value || [];
  labToast.info("Generando reporte Excel...", 2000);
  try {
    const fecha = new Date().toISOString().slice(0, 10);
    await exportToXlsx({
      filename: `reporte_inventario_${(sheetName.value || "inventario").replace(/\s+/g, "_")}_${fecha}`,
      sheetName: String(sheetName.value || "Inventario").slice(0, 31),
      title: `Inventario — ${sheetName.value || "Inventario"}`,
      subtitle: material.value ? `Material: ${material.value}` : undefined,
      columns,
      rows,
      summaryCards: [
        { label: "Productos", value: rows.length },
        { label: "Stock Total", value: rows.reduce((s, r) => s + Number(r.existencias || 0), 0) },
      ],
    });
    labToast.success("Excel descargado correctamente.");
  } catch (e) {
    console.error("[GlassTable] Export error:", e);
    labToast.danger("No se pudo generar el reporte.");
  }
}

/* ─── Lifecycle ─── */
onMounted(() => loadAll());

watch(
  () => [props.sheetId, props.sphType],
  () => {
    pendingChanges.value.clear();
    dirty.value = false;
    loadAll();
  }
);

/* ─── Fullscreen & Teleport ─── */
const isFullscreenActive = ref(!!document.fullscreenElement);
const updateFs = () => { isFullscreenActive.value = !!document.fullscreenElement; };
onMounted(() => document.addEventListener("fullscreenchange", updateFs));
onBeforeUnmount(() => document.removeEventListener("fullscreenchange", updateFs));

const teleportTarget = computed(() => {
  if (isFullscreenActive.value && document.fullscreenElement) return document.fullscreenElement;
  return "body";
});

/* ─── Dark mode ─── */
const _darkMode = ref(document.documentElement.getAttribute("data-theme") === "dark");
const _obs = new MutationObserver(() => {
  _darkMode.value = document.documentElement.getAttribute("data-theme") === "dark";
});
onMounted(() => _obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }));
onBeforeUnmount(() => _obs.disconnect());
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════
   LAYOUT (flex column, height 100% — como AgGridBase)
   ═══════════════════════════════════════════════════════════════════ */
.gt-root {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ── Toolbar compacta ── */
.gt-bar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  background: var(--surface-raised);
  border-bottom: 1px solid var(--border);
}
.gt-bar__left {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}
.gt-bar__right {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
}
.gt-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--c-primary);
  background: var(--c-primary-alpha);
  padding: 0.15rem 0.4rem;
  border-radius: var(--radius-pill);
  font-weight: 600;
  white-space: nowrap;
}
.gt-bar__name {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}
.gt-bar__count {
  font-size: 0.7rem;
  color: var(--text-muted);
  white-space: nowrap;
}
.gt-search { width: 160px; }

/* ═══════════════════════════════════════════════════════════════════
   GLASS CARD + TABLE (copiado de Optica.vue)
   ═══════════════════════════════════════════════════════════════════ */
.glass-card {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background: var(--surface-raised);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

.table-glass {
  flex: 1 1 auto;
  min-height: 0;
  padding: 0.6rem;
  overflow: auto;
}

.table-glass :deep(table) {
  background: transparent !important;
  color: var(--text-primary);
}

.table-glass :deep(thead th) {
  background: transparent !important;
  color: var(--text-muted) !important;
  border-bottom: 1px solid var(--border) !important;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
  white-space: nowrap;
}

.table-glass :deep(tbody tr) {
  background: transparent !important;
  transition: background 120ms ease;
}

.table-glass :deep(tbody tr:hover) {
  background: var(--c-primary-alpha) !important;
}

.table-glass :deep(tbody td) {
  border-bottom: 1px solid var(--border-light) !important;
  color: var(--text-primary);
  vertical-align: middle;
  font-size: 0.85rem;
}

.table-glass :deep(.is-striped tbody tr:nth-child(even)) {
  background: rgba(148, 163, 184, 0.04) !important;
}

/* Pagination (igual que Optica.vue) */
.table-glass :deep(.pagination-link),
.table-glass :deep(.pagination-previous),
.table-glass :deep(.pagination-next) {
  background: var(--surface-raised);
  border-color: var(--border);
  color: var(--text-secondary);
}
.table-glass :deep(.pagination-link.is-current) {
  background: var(--c-primary);
  border-color: var(--c-primary);
  color: var(--text-on-primary);
}

/* ═══════════════════════════════════════════════════════════════════
   MONOSPACE COORDENADAS (igual que Optica .sku-mono)
   ═══════════════════════════════════════════════════════════════════ */
.sku-mono {
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  font-size: 0.78rem;
  letter-spacing: -0.02em;
  color: var(--text-secondary);
}

/* ═══════════════════════════════════════════════════════════════════
   INPUT EXISTENCIAS
   ═══════════════════════════════════════════════════════════════════ */
.gt-stock-input {
  width: 64px;
  padding: 0.15rem 0.3rem;
  font-size: 0.82rem;
  font-weight: 700;
  text-align: center;
  border-radius: 4px;
  border: 1px solid transparent;
  background: transparent;
  color: inherit;
  outline: none;
  -moz-appearance: textfield;
  transition: border-color 120ms, background 120ms;
}
.gt-stock-input::-webkit-inner-spin-button,
.gt-stock-input::-webkit-outer-spin-button { -webkit-appearance: none; }
.gt-stock-input:hover {
  border-color: var(--border);
  background: var(--surface);
}
.gt-stock-input:focus {
  border-color: var(--c-primary);
  background: var(--surface);
  box-shadow: 0 0 0 2px var(--c-primary-alpha);
}
.gt-stock-input.gt-stock--changed {
  border-color: var(--c-primary);
  background: var(--c-primary-alpha);
}

/* ═══════════════════════════════════════════════════════════════════
   DIRTY FLOAT
   ═══════════════════════════════════════════════════════════════════ */
.gt-dirty-float {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100000;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.9rem;
  border-radius: 999px;
  background: var(--surface-solid);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-primary);
}
.gt-dirty-slide-enter-active,
.gt-dirty-slide-leave-active {
  transition: opacity 180ms ease, transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1);
}
.gt-dirty-slide-enter-from,
.gt-dirty-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(14px);
}

/* ═══════════════════════════════════════════════════════════════════
   REDUCED MOTION
   ═══════════════════════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .table-glass :deep(tbody tr) { transition: none !important; }
}
</style>
