<!-- ============================================================
  AgGridMonofocal.vue  —  Matriz SPH × CYL (lentes de contacto)

  ARQUITECTURA:
  ─────────────────────────────────────────────────────────────
  FILAS (vertical):  rowModelType="infinite"
    • datasource.getRows devuelve INMEDIATAMENTE filas placeholder
      con { sph, __loading: true }.
    • En paralelo, fetchea los datos reales para ese rango de SPH.
    • Al llegar los datos, actualiza los nodos con node.setData() y
      refreshCells().
    • NUNCA llama a purgeInfiniteCache() desde la lógica de columnas.

  COLUMNAS (horizontal):  useAgGridIncrementalColumns
    • Arranca con COL_CHUNK_SIZE columnas CYL.
    • Auto-rellena bloques hasta que aparezca scrollbar horizontal.
    • Carga más bloques al acercarse al borde derecho (scroll listener).
    • Las rows ya tienen TODOS los datos CYL en caché (rowCache),
      así que agregar columnas no re-invoca getRows.

  ANTI-COLISIÓN:
    • rowCache Map<sph, rowObj> almacena el pivot completo por fila.
    • getRows NUNCA necesita re-ejecutarse por un cambio de columnDefs.
    • addNextChunk() NUNCA toca el infinite row model.
  ============================================================ -->

<template>
  <div class="grid-page">
    <!-- ── TOPBAR (sticky) ────────────────────────────────────── -->
    <header class="grid-topbar">
      <navtools
        class="navtools-wrap"
        v-model="formulaValue"
        :dirty="dirty"
        :saving="saving"
        :total-rows="totalRows"
        :sheet-name="sheetName"
        :tipo-matriz="tipoMatriz"
        :material="material"
        :tratamientos="tratamientos"
        :last-saved-at="lastSavedAt"
        :grid-can-undo="gridHistory.canUndo.value"
        :grid-can-redo="gridHistory.canRedo.value"
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
        @grid-undo="handleGridUndo"
        @grid-redo="handleGridRedo"
      />
    </header>

    <!-- ── GRID MAIN ──────────────────────────────────────────── -->
    <main class="grid-main">
      <!-- Glass wrapper (backdrop-filter actúa aquí) -->
      <div
        class="glass-shell"
        :class="{ 'glass-shell--switching': switchingView }"
      >
        <!-- Indicador de columnas cargadas (modo dev) -->
        <div v-if="DEV_MODE" class="dev-col-badge">
          cols {{ activeCylValues.length }} / {{ allCylValues.length }}
          <span v-if="loadingCols" class="dev-col-badge__spin">⟳</span>
        </div>

        <AgGridVue
          class="ag-grid-glass"
          :columnDefs="columns"
          :rowModelType="'infinite'"
          :datasource="datasource"
          :defaultColDef="defaultColDef"
          :getRowId="getRowId"
          :animateRows="false"
          :localeText="localeText"
          :theme="themeCustom"
          :rowHeight="30"
          :headerHeight="32"
          :suppressMovableColumns="true"
          :rowClassRules="stockRowClassRules.value"
          :maxBlocksInCache="20"
          :cacheBlockSize="ROW_PAGE_SIZE"
          :infiniteInitialRowCount="sphAxis.length || 10"
          :suppressHorizontalScroll="false"
          @cellClicked="onCellClicked"
          @cellValueChanged="onCellValueChanged"
          @grid-ready="onGridReady"
          style="width: 100%; height: 100%;"
        />
      </div>
    </main>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
  onActivated,
  onDeactivated,
  shallowRef,
} from "vue";
import { AgGridVue } from "ag-grid-vue3";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import navtools from "@/components/ag-grid/navtools.vue";
import { useSheetApi } from "@/composables/useSheetApi";
import { useGridHistory } from "@/composables/useGridHistory";
import { useUnsavedGuard } from "@/composables/useUnsavedGuard";
import { labToast } from "@/composables/useLabToast";
import { exportAgGridToXlsx } from "@/composables/useExcelExport";
import {
  useAgGridBase,
  localeText,
  ackOk,
  ackErr,
  msgFromErr,
  statusFromErr,
  normalizeAxiosOk,
  numOr,
  isNumeric,
  to2,
  fmtSigned,
} from "@/composables/useAgGridBase";
import { useStockRules } from "@/composables/useStockRules";
import { useAgGridIncrementalColumns } from "@/composables/useAgGridIncrementalColumns";

ModuleRegistry.registerModules([AllCommunityModule]);

// ═══════════════════════════════════════════════════════════════
//  ENTORNO DE PRUEBAS — cambiar aquí para testing / producción
// ═══════════════════════════════════════════════════════════════
/** Activar logs detallados y delay artificial */
const DEV_MODE = import.meta.env.DEV;
/** Delay artificial en ms para simular red lenta (solo DEV_MODE) */
const DEV_DELAY_MS = DEV_MODE ? 2000 : 0;
/** Filas por página del datasource infinito */
const ROW_PAGE_SIZE = DEV_MODE ? 5 : 30;
/** Columnas por bloque inicial */
const COL_CHUNK_SIZE = DEV_MODE ? 3 : 8;

const LOG = (...args) => DEV_MODE && console.log("[Monofocal]", ...args);
const LOG_ROWS = (...args) =>
  DEV_MODE && console.log("[Monofocal][Rows]", ...args);

