<script setup>
import { reactive, ref, onMounted } from "vue";
import TabsManager from "@/components/TabsManager.vue";

import AgGridBifocal from "@/components/ag-grid/templates/AgGridBifocal.vue";        // SPH_ADD
import AgGridBase from "@/components/ag-grid/templates/AgGridBase.vue";               // BASE
import AgGridMonofocal from "@/components/ag-grid/templates/AgGridMonofocal.vue";     // SPH_CYL
import AgGridProgresivo from "@/components/ag-grid/templates/AgGridProgresivo.vue";   // BASE_ADD

import { listSheets } from "@/services/inventory";

// ⬇️ recibe user (la cookie de sesión; contiene el actor)
const props = defineProps({
  user: { type: Object, required: false, default: null }
});

const dynamicSheets = reactive([{ id: "nueva", name: "+ Agregar" }]);
const activeSheet = ref("nueva");
const activeInternalTab = ref(null);

// 🔹 estado de carga para skeletons de tabs
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
      name: s.nombre,
      tipo_matriz: s.tipo_matriz,
      baseKey: s.baseKey,
      material: s.material,
      tratamientos: s.tratamientos || [],
      tabs: s.tabs || [],
      // 👇 IMPORTANTÍSIMO: conservar meta del backend
      meta: s.meta || { observaciones: "", notas: "" }
    }));

    // Inserta antes de "nueva" evitando duplicados
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

// 👇 TabsManager ya hace el createSheet → aquí solo sincronizamos
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
    // 👇 también aquí
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
  return base;
};
</script>

<template>
  <section class="section section-matriz-dioptrias">
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
            <div
              v-if="sheet && sheet.id !== 'nueva'"
              :key="sheet.id"
              class="contenido-planilla animated-sheet"
            >
              <div class="planilla-wrapper">
                <component
                  :is="resolverGrid(sheet.tipo_matriz)"
                  v-bind="resolverGridProps(sheet, activeInternal)"
                  :actor="user"         
                />
              </div>
            </div>
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
  padding: 1rem;
  background-color: #ffffff;
}
.contenido-planilla {
  width: 100%;
  height: 100%;
}
.planilla-wrapper {
  width: 100%;
  height: 600px;
}
.animated-sheet {
  animation: sheetFadeSlide 0.26s cubic-bezier(0.22, 0.61, 0.36, 1);
}
@keyframes sheetFadeSlide {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.06);
  }
}
</style>
