<!-- src/views/inventario/BasesMicas.vue -->
<script setup>
import { reactive, ref, onMounted, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import TabsManager from "@/components/TabsManager.vue";
import { labToast } from "@/composables/useLabToast.js";

import AgGridBifocal   from "@/components/ag-grid/templates/AgGridBifocal.vue";
import AgGridBase      from "@/components/ag-grid/templates/AgGridBase.vue";
import AgGridMonofocal from "@/components/ag-grid/templates/AgGridMonofocal.vue";
import AgGridProgresivo from "@/components/ag-grid/templates/AgGridProgresivo.vue";

import { listSheets } from "@/services/inventory";

const DEBUG_INV_VIEW = true;

const props = defineProps({
  user: { type: Object, required: false, default: null }
});

const route  = useRoute();
const router = useRouter();

const dynamicSheets      = reactive([{ id: "nueva", name: "+ Agregar" }]);
const activeSheet        = ref("nueva");
const activeInternalTab  = ref(null);
const loadingSheets      = ref(true);

/* ─────────────────────────────────────────────────────────────────────────
   Foco desde búsqueda global
   Si la ruta llega con ?sheetId=<id> se activa esa planilla.
   Limpiamos el query param de la URL después para que sea idempotente.
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

/**
 * Intenta activar la planilla indicada.
 * Si todavía no está cargada (loadingSheets) reintenta con un pequeño
 * ciclo de espera para no perder la señal del query param.
 */
async function focusSheetFromQuery(sheetId) {
  if (!sheetId) return;

  // Espera hasta que las planillas terminen de cargarse (máx 4 s)
  let attempts = 0;
  while (loadingSheets.value && attempts < 40) {
    await new Promise(r => setTimeout(r, 100));
    attempts++;
  }

  await nextTick();
  const applied = applySheetFocus(sheetId);

  if (!applied) {
    // La planilla no está en la lista local todavía (rara vez ocurre si el
    // seed aún corre) → fuerza recarga y vuelve a intentar una vez.
    await cargarSheets();
    await nextTick();
    applySheetFocus(sheetId);
  }

  // Limpia el query param de la URL sin recargar
  const newQuery = { ...route.query };
  delete newQuery.sheetId;
  router.replace({ query: Object.keys(newQuery).length ? newQuery : undefined });
}

// Reacciona al query param en la carga inicial y en navegaciones posteriores
watch(
  () => route.query.sheetId,
  (id) => { if (id) focusSheetFromQuery(id); },
  { immediate: true }
);

/* ─────────────────────────────────────────────────────────────────────────
   Configuración catálogo
───────────────────────────────────────────────────────────────────────── */
const configuracion = {
  bases: {
    monofocal: {
      label: "Monofocal (Base)",
      materiales: ["Policarbonato", "CR-39", "1.56", "1.61 MR-8", "1.67", "1.74", "Cristal"],
      tratamientos: ["BCO", "AR", "ANTIBLE", "FOTO", "FOTO_ANTIBLE", "TRANSITIONS", "POLAR", "POLAR_ESPEJO", "CRISTAL_FOTO"],
      tipo_matriz: "BASE"
    },
    progresivo: {
      label: "Progresivo (Base + ADD)",
      materiales: ["Policarbonato", "CR-39", "1.56", "1.61 MR-8", "1.67", "1.74"],
      tratamientos: ["BCO", "AR", "ANTIBLE", "FOTO", "FOTO_ANTIBLE", "TRANSITIONS"],
      tipo_matriz: "BASE_ADD"
    },
    monofocalEsfCil: {
      label: "Monofocal Esférico-Cilíndrico (SPH/CYL)",
      materiales: ["Policarbonato", "CR-39", "1.56", "1.61 MR-8", "1.67", "1.74"],
      tratamientos: ["BCO", "AR", "ANTIBLE", "FOTO", "FOTO_ANTIBLE", "TRANSITIONS", "POLAR", "POLAR_ESPEJO"],
      tipo_matriz: "SPH_CYL"
    },
    bifocal: {
      label: "Bifocal (SPH + ADD)",
      materiales: ["Policarbonato", "CR-39", "1.56", "1.61 MR-8", "1.67", "1.74"],
      tratamientos: ["BCO", "AR", "ANTIBLE", "FOTO", "FOTO_ANTIBLE", "TRANSITIONS"],
      tipo_matriz: "SPH_ADD"
    },
    bifocalFT: {
      label: "Bifocal F.T (SPH + ADD)",
      materiales: ["Policarbonato", "CR-39"],
      tratamientos: ["BCO", "AR", "ANTIBLE", "FOTO", "FOTO_ANTIBLE", "TRANSITIONS"],
      tipo_matriz: "SPH_ADD"
    },
    bifocalYounger: {
      label: "Bifocal Younger (SPH + ADD)",
      materiales: ["Policarbonato", "CR-39"],
      tratamientos: ["BCO", "AR", "ANTIBLE", "FOTO", "FOTO_ANTIBLE", "TRANSITIONS"],
      tipo_matriz: "SPH_ADD"
    }
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   Carga de planillas
───────────────────────────────────────────────────────────────────────── */
async function cargarSheets() {
  loadingSheets.value = true;
  try {
    const { data } = await listSheets();

    if (DEBUG_INV_VIEW) {
      const first = (data?.data || [])[0];
      console.groupCollapsed("[INV][VIEW] listSheets first raw");
      console.log(first);
      console.log("keys:", first ? Object.keys(first) : []);
      console.log("purchase raw:", {
        numFactura:    first?.numFactura,
        loteProducto:  first?.loteProducto,
        fechaCompra:   first?.fechaCompra,
        fechaCaducidad: first?.fechaCaducidad
      });
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

      tipo_matriz:   s.tipo_matriz,
      baseKey:       s.baseKey,
      material:      s.material,

      tratamiento:   s.tratamiento  ?? null,
      variante:      s.variante     ?? null,

      fechaCreacion: s.fechaCreacion  ?? s.createdAt ?? null,
      fechaCaducidad: s.fechaCaducidad ?? null,
      fechaCompra:   s.fechaCompra    ?? null,
      numFactura:    s.numFactura     ?? "",
      loteProducto:  s.loteProducto   ?? "",
      precioVenta:   s.precioVenta    ?? null,
      precioCompra:  s.precioCompra   ?? null,

      tratamientos: s.tratamientos || [],
      tabs:         s.tabs         || [],
      meta:         s.meta         || { observaciones: "", notas: "" }
    }));

    const addIndex  = dynamicSheets.findIndex((s) => s.id === "nueva");
    const existentes = new Set(dynamicSheets.map((s) => s.id));
    const aInsertar  = arr.filter((s) => !existentes.has(s.id));
    if (aInsertar.length) dynamicSheets.splice(addIndex, 0, ...aInsertar);

    // Solo ponemos el default a la primera si NO hay ningún sheetId pendiente
    if (aInsertar.length && activeSheet.value === "nueva" && !route.query.sheetId) {
      activeSheet.value = aInsertar[0].id;
    }
  } catch (e) {
    console.error("Error listSheets:", e?.response?.data || e);
    labToast.danger("No se pudieron cargar las planillas. Verifica la conexión.");
  } finally {
    loadingSheets.value = false;
  }
}

onMounted(async () => {
  await cargarSheets();

  // Si llegó con ?sheetId= y la carga terminó, intenta focusear ahora
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

    tipo_matriz:   s.tipo_matriz,
    baseKey:       s.baseKey,
    material:      s.material,

    tratamiento:   s.tratamiento  ?? null,
    variante:      s.variante     ?? null,

    fechaCreacion: s.fechaCreacion  ?? s.createdAt ?? null,
    fechaCaducidad: s.fechaCaducidad ?? null,
    fechaCompra:   s.fechaCompra    ?? null,
    numFactura:    s.numFactura     ?? "",
    loteProducto:  s.loteProducto   ?? "",
    precioVenta:   s.precioVenta    ?? null,
    precioCompra:  s.precioCompra   ?? null,

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
   Resolvers de grilla
───────────────────────────────────────────────────────────────────────── */
const resolverGrid = (tipo) => {
  switch (tipo) {
    case "SPH_CYL":  return AgGridMonofocal;
    case "SPH_ADD":  return AgGridBifocal;
    case "BASE":     return AgGridBase;
    case "BASE_ADD": return AgGridProgresivo;
    default:         return AgGridMonofocal;
  }
};

const resolverGridProps = (sheet, activeInternal) => {
  if (!sheet) return {};
  const base = { sheetId: sheet.id };

  if (sheet.tipo_matriz === "SPH_ADD" || sheet.tipo_matriz === "SPH_CYL") {
    return { ...base, sphType: activeInternal || "sph-neg" };
  }
  if (sheet.tipo_matriz === "BASE" || sheet.tipo_matriz === "BASE_ADD") {
    return { ...base, sphType: activeInternal || "base-neg" };
  }
  return base;
};
</script>

<template>
  <section class="section section-matriz-dioptrias" v-motion-fade-visible-once>

    <header class="page-section-header">
      <div>
        <span class="inventario-pill">
          <b-icon icon="glasses" size="is-small" class="mr-1" />
          Inventario
        </span>
        <h2>Bases y Micas</h2>
        <p class="psh-desc">Gestiona el stock de planillas oftálmicas: monofocal, bifocal, progresivo y base.</p>

        <div class="psh-quick mt-3">
          <div class="psh-quick__card">
            <div class="psh-quick__icon"><i class="fas fa-plus-square"></i></div>
            <div>
              <p class="psh-quick__title">Agregar planilla</p>
              <p class="psh-quick__text">Selecciona el tipo, material y tratamiento</p>
            </div>
          </div>
          <div class="psh-quick__card">
            <div class="psh-quick__icon"><i class="fas fa-save"></i></div>
            <div>
              <p class="psh-quick__title">Guardar cambios</p>
              <p class="psh-quick__text">Edita el stock y pulsa "Guardar cambios"</p>
            </div>
          </div>
          <div class="psh-quick__card">
            <div class="psh-quick__icon"><i class="fas fa-file-export"></i></div>
            <div>
              <p class="psh-quick__title">Exportar CSV</p>
              <p class="psh-quick__text">Descarga el inventario como archivo .csv</p>
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
          :configuracion="configuracion"
          :actor="user"
          :loading-tabs="loadingSheets"
          @update:active="activeSheet = $event"
          @update:internal="activeInternalTab = $event"
          @crear="crearNuevaPlanilla"
          @reorder="reordenarSheets"
        >
          <template #default="{ activeSheet: sheet, activeInternal }">
            <Transition name="sheet" mode="out-in" appear>
              <div
                v-if="sheet && sheet.id !== 'nueva'"
                :key="`${sheet.id}:${sheet.tipo_matriz}`"
                class="contenido-planilla"
              >
                <div class="planilla-wrapper">
                  <component
                    :is="resolverGrid(sheet.tipo_matriz)"
                    v-bind="resolverGridProps(sheet, activeInternal)"
                    :actor="user"
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
</style>