// ═══════════════════════════════════════════════════════════════
//  PROPS
// ═══════════════════════════════════════════════════════════════
const props = defineProps({
  sheetId: { type: String, required: true },
  sphType: { type: String, default: "sph-neg" }, // sph-neg | sph-pos
  actor: { type: Object, default: null },
  apiType: { type: String, default: "inventory" },
});

const { fetchItems, saveChunk, reseedSheet, getSheet } = useSheetApi(
  () => props.apiType
);

// ═══════════════════════════════════════════════════════════════
//  HELPERS LOCALES
// ═══════════════════════════════════════════════════════════════
const isQuarterStep = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return false;
  return Math.abs(n * 4 - Math.round(n * 4)) < 1e-6;
};
const norm = (n) => String(to2(n)).replace(".", "_");
const denorm = (s) => Number(String(s).replace("_", "."));
const parseCylFromField = (field) => {
  if (!field.startsWith("cyl_")) return null;
  return denorm(field.slice(4));
};
/** CYL header siempre con signo "-" */
const fmtCylHeader = (cDisp) => {
  const n = Number(cDisp);
  if (!Number.isFinite(n)) return "";
  return n === 0 ? "0.00" : `-${n.toFixed(2)}`;
};
const raf = () =>
  new Promise((r) =>
    typeof requestAnimationFrame === "function"
      ? requestAnimationFrame(r)
      : setTimeout(r, 0)
  );
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════
//  ESTADO PRINCIPAL
// ═══════════════════════════════════════════════════════════════
const gridApi = shallowRef(null);
const dirty = ref(false);
const saving = ref(false);
const lastSavedAt = ref(null);
const sheetMeta = ref(null);
const sheetTabs = ref([]);
const physicalLimits = ref(null);
const pendingChanges = ref(new Map());
const switchingView = ref(false);
const loadingCols = ref(false);

/** SPH axis completo (del backend) — determina el rowCount total */
const sphAxis = ref([]);
/** CYL axis COMPLETO (del backend) — para fetch y caché de datos */
const allCylValues = ref([]);

/**
 * Cache de filas completas: Map<sph_number, rowObj>
 * Las rows tienen TODOS los CYL values, no solo los activos.
 * Esto evita que agregar columnas re-invoque getRows.
 */
/** rowCaches: Map<sphType, Map<sph, row>> — un cache por vista (neg/pos) */
const rowCaches = new Map();
const getRowCache = () => {
  const k = props.sphType;
  if (!rowCaches.has(k)) rowCaches.set(k, new Map());
  return rowCaches.get(k);
};

// ═══════════════════════════════════════════════════════════════
//  GRID HISTORY & UNSAVED GUARD
// ═══════════════════════════════════════════════════════════════
const gridHistory = useGridHistory({ maxSize: 300 });

const _guardViewId = computed(
  () => `${props.sheetId}:monofocal:${props.sphType}`
);
const unsavedGuard = useUnsavedGuard({
  storageKey: () => _guardViewId.value,
  isDirty: () => dirty.value,
  getPending: () => Object.fromEntries(pendingChanges.value),
  onRestore(saved) {
    for (const [k, v] of Object.entries(saved)) {
      pendingChanges.value.set(k, v);
    }
    if (pendingChanges.value.size > 0) {
      dirty.value = true;
      labToast.warning(
        `Se restauraron ${pendingChanges.value.size} cambios sin guardar.`
      );
    }
  },
});

// ═══════════════════════════════════════════════════════════════
//  COMPOSABLES: tema + stock rules + incremental columns
// ═══════════════════════════════════════════════════════════════
const { themeCustom } = useAgGridBase();

const { stockRowClassRules, stockCellClassRules } = useStockRules(sheetMeta);

const colManager = useAgGridIncrementalColumns({
  allValues: allCylValues,
  gridApiRef: gridApi,
  colChunkSize: COL_CHUNK_SIZE,
  scrollThreshold: 150,
  devMode: DEV_MODE,
});

/** Columnas CYL actualmente visibles (controladas por colManager) */
const activeCylValues = colManager.activeValues;

// ═══════════════════════════════════════════════════════════════
//  COMPUTED: meta derivado de sheetMeta
// ═══════════════════════════════════════════════════════════════
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

const totalRows = computed(() => sphAxis.value.length);
const sheetName = computed(
  () =>
    sheetMeta.value?.nombre ||
    sheetMeta.value?.name ||
    "Hoja monofocal (Esf/Cil)"
);
const tipoMatriz = computed(
  () => sheetMeta.value?.tipo_matriz || "SPH_CYL"
);
const material = computed(() => sheetMeta.value?.material || "");
const tratamientos = computed(() => sheetMeta.value?.tratamientos || []);

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

