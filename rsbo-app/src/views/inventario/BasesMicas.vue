<!-- src/views/inventario/BasesMicas.vue -->
<script setup>
import { computed, ref, onMounted, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import TabsManager from "@/components/TabsManager.vue";
import { labToast } from "@/composables/shared/useLabToast.js";

import { listSheets } from "@/services/inventory";
import { fetchCatalog } from "@/services/catalog";
import { useSheetPagination } from "@/composables/api/useSheetPagination.js";
import { INVENTORY_LABELS, GRID_RESOLVERS, INVENTORY_CONFIG } from "@/data/inventory.data";

const props = defineProps({
  user: { type: Object, required: false, default: null }
});

const route = useRoute();
const router = useRouter();

const activeSheet = ref(INVENTORY_CONFIG.TABS.NEW);
const activeInternalTab = ref(null);

const catalog = ref({ bases: [], treatments: [] });
const catalogLoading = ref(true);

/* ─────────────────────────────────────────────────────────────────────────
   Normalización de planilla
───────────────────────────────────────────────────────────────────────── */
function mapSheet(s) {
  if (!s) return null;
  return {
    id: String(s._id ?? s.id),
    sku: s.sku ?? null,
    name: s.nombre ?? s.name ?? "",
    proveedor: s.proveedor && typeof s.proveedor === "object"
      ? { id: s.proveedor.id ?? null, name: String(s.proveedor.name ?? "") }
      : { id: null, name: "" },
    marca: s.marca && typeof s.marca === "object"
      ? { id: s.marca.id ?? null, name: String(s.marca.name ?? "") }
      : { id: null, name: "" },
    tipo_matriz: s.tipo_matriz,
    baseKey: s.baseKey,
    material: s.material,
    tratamiento: s.tratamiento ?? null,
    variante: s.variante ?? null,
    fechaCreacion: s.fechaCreacion ?? s.createdAt ?? null,
    fechaCaducidad: s.fechaCaducidad ?? null,
    fechaCompra: s.fechaCompra ?? null,
    numFactura: s.numFactura ?? "",
    loteProducto: s.loteProducto ?? "",
    precioVenta: s.precioVenta ?? null,
    precioCompra: s.precioCompra ?? null,
    tratamientos: s.tratamientos || [],
    tabs: s.tabs || [],
    meta: s.meta || { observaciones: "", notas: "" }
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   Paginación
───────────────────────────────────────────────────────────────────────── */
const pager = useSheetPagination(listSheets, mapSheet);

const dynamicSheets = computed(() => [
  { id: INVENTORY_CONFIG.TABS.NEW, name: "+ Agregar" },
  ...pager.sheets
]);

/* ─────────────────────────────────────────────────────────────────────────
   Foco desde búsqueda
───────────────────────────────────────────────────────────────────────── */
async function focusSheetFromQuery(sheetId) {
  if (!sheetId) return;
  if (pager.sheets.find((s) => s.id === sheetId)) {
    activeSheet.value = sheetId;
  } else {
    await pager.init(sheetId);
    await nextTick();
    if (pager.sheets.find((s) => s.id === sheetId)) {
      activeSheet.value = sheetId;
    }
  }
  const newQuery = { ...route.query };
  delete newQuery.sheetId;
  router.replace({ query: Object.keys(newQuery).length ? newQuery : undefined });
}

watch(() => route.query.sheetId, (id) => { if (id) focusSheetFromQuery(id); }, { immediate: true });

/* ─────────────────────────────────────────────────────────────────────────
   Catálogo
───────────────────────────────────────────────────────────────────────── */
async function cargarCatalog() {
  catalogLoading.value = true;
  try {
    const { data } = await fetchCatalog();
    catalog.value = data?.data ?? { bases: [], treatments: [] };
  } catch (e) {
    labToast.danger("No se pudo cargar el catálogo. Verifica la conexión.");
  } finally {
    catalogLoading.value = false;
  }
}

onMounted(async () => {
  const focusId = route.query.sheetId || null;
  await Promise.all([cargarCatalog(), pager.init(focusId || null)]);
  if (focusId) {
    await nextTick();
    if (pager.sheets.find((s) => s.id === focusId)) {
      activeSheet.value = focusId;
    }
  }
});

/* ─────────────────────────────────────────────────────────────────────────
   Handlers
───────────────────────────────────────────────────────────────────────── */
function crearNuevaPlanilla({ result, tabs }) {
  const s = result;
  if (!s) return;
  pager.prependSheet({ ...s, tabs: tabs || s.tabs || [] });
  activeSheet.value = String(s._id ?? s.id);
  labToast.success(`Planilla creada: ${s.nombre ?? s.name}`);
}

function reordenarSheets({ oldIndex, newIndex }) {
  const last = pager.sheets.length - 1;
  if (oldIndex >= last || newIndex >= last) return;
  const moved = pager.sheets.splice(oldIndex, 1)[0];
  pager.sheets.splice(newIndex, 0, moved);
}
</script>

<template>
  <section class="section section-matriz-dioptrias">

    <header class="page-section-header">
      <div>
        <div class="psh-top-row">
          <div>
            <span class="inventario-pill">
              <b-icon icon="glasses" size="is-small" class="mr-1" />
              {{ INVENTORY_LABELS.SUBTITLE }}
            </span>
            <h2>{{ INVENTORY_LABELS.TITLE }}</h2>
            <p class="psh-desc">{{ INVENTORY_LABELS.DESCRIPTION }}</p>
          </div>
        </div>

        <div class="psh-quick mt-3">
          <div v-for="card in INVENTORY_LABELS.QUICK_CARDS" :key="card.title" class="psh-quick__card">
            <div class="psh-quick__icon"><i :class="card.icon"></i></div>
            <div>
              <p class="psh-quick__title">{{ card.title }}</p>
              <p class="psh-quick__text">{{ card.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="columns is-multiline">
      <div class="column is-12">
        <TabsManager 
          :initial-sheets="dynamicSheets" 
          :active-id="activeSheet" 
          :catalog="catalog"
          :catalog-loading="catalogLoading" 
          :actor="user"
          :active-internal-id="activeInternalTab"
          :loading-tabs="pager.loadingForward.value && pager.sheets.length === 0" 
          :has-more="pager.hasMore.value"
          :has-prior="pager.hasPrior.value" 
          :loading-more="pager.loadingForward.value"
          :loading-prior="pager.loadingBackward.value" 
          :prior-count="pager.priorCount.value"
          @update:active="activeSheet = $event" 
          @update:internal="activeInternalTab = $event"
          @crear="crearNuevaPlanilla" 
          @reorder="reordenarSheets" 
          @load-more="pager.loadNext()"
          @load-prior="pager.loadPrior()">
        </TabsManager>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section-matriz-dioptrias {
  border-bottom: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;
  background-color: var(--surface-solid);
}

.inventario-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--c-primary);
  background: var(--c-primary-alpha);
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  margin-bottom: 0.35rem;
}

.planilla-wrapper {
  width: 100%;
  height: 600px;
  position: relative;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 180ms ease, transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1), filter 220ms ease;
  will-change: transform, opacity, filter;
}

.sheet-enter-from {
  opacity: 0;
  transform: translate3d(0, 10px, 0) scale(0.985);
  filter: blur(2px);
}

.sheet-enter-to {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
  filter: blur(0);
}

.sheet-leave-from {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
  filter: blur(0);
}

.sheet-leave-to {
  opacity: 0;
  transform: translate3d(0, -6px, 0) scale(0.99);
  filter: blur(1px);
}

@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active,
  .sheet-leave-active {
    transition: none !important;
  }
}
</style>
