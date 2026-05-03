<!-- src/components/DynamicTabs.vue
     Glassmorphism tab bar with sliding pill indicator + directional slide transition.

     Usage:
       <DynamicTabs v-model="active" :tabs="[{ key, label, icon?, badge? }]">
         <template #tab-key-1> … </template>
         <template #tab-key-2> … </template>
       </DynamicTabs>
-->
<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from "vue";

const props = defineProps({
  /** Array of tab descriptors: { key, label, icon?, badge?, badgeType? } */
  tabs: { type: Array, required: true },
  /** Currently active tab key (v-model) */
  modelValue: { type: [String, Number], default: null },
});

const emit = defineEmits(["update:modelValue"]);

// ── Sliding indicator ────────────────────────────────────────
const barRef = ref(null);
const tabRefs = ref([]);
const indLeft = ref(0);
const indWidth = ref(0);
const indReady = ref(false);

function syncIndicator() {
  const idx = props.tabs.findIndex(
    (t) => (t.key !== undefined ? t.key : t.label) === props.modelValue
  );
  const el = tabRefs.value[idx];
  if (!el) return;
  indLeft.value = el.offsetLeft;
  indWidth.value = el.offsetWidth;
  indReady.value = true;
}

let ro;
onMounted(() => {
  nextTick(syncIndicator);
  ro = new ResizeObserver(() => nextTick(syncIndicator));
  if (barRef.value) ro.observe(barRef.value);
});
onBeforeUnmount(() => ro?.disconnect());

// ── Slide direction ──────────────────────────────────────────
const slideDir = ref("slide-ltr"); // ltr = left→right (forward), rtl = right→left (back)

watch(
  () => props.modelValue,
  (newVal, oldVal) => {
    const idx = (v) =>
      props.tabs.findIndex((t) => (t.key !== undefined ? t.key : t.label) === v);
    slideDir.value = idx(newVal) > idx(oldVal) ? "slide-ltr" : "slide-rtl";
    nextTick(syncIndicator);
  }
);

// ── Tab click ────────────────────────────────────────────────
function select(tab) {
  const key = tab.key !== undefined ? tab.key : tab.label;
  if (key !== props.modelValue) {
    emit("update:modelValue", key);
  }
}
</script>

<template>
  <div class="dyn-tabs">
    <!-- ── Tab bar ── -->
    <div class="dyn-tabs__bar" ref="barRef" role="tablist">
      <!-- Sliding pill -->
      <span v-if="indReady" class="dyn-tabs__indicator" aria-hidden="true"
        :style="{ left: indLeft + 'px', width: indWidth + 'px' }" />

      <button v-for="(tab, idx) in tabs" :key="tab.key !== undefined ? tab.key : tab.label"
        :ref="(el) => (tabRefs[idx] = el)" class="dyn-tab" :class="{
          'is-active':
            modelValue === (tab.key !== undefined ? tab.key : tab.label),
        }" role="tab" :aria-selected="modelValue === (tab.key !== undefined ? tab.key : tab.label)
          " @click="select(tab)">
        <i v-if="tab.icon" :class="`fas fa-${tab.icon}`" class="dyn-tab__icon" aria-hidden="true" />
        <span class="dyn-tab__label">{{ tab.label }}</span>
        <span v-if="tab.badge" class="dyn-tab__badge" :class="`dyn-tab__badge--${tab.badgeType || 'primary'}`">
          {{ tab.badge }}
        </span>
      </button>
    </div>

    <!-- ── Content with directional slide transition ── -->
    <div class="dyn-tabs__content">
      <transition :name="slideDir">
        <div :key="modelValue" class="dyn-tab-panel">
          <slot :name="String(modelValue)" />
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
/* ════════════════════════════════════════════════════════════
   WRAPPER
   ════════════════════════════════════════════════════════════ */
.dyn-tabs {
  display: flex;
  flex-direction: column;
}

/* ════════════════════════════════════════════════════════════
   TAB BAR
   ════════════════════════════════════════════════════════════ */
.dyn-tabs__bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.3rem;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill, 999px);
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  margin-bottom: 1.1rem;
  flex-shrink: 0;
}

/* Anular margen cuando se usa en el Ribbon u otras vistas compactas */
.dyn-tabs.ribbon-tabs .dyn-tabs__bar {
  margin-bottom: 0;
}

.dyn-tabs__bar::-webkit-scrollbar {
  display: none;
}

