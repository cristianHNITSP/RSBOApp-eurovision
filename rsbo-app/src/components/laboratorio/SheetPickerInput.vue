<template>
  <div class="spi-container">
    <!-- Trigger -->
    <div class="spi-trigger" @click="openPicker" ref="triggerRef">
      <i class="fas fa-layer-group spi-trigger__icon"></i>
      <span class="spi-trigger__name">{{ currentName }}</span>
      <i class="fas fa-chevron-down spi-trigger__chev"></i>
    </div>

    <!-- Popover -->
    <teleport to="body">
      <div v-if="open" class="spi-panel" :style="panelStyle" ref="panelRef">
        <div class="spi-search">
          <i class="fas fa-search spi-search__icon"></i>
          <input
            ref="inputRef"
            v-model="query"
            class="spi-search__input"
            placeholder="Buscar planilla…"
            @input="props.searchFn(query)"
            @keydown.down.prevent="highlight(highlighted + 1)"
            @keydown.up.prevent="highlight(highlighted - 1)"
            @keydown.enter.prevent="selectHighlighted"
            @keydown.esc="close"
          />
        </div>
        <div class="spi-list" ref="listRef">
          <div v-if="loading || isOpening" class="spi-loading">
            <b-loading :is-full-page="false" :active="true" />
          </div>
          <button v-else-if="!results.length" class="spi-empty">Sin resultados</button>
          <button
            v-else
            v-for="(s, i) in results"
            :key="s.id || s._id"
            class="spi-item"
            :class="{ 'spi-item--active': modelValue === (s.id || s._id), 'spi-item--hl': highlighted === i }"
            @click="select(s.id || s._id)"
            @mouseenter="highlighted = i"
          >
            <div class="spi-item__name">{{ sheetTitle(s) }}</div>
            <div class="spi-item__meta">{{ s.fecha || s.createdAtShort || s.createdAt || '' }}</div>
          </button>
        </div>
        <div class="spi-footer">
          {{ results.length }} resultados encontrados
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, inject, watch } from 'vue';
import './SheetPickerInput.css';

const lab = inject("lab");

const props = defineProps({
  modelValue: { type: String, default: "" },
  sheetTitle: { type: Function, required: true },
  searchFn: { type: Function, required: true },
  results: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue']);

const open = ref(false);
const query = ref("");
const highlighted = ref(0);
const triggerRef = ref(null);
const panelRef = ref(null);
const inputRef = ref(null);
const listRef = ref(null);

const currentName = computed(() => {
  const found = lab?.sheetById(props.modelValue);
  return found ? props.sheetTitle(found) : "Seleccionar planilla…";
});

const isOpening = ref(false);

watch(() => props.loading, (loading) => {
  if (!loading && isOpening.value) {
    isOpening.value = false;
  }
});

const panelStyle = ref({});

function updatePosition() {
  if (!open.value || !triggerRef.value) return;
  const rect = triggerRef.value.getBoundingClientRect();
  panelStyle.value = {
    top: `${rect.bottom + 5}px`,
    left: `${rect.left}px`,
    width: `${Math.max(340, rect.width)}px`
  };
}

function openPicker() {
  const rect = triggerRef.value.getBoundingClientRect();
  panelStyle.value = {
    top: `${rect.bottom + 5}px`,
    left: `${rect.left}px`,
    width: `${Math.max(340, rect.width)}px`
  };
  isOpening.value = true;
  open.value = true;
  query.value = "";
  props.searchFn(""); 
  highlighted.value = 0;

  window.addEventListener('scroll', updatePosition, true);

  nextTick(() => {
    inputRef.value?.focus();
  });
}

function close() {
  open.value = false;
  window.removeEventListener('scroll', updatePosition, true);
}

function select(id) {
  emit('update:modelValue', id);
  close();
}

function highlight(idx) {
  const max = props.results.length - 1;
  if (idx < 0) highlighted.value = max;
  else if (idx > max) highlighted.value = 0;
  else highlighted.value = idx;

  nextTick(() => {
    const el = listRef.value?.children[highlighted.value];
    if (el) el.scrollIntoView({ block: 'nearest' });
  });
}

function selectHighlighted() {
  const item = props.results[highlighted.value];
  if (item) select(item.id || item._id);
}

function handleOutsideClick(e) {
  if (open.value && panelRef.value && !panelRef.value.contains(e.target) && !triggerRef.value.contains(e.target)) {
    close();
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleOutsideClick);
  window.removeEventListener('scroll', updatePosition, true);
});
</script>