// ═══════════════════════════════════════════════════════════════
//  COLUMN DEFS  (reactivo a activeCylValues)
// ═══════════════════════════════════════════════════════════════
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
          if (p.data?.__loading) return "";
          const v = Number(p.value);
          return Number.isFinite(v) ? fmtSigned(v) : (p.value ?? "");
        },
        // Skeleton en celda SPH cuando la fila aún carga
        cellRenderer: (p) => {
          if (p.data?.__loading) {
            return '<span class="skeleton-cell"></span>';
          }
          return p.valueFormatted ?? String(p.value ?? "");
        },
      },
    ],
  },
  {
    headerName: "CYL (-)",
    children: activeCylValues.value.map((cDisp) => ({
      field: `cyl_${norm(cDisp)}`,
      headerName: fmtCylHeader(cDisp),
      editable: (p) => !p.data?.__loading, // ← no editar mientras carga
      filter: "agNumberColumnFilter",
      minWidth: 80,
      maxWidth: 110,
      resizable: true,
      cellClass: ["ag-cell--compact", "ag-cell--numeric"],
      headerClass: ["ag-header-cell--compact"],

      cellClassRules: {
        ...stockCellClassRules.value,
        "ag-cell--loading": (p) => !!p.data?.__loading,
      },

      // Skeleton mientras __loading, valor real cuando ya cargó
      cellRenderer: (p) => {
        if (p.data?.__loading) {
          return '<span class="skeleton-cell skeleton-cell--cyl"></span>';
        }
        const v = p.value;
        return v !== undefined && v !== null ? String(v) : "0";
      },

      valueSetter: (p) => {
        if (p.data?.__loading) return false; // guard extra
        const v = String(p.newValue ?? "").trim();
        const newVal = isNumeric(v) ? Number(v) : 0;
        const oldVal = Number(p.oldValue ?? 0);
        p.data[p.colDef.field] = newVal;
        // Actualizar caché de fila
        const _rc = getRowCache();
        if (_rc.has(p.data.sph)) _rc.get(p.data.sph)[p.colDef.field] = newVal;
        markCellChanged(p.data.sph, cDisp, newVal, oldVal);
        return true;
      },
    })),
  },
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
  headerClass: "ag-header-cell--compact",
};

const getRowId = (p) => String(p.data.sph);

// ═══════════════════════════════════════════════════════════════
//  PENDING CHANGES
// ═══════════════════════════════════════════════════════════════
function markCellChanged(sph, cylDisplay, existencias, _oldValue) {
  const s = to2(sph);
  const cDisp = to2(Math.abs(Number(cylDisplay)));
  const cBackend = -cDisp;
  const field = `cyl_${norm(cDisp)}`;
  const key = `${s}|${cDisp}`;

  const prev = pendingChanges.value.get(key);
  const oldVal = _oldValue ?? prev?.existencias ?? 0;
  const newVal = Number(existencias ?? 0);

  pendingChanges.value.set(key, { sph: s, cyl: cBackend, existencias: newVal });
  dirty.value = true;

  if (!gridHistory.isApplying.value) {
    gridHistory.push({
      key,
      field,
      oldValue: oldVal,
      newValue: newVal,
      meta: { sph: s, cyl: cBackend },
    });
  }
}

// ═══════════════════════════════════════════════════════════════
//  FETCH HELPERS
// ═══════════════════════════════════════════════════════════════
function _buildFetchQueryForSphRange(pageSphs) {
  const P = phys.value;
  return {
    sphMin: Math.min(...pageSphs),
    sphMax: Math.max(...pageSphs),
    cylMin: P.cylMin,
    cylMax: 0,
    limit: 5000,
  };
}

/** Normaliza un item del backend al formato interno */
function _normalizeItem(i) {
  const sph = to2(i.sph);
  let cyl = to2(i.cyl);
  if (Number.isFinite(cyl) && cyl > 0) cyl = -Math.abs(cyl);
  return { sph, cyl, existencias: Number(i.existencias ?? 0) };
}

/**
 * Construye filas pivot completas para un bloque de SPH.
 * Usa TODOS los CYL values del eje, no solo los activos.
 */
function _buildPivotPage(pageSphs, items) {
  const cylAll = allCylValues.value;

  return pageSphs.map((sph) => {
    const row = { sph };
    cylAll.forEach((cDisp) => {
      const match = items.find(
        (it) =>
          to2(it.sph) === sph &&
          Number.isFinite(it.cyl) &&
          to2(Math.abs(it.cyl)) === cDisp
      );
      row[`cyl_${norm(cDisp)}`] = match?.existencias ?? 0;
    });
    // Aplicar cambios pendientes (restaurados o en curso)
    pendingChanges.value.forEach((change, key) => {
      const [sphStr, cylStr] = key.split("|");
      if (to2(Number(sphStr)) === sph) {
        const field = `cyl_${norm(Number(cylStr))}`;
        if (field in row) row[field] = change.existencias;
      }
    });
    return row;
  });
}

