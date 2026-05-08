<template>
  <div class="help-note">
    <b-icon :icon="icon" size="is-small" class="mr-1" />
    <span><slot /></span>
  </div>
</template>

<script setup>
import './HelpNoteBox.css';

defineProps({
  icon: { type: String, default: 'info-circle' },
});
</script>
