<template>
  <div class="prefs-card" :class="{ 'prefs-card--wide': wide }">
    <div class="prefs-card__head">
      <div class="prefs-title">
        <b-icon :icon="icon" size="is-small" class="mr-2" />
        {{ title }}
      </div>
      <b-tag type="is-light" rounded size="is-small">{{ tag }}</b-tag>
    </div>

    <slot />
  </div>
</template>

<script setup>
import './PrefsCard.css';

defineProps({
  icon:  { type: String, default: '' },
  title: { type: String, default: '' },
  tag:   { type: String, default: '' },
  wide:  { type: Boolean, default: false },
});
</script>