// ═══════════════════════════════════════════════════════════════
//  DATASOURCE (infinite row model)
//  ─────────────────────────────────────────────────────────────
//  Paso 1 (síncrono):  successCallback(loadingRows, total)
//  Paso 2 (asíncrono): fetch real → node.setData() + refreshCells
//
//  ANTI-COLISIÓN: este datasource NUNCA llama purgeInfiniteCache.
// ═══════════════════════════════════════════════════════════════
const datasource = computed(() => ({
  getRows({ startRow, endRow, successCallback }) {
    const axis = sphAxis.value;
    const pageSphs = axis.slice(startRow, endRow);

    LOG_ROWS(
      `getRows: índices [${startRow}–${endRow}]`,
      `SPH [${pageSphs[0] ?? "?"} … ${pageSphs.at(-1) ?? "?"}]`,
      `(${pageSphs.length} filas)`
    );

    if (!pageSphs.length) {
      LOG_ROWS("getRows: página vacía, respondiendo con [].");
      successCallback([], axis.length);
      return;
    }

    // ── Cache-first: sin skeleton si todos los SPH ya están en caché ──
    const cache = getRowCache();
    if (pageSphs.every(s => cache.has(s))) {
      LOG_ROWS(`getRows [${startRow}–${endRow}]: cache hit total.`);
      successCallback(pageSphs.map(s => cache.get(s)), axis.length);
      return;
    }

    // ── FASE 1: placeholders inmediatos ──────────────────────────
    const loadingRows = pageSphs.map((sph) => ({
      sph,
      __loading: true,
      ...Object.fromEntries(
        allCylValues.value.map((c) => [`cyl_${norm(c)}`, null])
      ),
    }));
    successCallback(loadingRows, axis.length);
    LOG_ROWS(
      `getRows FASE 1: ${pageSphs.length} filas placeholder enviadas.`
    );

    // ── FASE 2: fetch real (asíncrono) ───────────────────────────
    (async () => {
      try {
        // Delay artificial para entorno de pruebas
        if (DEV_DELAY_MS > 0) {
          LOG_ROWS(
            `getRows FASE 2: delay artificial ${DEV_DELAY_MS}ms...`
          );
          await sleep(DEV_DELAY_MS);
        }

        LOG_ROWS(
          `getRows FASE 2: fetching items para SPH ${pageSphs[0]}…${pageSphs.at(-1)}`
        );
        const query = _buildFetchQueryForSphRange(pageSphs);
        LOG_ROWS("getRows FASE 2: query →", query);

        const { data } = await fetchItems(props.sheetId, query);
        const items = (data?.data || []).map(_normalizeItem);
        LOG_ROWS(`getRows FASE 2: ${items.length} items recibidos del backend.`);

        // Construir filas pivot completas (con TODOS los CYL)
        const realRows = _buildPivotPage(pageSphs, items);

        // Guardar en caché (referencia capturada antes del await → inmune a race condition)
        realRows.forEach((row) => cache.set(row.sph, row));
        LOG_ROWS(
          `getRows FASE 2: ${realRows.length} filas almacenadas en caché.`
        );

        // Actualizar nodos en el grid
        if (gridApi.value) {
          let updatedCount = 0;
          realRows.forEach((row) => {
            const node = gridApi.value.getRowNode(String(row.sph));
            if (node) {
              node.setData(row);
              gridApi.value.refreshCells({
                rowNodes: [node],
                force: true,
              });
              updatedCount++;
            }
          });
          LOG_ROWS(
            `getRows FASE 2: ${updatedCount}/${realRows.length} nodos actualizados en el grid.`
          );
        } else {
          LOG_ROWS("getRows FASE 2: gridApi no disponible aún.");
        }
      } catch (e) {
        console.error("[Monofocal][Rows] getRows FASE 2 error:", e);
        // No llamamos failCallback porque ya hicimos successCallback en fase 1.
        // Las filas quedarán con __loading=true (aceptable en error de red).
      }
    })();
  },
}));

// ═══════════════════════════════════════════════════════════════
//  CARGA DE METADATA
// ═══════════════════════════════════════════════════════════════
async function loadSheetMeta() {
  try {
    const { data } = await getSheet(props.sheetId);
    const payload = data?.data || data;
    sheetMeta.value = payload?.sheet || null;
    sheetTabs.value = payload?.tabs || [];
    physicalLimits.value =
      payload?.physicalLimits ||
      payload?.physical_limits ||
      payload?.limits ||
      null;

    LOG("loadSheetMeta: metadata cargada.", {
      tipo: tipoMatriz.value,
      tabs: sheetTabs.value.length,
    });
  } catch (e) {
    console.error("[Monofocal] Error getSheet:", e?.response?.data || e);
  }
}

function _getTabForView() {
  return (
    (sheetTabs.value || []).find((t) => t?.id === props.sphType) ||
    (sheetTabs.value || []).find((t) =>
      String(t?.id || "").includes("sph")
    ) ||
    null
  );
}

/**
 * Reconstruye sphAxis y allCylValues desde la metadata del backend.
 * Estas son las fuentes de verdad para el datasource y el colManager.
 */
function _rebuildAxes() {
  const P = phys.value;
  const isNeg = props.sphType === "sph-neg";
  const tab = _getTabForView();

  const backendSph = Array.isArray(tab?.axis?.sph) ? tab.axis.sph : [];
  const backendCyl = Array.isArray(tab?.axis?.cyl) ? tab.axis.cyl : [];

  sphAxis.value = [...new Set(backendSph.map(to2))]
    .filter(
      (s) => Number.isFinite(s) && s >= P.sphMin && s <= P.sphMax
    )
    .filter((s) => (isNeg ? s <= 0 : s >= 0))
    .sort((a, b) => (isNeg ? b - a : a - b));

  allCylValues.value = [...new Set(backendCyl.map(to2))]
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= P.cylAbsMax)
    .sort((a, b) => a - b);

  LOG("_rebuildAxes:", {
    sph: `${sphAxis.value.length} valores`,
    cyl: `${allCylValues.value.length} valores`,
    ejemplo_sph: sphAxis.value.slice(0, 3),
    ejemplo_cyl: allCylValues.value.slice(0, 5),
  });
}

// ═══════════════════════════════════════════════════════════════
//  CARGA COMPLETA (meta + ejes + grid + columnas)
// ═══════════════════════════════════════════════════════════════
async function loadAll() {
  LOG("loadAll: iniciando...");
  await loadSheetMeta();
  await switchViewReload();
}

