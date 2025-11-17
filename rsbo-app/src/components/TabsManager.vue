<template>
  <div>
    <!-- Tabs principales (Planillas) -->
    <div ref="tabsContainer" class="tabs-wrapper">
      <div
        v-for="planilla in sheets"
        :key="planilla.id"
        :data-id="planilla.id"
        :class="['tab-item', { 'tab-agregar': planilla.id === 'nueva', active: planilla.id === activeId }]"
        @click="handleTabClick(planilla.id)"
      >
        <template v-if="planilla.id === 'nueva'">
          <i class="fas fa-plus"></i>
        </template>
        <template v-else>
          {{ planilla.name }}
        </template>
      </div>
    </div>

    <!-- Contenido -->
    <div :key="activeId" class="box plantillas-contenedor">
      <!-- Form nueva planilla -->
      <div v-if="activeId === 'nueva'">
        <form @submit.prevent="handleCrear">
          <!-- BASES -->
          <b-field label="Selecciona la Base">
            <div class="tabs tabs-opciones is-toggle is-small">
              <ul>
                <li
                  v-for="(val, key) in configuracion.bases"
                  :key="key"
                  :class="{ 'is-active': selectedBase === key }"
                  @click="selectBase(key)"
                >
                  <a>{{ val.label }}</a>
                </li>
              </ul>
            </div>
          </b-field>

          <!-- MATERIALES -->
          <transition name="fade-slide">
            <b-field label="Selecciona el Material" v-if="selectedBase">
              <div class="tabs tabs-opciones is-toggle is-small">
                <ul>
                  <li
                    v-for="mat in allMaterials"
                    :key="mat"
                    :class="[{ 'is-active': selectedMaterial === mat }, { 'is-disabled': !isMaterialAllowed(mat) }]"
                    @click="isMaterialAllowed(mat) && selectMaterial(mat)"
                  >
                    <a>{{ mat }}</a>
                  </li>
                </ul>
              </div>
            </b-field>
          </transition>

          <!-- TRATAMIENTOS -->
          <transition name="fade-slide">
            <b-field label="Selecciona Tratamientos" v-if="selectedMaterial">
              <div class="columns is-multiline is-mobile" style="max-height: 150px; overflow-y: auto;">
                <div
                  class="column is-half-mobile is-one-third-tablet is-one-quarter-desktop"
                  v-for="trat in allTratamientos"
                  :key="trat"
                >
                  <b-checkbox
                    v-model="selectedTratamientos"
                    :native-value="trat"
                    size="is-small"
                    type="is-primary"
                    :disabled="!isTratamientoAllowed(trat)"
                  >
                    {{ trat }}
                  </b-checkbox>
                </div>
              </div>
            </b-field>
          </transition>

          <!-- Tags de tratamientos -->
          <transition-group name="tag-list" tag="div" class="tags mb-3">
            <span
              v-for="(tag, index) in selectedTratamientos"
              :key="tag"
              class="tag is-info is-light is-rounded"
            >
              {{ tag }}
              <button class="delete is-small" @click.prevent="removeTratamiento(index)" aria-label="Eliminar tratamiento"></button>
            </span>
          </transition-group>

          <!-- Nombre autogenerado -->
          <b-field label="Nombre generado automáticamente">
            <b-input v-model="newSheetName" disabled expanded />
          </b-field>

          <!-- Botón crear -->
          <b-button
            type="is-primary"
            native-type="submit"
            size="is-small"
            :disabled="!canCreate || creatingSheet"
            :loading="creatingSheet"
          >
            Crear Planilla
          </b-button>
        </form>
      </div>

      <!-- Contenido de tabs existentes -->
      <div v-else>
        <slot :activeId="activeId" :activeInternal="activeInternalTab" :activeSheet="activeSheetObj"></slot>

        <!-- Tabs internas (según tipo_matriz) -->
        <div class="sheet-tabs" v-if="internalTabs.length">
          <div
            v-for="tab in internalTabs"
            :key="tab.id"
            class="sheet-tab"
            :class="{ active: activeInternalTab === tab.id }"
            @click="handleInternalTabClick(tab.id)"
          >
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
import { createSheet } from "@/services/inventory";

