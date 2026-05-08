<template>
  <div class="period-selector">
    <div class="buttons has-addons">
      <b-button size="is-small" :type="modelValue === '1d' ? 'is-primary' : 'is-light'" @click="$emit('update:modelValue', '1d')">Diario</b-button>
      <b-button size="is-small" :type="modelValue === '7d' ? 'is-primary' : 'is-light'" @click="$emit('update:modelValue', '7d')">Semanal</b-button>
      <b-button size="is-small" :type="modelValue === '30d' ? 'is-primary' : 'is-light'" @click="$emit('update:modelValue', '30d')">Mensual</b-button>
      <b-button size="is-small" :type="modelValue === '90d' ? 'is-primary' : 'is-light'" @click="$emit('update:modelValue', '90d')">Trimestral</b-button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    default: '30d'
  }
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.period-selector {
  display: inline-flex;
}
</style>