async function switchViewReload({ clearCache = true } = {}) {
  switchingView.value = true;
  await raf();

  try {
    // 1. Reconstruir ejes desde metadata
    _rebuildAxes();

    // 2. Limpiar caché SOLO en reload completo; en cambio de vista (neg↔pos) conservar
    if (clearCache) {
      rowCaches.clear();
      colManager.reset();
    }

    // 3. Resetear el datasource del grid
    if (gridApi.value) {
      gridApi.value.setGridOption("datasource", datasource.value);
      LOG("switchViewReload: datasource reseteado en el grid.");
    }

    // 4. Columnas: inicializar completo o solo re-enganchar listener de scroll
    if (clearCache) {
      loadingCols.value = true;
      await colManager.init();
      loadingCols.value = false;
    } else {
      colManager.reattach();
    }

    LOG("switchViewReload: completo.", {
      sphAxis: sphAxis.value.length,
      colsActivas: activeCylValues.value.length,
    });
  } catch (e) {
    console.error("[Monofocal] switchViewReload error:", e);
  } finally {
    await raf();
    switchingView.value = false;
  }
}

// ═══════════════════════════════════════════════════════════════
//  FORMULA BAR / QUICK EDIT
// ═══════════════════════════════════════════════════════════════
const formulaValue = ref("");
let activeCell = null;

const onCellClicked = (p) => {
  activeCell = p;
  formulaValue.value = p.value;
};

const onCellValueChanged = (p) => {
  if (
    activeCell &&
    activeCell.rowIndex === p.rowIndex &&
    activeCell.colDef.field === p.colDef.field
  ) {
    formulaValue.value = p.newValue;
  }
  if (p.colDef.field.startsWith("cyl_")) {
    const cDisp = parseCylFromField(p.colDef.field);
    if (!Number.isNaN(cDisp)) {
      markCellChanged(p.data.sph, cDisp, p.data[p.colDef.field]);
    }
  }
};

function applyFxToGrid(val, { commit = false } = {}) {
  if (!activeCell || !gridApi.value) return;
  if (activeCell.data?.__loading) return;

  const field = activeCell.colDef?.field;
  if (!field || !field.startsWith("cyl_")) return;

  const cDisp = parseCylFromField(field);
  if (cDisp === null || Number.isNaN(cDisp)) return;

  const raw = String(val ?? "").trim();
  const newVal = isNumeric(raw) ? Number(raw) : 0;

  if (activeCell.data) activeCell.data[field] = newVal;

  if (!commit) {
    gridApi.value.refreshCells?.({
      rowNodes: activeCell.node ? [activeCell.node] : undefined,
      columns: [field],
      force: true,
    });
    return;
  }

  const updatedRow = { ...(activeCell.data || {}), [field]: newVal };
  // No podemos usar applyTransaction con infinite model → usamos setData
  const node = gridApi.value.getRowNode(String(updatedRow.sph));
  if (node) {
    node.setData(updatedRow);
    gridApi.value.flashCells?.({
      rowNodes: [node],
      columns: [field],
    });
  }
  markCellChanged(updatedRow.sph, cDisp, newVal);
}

const onFxInput = (val) => applyFxToGrid(val, { commit: false });
const onFxCommit = (val) => applyFxToGrid(val, { commit: true });

// ═══════════════════════════════════════════════════════════════
//  GRID HISTORY: UNDO / REDO
// ═══════════════════════════════════════════════════════════════
function applyGridHistoryOp(op) {
  if (!op) return;
  const value = op.reversed ? op.oldValue : op.newValue;
  const [sphStr, cylDispStr] = op.key.split("|");
  const sph = to2(Number(sphStr));

  // Actualizar caché
  const cached = getRowCache().get(sph);
  if (cached) {
    cached[op.field] = value;
    const node = gridApi.value?.getRowNode(String(sph));
    if (node) {
      node.setData({ ...cached });
      gridApi.value?.refreshCells({ rowNodes: [node], force: true });
    }
  }

  const cDisp = Number(cylDispStr);
  pendingChanges.value.set(op.key, {
    sph,
    cyl: -cDisp,
    existencias: value,
  });
  dirty.value = pendingChanges.value.size > 0;
}
const handleGridUndo = () => applyGridHistoryOp(gridHistory.undo());
const handleGridRedo = () => applyGridHistoryOp(gridHistory.redo());

// ═══════════════════════════════════════════════════════════════
//  GRID READY
// ═══════════════════════════════════════════════════════════════
const onGridReady = async (p) => {
  gridApi.value = p.api;
  LOG("onGridReady: gridApi listo.");
  // Establecer datasource inicial
  p.api.setGridOption("datasource", datasource.value);
  await nextTick();
  resetSort();
  // Reattach scroll listener por si el grid se montó tarde
  colManager.reattach();
};

// ═══════════════════════════════════════════════════════════════
//  SORT / FILTERS
// ═══════════════════════════════════════════════════════════════
const clearFilters = () => {
  if (!gridApi.value) return;
  const api = gridApi.value;
  if (typeof api.setFilterModel === "function") api.setFilterModel(null);
  else if (typeof api.setGridOption === "function")
    api.setGridOption("filterModel", null);
};

const resetSort = () => {
  const api = gridApi.value;
  if (!api) return;
  const sortDir = props.sphType === "sph-neg" ? "desc" : "asc";
  if (typeof api.applyColumnState === "function") {
    api.applyColumnState({
      defaultState: { sort: null },
      state: [{ colId: "sph", sort: sortDir }],
    });
  }
};

const handleToggleFilters = () => clearFilters();

