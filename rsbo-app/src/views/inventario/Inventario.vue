<!-- (Tu vista donde renderizas TabsManager y el grid dinámico) -->
<script setup>
import { reactive, ref, onMounted } from "vue";
import TabsManager from "@/components/TabsManager.vue";

import AgGridBifocal from "@/components/ag-grid/templates/AgGridBifocal.vue";        // SPH_ADD
import AgGridBase from "@/components/ag-grid/templates/AgGridBase.vue";               // BASE
import AgGridMonofocal from "@/components/ag-grid/templates/AgGridMonofocal.vue";     // SPH_CYL
import AgGridProgresivo from "@/components/ag-grid/templates/AgGridProgresivo.vue";   // BASE_ADD

import { listSheets } from "@/services/inventory";

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
      label: "Monofocal",
      materiales: ["Polycarbonato", "CR-39", "1.56", "1.61", "1.74"],
      tratamientos: ["Antirreflejo", "Fotocromático", "Tinte Gris", "Blue Light", "Endurecido"],
      tipo_matriz: "BASE"
    },
    monofocalEsfCil: {
      label: "Monofocal Esférico-Cilíndrico",
      materiales: ["Polycarbonato", "CR-39", "1.56", "1.61", "1.74"],
      tratamientos: ["Antirreflejo", "Fotocromático", "Tinte Gris", "Blue Light", "Endurecido"],
      tipo_matriz: "SPH_CYL"
    },
    bifocal: {
      label: "Bifocal",
      materiales: ["CR-39", "1.56", "1.61", "1.74"],
      tratamientos: ["Antirreflejo", "Fotocromático", "Tinte Gris", "Endurecido"],
      tipo_matriz: "SPH_ADD"
    },
    progresivo: {
      label: "Progresivo",
      materiales: ["1.56", "1.61", "1.74"],
      tratamientos: ["Antirreflejo", "Fotocromático", "Tinte Gris", "Blue Light", "Endurecido"],
      tipo_matriz: "BASE_ADD"
    }
  }
};

async function cargarSheets() {
  loadingSheets.value = true;
  try {
    const { data } = await listSheets();

    const arr = (data?.data || []).map((s) => ({
      id: String(s._id),
      sku: s.sku,
      name: s.nombre,
      tipo_matriz: s.tipo_matriz,
      baseKey: s.baseKey,
      material: s.material,
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

function crearNuevaPlanilla({ payload, result, tabs }) {
  const s = result;
  if (!s) return;

  const newSheet = {
    id: String(s._id),
    name: s.nombre,
    tipo_matriz: s.tipo_matriz,
    baseKey: s.baseKey,
    material: s.material,
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
    case "SPH_CYL":
      return AgGridMonofocal;
    case "SPH_ADD":
      return AgGridBifocal;
    case "BASE":
      return AgGridBase;
    case "BASE_ADD":
      return AgGridProgresivo;
    default:
      return AgGridMonofocal;
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
  <section class="section section-matriz-dioptrias">
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
            <!-- ✅ Transición suave al cambiar de PLANILLA / TIPO (no por vista interna) -->
            <Transition name="sheet" mode="out-in" appear>
              <div
                v-if="sheet && sheet.id !== 'nueva'"
                :key="`${sheet.id}:${sheet.tipo_matriz}`"
                class="contenido-planilla"
              >
                <div class="planilla-wrapper">
                  <!-- ✅ Ya NO se remontea por activeInternal (evita lo brusco) -->
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

/* ✅ Transición (sheet change) */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 180ms ease, transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1),
    filter 220ms ease;
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
