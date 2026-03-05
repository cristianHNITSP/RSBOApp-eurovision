<!-- src/views/Inventario.vue -->
<script setup>
import { reactive, ref, onMounted } from "vue";
import TabsManager from "@/components/TabsManager.vue";

import AgGridBifocal from "@/components/ag-grid/templates/AgGridBifocal.vue";
import AgGridBase from "@/components/ag-grid/templates/AgGridBase.vue";
import AgGridMonofocal from "@/components/ag-grid/templates/AgGridMonofocal.vue";
import AgGridProgresivo from "@/components/ag-grid/templates/AgGridProgresivo.vue";

import { listSheets } from "@/services/inventory";

const DEBUG_INV_VIEW = true;

const props = defineProps({
  user: { type: Object, required: false, default: null }
});

const dynamicSheets = reactive([{ id: "nueva", name: "+ Agregar" }]);
const activeSheet = ref("nueva");
const activeInternalTab = ref(null);
const loadingSheets = ref(true);

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
        numFactura: first?.numFactura,
        loteProducto: first?.loteProducto,
        fechaCompra: first?.fechaCompra,
        fechaCaducidad: first?.fechaCaducidad
      });
      console.groupEnd();
    }

    const arr = (data?.data || []).map((s) => ({
      id: String(s._id),
      sku: s.sku,
      name: s.nombre,

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

      tratamientos: s.tratamientos || [],
      tabs: s.tabs || [],
      meta: s.meta || { observaciones: "", notas: "" }
    }));

    const addIndex = dynamicSheets.findIndex((s) => s.id === "nueva");
    const existentes = new Set(dynamicSheets.map((s) => s.id));
    const aInsertar = arr.filter((s) => !existentes.has(s.id));
    if (aInsertar.length) dynamicSheets.splice(addIndex, 0, ...aInsertar);

    if (aInsertar.length && activeSheet.value === "nueva") {
      activeSheet.value = aInsertar[0].id;
    }
  } catch (e) {
    console.error("Error listSheets:", e?.response?.data || e);
  } finally {
    loadingSheets.value = false;
  }
}

onMounted(cargarSheets);

function crearNuevaPlanilla({ result, tabs }) {
  const s = result;
  if (!s) return;

  const newSheet = {
    id: String(s._id),
    sku: s.sku,
    name: s.nombre,

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

    tratamientos: s.tratamientos || [],
    tabs: tabs || [],
    meta: s.meta || { observaciones: "", notas: "" }
  };

  const addIndex = dynamicSheets.findIndex((x) => x.id === "nueva");
  dynamicSheets.splice(addIndex >= 0 ? addIndex : dynamicSheets.length, 0, newSheet);
  activeSheet.value = newSheet.id;
}

function reordenarSheets({ oldIndex, newIndex }) {
  const last = dynamicSheets.length - 1;
  if (oldIndex >= last || newIndex >= last) return;
  const moved = dynamicSheets.splice(oldIndex, 1)[0];
  dynamicSheets.splice(newIndex, 0, moved);
  if (activeSheet.value === moved.id) activeSheet.value = moved.id;
}

const resolverGrid = (tipo) => {
  switch (tipo) {
    case "SPH_CYL": return AgGridMonofocal;
    case "SPH_ADD": return AgGridBifocal;
    case "BASE": return AgGridBase;
    case "BASE_ADD": return AgGridProgresivo;
    default: return AgGridMonofocal;
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
    <span class="inventario-pill">
      <b-icon icon="life-ring" size="is-small" class="mr-1" />
      Inventario
    </span>

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
              <div v-if="sheet && sheet.id !== 'nueva'" :key="`${sheet.id}:${sheet.tipo_matriz}`" class="contenido-planilla">
                <div class="planilla-wrapper">
                  <component :is="resolverGrid(sheet.tipo_matriz)" v-bind="resolverGridProps(sheet, activeInternal)" :actor="user" />
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
  border-bottom: 1px solid #ccc;
  border-radius: 8px;
  padding: 1.5rem;
  background-color: #ffffff;
}

.inventario-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #4f46e5;
  background: #eef2ff;
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  margin-bottom: 1rem;
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