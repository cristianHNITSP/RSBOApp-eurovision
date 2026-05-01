<script setup>
defineProps({
  loading: { type: Boolean, default: false },
});
</script>

<template>
  <div v-if="loading" class="empty-state">
    <b-icon pack="fas" icon="spinner" custom-class="fa-spin" />
    <span>Cargando...</span>
  </div>

  <div v-else class="empty-state">
    <b-icon pack="fas" icon="bell-slash" size="is-medium" />
    <span>Sin notificaciones</span>
  </div>
</template>

<style scoped src="./NotificationEmptyState.css"></style>
