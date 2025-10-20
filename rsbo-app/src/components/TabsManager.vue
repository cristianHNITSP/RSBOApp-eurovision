<template>
  <div>
    <!-- Tabs principales (Planillas) -->
    <div ref="tabsContainer" class="tabs-wrapper">
      <div v-for="planilla in sheets" :key="planilla.id" :data-id="planilla.id"
        :class="['tab-item', { 'tab-agregar': planilla.id === 'nueva', 'active': planilla.id === activeId }]"
        @click="handleTabClick(planilla.id)">
        <template v-if="planilla.id === 'nueva'">
          <i class="fas fa-plus"></i> <!-- ✅ Ícono bonito -->
        </template>
        <template v-else>
          {{ planilla.name }}
        </template>
      </div>

    </div>

    <!-- Contenido de cada tab -->
    <div :key="activeId" class="box plantillas-contenedor">
      <!-- Form nueva planilla -->
      <div v-if="activeId === 'nueva'">
        <form @submit.prevent="handleCrear">
          <!-- BASES -->
          <b-field label="Selecciona la Base">
            <div class="tabs tabs-opciones is-toggle is-small">
              <ul>
                <li v-for="(val, key) in configuracion.bases" :key="key" :class="{ 'is-active': selectedBase === key }"
                  @click="selectBase(key)">
                  <a>{{ val.label }}</a>
                </li>
              </ul>
            </div>
          </b-field>

          <!-- MATERIALES (animado) -->
          <transition name="fade-slide">
            <b-field label="Selecciona el Material" v-if="selectedBase">
              <div class="tabs tabs-opciones is-toggle is-small">
                <ul>
                  <li v-for="mat in allMaterials" :key="mat" :class="[
                    { 'is-active': selectedMaterial === mat },
                    { 'is-disabled': !isMaterialAllowed(mat) }
                  ]" @click="isMaterialAllowed(mat) && selectMaterial(mat)">
                    <a>{{ mat }}</a>
                  </li>
                </ul>
              </div>
            </b-field>
          </transition>

          <!-- TRATAMIENTOS (animado) -->
          <transition name="fade-slide">
            <b-field label="Selecciona Tratamientos" v-if="selectedMaterial">
              <div class="columns is-multiline is-mobile" style="max-height: 150px; overflow-y: auto;">
                <div class="column is-half-mobile is-one-third-tablet is-one-quarter-desktop"
                  v-for="trat in allTratamientos" :key="trat">
                  <b-checkbox v-model="selectedTratamientos" :native-value="trat" size="is-small" type="is-primary"
                    :disabled="!isTratamientoAllowed(trat)">
                    {{ trat }}
                  </b-checkbox>
                </div>
              </div>
            </b-field>
          </transition>

          <!-- Tags de tratamientos seleccionados -->
          <transition-group name="tag-list" tag="div" class="tags mb-3">
            <span v-for="(tag, index) in selectedTratamientos" :key="tag" class="tag is-info is-light is-rounded">
              {{ tag }}
              <button class="delete is-small" @click.prevent="removeTratamiento(index)"
                aria-label="Eliminar tratamiento" />
            </span>
          </transition-group>

          <!-- Nombre autogenerado -->
          <b-field label="Nombre generado automáticamente">
            <b-input v-model="newSheetName" disabled expanded />
          </b-field>

          <!-- Botón crear -->
          <b-button type="is-primary" native-type="submit" size="is-small"
            :disabled="!selectedBase || !selectedMaterial || selectedTratamientos.length === 0 || creatingSheet"
            :loading="creatingSheet">
            Crear Planilla
          </b-button>
        </form>
      </div>

      <!-- Contenido de tabs existentes -->
      <div v-else>
        <slot :activeId="activeId" :activeInternal="activeInternalTab"></slot>

        <!-- Segunda fila de pestañas visual (dinámica) -->
        <div class="sheet-tabs">
          <div v-for="tab in internalTabs" :key="tab.id" class="sheet-tab"
            :class="{ active: activeInternalTab === tab.id }" @click="handleInternalTabClick(tab.id)">
            {{ tab.label }}
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from "vue";
import Sortable from "sortablejs";

const props = defineProps({
  initialSheets: { type: Array, required: true },
  activeId: { type: String, required: true },
  configuracion: { type: Object, required: true }
});

const emit = defineEmits(["update:active", "reorder", "crear", "update:internal"]);

const sheets = computed(() => props.initialSheets);
const tabsContainer = ref(null);

// ===============================
// 🔸 Pestañas internas
// ===============================
const internalTabs = ref([
  { id: "sph-neg", label: "SPH (-)" },
  { id: "sph-pos", label: "SPH (+)" }
]);

const activeInternalTab = ref(internalTabs.value[0].id);

const handleInternalTabClick = (id) => {
  activeInternalTab.value = id;
  emit("update:internal", id);
};

// ===============================
// 🪄 Estado del formulario
// ===============================
const selectedBase = ref(null);
const selectedMaterial = ref(null);
const selectedTratamientos = ref([]);
const newSheetName = ref("");
const creatingSheet = ref(false);

const allMaterials = ["Polycarbonato", "CR-39", "1.56", "1.61", "1.74"];
const allTratamientos = ["Antirreflejo", "Fotocromático", "Tinte Gris", "Blue Light", "Endurecido"];

