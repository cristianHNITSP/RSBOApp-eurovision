<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  showRead: { type: Boolean, default: false },
  hasNotifications: { type: Boolean, default: false }
});

defineEmits(['toggle-read']);
</script>

<template>
  <div v-if="loading" class="empty-state">
    <b-icon pack="fas" icon="spinner" custom-class="fa-spin" />
    <span>Cargando...</span>
  </div>

  <div v-else class="empty-state">
    <b-icon pack="fas" :icon="showRead ? 'bell-slash' : 'bell'" size="is-medium" />
    <span>{{ showRead ? 'Sin notificaciones' : 'Sin notificaciones nuevas' }}</span>
    <button v-if="!showRead && hasNotifications"
            class="show-read-link" @click="$emit('toggle-read')">
      Ver notificaciones leídas
    </button>
  </div>
</template>

<style scoped src="./NotificationEmptyState.css"></style>
