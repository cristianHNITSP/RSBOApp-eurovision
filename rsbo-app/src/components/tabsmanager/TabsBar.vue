<!-- rsbo-app/src/components/tabsmanager/TabsBar.vue -->
<template>
  <div ref="tabsContainer" class="tabs-wrapper tabs-wrapper--glass">
    <template v-if="loadingTabs">
      <div v-for="n in 3" :key="'sk-' + n" class="tab-item skeleton-tab">
        <span class="skeleton-bar"></span>
      </div>
    </template>

    <template v-else>
      <!-- LEFT STATIC ZONE -->
      <div class="tabs-static-zone">
        <!-- Left sentinel: triggers load-prior when scrolled into view -->
        <div
          v-if="hasPrior || loadingPrior"
          ref="leftSentinel"
          class="tab-sentinel tab-prior-pill"
          @click="!loadingPrior && $emit('load-prior')"
          :title="loadingPrior ? 'Cargando…' : `Cargar ${priorCount} planillas anteriores`"
        >
          <span v-if="loadingPrior" class="tab-sentinel-spinner"></span>
          <template v-else>
            <i class="fas fa-chevron-left"></i>
            <span>{{ priorCount }}</span>
          </template>
        </div>

        <!-- Botón + -->
        <template v-for="planilla in sheets" :key="'static-' + planilla.id">
          <div v-if="planilla.id === 'nueva'" :data-id="planilla.id" :class="[
            'tab-item',
            'tab-item--glass',
            'tab-agregar',
            { active: planilla.id === activeId }
          ]" @click="$emit('tab-click', planilla.id)">
            <i class="fas fa-plus"></i>
          </div>

          <!-- Menu de Plantillas (Insertado tras el botón +) -->
          <div v-if="planilla.id === 'nueva'" class="tab-sentinel tab-menu-manager-wrapper">
            <TemplateMenuManager :api-type="apiType" />
          </div>

          <!-- Papelera (Insertado tras el catálogo) -->
          <div v-if="planilla.id === 'nueva'" class="tab-sentinel tab-menu-manager-wrapper">
            <TrashMenuManager :api-type="apiType" :actor="actor" @restored="$emit('open-template', $event)" />
          </div>
        </template>
      </div>

      <!-- SORTABLE ZONE -->
      <div class="tabs-sortable-zone" ref="sortableZone">
        <template v-for="planilla in sheets" :key="planilla.id">
          <div v-if="planilla.id !== 'nueva'" :data-id="planilla.id" :class="[
            'tab-item',
            'tab-item--glass',
            { 
              active: planilla.id === activeId,
              'is-pinned': planilla.isPinned
            }
          ]" @click="$emit('tab-click', planilla.id)">
            <button 
              class="tab-pin-btn" 
              :title="planilla.isPinned ? 'Desfijar' : 'Fijar'"
              @click.stop="$emit('toggle-pin', planilla.id)"
            >
              <i class="fas fa-thumbtack"></i>
            </button>

            <div class="tab-text">
              <span class="tab-label" :title="planilla.name">{{ planilla.name }}</span>

              <span v-if="planilla.sku" class="tab-sku" :title="planilla.sku">
                {{ planilla.sku }}
              </span>
              <span v-else class="tab-sku tab-sku--empty" title="Sin SKU (pendiente de backfill)">
                SIN-SKU
              </span>
            </div>

            <div class="tab-actions">
              <button class="tab-menu-btn" title="Más acciones" aria-label="Más acciones"
                @click.stop="$emit('open-actions', planilla)">
                ⋮
              </button>
              <button class="tab-close-btn" title="Cerrar pestaña" @click.stop="$emit('close-tab', planilla.id)">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- RIGHT STATIC ZONE -->
      <div class="tabs-static-zone">
        <!-- Right sentinel: IntersectionObserver triggers load-more -->
        <div
          v-if="hasMore || loadingMore"
          ref="rightSentinel"
          class="tab-sentinel tab-loading-pill"
        >
          <span class="tab-sentinel-spinner"></span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import Sortable from "sortablejs";
import TemplateMenuManager from "./TemplateMenuManager.vue";
import TrashMenuManager from "./TrashMenuManager.vue";

const props = defineProps({
  sheets:       { type: Array,   required: true },
  activeId:     { type: String,  required: true },
  loadingTabs:  { type: Boolean, default: false },
  hasMore:      { type: Boolean, default: false },
  hasPrior:     { type: Boolean, default: false },
  loadingMore:  { type: Boolean, default: false },
  loadingPrior: { type: Boolean, default: false },
  priorCount:   { type: Number,  default: 0 },
  apiType:      { type: String,  default: "inventory" },
  actor:        { type: Object,  default: null }
});

const emit = defineEmits(["tab-click", "open-actions", "load-more", "load-prior", "reorder", "close-tab", "toggle-pin", "open-template"]);

const tabsContainer  = ref(null);
const sortableZone   = ref(null);
const rightSentinel  = ref(null);
const leftSentinel   = ref(null);

