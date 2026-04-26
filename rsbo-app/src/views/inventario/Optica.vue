<!-- src/views/inventario/Optica.vue -->
<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import DynamicTabs from "@/components/DynamicTabs.vue";

// Composables
import { useOpticaSection } from "@/composables/optica/useOpticaSection.js";
import { useOpticaConfirm } from "@/composables/optica/useOpticaConfirm.js";
import { useOpticaForm } from "@/composables/optica/useOpticaForm.js";
import { useOpticaActions } from "@/composables/optica/useOpticaActions.js";

// Componentes
import ArmazonesSection from "@/components/optica/ArmazonesSection.vue";
import SolucionesSection from "@/components/optica/SolucionesSection.vue";
import AccesoriosSection from "@/components/optica/AccesoriosSection.vue";
import EstuchesSection from "@/components/optica/EstuchesSection.vue";
import EquiposSection from "@/components/optica/EquiposSection.vue";
import OpticaConfirmModal from "@/components/optica/OpticaConfirmModal.vue";
import OpticaFormModal from "@/components/optica/OpticaFormModal.vue";

// Servicios y Constantes
import * as opticaSVC from "@/services/optica.js";
import {
  OPTICA_TABS,
  ARMAZONES_CONFIG,
  SOLUCIONES_CONFIG,
  ACCESORIOS_CONFIG,
  ESTUCHES_CONFIG,
  EQUIPOS_CONFIG,
} from "@/constants/optica.js";

// Estilos
import "./Optica.css";

const props = defineProps({ user: { type: Object, default: null } });

const actor = computed(() => ({
  userId: props.user?._id || props.user?.id || null,
  name: props.user?.name || props.user?.nombre || "Usuario",
}));

const activeTab = ref("armazones");

// ── Composición de Lógica ──
const SVC = {
  armazones: opticaSVC.armazonesService,
  soluciones: opticaSVC.solucionesService,
  accesorios: opticaSVC.accesoriosService,
  estuches: opticaSVC.estuchesService,
  equipos: opticaSVC.equiposService,
};

const { sec, loadingAll, load, loadAll, selectRow, toggleTrash } = useOpticaSection(SVC);
const { confirm, openConfirm, onConfirmOk, onConfirmCancel } = useOpticaConfirm();
const { fm, openCreate, openEdit, saveForm } = useOpticaForm();
const { doSoftDelete, doHardDelete, doRestore } = useOpticaActions(openConfirm);

// Handlers específicos (wrappers para pasar SVC y actor)
const handleSave = () => saveForm({ SVC, actor: actor.value, loadCallback: load });
const handleDelete = (key, row) => doSoftDelete(key, row, SVC, actor.value, load);
const handleHardDelete = (key, row) => doHardDelete(key, row, SVC, actor.value, load);
const handleRestore = (key, row) => doRestore(key, row, SVC, actor.value, load);

onMounted(loadAll);

// ── Lógica de Pantalla Completa ──
const isFullscreenActive = ref(!!document.fullscreenElement);
const fullscreenContainer = computed(() => isFullscreenActive.value ? '.optica-section' : null);
const updateFullscreenStatus = () => { isFullscreenActive.value = !!document.fullscreenElement; };

onMounted(() => { document.addEventListener("fullscreenchange", updateFullscreenStatus); });
onBeforeUnmount(() => { document.removeEventListener("fullscreenchange", updateFullscreenStatus); });
</script>

