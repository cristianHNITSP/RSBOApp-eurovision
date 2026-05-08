<!-- Renders a single step row. Use inside a <div class="help-steps2"> wrapper. -->
<template>
  <div class="help-step2">
    <div class="help-step2__n">
      <template v-if="typeof n === 'number' || /^\d+$/.test(String(n))">{{ n }}</template>
      <b-icon v-else :icon="n" size="is-small" />
    </div>
    <div class="help-step2__body">
      <p class="help-step2__title">{{ title }}</p>
      <p class="help-step2__text">{{ text }}</p>
    </div>
  </div>
</template>

<script setup>
import './HelpStepCard.css';

defineProps({
  n: { type: [Number, String], required: true },
  title: { type: String, required: true },
  text: { type: String, required: true },
});
</script>
