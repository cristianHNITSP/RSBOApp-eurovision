<!-- src/views/inventario/Optica.vue -->
<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import DynamicTabs from "@/components/DynamicTabs.vue";
import SectionLoadingOverlay from "@/components/SectionLoadingOverlay.vue";

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

// Servicios
import * as opticaSVC from "@/services/optica.js";

// Estilos
import "./Optica.css";

const props = defineProps({ user: { type: Object, default: null } });

const actor = computed(() => ({
  userId: props.user?._id || props.user?.id || null,
  name: props.user?.name || props.user?.nombre || "Usuario",
}));

// ── Composición de Lógica (singleton) ──
const SVC = {
  armazones: opticaSVC.armazonesService,
  soluciones: opticaSVC.solucionesService,
  accesorios: opticaSVC.accesoriosService,
  estuches: opticaSVC.estuchesService,
  equipos: opticaSVC.equiposService,
};

// activeTab/categorias/booting viven en el singleton (estado persistido + boot 1 vez).
const {
  sec, categorias, activeTab, booting, boot, dictFor, setCurrentUser,
  reloadSection, goToPage, selectRow, toggleTrash, focusBySku,
} = useOpticaSection(SVC);

// Identidad del usuario actual → para no mostrarse a sí mismo el toast de tiempo real.
setCurrentUser(props.user?._id || props.user?.id || null);
const { confirm, openConfirm, onConfirmOk, onConfirmCancel } = useOpticaConfirm();
const { fm, openCreate, openEdit, saveForm } = useOpticaForm();

// Crear: pasa el diccionario de la categoría para sembrar los selects.
const onCreate = (key) => openCreate(key, dictFor(key));
const { doSoftDelete, doHardDelete, doRestore } = useOpticaActions(openConfirm);

// Handlers específicos (wrappers para pasar SVC y actor)
// Tras crear/editar/borrar se recarga la sección desde la página 1.
const reloadCb = (key) => reloadSection(key);
const handleSave = () => saveForm({ SVC, actor: actor.value, loadCallback: reloadCb });
const handleDelete = (key, row) => doSoftDelete(key, row, SVC, actor.value, reloadCb);
const handleHardDelete = (key, row) => doHardDelete(key, row, SVC, actor.value, reloadCb);
const handleRestore = (key, row) => doRestore(key, row, SVC, actor.value, reloadCb);

// Resumen del header: total de la categoría activa (la paginación impide sumar todo).
const activeTotal = computed(() => sec[activeTab.value]?.total || 0);

// ── Boot (Etapa 1: categorías + preferencias; Etapa 2: data de la tab activa) ──
// Sólo corre la 1ª vez por sesión (singleton); al volver, reaparece al instante.
const route = useRoute();
const router = useRouter();

// Deep-link desde notificación: ?categoria&sku → enfoca el producto (búsqueda por SKU).
async function consumeFocusQuery() {
  const { categoria, sku } = route.query;
  if (!categoria || !sku) return;
  if (!categorias.value.some((c) => c.key === categoria)) return; // categoría inexistente/inactiva
  await focusBySku(String(categoria), String(sku));
  const q = { ...route.query }; delete q.categoria; delete q.sku;
  router.replace({ query: Object.keys(q).length ? q : undefined });
}

onMounted(async () => { await boot(); await consumeFocusQuery(); });
watch(() => [route.query.categoria, route.query.sku], consumeFocusQuery);

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

      <div
        class="optica-header-summary is-flex is-flex-wrap-wrap is-align-items-center is-justify-content-flex-end is-flex-direction-column-desktop is-align-items-flex-end-desktop is-justify-content-flex-start-desktop">
        <b-taglist attached class="mb-0">
          <b-tag type="is-primary">
            <template v-if="sec[activeTab]?.loading"><b-icon icon="spinner" size="is-small"
                class="fa-spin mr-1" />Cargando…</template>
            <template v-else>{{ activeTotal }} items</template>
          </b-tag>
          <b-tag type="is-success">{{ sec[activeTab]?.showTrash ? 'en papelera' : 'activos' }}</b-tag>
        </b-taglist>
        <p class="is-size-7 has-text-grey ml-2 mt-0 ml-0-desktop mt-1-desktop">{{ categorias.length }} categorías</p>
      </div>
    </header>

    <div class="glass-wrapper section-boot-wrap" :class="{ 'is-booting': booting }">
      <!-- Etapa 1: loading general mientras cargan categorías + preferencias -->
      <SectionLoadingOverlay v-if="booting" label="Cargando óptica…" />

      <DynamicTabs v-else v-model="activeTab" :tabs="categorias">

        <template #armazones>
          <ArmazonesSection :section="sec.armazones" @select="r => selectRow('armazones', r)"
            @reload="() => reloadSection('armazones')" @page-change="p => goToPage('armazones', p)"
            @toggle-trash="() => toggleTrash('armazones')"
            @create="() => onCreate('armazones')" @edit="r => openEdit('armazones', r)"
            @soft-delete="r => handleDelete('armazones', r)" @hard-delete="r => handleHardDelete('armazones', r)"
            @restore="r => handleRestore('armazones', r)" />
        </template>

        <template #soluciones>
          <SolucionesSection :section="sec.soluciones"
            @select="r => selectRow('soluciones', r)" @reload="() => reloadSection('soluciones')"
            @page-change="p => goToPage('soluciones', p)"
            @toggle-trash="() => toggleTrash('soluciones')" @create="() => onCreate('soluciones')"
            @edit="r => openEdit('soluciones', r)" @soft-delete="r => handleDelete('soluciones', r)"
            @hard-delete="r => handleHardDelete('soluciones', r)" @restore="r => handleRestore('soluciones', r)" />
        </template>

        <template #accesorios>
          <AccesoriosSection :section="sec.accesorios"
            @select="r => selectRow('accesorios', r)" @reload="() => reloadSection('accesorios')"
            @page-change="p => goToPage('accesorios', p)"
            @toggle-trash="() => toggleTrash('accesorios')" @create="() => onCreate('accesorios')"
            @edit="r => openEdit('accesorios', r)" @soft-delete="r => handleDelete('accesorios', r)"
            @hard-delete="r => handleHardDelete('accesorios', r)" @restore="r => handleRestore('accesorios', r)" />
        </template>

        <template #estuches>
          <EstuchesSection :section="sec.estuches" @select="r => selectRow('estuches', r)"
            @reload="() => reloadSection('estuches')" @page-change="p => goToPage('estuches', p)"
            @toggle-trash="() => toggleTrash('estuches')"
            @create="() => onCreate('estuches')" @edit="r => openEdit('estuches', r)"
            @soft-delete="r => handleDelete('estuches', r)" @hard-delete="r => handleHardDelete('estuches', r)"
            @restore="r => handleRestore('estuches', r)" />
        </template>

        <template #equipos>
          <EquiposSection :section="sec.equipos" @select="r => selectRow('equipos', r)"
            @reload="() => reloadSection('equipos')" @page-change="p => goToPage('equipos', p)"
            @toggle-trash="() => toggleTrash('equipos')"
            @create="() => onCreate('equipos')" @edit="r => openEdit('equipos', r)"
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

<style scoped>
/* Contenedor relativo para el overlay de boot; reserva alto mientras carga. */
.section-boot-wrap {
  position: relative;
}
.section-boot-wrap.is-booting {
  min-height: 420px;
}
</style>
