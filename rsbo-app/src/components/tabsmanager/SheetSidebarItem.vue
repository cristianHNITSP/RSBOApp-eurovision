<script setup>
import { computed } from 'vue';

const props = defineProps({
  sheet: { type: Object, required: true },
  active: { type: Boolean, default: false },
  isResult: { type: Boolean, default: false },
  showClose: { type: Boolean, default: false }
});

const emits = defineEmits(['select', 'close']);

const classes = computed(() => ({
  'ssi': true,
  'is-active': props.active,
  'is-result': props.isResult
}));

const categoryBadge = computed(() => {
  // Simulación de categoría basada en el SKU o tipo de planilla
  if (props.sheet.sku?.startsWith('SPH')) return 'SPH';
  if (props.sheet.sku?.startsWith('BASE')) return 'BASE';
  return 'GEN';
});
</script>

<template>
  <div :class="classes" @click="$emit('select', sheet)">
    <div class="ssi-cat-badge">{{ categoryBadge }}</div>
    
    <div class="ssi-text">
      <div class="ssi-name">{{ sheet.name || sheet.nombre }}</div>
      <div class="ssi-sku">{{ sheet.sku || 'N/A' }}</div>
    </div>

    <button 
      v-if="showClose"
      class="ssi-close" 
      @click.stop="$emit('close', sheet.id)"
      title="Cerrar planilla"
    >
      <i class="fas fa-times"></i>
    </button>
  </div>
</template>
