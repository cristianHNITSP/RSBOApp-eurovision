<template>
  <article :id="id" :class="['help-card', support && 'help-card--support', 'help-anchor']">
    <header class="help-card-header">
      <div class="help-card-title-block">
        <b-icon :icon="icon" size="is-small" class="mr-2" />
        <h3>{{ title }}</h3>
      </div>
      <slot name="badge" />
    </header>
    <slot />
  </article>
</template>

<script setup>
import './HelpCard.css';

defineProps({
  id: { type: String, required: true },
  icon: { type: String, required: true },
  title: { type: String, required: true },
  support: { type: Boolean, default: false },
});
</script>
