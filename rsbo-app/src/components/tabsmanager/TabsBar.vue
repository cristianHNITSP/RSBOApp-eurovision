<!-- rsbo-app/src/components/tabsmanager/TabsBar.vue -->
<template>
  <div ref="tabsContainer" class="tabs-wrapper tabs-wrapper--glass">
    <template v-if="loadingTabs">
      <div v-for="n in 3" :key="'sk-' + n" class="tab-item skeleton-tab">
        <span class="skeleton-bar"></span>
      </div>
    </template>

    <template v-else>
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

      <div v-for="planilla in sheets" :key="planilla.id" :data-id="planilla.id" :class="[
        'tab-item',
        'tab-item--glass',
        { 'tab-agregar': planilla.id === 'nueva', active: planilla.id === activeId }
      ]" @click="$emit('tab-click', planilla.id)">
        <template v-if="planilla.id === 'nueva'">
          <i class="fas fa-plus"></i>
        </template>

        <template v-else>
          <div class="tab-text">
            <span class="tab-label" :title="planilla.name">{{ planilla.name }}</span>

            <span v-if="planilla.sku" class="tab-sku" :title="planilla.sku">
              {{ planilla.sku }}
            </span>
            <span v-else class="tab-sku tab-sku--empty" title="Sin SKU (pendiente de backfill)">
              SIN-SKU
            </span>
          </div>

          <button class="tab-menu-btn" title="Más acciones" aria-label="Más acciones"
            @click.stop="$emit('open-actions', planilla)">
            ⋮
          </button>
        </template>
      </div>

      <!-- Right sentinel: IntersectionObserver triggers load-more -->
      <div
        v-if="hasMore || loadingMore"
        ref="rightSentinel"
        class="tab-sentinel tab-loading-pill"
      >
        <span class="tab-sentinel-spinner"></span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import Sortable from "sortablejs";

const props = defineProps({
  sheets:       { type: Array,   required: true },
  activeId:     { type: String,  required: true },
  loadingTabs:  { type: Boolean, default: false },
  hasMore:      { type: Boolean, default: false },
  hasPrior:     { type: Boolean, default: false },
  loadingMore:  { type: Boolean, default: false },
  loadingPrior: { type: Boolean, default: false },
  priorCount:   { type: Number,  default: 0 }
});

const emit = defineEmits(["tab-click", "open-actions", "load-more", "load-prior", "reorder"]);

const tabsContainer  = ref(null);
const rightSentinel  = ref(null);
const leftSentinel   = ref(null);

let _ioRight = null;
let _ioLeft  = null;

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
  if (!tabsContainer.value) return;

  Sortable.create(tabsContainer.value, {
    animation: 150,
    ghostClass: "sortable-ghost",
    filter: ".tab-agregar, .tab-sentinel, .tab-prior-pill, .tab-loading-pill",
    preventOnFilter: false,
    delay: 200,
    delayOnTouchOnly: true,
    onEnd: (evt) => {
      if (props.loadingTabs) return;
      const draggedId = evt.item?.dataset?.id;
      if (!draggedId) return;

      const oldIdx = props.sheets.findIndex((s) => s.id === draggedId);
      if (oldIdx < 0) return;

      const targetEl = evt.from.children[evt.newIndex];
      const targetId = targetEl?.dataset?.id;
      const newIdx = targetId ? props.sheets.findIndex((s) => s.id === targetId) : -1;

      const last = props.sheets.length - 1; 
      if (oldIdx >= last || newIdx < 0 || newIdx >= last || oldIdx === newIdx) {
        evt.from.insertBefore(evt.item, evt.from.children[oldIdx]);
        return;
      }
      emit("reorder", { oldIndex: oldIdx, newIndex: newIdx });
    }
  });

  _setupObservers();
});

onBeforeUnmount(() => {
  _destroyObservers();
});

watch(
  [() => props.hasMore, () => props.hasPrior],
  async () => {
    await nextTick();
    _setupObservers();
  }
);

// Scroll to active tab logic
watch(
  () => props.activeId,
  async (id) => {
    if (!id || id === "nueva") return;
    await nextTick();
    const container = tabsContainer.value;
    if (!container) return;
    const el = container.querySelector(`[data-id="${id}"]`);
    if (!el) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const scrollLeft =
      container.scrollLeft +
      (elRect.left - containerRect.left) -
      containerRect.width / 2 +
      elRect.width / 2;

    container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    el.classList.add("tab-focus-pulse");
    setTimeout(() => el.classList.remove("tab-focus-pulse"), 900);
  }
);
</script>

<style scoped src="./TabsBar.css"></style>
