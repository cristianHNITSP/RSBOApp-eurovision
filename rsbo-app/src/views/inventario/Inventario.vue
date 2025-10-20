<template>
  <section class="section section-matriz-dioptrias">
    <div class="columns is-multiline">
      <div class="column is-12">

        <!-- Componente de tabs -->
        <TabsManager :initial-sheets="dynamicSheets" :active-id="activeSheet" :configuracion="configuracion"
          @update:active="activeSheet = $event" @crear="crearNuevaPlanilla"
          @update:internal="activeInternalTab = $event">
          <template #default="{ activeId, activeInternal }">
            <div class="contenido-planilla" v-if="activeId !== 'nueva'">
              <div style="width: 100%; height: 600px;">
                <!-- Pasamos el tipo de SPH como prop -->
                <AGgridBifocal :sph-type="activeInternalTab" />
              </div>
            </div>
          </template>
        </TabsManager>


      </div>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref, computed } from 'vue';
import TabsManager from '@/components/TabsManager.vue';
import AGgridBifocal from '@/components/ag-grid/templates/AgGridBifocal.vue';

// Inicial solo con la opción de "Agregar"
const dynamicSheets = reactive([{ id: 'nueva', name: '+ Agregar' }]);
const activeSheet = ref('nueva');


// 👇 añadimos esto
const activeInternalTab = ref('sph-neg');

// Configuración de lógica óptica
const configuracion = {
  bases: {
    monofocal: {
      label: "Monofocal",
      materiales: ["Polycarbonato", "CR-39", "1.56", "1.61", "1.74"],
      tratamientos: ["Antirreflejo", "Fotocromático", "Tinte Gris", "Blue Light", "Endurecido"]
    },
    monofocalEsfCil: {
      label: "Monofocal Esférico-Cilíndrico",
      materiales: ["Polycarbonato", "CR-39", "1.56", "1.61", "1.74"],
      tratamientos: ["Antirreflejo", "Fotocromático", "Tinte Gris", "Blue Light", "Endurecido"]
    },
    bifocal: {
      label: "Bifocal",
      materiales: ["CR-39", "1.56", "1.61", "1.74"],
      tratamientos: ["Antirreflejo", "Fotocromático", "Tinte Gris", "Endurecido"] // sin Blue Light
    },
    progresivo: {
      label: "Progresivo",
      materiales: ["1.56", "1.61", "1.74"],
      tratamientos: ["Antirreflejo", "Fotocromático", "Tinte Gris", "Blue Light", "Endurecido"]
    }
  }
};

const obtenerSheetActivo = computed(() =>
  dynamicSheets.find(s => s.id === activeSheet.value)
);

// Crear nueva planilla con ID consistente
const crearNuevaPlanilla = (sheetName) => {
  const id = `sheet-${Date.now()}`;
  const newSheet = { id, name: sheetName };
  const agregarIndex = dynamicSheets.findIndex(s => s.id === 'nueva');
  dynamicSheets.splice(agregarIndex, 0, newSheet);
  activeSheet.value = newSheet.id;
};
</script>

<style scoped>
.section-matriz-dioptrias {
  border-bottom: 1px solid #ccc;
  border-radius: 8px;
  padding: 1rem;
  background-color: white;
}

.contenido-planilla {
  animation: fadeIn 0.9s forwards;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}
</style>
