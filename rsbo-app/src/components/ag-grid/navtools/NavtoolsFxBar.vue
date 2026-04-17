<!-- src/components/ag-grid/navtools/NavtoolsFxBar.vue -->
<template>
  <div class="navtools-card navtools-card--fx">
    <div class="formula-bar-card">
      <b-tag type="is-light" class="formula-fx-tag"> fx </b-tag>

      <b-input
        v-model="internalValue"
        type="text"
        inputmode="numeric"
        placeholder="Selecciona una celda"
        size="is-small"
        class="formula-input"
        @input="$emit('fx-input', $event)"
        @keyup.enter="$emit('apply')"
        @blur="$emit('apply')"
      />

      <b-button
        size="is-small"
        :rounded="true"
        type="is-primary"
        icon-left="check"
        class="formula-apply-button"
        @click="$emit('apply')"
      >
        Aplicar
      </b-button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: [Number, String], default: '' }
})

const emit = defineEmits(['update:modelValue', 'fx-input', 'apply'])

const internalValue = ref(props.modelValue ?? '')
watch(() => props.modelValue, (v) => internalValue.value = v ?? '')
watch(internalValue, (v) => emit('update:modelValue', v))
</script>