const props = defineProps({
  initialSheets: { type: Array, required: true },
  activeId: { type: String, required: true },
  configuracion: { type: Object, required: true },
  /** Actor opcional: { id, name }. Si no viene, intenta leer de window.__currentUser */
  actor: { type: Object, default: null }
});

const emit = defineEmits(["update:active", "reorder", "crear", "update:internal"]);

/** Copia local */
const sheets = ref([...props.initialSheets]);
watch(() => props.initialSheets, v => (sheets.value = [...v]), { deep: true });

/** activo */
const activeId = computed(() => props.activeId);
const activeSheetObj = computed(() => sheets.value.find(s => s.id === activeId.value));

/** pestañas internas */
const activeInternalTab = ref(null);
const internalTabs = computed(() => {
  const t = activeSheetObj.value?.tipo_matriz;
  if (!t) return [];
  if (t === "SPH_ADD" || t === "SPH_CYL") return [{ id: "sph-neg", label: "SPH (-)" }, { id: "sph-pos", label: "SPH (+)" }];
  if (t === "BASE_ADD") return [{ id: "base-add", label: "BASE / ADD +" }];
  return [];
});
watch(internalTabs, (tabs) => {
  const first = tabs[0]?.id || null;
  activeInternalTab.value = first;
  emit("update:internal", first);
}, { immediate: true });
const handleInternalTabClick = (id) => { activeInternalTab.value = id; emit("update:internal", id); };

/** form */
const selectedBase = ref(null);
const selectedMaterial = ref(null);
const selectedTratamientos = ref([]);
const newSheetName = ref("");
const creatingSheet = ref(false);

const allMaterials = ["Polycarbonato", "CR-39", "1.56", "1.61", "1.74"];
const allTratamientos = ["Antirreflejo", "Fotocromático", "Tinte Gris", "Blue Light", "Endurecido"];

/** nombre autogenerado */
watch([selectedBase, selectedMaterial, selectedTratamientos], () => {
  const baseCfg = selectedBase.value && props.configuracion.bases[selectedBase.value];
  const baseLabel = baseCfg ? baseCfg.label : "";
  const materialLabel = selectedMaterial.value || "";
  const tratamientosLabel = selectedTratamientos.value.join(" + ");
  newSheetName.value = [baseLabel, materialLabel, tratamientosLabel].filter(Boolean).join(" | ");
});

const selectBase = (base) => { selectedBase.value = base; selectedMaterial.value = null; selectedTratamientos.value = []; };
const selectMaterial = (mat) => { if (!isMaterialAllowed(mat)) return; selectedMaterial.value = mat; selectedTratamientos.value = []; };
const isMaterialAllowed = (mat) => { if (!selectedBase.value) return false; const b = props.configuracion.bases[selectedBase.value]; return b && b.materiales.includes(mat); };
const isTratamientoAllowed = (trat) => { if (!selectedBase.value) return false; const b = props.configuracion.bases[selectedBase.value]; return b && b.tratamientos.includes(trat); };
const removeTratamiento = (i) => selectedTratamientos.value.splice(i, 1);

const canCreate = computed(() =>
  !!selectedBase.value && !!selectedMaterial.value && selectedTratamientos.value.length > 0 && !!newSheetName.value
);

/** map baseKey -> tipo_matriz */
const mapBaseToTipoMatriz = (baseKey) => {
  const cfg = props.configuracion.bases[baseKey];
  if (cfg?.tipo_matriz) return cfg.tipo_matriz;
  if (baseKey === "monofocal") return "BASE";
  if (baseKey === "monofocalEsfCil") return "SPH_CYL";
  if (baseKey === "bifocal") return "SPH_ADD";
  if (baseKey === "progresivo") return "BASE_ADD";
  if (baseKey === "base" || baseKey === "bases") return "BASE";
  return "SPH_CYL";
};

/** actor final */
const actorRef = computed(() => {
  const src = props.actor || (typeof window !== "undefined" ? window.__currentUser : null) || null;
  return src && (src.id || src.userId) ? { userId: src.id || src.userId, name: src.name } : null;
});

