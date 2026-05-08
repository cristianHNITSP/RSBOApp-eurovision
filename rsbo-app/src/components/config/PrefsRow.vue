<template>
  <div class="prefs-row">
    <div class="prefs-row__left">
      <p class="prefs-label">{{ label }}</p>
      <p class="prefs-help">{{ help }}</p>
    </div>

    <div class="prefs-row__right">
      <slot name="control" />
    </div>
  </div>
</template>

<script setup>
import './PrefsRow.css';

defineProps({
  label: { type: String, default: '' },
  help:  { type: String, default: '' },
});
</script>