// ═══════════════════════════════════════════════════════════════
//  NAVTOOLS HANDLERS (con ACK)
// ═══════════════════════════════════════════════════════════════
const handleAddRow = async (nuevoValor, ack) => {
  const P = phys.value;
  const v = to2(nuevoValor);

  if (!Number.isFinite(v))
    return ackErr(ack, "Ingresa un SPH numérico", 400);
  if (!isQuarterStep(v))
    return ackErr(
      ack,
      "SPH debe ser múltiplo de 0.25 (…00, …25, …50, …75)",
      400
    );
  if (v < P.sphMin || v > P.sphMax)
    return ackErr(
      ack,
      `SPH fuera de límites (${P.sphMin} a ${P.sphMax})`,
      400
    );
  if (props.sphType === "sph-neg" && v >= 0)
    return ackErr(ack, "Vista SPH (-): SPH debe ser negativo", 400);
  if (props.sphType === "sph-pos" && v < 0)
    return ackErr(ack, "Vista SPH (+): SPH debe ser 0 o positivo", 400);
  if (sphAxis.value.includes(v))
    return ackErr(ack, `SPH ${fmtSigned(v)} ya existe`, 409);

  try {
    const res = await saveChunk(
      props.sheetId,
      [{ sph: v, cyl: 0, existencias: 0 }],
      effectiveActor.value
    );
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo agregar SPH", ok.status);
    ackOk(ack, ok.message || `SPH agregado: ${fmtSigned(v)}`, ok.status);
    lastSavedAt.value = new Date();
    await loadSheetMeta();
    await switchViewReload();
  } catch (e) {
    ackErr(ack, msgFromErr(e, "Error al guardar el nuevo SPH"), statusFromErr(e));
  }
};

const handleAddColumn = async (nuevoValor, ack) => {
  const P = phys.value;
  const raw = to2(nuevoValor);

  if (!Number.isFinite(raw))
    return ackErr(ack, "Ingresa un CYL numérico", 400);
  if (!isQuarterStep(raw))
    return ackErr(ack, "CYL debe ser múltiplo de 0.25", 400);
  if (raw >= 0)
    return ackErr(ack, "CYL debe ingresarse negativo. Ej: -0.25", 400);

  const vDisp = to2(Math.abs(raw));
  if (vDisp > P.cylAbsMax)
    return ackErr(ack, `CYL fuera de límite (máx ${P.cylAbsMax})`, 400);
  if (allCylValues.value.includes(vDisp))
    return ackErr(ack, `CYL ${vDisp.toFixed(2)} ya existe`, 409);

  try {
    const res = await saveChunk(
      props.sheetId,
      [{ sph: 0, cyl: -vDisp, existencias: 0 }],
      effectiveActor.value
    );
    const ok = normalizeAxiosOk(res);
    if (!ok.ok) return ackErr(ack, ok.message || "No se pudo agregar CYL", ok.status);
    ackOk(ack, ok.message || `CYL agregado: -${vDisp.toFixed(2)}`, ok.status);
    lastSavedAt.value = new Date();
    await loadSheetMeta();
    await switchViewReload();
  } catch (e) {
    ackErr(ack, msgFromErr(e, "Error al guardar el nuevo CYL"), statusFromErr(e));
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
    if (!ok.ok)
      return ackErr(ack, ok.message || "No se pudieron guardar los cambios", ok.status);

    dirty.value = false;
    pendingChanges.value.clear();
    lastSavedAt.value = new Date();
    gridHistory.clear();
    unsavedGuard.clearStorage();
    ackOk(ack, ok.message || "Cambios guardados.", ok.status);
    _suppressNextWsRefresh = true;
    _broadcastCh?.postMessage({ type: "ROWS_CHANGED" });
    await loadSheetMeta();
    await switchViewReload();
  } catch (e) {
    console.error("[Monofocal] Error saveChunk:", e?.response?.data || e);
    ackErr(ack, msgFromErr(e, "Error al guardar cambios"), statusFromErr(e));
  } finally {
    saving.value = false;
  }
}

async function handleDiscard() {
  pendingChanges.value.clear();
  dirty.value = false;
  gridHistory.clear();
  unsavedGuard.clearStorage();
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
    if (!ok.ok)
      return ackErr(ack, ok.message || "No se pudo hacer seed", ok.status);
    await loadSheetMeta();
    await switchViewReload();
    lastSavedAt.value = new Date();
    pendingChanges.value.clear();
    ackOk(ack, ok.message || "Seed generado.", ok.status);
  } catch (e) {
    ackErr(ack, msgFromErr(e, "Error al generar seed"), statusFromErr(e));
  } finally {
    saving.value = false;
  }
}

async function handleExport() {
  if (!gridApi.value) return;
  const nameSlug = sheetName.value.replace(/\s+/g, "_");
  const fecha = new Date().toISOString().slice(0, 10);
  await exportAgGridToXlsx(gridApi.value, {
    filename: `reporte_monofocal_${nameSlug || "sph_cyl"}_${fecha}`,
    sheetName: String(sheetName.value || "Monofocal").slice(0, 31),
    title: `Inventario — ${sheetName.value || "Monofocal"}`,
  });
}

// ═══════════════════════════════════════════════════════════════
//  LIFECYCLE
// ═══════════════════════════════════════════════════════════════
const _WS_STOCK = new Set([
  "LAB_ORDER_SCAN",
  "LAB_ORDER_CANCEL",
  "LAB_ORDER_RESET",
  "INVENTORY_CHUNK_SAVED",
]);
// ─── Cross-tab sync (BroadcastChannel) ────────────────────────────
let _broadcastCh = null;
let _suppressNextWsRefresh = false;
function _initBroadcast() {
  if (typeof BroadcastChannel === "undefined") return;
  _broadcastCh?.close();
  _broadcastCh = new BroadcastChannel(`rsbo:inv:${props.sheetId}`);
  _broadcastCh.onmessage = () => { _refreshCachedRows(); };
}
function _closeBroadcast() { _broadcastCh?.close(); _broadcastCh = null; }

