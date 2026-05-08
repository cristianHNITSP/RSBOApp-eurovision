<!-- Individual search result chip button. -->
<template>
  <button class="help-index__chip" type="button" @click="$emit('click')">
    <b-icon :icon="icon" size="is-small" class="mr-1" />
    {{ title }}
    <span class="help-chip-tab-badge">{{ tabLabel }}</span>
  </button>
</template>

<script setup>
import './HelpSearchChip.css';

defineProps({
  icon: { type: String, required: true },
  title: { type: String, required: true },
  tabLabel: { type: String, default: '' },
});

defineEmits(['click']);
</script>