watch([selectedBase, selectedMaterial, selectedTratamientos], () => {
  let baseLabel = selectedBase.value ? props.configuracion.bases[selectedBase.value].label : "";
  let materialLabel = selectedMaterial.value || "";
  let tratamientosLabel = selectedTratamientos.value.join(" + ");
  newSheetName.value = [baseLabel, materialLabel, tratamientosLabel].filter(Boolean).join(" | ");
});

const selectBase = (base) => {
  selectedBase.value = base;
  selectedMaterial.value = null;
  selectedTratamientos.value = [];
};

const selectMaterial = (mat) => {
  selectedMaterial.value = mat;
  selectedTratamientos.value = [];
};

const isMaterialAllowed = (mat) => {
  if (!selectedBase.value) return false;
  return props.configuracion.bases[selectedBase.value].materiales.includes(mat);
};

const isTratamientoAllowed = (trat) => {
  if (!selectedBase.value) return false;
  return props.configuracion.bases[selectedBase.value].tratamientos.includes(trat);
};

const removeTratamiento = (index) => selectedTratamientos.value.splice(index, 1);

const handleCrear = async () => {
  if (!newSheetName.value) return;
  creatingSheet.value = true;
  await nextTick();
  await new Promise((r) => setTimeout(r, 500));
  emit("crear", newSheetName.value);

  selectedBase.value = null;
  selectedMaterial.value = null;
  selectedTratamientos.value = [];
  newSheetName.value = "";
  creatingSheet.value = false;
};

// ===============================
// 🧲 Drag & drop pestañas
// ===============================
onMounted(() => {
  if (!tabsContainer.value) return;
  Sortable.create(tabsContainer.value, {
    animation: 150,
    ghostClass: "sortable-ghost",
    filter: ".tab-agregar",
    preventOnFilter: false,
    delay: 200,
    delayOnTouchOnly: true,
    onMove: (evt) => {
      const relatedEl = evt.related;
      if (relatedEl && relatedEl.classList.contains("tab-agregar")) {
        evt.dragged.classList.add("shake", "shake-color");
        setTimeout(() => evt.dragged.classList.remove("shake", "shake-color"), 300);
        return false;
      }
      return true;
    },
    onEnd: (evt) => {
      const maxIndex = sheets.value.length - 1;
      const oldIndex = evt.oldIndex;
      let newIndex = evt.newIndex;

      if (newIndex >= maxIndex) {
        evt.from.insertBefore(evt.item, evt.from.children[oldIndex]);
        return;
      }
      if (oldIndex === newIndex) return;

      emit("reorder", { oldIndex, newIndex });
    }
  });
});

const handleTabClick = (id) => emit("update:active", id);
</script>

<style scoped>
/* Tabs de planillas */
.tabs-wrapper {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  gap: 0.25rem;
  border-bottom: 2px solid #dbdbdb;
}

.tab-item {
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  /* ✅ Ahora muestra la manito */
  background-color: #f5f5f5;
  color: #4a4a4a;
  user-select: none;
  border: 1px solid #dbdbdb;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.tab-item.active {

  background-color: #8e00d2;
  color: white;
}

.tab-agregar {
  cursor: pointer !important;
  background-color: #494949;
  color: white;

}

/* Tabs internas de opciones */
.tabs-opciones ul li.is-disabled {
  pointer-events: none;
  opacity: 0.4;
}

/* Shake animación */
@keyframes shake {

  0%,
  100% {
    transform: translateX(0);
  }

  20%,
  60% {
    transform: translateX(-3px);
  }

  40%,
  80% {
    transform: translateX(3px);
  }
}

.shake {
  animation: shake 0.3s;
}

.tabs-wrapper .tab-item.shake-color {
  background-color: red;
  color: white;
}

/* Tabs internas de hojas */
.sheet-tab {
  padding: 0.25rem 0.75rem;
  font-size: 0.85rem;
  background-color: transparent;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  margin-right: 2px;
  cursor: pointer;
  transition: all 0.2s;
}

.sheet-tabs {
  display: flex;
  height: 34px;
  align-items: center;
  border-bottom: 1px solid #dbdbdb;
  background-color: #f5f5f5;
  padding-left: 0.25rem;
  border-radius: 0 0 4px 4px;
}

.sheet-tab.active {
  background-color: white;
  border-color: #dbdbdb #dbdbdb white;

}

.sheet-tab:hover:not(.active) {
  background-color: #e8e8e8;
}

.sheet-tab:hover {
  background-color: #f0f0f0;
}

.add-sheet {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 0 8px;
  color: #555;
}

.add-sheet:hover {
  background-color: #e0e0e0;
  border-radius: 3px;
}

/* ========================
   ✨ Transiciones vistosas
======================== */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.55, 0, 0.1, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-slide-enter-to,
.fade-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
}

/* Tags animados */
.tag-list-enter-active,
.tag-list-leave-active {
  transition: all 0.3s ease;
}

.tag-list-enter-from,
.tag-list-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.tag-list-enter-to,
.tag-list-leave-from {
  opacity: 1;
  transform: scale(1);
}
</style>