// ─── Surgical row refresh (sin skeleton, sin flicker) ─────────────
async function _refreshCachedRows() {
  const cache = getRowCache();
  if (!cache.size || !gridApi.value) return;
  const pageSphs = [...cache.keys()];
  if (!pageSphs.length) return;
  try {
    const { data } = await fetchItems(props.sheetId, _buildFetchQueryForSphRange(pageSphs));
    const items = (data?.data || []).map(_normalizeItem);
    const realRows = _buildPivotPage(pageSphs, items);
    realRows.forEach(row => {
      cache.set(row.sph, row);
      const node = gridApi.value?.getRowNode(String(row.sph));
      if (node) { node.setData(row); gridApi.value.refreshCells({ rowNodes: [node], force: true }); }
    });
    LOG(`_refreshCachedRows: ${realRows.length} filas actualizadas silenciosamente.`);
  } catch (e) { console.error("[Monofocal] _refreshCachedRows error:", e); }
}

function _onLabWs(e) {
  if (!_WS_STOCK.has(e?.detail?.type)) return;
  const sheetIds = e.detail?.payload?.sheetIds;
  if (sheetIds && sheetIds.length > 0 && !sheetIds.includes(props.sheetId)) return;
  if (_suppressNextWsRefresh) { _suppressNextWsRefresh = false; return; }
  _refreshCachedRows();
}

onMounted(async () => {
  await loadAll();
  window.addEventListener("lab:ws", _onLabWs);
  _initBroadcast();
  unsavedGuard.restore();
});
onActivated(() => {
  window.addEventListener("lab:ws", _onLabWs);
  _initBroadcast();
  colManager.reattach();
  LOG("onActivated: reactivado desde KeepAlive.");
});
onDeactivated(() => {
  window.removeEventListener("lab:ws", _onLabWs);
  _closeBroadcast();
  LOG("onDeactivated: desactivado por KeepAlive.");
});
onBeforeUnmount(() => {
  window.removeEventListener("lab:ws", _onLabWs);
  _closeBroadcast();
  colManager.reset();
});

watch(
  () => props.sheetId,
  async () => {
    _initBroadcast();
    if (dirty.value && pendingChanges.value.size > 0) unsavedGuard.persist();
    pendingChanges.value.clear();
    dirty.value = false;
    gridHistory.clear();
    await loadAll();
    unsavedGuard.restore();
  }
);

watch(
  () => props.sphType,
  async () => {
    if (dirty.value && pendingChanges.value.size > 0) unsavedGuard.persist();
    pendingChanges.value.clear();
    dirty.value = false;
    gridHistory.clear();
    await switchViewReload({ clearCache: false });
    unsavedGuard.restore();
  }
);
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════════════════════════ */
.grid-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.grid-topbar {
  flex: 0 0 auto;
  position: sticky;
  top: 0;
  z-index: 10;
}

.navtools-wrap {
  padding: 0.5rem 0.75rem;
}

.grid-main {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0 0.5rem 0.5rem;
}

/* ═══════════════════════════════════════════════════════════════
   GLASSMORPHISM SHELL (no-line rule)
   ─────────────────────────────────────────────────────────────
   El fondo del AG Grid theme es rgba(…, 0.0) → transparente.
   El glass-shell aplica el backdrop-filter y el fondo
   translúcido, creando el efecto vidrio sobre lo que haya detrás.
   SIN bordes duros: separación por contraste y blur.
   ═══════════════════════════════════════════════════════════════ */
.glass-shell {
  position: relative;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;

  /* Fondo translúcido + blur */
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(var(--fx-blur, 14px)) saturate(1.4);
  -webkit-backdrop-filter: blur(var(--fx-blur, 14px)) saturate(1.4);

  /* Bordes suaves: NO líneas duras, solo separación por sombra */
  border-radius: var(--radius-lg, 14px);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.12),
    var(--shadow-md, 0 10px 30px rgba(15, 23, 42, 0.08));

  /* Transición suave al cambiar de vista */
  transition:
    opacity 180ms ease,
    transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1),
    filter 180ms ease;
  will-change: opacity, transform, filter;
}

.glass-shell--switching {
  opacity: 0;
  transform: translate3d(0, 10px, 0) scale(0.993);
  filter: blur(1.5px);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .glass-shell {
    transition: none !important;
  }
}

/* Dark mode glass shell */
[data-theme="dark"] .glass-shell {
  background: rgba(15, 18, 40, 0.55);
  box-shadow:
    0 0 0 1px rgba(167, 139, 250, 0.10),
    0 12px 40px rgba(0, 0, 0, 0.35);
}

