<!-- src/views/inventario/BasesMicas.vue -->
<script setup>
import { computed, ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import TabsManager from "@/components/TabsManager.vue";
import SectionLoadingOverlay from "@/components/SectionLoadingOverlay.vue";
import PageSectionHeader from "@/components/ui/PageSectionHeader.vue";
import { labToast } from "@/composables/shared/useLabToast.js";

import { listSheets, getSheet } from "@/services/inventory";
import { fetchCatalog } from "@/services/catalog";
import { useSheetPagination } from "@/composables/api/useSheetPagination.js";
import { useWorkspaceTabs } from "@/composables/tabsmanager/useWorkspaceTabs";
import { useSectionBoot } from "@/composables/tabsmanager/useSectionBoot";
import { useSheetDeepLink } from "@/composables/inventory/useSheetDeepLink.js";
import { useSheetEviction } from "@/composables/inventory/useSheetEviction.js";
import { INVENTORY_LABELS, INVENTORY_CONFIG } from "@/data/inventory.data";

const props = defineProps({
  user: { type: Object, required: false, default: null }
});

const route = useRoute();

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

// Workspace (sesión persistida: tabs abiertas, fijadas, pestaña activa)
const ws = useWorkspaceTabs("inventory");

// Boot de sección (Etapa 1): loading global + restaurar sesión sin salto
const { booting, activeSheet, boot } = useSectionBoot({
  pager,
  ws,
  loadCatalog: cargarCatalog,
  newTabId: INVENTORY_CONFIG.TABS.NEW,
});

const dynamicSheets = computed(() => [
  { id: INVENTORY_CONFIG.TABS.NEW, name: "+ Agregar" },
  ...pager.sheets
]);

/* ─────────────────────────────────────────────────────────────────────────
   Deep-link (buscador + notificaciones): abre la planilla como pestaña real,
   fija el lado y deja la petición de foco. El watch en caliente lo cablea el
   composable; el arranque en frío lo dispara onMounted tras el boot.
───────────────────────────────────────────────────────────────────────── */
const deepLink = useSheetDeepLink({ pager, ws, activeInternalTab, getSheetMeta: getSheet });

// Evicción en vivo: si otro usuario borra una planilla, se limpia de esta sesión
// (WS SHEET_DELETED) o, como respaldo, ante un 410 al guardar.
useSheetEviction({ pager, ws, activeSheet, isCL: false });

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
  await boot(focusId);            // catálogo + restaurar sesión + lista; sin salto
  if (focusId) await deepLink.consumeRouteFocus(focusId); // abre + enfoca + limpia query
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

    <PageSectionHeader
      :pill="INVENTORY_LABELS.SUBTITLE"
      icon="glasses"
      :title="INVENTORY_LABELS.TITLE"
      :description="INVENTORY_LABELS.DESCRIPTION"
      :quick-items="INVENTORY_LABELS.QUICK_CARDS"
    />

    <div class="section-boot-wrap" :class="{ 'is-booting': booting }">
      <Transition name="boot">
        <SectionLoadingOverlay v-if="booting" label="Cargando planillas…" />
      </Transition>

      <div v-if="!booting" class="columns is-multiline">
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

.planilla-wrapper {
  width: 100%;
  height: 600px;
  position: relative;
}

/* Boot de sección: contenedor relativo para el overlay; reserva alto mientras
   el TabsManager aún no se monta, para que el loader tenga dónde mostrarse. */
.section-boot-wrap {
  position: relative;
}

.section-boot-wrap.is-booting {
  min-height: 640px;
}

/* Reveal suave del contenido al terminar el boot */
.boot-leave-active {
  transition: opacity 220ms ease, filter 220ms ease;
}

.boot-leave-to {
  opacity: 0;
  filter: blur(2px);
}

@media (prefers-reduced-motion: reduce) {
  .boot-leave-active {
    transition: none !important;
  }
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
