<!-- A single quick-tip card. Render 3 inside a <div class="help-quick"> wrapper. -->
<template>
  <div class="help-quick__card">
    <div class="help-quick__icon">
      <b-icon :icon="icon" size="is-small" />
    </div>
    <div>
      <p class="help-quick__title">{{ title }}</p>
      <p class="help-quick__text"><slot /></p>
    </div>
  </div>
</template>

<script setup>
import './HelpQuickTip.css';

defineProps({
  icon: { type: String, required: true },
  title: { type: String, required: true },
});
</script>