/* ── Badge dev ──────────────────────────────────────────────── */
.dev-col-badge {
  position: absolute;
  top: 6px;
  right: 10px;
  z-index: 20;
  background: rgba(167, 139, 250, 0.18);
  border: 1px solid rgba(167, 139, 250, 0.35);
  color: #7c3aed;
  font-size: 10px;
  font-family: monospace;
  padding: 2px 7px;
  border-radius: 999px;
  pointer-events: none;
  user-select: none;
}
.dev-col-badge__spin {
  display: inline-block;
  animation: spin 0.8s linear infinite;
  margin-left: 3px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ═══════════════════════════════════════════════════════════════
   AG GRID — glass overrides (no-line rule)
   ─────────────────────────────────────────────────────────────
   AG Grid theme params ya establecen columnBorder/rowBorder=false.
   Aquí forzamos override de cualquier borde residual y añadimos
   el efecto glassmorphism a header y hover.
   ═══════════════════════════════════════════════════════════════ */
.ag-grid-glass {
  width: 100%;
  height: 100%;
  /* Fondo del grid completamente transparente → backdrop del shell actúa */
  --ag-background-color: transparent;
  --ag-odd-row-background-color: transparent;
}

/* Suprimir líneas de AG Grid que puedan quedar */
.ag-grid-glass :deep(.ag-cell) {
  border-right: none !important;
}
.ag-grid-glass :deep(.ag-row) {
  border-bottom: none !important;
  /* Separación sutil entre filas: sombra inferior en lugar de línea */
  box-shadow: 0 1px 0 rgba(148, 163, 184, 0.06);
}

/* Header glassmorphism */
.ag-grid-glass :deep(.ag-header) {
  background: rgba(245, 243, 255, 0.72);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(121, 87, 213, 0.10);
}
[data-theme="dark"] .ag-grid-glass :deep(.ag-header) {
  background: rgba(20, 16, 45, 0.65);
  border-bottom: 1px solid rgba(167, 139, 250, 0.12);
}

/* Columna SPH pinned — glass sutil */
.ag-grid-glass :deep(.ag-cell.ag-cell--pinned) {
  background: rgba(245, 243, 255, 0.55) !important;
  font-weight: 600;
}
[data-theme="dark"] .ag-grid-glass :deep(.ag-cell.ag-cell--pinned) {
  background: rgba(30, 20, 60, 0.55) !important;
}

/* Hover de fila — glass highlight */
.ag-grid-glass :deep(.ag-row-hover) {
  background: rgba(121, 87, 213, 0.07) !important;
}
[data-theme="dark"] .ag-grid-glass :deep(.ag-row-hover) {
  background: rgba(167, 139, 250, 0.08) !important;
}

/* Celda compacta + numérica */
.ag-grid-glass :deep(.ag-cell.ag-cell--compact) {
  padding-inline: 6px;
  line-height: 1.2;
  font-size: 0.75rem;
}
.ag-grid-glass :deep(.ag-cell.ag-cell--numeric) {
  justify-content: flex-end;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.ag-grid-glass :deep(.ag-header-cell.ag-header-cell--compact) {
  padding-inline: 6px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ═══════════════════════════════════════════════════════════════
   SKELETON LOADING  (shimmer glassmorphism)
   ═══════════════════════════════════════════════════════════════ */
.ag-grid-glass :deep(.skeleton-cell) {
  display: block;
  width: 70%;
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    rgba(148, 163, 184, 0.12) 25%,
    rgba(148, 163, 184, 0.24) 50%,
    rgba(148, 163, 184, 0.12) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.6s ease infinite;
}
.ag-grid-glass :deep(.skeleton-cell--cyl) {
  width: 55%;
  margin: 0 auto;
  /* Tono violeta sutil para CYL */
  background: linear-gradient(
    90deg,
    rgba(121, 87, 213, 0.07) 25%,
    rgba(121, 87, 213, 0.18) 50%,
    rgba(121, 87, 213, 0.07) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.6s ease infinite;
}
@keyframes shimmer {
  0% {
    background-position: 200% center;
  }
  100% {
    background-position: -200% center;
  }
}

/* Fila en loading — fondo muy sutil */
.ag-grid-glass :deep(.ag-row.ag-row--loading-row) {
  background: rgba(121, 87, 213, 0.02) !important;
}

/* ═══════════════════════════════════════════════════════════════
   STOCK ALERTS  (translúcidos, estética glassmorphism)
   No-line rule: sin bordes de color duros, solo inset shadow + bg
   ═══════════════════════════════════════════════════════════════ */

/* Fila — stock bajo */
.ag-grid-glass :deep(.ag-row.ag-row--stock-low) {
  background: rgba(167, 139, 250, 0.06) !important;
  box-shadow:
    inset 3px 0 0 rgba(139, 92, 246, 0.55),
    0 1px 0 rgba(148, 163, 184, 0.06);
}
/* Fila — sin stock */
.ag-grid-glass :deep(.ag-row.ag-row--stock-zero) {
  background: rgba(99, 102, 241, 0.05) !important;
  box-shadow:
    inset 3px 0 0 rgba(79, 70, 229, 0.60),
    0 1px 0 rgba(148, 163, 184, 0.06);
}

/* Celda stock bajo */
.ag-grid-glass :deep(.ag-cell.ag-cell--stock-low) {
  font-weight: 700;
  background: rgba(139, 92, 246, 0.10);
  border-radius: 5px;
  color: #6d28d9;
}
[data-theme="dark"] .ag-grid-glass :deep(.ag-cell.ag-cell--stock-low) {
  color: #c4b5fd;
  background: rgba(139, 92, 246, 0.18);
}

/* Celda sin stock */
.ag-grid-glass :deep(.ag-cell.ag-cell--stock-zero) {
  font-weight: 800;
  background: rgba(99, 102, 241, 0.12);
  border-radius: 5px;
  color: #4338ca;
}
[data-theme="dark"] .ag-grid-glass :deep(.ag-cell.ag-cell--stock-zero) {
  color: #a5b4fc;
  background: rgba(99, 102, 241, 0.20);
}
</style>