/* Sliding pill indicator */
.dyn-tabs__indicator {
  position: absolute;
  top: 0.3rem;
  height: calc(100% - 0.6rem);
  background: linear-gradient(135deg,
      rgba(144, 111, 225, 0.22),
      rgba(236, 72, 153, 0.13));
  border: 1px solid rgba(144, 111, 225, 0.35);
  border-radius: calc(var(--radius-pill, 999px) - 4px);
  box-shadow:
    0 2px 10px rgba(144, 111, 225, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
  pointer-events: none;
  z-index: 0;
  transition:
    left 230ms cubic-bezier(0.34, 1.56, 0.64, 1),
    width 230ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ════════════════════════════════════════════════════════════
   TAB BUTTONS
   ════════════════════════════════════════════════════════════ */
.dyn-tab {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.42rem 0.9rem;
  border: none;
  background: transparent;
  border-radius: calc(var(--radius-pill, 999px) - 4px);
  cursor: pointer;
  white-space: nowrap;
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 650;
  font-family: inherit;
  transition: color 160ms ease;
  flex-shrink: 0;
  outline: none;
}

.dyn-tab:hover {
  color: var(--c-primary);
}

.dyn-tab.is-active {
  color: var(--c-primary);
  font-weight: 800;
}

.dyn-tab__icon {
  font-size: 0.82rem;
  opacity: 0.8;
  transition: opacity 160ms ease, transform 160ms ease;
}

.dyn-tab.is-active .dyn-tab__icon {
  opacity: 1;
  transform: scale(1.08);
}

/* Badge */
.dyn-tab__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.2rem;
  height: 1.2rem;
  padding: 0 0.38rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 900;
  line-height: 1;
}

.dyn-tab__badge--primary {
  background: var(--c-primary);
  color: #fff;
}

.dyn-tab__badge--warning {
  background: var(--c-warning);
  color: #fff;
}

.dyn-tab__badge--success {
  background: var(--c-success);
  color: #fff;
}

.dyn-tab__badge--danger {
  background: var(--c-danger);
  color: #fff;
}

.dyn-tab__badge--info {
  background: var(--c-info);
  color: #fff;
}

/* ════════════════════════════════════════════════════════════
   CONTENT PANEL
   ════════════════════════════════════════════════════════════ */
.dyn-tabs__content {
  /* Eliminamos overflow: hidden para permitir que los tooltips se vean por fuera */
  position: relative;
}

.dyn-tab-panel {
  width: 100%;
  /* Padding superior estable (0.75rem = mt-3) para evitar el "salto" de los márgenes durante la transición */
  padding-top: 0.75rem;
}

/* ════════════════════════════════════════════════════════════
   SLIDE TRANSITIONS
   LTR  = going forward  (new tab index > old) → slide in from right
   RTL  = going backward (new tab index < old) → slide in from left
   ════════════════════════════════════════════════════════════ */
.slide-ltr-enter-active,
.slide-ltr-leave-active,
.slide-rtl-enter-active,
.slide-rtl-leave-active {
  transition: transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 250ms ease;
}

/* Evitar saltos verticales posicionando el elemento que sale */
.slide-ltr-leave-active,
.slide-rtl-leave-active {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

/* --- Forward: enter from right (30px), leave to left (-30px) --- */
.slide-ltr-enter-from {
  transform: translate3d(30px, 0, 0);
  opacity: 0;
}
.slide-ltr-leave-to {
  transform: translate3d(-30px, 0, 0);
  opacity: 0;
}

/* --- Backward: enter from left (-30px), leave to right (30px) --- */
.slide-rtl-enter-from {
  transform: translate3d(-30px, 0, 0);
  opacity: 0;
}
.slide-rtl-leave-to {
  transform: translate3d(30px, 0, 0);
  opacity: 0;
}

/* ════════════════════════════════════════════════════════════
   RESPONSIVE — hide labels on small screens
   ════════════════════════════════════════════════════════════ */
@media (max-width: 640px) {
  .dyn-tabs__bar {
    border-radius: var(--radius-md);
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: auto;
    /* Mostrar scrollbar en móvil si es necesario */
    -webkit-overflow-scrolling: touch;
    padding-bottom: 0.4rem;
    /* Espacio para scrollbar si aparece */
  }

  .dyn-tab {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
    min-width: fit-content;
  }

  .dyn-tab__label {
    display: inline-block;
    /* Mostrar texto */
  }

  .dyn-tab__icon {
    display: none;
    /* Ocultar icono para "ver texto únicamente" */
  }
}
</style>
