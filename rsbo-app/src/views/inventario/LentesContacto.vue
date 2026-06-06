<!-- src/views/inventario/LentesContacto.vue -->
<script setup>
import { computed, ref, onMounted, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import TabsManager from "@/components/TabsManager.vue";
import SectionLoadingOverlay from "@/components/SectionLoadingOverlay.vue";
import { labToast } from "@/composables/shared/useLabToast.js";


import { listContactLensSheets } from "@/services/contactlenses";
import { useSheetPagination } from "@/composables/api/useSheetPagination.js";
import { useWorkspaceTabs } from "@/composables/tabsmanager/useWorkspaceTabs";
import { useSectionBoot } from "@/composables/tabsmanager/useSectionBoot";
import { useSheetFocus, sideFromCoords } from "@/composables/inventory/useSheetFocus.js";

const props = defineProps({
  user: { type: Object, required: false, default: null }
});

const route  = useRoute();
const router = useRouter();
const sheetFocus = useSheetFocus();

const activeInternalTab = ref(null);


/* ─────────────────────────────────────────────────────────────────────────
   Normalización de planilla (raw → normalizado)
───────────────────────────────────────────────────────────────────────── */
function mapSheet(s) {
  if (!s) return null;
  return {
    id:   String(s._id ?? s.id),
    sku:  s.sku ?? null,
    name: s.nombre ?? s.name ?? "",

    proveedor: s.proveedor && typeof s.proveedor === "object"
      ? { id: s.proveedor.id ?? null, name: String(s.proveedor.name ?? "") }
      : { id: null, name: "" },

    marca: s.marca && typeof s.marca === "object"
      ? { id: s.marca.id ?? null, name: String(s.marca.name ?? "") }
      : { id: null, name: "" },

    tipo_matriz:    s.tipo_matriz,
    baseKey:        s.baseKey,
    material:       s.material,

    tratamiento:    s.tratamiento   ?? null,
    variante:       s.variante      ?? null,

    fechaCreacion:  s.fechaCreacion  ?? s.createdAt ?? null,
    fechaCaducidad: s.fechaCaducidad ?? null,
    fechaCompra:    s.fechaCompra    ?? null,
    numFactura:     s.numFactura     ?? "",
    loteProducto:   s.loteProducto   ?? "",
    precioVenta:    s.precioVenta    ?? null,
    precioCompra:   s.precioCompra   ?? null,

    tratamientos: s.tratamientos || [],
    tabs:         s.tabs         || [],
    meta:         s.meta         || { observaciones: "", notas: "" }
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   Paginación de planillas
───────────────────────────────────────────────────────────────────────── */
const pager = useSheetPagination(listContactLensSheets, mapSheet);

// Workspace (sesión persistida) + boot de sección (Etapa 1): loading global
// + restaurar sesión sin salto. Catálogo es estático aquí, no hay loadCatalog.
const ws = useWorkspaceTabs("contactlenses");
const { booting, activeSheet, boot } = useSectionBoot({ pager, ws, newTabId: "nueva" });

/** dynamicSheets = planillas paginadas + tab "nueva" al final */
const dynamicSheets = computed(() => [
  ...pager.sheets,
  { id: "nueva", name: "+ Agregar" }
]);

/* ─────────────────────────────────────────────────────────────────────────
   Foco desde búsqueda global
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

  consumeCellFocus(sheetId);
  const newQuery = { ...route.query };
  delete newQuery.sheetId;
  delete newQuery.focusCell;
  router.replace({ query: Object.keys(newQuery).length ? newQuery : undefined });
}

// Deep-link de dioptría: fija el lado interno y pide el foco de celda al grid.
function consumeCellFocus(sheetId) {
  const raw = route.query.focusCell;
  if (!raw || !sheetId) return;
  let coords = null;
  try { coords = JSON.parse(decodeURIComponent(String(raw))); } catch { return; }
  const side = sideFromCoords(coords);
  if (side) activeInternalTab.value = side;
  nextTick(() => sheetFocus.request({ sheetId, coords }));
}

// Solo cambios de query EN CALIENTE (tras el boot); el arranque lo maneja boot()
watch(() => route.query.sheetId, (id) => { if (id) focusSheetFromQuery(id); });

/* ─────────────────────────────────────────────────────────────────────────
   Carga inicial (Etapa 1: loading global + restaurar sesión sin salto)
───────────────────────────────────────────────────────────────────────── */
onMounted(async () => {
  const focusId = route.query.sheetId || null;
  await boot(focusId);
  if (focusId) {
    consumeCellFocus(focusId);
    const newQuery = { ...route.query };
    delete newQuery.sheetId;
    delete newQuery.focusCell;
    router.replace({ query: Object.keys(newQuery).length ? newQuery : undefined });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
   Configuración catálogo — categorías de lentes de contacto
───────────────────────────────────────────────────────────────────────── */
const catalog = computed(() => ({
  bases: [
    {
      key: "esferico",
      label: "Esférico",
      materiales: ["Hidrogel", "Silicona-Hidrogel", "HEMA", "Polímero"],
      tratamientos: ["Transparente", "Diario", "Quincenal", "Mensual", "Anual", "UV", "Humectante"],
      tipo_matriz: "BASE"
    },
    {
      key: "colorido",
      label: "Colorido (SPH/CYL)",
      materiales: ["Hidrogel", "Silicona-Hidrogel", "HEMA"],
      tratamientos: ["Color Opaco", "Color Realce", "Diario", "Mensual", "UV"],
      tipo_matriz: "SPH_CYL"
    },
    {
      key: "torico",
      label: "Tórico (SPH + CYL + Eje)",
      materiales: ["Hidrogel", "Silicona-Hidrogel", "HEMA", "Polímero"],
      tratamientos: ["Transparente", "Diario", "Quincenal", "Mensual", "UV", "Humectante"],
      tipo_matriz: "SPH_CYL_AXIS"
    },
    {
      key: "multifocal",
      label: "Multifocal (Base + ADD)",
      materiales: ["Hidrogel", "Silicona-Hidrogel", "HEMA"],
      tratamientos: ["Transparente", "Diario", "Mensual", "UV", "Humectante"],
      tipo_matriz: "BASE_ADD"
    }
  ],
  treatments: []
}));

/* ─────────────────────────────────────────────────────────────────────────
   Handlers de TabsManager
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
  <section class="section section-cl">

    <header class="page-section-header">
      <div>
        <div class="psh-top-row">
          <div>
            <span class="cl-pill">
              <b-icon icon="eye" size="is-small" class="mr-1" />
              Inventario
            </span>
            <h2>Lentes de Contacto</h2>
            <p class="psh-desc">Gestiona el stock de lentes de contacto: esféricos, tóricos, coloridos y multifocales.</p>
          </div>

          <!-- VIEW TOGGLE (disabled) -->
        </div>

        <div class="psh-quick mt-3">
          <div class="psh-quick__card">
            <div class="psh-quick__icon"><i class="fas fa-plus-square"></i></div>
            <div>
              <p class="psh-quick__title">Nueva planilla</p>
              <p class="psh-quick__text">Selecciona el tipo y material</p>
            </div>
          </div>
          <div class="psh-quick__card">
            <div class="psh-quick__icon"><i class="fas fa-save"></i></div>
            <div>
              <p class="psh-quick__title">Guardar cambios</p>
              <p class="psh-quick__text">Edita el stock y pulsa "Guardar cambios"</p>
            </div>
          </div>
        </div>
      </div>
    </header>

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
          :actor="user"
          :active-internal-id="activeInternalTab"
          :loading-tabs="pager.loadingForward.value && pager.sheets.length === 0"
          :has-more="pager.hasMore.value"
          :has-prior="pager.hasPrior.value"
          :loading-more="pager.loadingForward.value"
          :loading-prior="pager.loadingBackward.value"
          :prior-count="pager.priorCount.value"
          api-type="contactlenses"
          :material-required="false"
          :show-tratamiento="false"
          @update:active="activeSheet = $event"
          @update:internal="activeInternalTab = $event"
          @crear="crearNuevaPlanilla"
          @reorder="reordenarSheets"
          @load-more="pager.loadNext()"
          @load-prior="pager.loadPrior()"
        >
        </TabsManager>
      </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section-cl {
  border-bottom: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;
  background-color: var(--surface-solid);
}

.cl-pill {
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

.contenido-planilla {
  width: 100%;
  height: auto;
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

.vt-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 34px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 150ms, color 150ms;
  font-size: 0.85rem;
}
.vt-btn:hover {
  background: var(--c-primary-alpha);
  color: var(--c-primary);
}
.vt-btn--active {
  background: var(--c-primary);
  color: #fff;
}
.vt-btn--active:hover {
  background: var(--c-primary);
  color: #fff;
}
</style>