<template>
  <section class="optica-section" :class="{ 'ag-grid-fullscreen-container': isFullscreenActive }"
    v-motion-fade-visible-once>

    <header class="optica-page-header page-section-header">
      <div>
        <span class="optica-pill">
          <b-icon icon="store" size="is-small" class="mr-1" />
          Inventario Óptica
        </span>
        <h2>Gestión de Óptica</h2>
        <p class="psh-desc">Armazones, soluciones, accesorios, estuches y equipos — control total con historial de
          cambios.</p>

        <div class="psh-quick mt-3">
          <div class="psh-quick__card">
            <div class="psh-quick__icon"><i class="fas fa-glasses"></i></div>
            <div>
              <p class="psh-quick__title">Armazones</p>
              <p class="psh-quick__text">Stock, marcas y modelos</p>
            </div>
          </div>
          <div class="psh-quick__card">
            <div class="psh-quick__icon"><i class="fas fa-tools"></i></div>
            <div>
              <p class="psh-quick__title">Equipos</p>
              <p class="psh-quick__text">Estado y mantenimientos</p>
            </div>
          </div>
          <div class="psh-quick__card">
            <div class="psh-quick__icon"><i class="fas fa-trash-restore"></i></div>
            <div>
              <p class="psh-quick__title">Papelera</p>
              <p class="psh-quick__text">Los eliminados se pueden restaurar</p>
            </div>
          </div>
        </div>
      </div>

      <div class="optica-header-summary">
        <b-taglist attached>
          <b-tag type="is-primary">
            <template v-if="loadingAll"><b-icon icon="spinner" size="is-small"
                class="fa-spin mr-1" />Cargando…</template>
            <template v-else>
              {{ sec.armazones.items.length + sec.soluciones.items.length + sec.accesorios.items.length +
                sec.estuches.items.length + sec.equipos.items.length }} items
            </template>
          </b-tag>
          <b-tag type="is-success">activos</b-tag>
        </b-taglist>
        <p class="is-size-7 has-text-grey mt-1">5 categorías</p>
      </div>
    </header>

    <div class="glass-wrapper">
      <DynamicTabs v-model="activeTab" :tabs="OPTICA_TABS">

        <template #armazones>
          <ArmazonesSection :section="sec.armazones" :config="ARMAZONES_CONFIG" @select="r => selectRow('armazones', r)"
            @reload="() => load('armazones')" @toggle-trash="() => toggleTrash('armazones')"
            @create="() => openCreate('armazones')" @edit="r => openEdit('armazones', r)"
            @soft-delete="r => handleDelete('armazones', r)" @hard-delete="r => handleHardDelete('armazones', r)"
            @restore="r => handleRestore('armazones', r)" />
        </template>

        <template #soluciones>
          <SolucionesSection :section="sec.soluciones" :config="SOLUCIONES_CONFIG"
            @select="r => selectRow('soluciones', r)" @reload="() => load('soluciones')"
            @toggle-trash="() => toggleTrash('soluciones')" @create="() => openCreate('soluciones')"
            @edit="r => openEdit('soluciones', r)" @soft-delete="r => handleDelete('soluciones', r)"
            @hard-delete="r => handleHardDelete('soluciones', r)" @restore="r => handleRestore('soluciones', r)" />
        </template>

        <template #accesorios>
          <AccesoriosSection :section="sec.accesorios" :config="ACCESORIOS_CONFIG"
            @select="r => selectRow('accesorios', r)" @reload="() => load('accesorios')"
            @toggle-trash="() => toggleTrash('accesorios')" @create="() => openCreate('accesorios')"
            @edit="r => openEdit('accesorios', r)" @soft-delete="r => handleDelete('accesorios', r)"
            @hard-delete="r => handleHardDelete('accesorios', r)" @restore="r => handleRestore('accesorios', r)" />
        </template>

        <template #estuches>
          <EstuchesSection :section="sec.estuches" :config="ESTUCHES_CONFIG" @select="r => selectRow('estuches', r)"
            @reload="() => load('estuches')" @toggle-trash="() => toggleTrash('estuches')"
            @create="() => openCreate('estuches')" @edit="r => openEdit('estuches', r)"
            @soft-delete="r => handleDelete('estuches', r)" @hard-delete="r => handleHardDelete('estuches', r)"
            @restore="r => handleRestore('estuches', r)" />
        </template>

        <template #equipos>
          <EquiposSection :section="sec.equipos" :config="EQUIPOS_CONFIG" @select="r => selectRow('equipos', r)"
            @reload="() => load('equipos')" @toggle-trash="() => toggleTrash('equipos')"
            @create="() => openCreate('equipos')" @edit="r => openEdit('equipos', r)"
            @soft-delete="r => handleDelete('equipos', r)" @hard-delete="r => handleHardDelete('equipos', r)"
            @restore="r => handleRestore('equipos', r)" />
        </template>

      </DynamicTabs>
    </div>

    <!-- Modales -->
    <OpticaConfirmModal v-model="confirm.active" :confirm="confirm" @ok="onConfirmOk" @cancel="onConfirmCancel" />

    <OpticaFormModal v-model="fm.active" :fm="fm" @close="fm.active = false" @save="handleSave" />

  </section>
</template>
