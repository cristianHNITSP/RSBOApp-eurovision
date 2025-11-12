<template>
  <section class="section section-matriz-dioptrias">
    <div class="columns is-multiline">
      <div class="column is-12">
        <TabsManager
          :initial-sheets="dynamicSheets"
          :active-id="activeSheet"
          :configuracion="configuracion"
          @update:active="activeSheet = $event"
          @crear="crearNuevaPlanilla"
          @update:internal="activeInternalTab = $event"
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
                />
              </div>
            </div>
          </template>
        </TabsManager>
      </div>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref } from "vue";
import TabsManager from "@/components/TabsManager.vue";

import AgGridBifocal from "@/components/ag-grid/templates/AgGridBifocal.vue";
import AgGridMonofocal from "@/components/ag-grid/templates/AgGridBase.vue";        // Monofocal BASE simple
import AgGridMonofocalSPHCYL from "@/components/ag-grid/templates/AgGridMonofocal.vue"; // SPH/CYL
import AgGridProgresivo from "@/components/ag-grid/templates/AgGridProgresivo.vue";

// Inicial: solo "+ Agregar"
const dynamicSheets = reactive([{ id: "nueva", name: "+ Agregar" }]);
const activeSheet = ref("nueva");
const activeInternalTab = ref(null);

// Configuración de lógica óptica
const configuracion = {
  bases: {
    monofocal: {
      label: "Monofocal",
      materiales: ["Polycarbonato", "CR-39", "1.56", "1.61", "1.74"],
      tratamientos: [
        "Antirreflejo",
        "Fotocromático",
        "Tinte Gris",
        "Blue Light",
        "Endurecido"
      ]
    },
    monofocalEsfCil: {
      label: "Monofocal Esférico-Cilíndrico",
      materiales: ["Polycarbonato", "CR-39", "1.56", "1.61", "1.74"],
      tratamientos: [
        "Antirreflejo",
        "Fotocromático",
        "Tinte Gris",
        "Blue Light",
        "Endurecido"
      ]
    },
    bifocal: {
      label: "Bifocal",
      materiales: ["CR-39", "1.56", "1.61", "1.74"],
      tratamientos: ["Antirreflejo", "Fotocromático", "Tinte Gris", "Endurecido"]
    },
    progresivo: {
      label: "Progresivo",
      materiales: ["1.56", "1.61", "1.74"],
      tratamientos: [
        "Antirreflejo",
        "Fotocromático",
        "Tinte Gris",
        "Blue Light",
        "Endurecido"
      ]
    }
  }
};

// Crear nueva planilla (recibe payload desde TabsManager)
const crearNuevaPlanilla = (payload) => {
  const id = `sheet-${Date.now()}`;
  const newSheet = {
    id,
    name: payload.nombre,
    tipo_matriz: payload.tipo_matriz,
    baseKey: payload.baseKey,
    material: payload.material,
    tratamientos: payload.tratamientos
  };

  const agregarIndex = dynamicSheets.findIndex((s) => s.id === "nueva");
  dynamicSheets.splice(agregarIndex, 0, newSheet);
  activeSheet.value = newSheet.id;
};

// Decide qué grid usar según tipo_matriz
const resolverGrid = (tipo) => {
  switch (tipo) {
    case "SPH_CYL":
      return AgGridMonofocalSPHCYL; // Monofocal Esf/Cil
    case "SPH_ADD":
      return AgGridBifocal;         // Bifocal
    case "BASE":
      return AgGridMonofocal;       // Monofocal simple Base + Existencias
    case "BASE_ADD":
      return AgGridProgresivo;      // Progresivo Base + Add
    default:
      return AgGridMonofocalSPHCYL;
  }
};

// Props para cada grid
const resolverGridProps = (sheet, activeInternal) => {
  if (!sheet) return {};

  if (sheet.tipo_matriz === "SPH_ADD" || sheet.tipo_matriz === "SPH_CYL") {
    return { sphType: activeInternal || "sph-neg" };
  }

  return {};
};
</script>

<style scoped>
.section-matriz-dioptrias {
  border-bottom: 1px solid #ccc;
  border-radius: 8px;
  padding: 1rem;
  background-color: #ffffff;
}

/* Contenedor planilla */
.contenido-planilla {
  width: 100%;
  height: 100%;
}

/* Contenedor interno fijo para el grid */
.planilla-wrapper {
  width: 100%;
  height: 600px;
}

/* 🟣 Animación solo CSS al cambiar de planilla */
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
