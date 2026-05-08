<template>
  <div class="help-search">
    <b-field label="Buscar en la ayuda" label-position="on-border" custom-class="help-search-label">
      <b-input
        ref="bInputRef"
        :value="modelValue"
        placeholder='"guardar", "pedido", "laboratorio", "aviso", "contraseña"...'
        icon="search"
        size="is-small"
        @input="handleInput"
        @update:modelValue="handleInput"
        @keyup.esc="$emit('clear')"
      />
    </b-field>

    <div v-if="modelValue.trim() && quickMatches.length" class="help-results">
      <div class="help-results__title">
        <b-icon icon="list" size="is-small" class="mr-1" />
        Resultados sugeridos
      </div>
      <div class="help-results__chips">
        <HelpSearchChip
          v-for="m in quickMatches"
          :key="m.id"
          :icon="m.icon"
          :title="m.title"
          :tab-label="tabLabelForSection(m.id)"
          @click="$emit('go-to', m.id)"
        />
      </div>
    </div>

    <p class="help-search-hint">
      Atajos: <strong>/</strong> enfoca la búsqueda · <strong>Esc</strong> limpia.
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import './HelpSearchBar.css';
import HelpSearchChip from './HelpSearchChip.vue';

defineProps({
  modelValue: { type: String, default: '' },
  quickMatches: { type: Array, default: () => [] },
  tabLabelForSection: { type: Function, default: () => '' },
});

const emit = defineEmits(['update:modelValue', 'clear', 'go-to']);

const bInputRef = ref(null);

const handleInput = (payload) => {
  let val = '';
  if (typeof payload === 'string' || typeof payload === 'number') {
    val = String(payload);
  } else {
    const t = payload?.target || payload?.srcElement;
    if (t && typeof t.value !== 'undefined') {
      val = String(t.value ?? '');
    } else if (payload && typeof payload === 'object' && 'value' in payload) {
      val = String(payload.value ?? '');
    }
  }
  emit('update:modelValue', val);
};

const focus = () => {
  const root = bInputRef.value?.$el || bInputRef.value;
  const input = root?.querySelector?.('input');
  if (input) { input.focus(); input.select?.(); }
};

defineExpose({ focus });
</script>
