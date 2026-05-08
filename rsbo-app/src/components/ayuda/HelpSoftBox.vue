<template>
  <div class="help-soft">
    <div class="help-soft__title">
      <b-icon :icon="icon" size="is-small" />
      {{ title }}
    </div>
    <p class="help-soft__text"><slot /></p>
  </div>
</template>

<script setup>
import './HelpSoftBox.css';

defineProps({
  icon: { type: String, default: 'info-circle' },
  title: { type: String, required: true },
});
</script>
