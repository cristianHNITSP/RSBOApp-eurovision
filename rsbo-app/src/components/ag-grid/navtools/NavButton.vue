<!-- src/components/ag-grid/navtools/NavButton.vue -->
<template>
  <p class="control">
    <b-tooltip :label="tooltip" :position="tooltipPos" :active="!!tooltip">
      <b-button
        class="rbtn"
        :class="extraClass"
        :size="size"
        :icon-left="icon"
        :type="type"
        :disabled="disabled"
        @click="$emit('click', $event)"
      >
        <slot />
      </b-button>
    </b-tooltip>
  </p>
</template>

<script setup>
defineProps({
  tooltip:     { type: String, default: '' },
  tooltipPos:  { type: String, default: 'is-top' },
  icon:        { type: String, default: '' },
  type:        { type: String, default: 'is-light' },
  disabled:    { type: Boolean, default: false },
  size:        { type: String, default: 'is-small' },
  extraClass:  { type: String, default: '' }
})
defineEmits(['click'])
</script>