/** crear planilla (autogenerado SIEMPRE) */
const handleCrear = async () => {
  if (!canCreate.value) return;
  creatingSheet.value = true;
  await nextTick();

  try {
    const baseCfg = props.configuracion.bases[selectedBase.value];
    const tipo_matriz = mapBaseToTipoMatriz(selectedBase.value);

    const payload = {
      nombre: newSheetName.value,
      baseKey: selectedBase.value,
      base: baseCfg?.label || selectedBase.value,
      material: selectedMaterial.value,
      tratamientos: [...selectedTratamientos.value],
      tipo_matriz,
      // siempre autogenerado:
      seed: true,
      autoGenerate: true,
      rangos: baseCfg?.rangos || undefined,
      actor: actorRef.value || undefined
    };

    const { data } = await createSheet(payload);
    const s = data?.data?.sheet;
    const tabs = data?.data?.tabs || [];
    if (!s) throw new Error("Sin hoja en respuesta");

    const newTab = {
      id: String(s._id),
      name: s.nombre,
      tipo_matriz: s.tipo_matriz,
      baseKey: s.baseKey,
      material: s.material,
      tratamientos: s.tratamientos || [],
      tabs
    };

    const addIndex = sheets.value.findIndex(x => x.id === "nueva");
    sheets.value.splice(addIndex >= 0 ? addIndex : sheets.value.length, 0, newTab);

    emit("update:active", newTab.id);
    emit("crear", { payload, result: s });

    // reset form
    selectedBase.value = null;
    selectedMaterial.value = null;
    selectedTratamientos.value = [];
    newSheetName.value = "";
  } catch (err) {
    console.error("Error al crear planilla:", err);
    // opcional: toast si tienes Buefy global
    // this?.$buefy?.toast.open({ message: 'No se pudo crear la planilla', type: 'is-danger' });
  } finally {
    creatingSheet.value = false;
  }
};

/** drag & drop */
const tabsContainer = ref(null);
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
      const maxIndex = sheets.value.length - 1; // última es "nueva"
      const oldIndex = evt.oldIndex;
      let newIndex = evt.newIndex;
      if (newIndex >= maxIndex) {
        evt.from.insertBefore(evt.item, evt.from.children[oldIndex]);
        return;
      }
      if (oldIndex === newIndex) return;

      const moved = sheets.value.splice(oldIndex, 1)[0];
      sheets.value.splice(newIndex, 0, moved);
      emit("reorder", { oldIndex, newIndex });
    }
  });
});

const handleTabClick = (id) => emit("update:active", id);
</script>

<style scoped>
.tabs-wrapper { display:flex; flex-wrap:nowrap; overflow-x:auto; gap:0.25rem; border-bottom:2px solid #dbdbdb; }
.tab-item { padding:0.35rem 0.75rem; font-size:0.85rem; border-radius:4px 4px 0 0; cursor:pointer; background:#f5f5f5; color:#4a4a4a; user-select:none; border:1px solid #dbdbdb; transition:background-color .3s,color .3s; }
.tab-item.active { background-color:#8e00d2; color:white; }
.tab-agregar { cursor:pointer !important; background-color:#494949; color:white; }
.tabs-opciones ul li.is-disabled { pointer-events:none; opacity:.4; }
@keyframes shake { 0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-3px)}40%,80%{transform:translateX(3px)} }
.shake { animation: shake .3s; }
.tabs-wrapper .tab-item.shake-color { background-color:red; color:white; }
.sheet-tab { padding:.25rem .75rem; font-size:.85rem; background:transparent; border:1px solid transparent; border-bottom:none; border-radius:4px 4px 0 0; margin-right:2px; cursor:pointer; transition:all .2s; }
.sheet-tabs { display:flex; height:34px; align-items:center; border-bottom:1px solid #dbdbdb; background:#f5f5f5; padding-left:.25rem; border-radius:0 0 4px 4px; }
.sheet-tab.active { background:white; border-color:#dbdbdb #dbdbdb white; }
.sheet-tab:hover:not(.active) { background:#e8e8e8; }
.fade-slide-enter-active, .fade-slide-leave-active { transition: all .4s cubic-bezier(.55,0,.1,1); }
.fade-slide-enter-from, .fade-slide-leave-to { opacity:0; transform: translateY(-10px); }
.tag-list-enter-active, .tag-list-leave-active { transition: all .3s ease; }
.tag-list-enter-from, .tag-list-leave-to { opacity:0; transform: scale(.8); }
</style>
