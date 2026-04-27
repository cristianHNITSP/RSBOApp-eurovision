<script setup>
import CreateSheetForm from './CreateSheetForm.vue';

defineProps({
  // Props forwarded to CreateSheetForm
});

defineEmits(['create']);
</script>

<template>
  <div class="empty-workspace">
    <div class="ew-card glass-shell">
      <CreateSheetForm v-bind="$attrs" />
    </div>
  </div>
</template>

<style scoped>
/* Estilos se manejan en TabsManager.css o se pueden poner aquí si se prefiere encapsular */
</style>