let _ioRight = null;
let _ioLeft  = null;

let _sortableInstance = null;

function _setupSortable() {
  if (_sortableInstance) {
    _sortableInstance.destroy();
    _sortableInstance = null;
  }

  if (!sortableZone.value) return;

  _sortableInstance = Sortable.create(sortableZone.value, {
    animation: 150,
    ghostClass: "sortable-ghost",
    filter: ".is-pinned, .no-drag",
    preventOnFilter: false,
    delay: 200,
    delayOnTouchOnly: true,
    onMove: (evt) => {
      const related = evt.related;
      if (!related) return true;
      if (related.classList.contains("is-pinned")) return false;
      return true;
    },
    onEnd: (evt) => {
      if (props.loadingTabs) return;
      
      const draggedId = evt.item?.dataset?.id;
      if (!draggedId) return;

      const oldIdx = props.sheets.findIndex((s) => s.id === draggedId);
      if (oldIdx < 0) return;

      // Pinned tabs should not be moved
      if (props.sheets[oldIdx]?.isPinned) {
        // Undo DOM change
        const children = Array.from(evt.from.children);
        const originalPos = children.indexOf(evt.item);
        if (originalPos !== oldIdx) {
          evt.from.insertBefore(evt.item, evt.from.children[oldIdx]);
        }
        return;
      }

      // Sortable reorders DOM before onEnd. 
      // We find what item is NOW at the new position to find the target index in the array.
      // Note: evt.newIndex is the index within the sortableZone.
      const children = Array.from(evt.from.children);
      const targetEl = children[evt.newIndex];
      const targetId = targetEl?.dataset?.id;
      
      if (!targetId || targetId === draggedId) {
        // If we can't find a target or it's the same, it might be a cancelled move
        return;
      }

      const newIdx = props.sheets.findIndex((s) => s.id === targetId);
      if (newIdx < 0 || oldIdx === newIdx) return;

      emit("reorder", { oldIndex: oldIdx, newIndex: newIdx });
    }
  });
}

function _destroyObservers() {
  _ioRight?.disconnect();
  _ioLeft?.disconnect();
  _ioRight = null;
  _ioLeft  = null;
}

function _setupObservers() {
  _destroyObservers();
  const root = tabsContainer.value;
  if (!root) return;

  if (rightSentinel.value) {
    _ioRight = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && props.hasMore && !props.loadingMore) {
          emit("load-more");
        }
      },
      { root, threshold: 0.1 }
    );
    _ioRight.observe(rightSentinel.value);
  }

  if (leftSentinel.value) {
    _ioLeft = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && props.hasPrior && !props.loadingPrior) {
          emit("load-prior");
        }
      },
      { root, threshold: 0.1 }
    );
    _ioLeft.observe(leftSentinel.value);
  }
}

onMounted(() => {
  _setupSortable();
  _setupObservers();
  // Deep-link (búsqueda/notificación desde otra página): la pestaña activa ya
  // viene fijada al montar, así que el watch de activeId no dispara. Forzamos
  // aquí el scroll + pulse inicial.
  nextTick(() => scrollToActiveTab(props.activeId));
});

onBeforeUnmount(() => {
  _destroyObservers();
  if (_sortableInstance) {
    _sortableInstance.destroy();
  }
});

watch(
  () => props.loadingTabs,
  async (isLoading) => {
    if (!isLoading) {
      await nextTick();
      _setupSortable();
      _setupObservers();
    }
  }
);

watch(
  [() => props.hasMore, () => props.hasPrior],
  async () => {
    await nextTick();
    _setupObservers();
  }
);

// ── Scroll + pulse hasta la pestaña activa ───────────────────────────────
// Reintenta hasta que el tab exista en el DOM: al venir de un deep-link
// (búsqueda/notificación) la pestaña puede renderizarse un instante después.
function scrollToActiveTab(id, tries = 0) {
  if (!id || id === "nueva") return;
  // El scroll horizontal real vive en .tabs-sortable-zone (overflow-x:auto),
  // NO en .tabs-wrapper. Las pestañas de planilla están dentro de esa zona.
  const scroller = sortableZone.value;
  const el = scroller?.querySelector(`[data-id="${id}"]`);
  if (!el) {
    if (tries < 12) setTimeout(() => scrollToActiveTab(id, tries + 1), 80); // ~1s máx
    return;
  }

  // Centrar: delta del rect del tab respecto al scroller + su scrollLeft actual
  // (robusto sin depender de offsetParent).
  const sRect = scroller.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  const target =
    scroller.scrollLeft + (eRect.left - sRect.left) - scroller.clientWidth / 2 + eRect.width / 2;

  scroller.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  el.classList.add("tab-focus-pulse");
  setTimeout(() => el.classList.remove("tab-focus-pulse"), 900);
}

// Cambios en caliente (clic / cambio de pestaña ya montada).
watch(
  () => props.activeId,
  async (id) => { await nextTick(); scrollToActiveTab(id); }
);

</script>

<style scoped src="./TabsBar.css"></style>
