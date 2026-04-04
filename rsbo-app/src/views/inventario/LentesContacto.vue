<!-- src/views/inventario/LentesContacto.vue -->
<script setup>
import { reactive, ref, computed, onMounted, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import TabsManager from "@/components/TabsManager.vue";
import { labToast } from "@/composables/useLabToast.js";

import AgGridBifocal    from "@/components/ag-grid/templates/AgGridBifocal.vue";
import AgGridBase       from "@/components/ag-grid/templates/AgGridBase.vue";
import AgGridMonofocal  from "@/components/ag-grid/templates/AgGridMonofocal.vue";
import AgGridTorico     from "@/components/ag-grid/templates/AgGridTorico.vue";
import AgGridProgresivo from "@/components/ag-grid/templates/AgGridProgresivo.vue";
import GlassTable       from "@/components/ag-grid/templates/GlassTable.vue";

import { listContactLensSheets } from "@/services/contactlenses";

const DEBUG_CL_VIEW = true;

const props = defineProps({
  user: { type: Object, required: false, default: null }
});

const route  = useRoute();
const router = useRouter();

const dynamicSheets     = reactive([{ id: "nueva", name: "+ Agregar" }]);
const activeSheet       = ref("nueva");
const activeInternalTab = ref(null);
const loadingSheets     = ref(true);

/** "excel" = AG-Grid | "glass" = Buefy GlassTable */
const viewMode = ref("excel");

/* ─────────────────────────────────────────────────────────────────────────
   Foco desde búsqueda global
───────────────────────────────────────────────────────────────────────── */
function applySheetFocus(sheetId) {
  if (!sheetId) return false;
  const found = dynamicSheets.find(s => s.id === sheetId);
  if (found) {
    activeSheet.value = sheetId;
    return true;
  }
  return false;
}

async function focusSheetFromQuery(sheetId) {
  if (!sheetId) return;

  let attempts = 0;
  while (loadingSheets.value && attempts < 40) {
    await new Promise(r => setTimeout(r, 100));
    attempts++;
  }

  await nextTick();
  const applied = applySheetFocus(sheetId);

  if (!applied) {
    await cargarSheets();
    await nextTick();
    applySheetFocus(sheetId);
  }

  const newQuery = { ...route.query };
  delete newQuery.sheetId;
  router.replace({ query: Object.keys(newQuery).length ? newQuery : undefined });
}

watch(
  () => route.query.sheetId,
  (id) => { if (id) focusSheetFromQuery(id); },
  { immediate: true }
);

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
   Carga de planillas
───────────────────────────────────────────────────────────────────────── */
async function cargarSheets() {
  loadingSheets.value = true;
  try {
    const { data } = await listContactLensSheets();

    if (DEBUG_CL_VIEW) {
      const first = (data?.data || [])[0];
      console.groupCollapsed("[CL][VIEW] listContactLensSheets first raw");
      console.log(first);
      console.log("keys:", first ? Object.keys(first) : []);
      console.groupEnd();
    }

    const arr = (data?.data || []).map((s) => ({
      id:   String(s._id),
      sku:  s.sku,
      name: s.nombre,

      proveedor: s.proveedor && typeof s.proveedor === "object"
        ? { id: s.proveedor.id ?? null, name: String(s.proveedor.name ?? "") }
        : { id: null, name: "" },

      marca: s.marca && typeof s.marca === "object"
        ? { id: s.marca.id ?? null, name: String(s.marca.name ?? "") }
        : { id: null, name: "" },

      tipo_matriz:    s.tipo_matriz,
      baseKey:        s.baseKey,
      material:       s.material,

      tratamiento:    s.tratamiento  ?? null,
      variante:       s.variante     ?? null,

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
    }));

    const addIndex   = dynamicSheets.findIndex((s) => s.id === "nueva");
    const existentes = new Set(dynamicSheets.map((s) => s.id));
    const aInsertar  = arr.filter((s) => !existentes.has(s.id));
    if (aInsertar.length) dynamicSheets.splice(addIndex, 0, ...aInsertar);

    if (aInsertar.length && activeSheet.value === "nueva" && !route.query.sheetId) {
      activeSheet.value = aInsertar[0].id;
    }
  } catch (e) {
    console.error("Error listContactLensSheets:", e?.response?.data || e);
    labToast.danger("No se pudieron cargar las planillas. Verifica la conexión.");
  } finally {
    loadingSheets.value = false;
  }
}

onMounted(async () => {
  await cargarSheets();

  if (route.query.sheetId) {
    await focusSheetFromQuery(route.query.sheetId);
  }
});

/* ─────────────────────────────────────────────────────────────────────────
   Handlers de TabsManager
───────────────────────────────────────────────────────────────────────── */
function crearNuevaPlanilla({ result, tabs }) {
  const s = result;
  if (!s) return;

  const newSheet = {
    id:   String(s._id),
    sku:  s.sku,
    name: s.nombre,

    proveedor: s.proveedor && typeof s.proveedor === "object"
      ? { id: s.proveedor.id ?? null, name: String(s.proveedor.name ?? "") }
      : { id: null, name: "" },

    marca: s.marca && typeof s.marca === "object"
      ? { id: s.marca.id ?? null, name: String(s.marca.name ?? "") }
      : { id: null, name: "" },

    tipo_matriz:    s.tipo_matriz,
    baseKey:        s.baseKey,
    material:       s.material,

    tratamiento:    s.tratamiento  ?? null,
    variante:       s.variante     ?? null,

    fechaCreacion:  s.fechaCreacion  ?? s.createdAt ?? null,
    fechaCaducidad: s.fechaCaducidad ?? null,
    fechaCompra:    s.fechaCompra    ?? null,
    numFactura:     s.numFactura     ?? "",
    loteProducto:   s.loteProducto   ?? "",
    precioVenta:    s.precioVenta    ?? null,
    precioCompra:   s.precioCompra   ?? null,

    tratamientos: s.tratamientos || [],
    tabs:         tabs            || [],
    meta:         s.meta         || { observaciones: "", notas: "" }
  };

  const addIndex = dynamicSheets.findIndex((x) => x.id === "nueva");
  dynamicSheets.splice(addIndex >= 0 ? addIndex : dynamicSheets.length, 0, newSheet);
  activeSheet.value = newSheet.id;
  labToast.success(`Planilla creada: ${newSheet.name}`);
}

function reordenarSheets({ oldIndex, newIndex }) {
  const last = dynamicSheets.length - 1;
  if (oldIndex >= last || newIndex >= last) return;
  const moved = dynamicSheets.splice(oldIndex, 1)[0];
  dynamicSheets.splice(newIndex, 0, moved);
  if (activeSheet.value === moved.id) activeSheet.value = moved.id;
}

/* ─────────────────────────────────────────────────────────────────────────
   Resolvers de grilla — misma lógica que BasesMicas
───────────────────────────────────────────────────────────────────────── */
const resolverGrid = (tipo) => {
  switch (tipo) {
    case "SPH_CYL":      return AgGridMonofocal;
    case "SPH_CYL_AXIS": return AgGridTorico;
    case "SPH_ADD":      return AgGridBifocal;
    case "BASE":         return AgGridBase;
    case "BASE_ADD":     return AgGridProgresivo;
    default:             return AgGridMonofocal;
  }
};

const resolverGridProps = (sheet, activeInternal) => {
  if (!sheet) return {};
  const base = { sheetId: sheet.id, apiType: "contactlenses" };

  if (sheet.tipo_matriz === "SPH_ADD" || sheet.tipo_matriz === "SPH_CYL" || sheet.tipo_matriz === "SPH_CYL_AXIS") {
    return { ...base, sphType: activeInternal || "sph-neg" };
  }
  if (sheet.tipo_matriz === "BASE" || sheet.tipo_matriz === "BASE_ADD") {
    return { ...base, sphType: activeInternal || "base-neg" };
  }
  return base;
};
</script>

<template>
  <section class="section section-cl" v-motion-fade-visible-once>

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

    <div class="columns is-multiline">
      <div class="column is-12">
        <TabsManager
          :initial-sheets="dynamicSheets"
          :active-id="activeSheet"
          :catalog="catalog"
          :actor="user"
          :loading-tabs="loadingSheets"
          api-type="contactlenses"
          :material-required="false"
          :show-tratamiento="false"
          @update:active="activeSheet = $event"
          @update:internal="activeInternalTab = $event"
          @crear="crearNuevaPlanilla"
          @reorder="reordenarSheets"
        >
          <template #default="{ activeSheet: sheet, activeInternal }">
            <Transition name="sheet" mode="out-in" appear>
              <div
                v-if="sheet && sheet.id !== 'nueva'"
                :key="`${sheet.id}:${sheet.tipo_matriz}:${viewMode}`"
                class="contenido-planilla"
              >
                <div class="planilla-wrapper">
                  <!-- AG-Grid (Excel) view -->
                  <component
                    v-if="viewMode === 'excel'"
                    :is="resolverGrid(sheet.tipo_matriz)"
                    v-bind="resolverGridProps(sheet, activeInternal)"
                    :actor="user"
                  />
                  <!-- Glass Table (Buefy) view -->
                  <GlassTable
                    v-else
                    :sheet-id="sheet.id"
                    :sph-type="activeInternal || 'sph-neg'"
                    :actor="user"
                    api-type="contactlenses"
                  />
                </div>
              </div>
            </Transition>
          </template>
        </TabsManager>
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
  height: 100%;
}

.planilla-wrapper {
  width: 100%;
  height: 600px;
  position: relative;
  contain: paint;
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

/* ── Top row with view toggle ── */
.psh-top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.view-toggle {
  display: flex;
  gap: 0;
  border-radius: 0.6rem;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
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
