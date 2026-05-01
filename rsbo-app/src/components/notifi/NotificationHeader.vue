<script setup>
defineEmits(['close']);
</script>

<template>
  <header class="panel-heading">
    <div class="panel-heading-left">
      <b-icon pack="fas" icon="bell" size="is-small" class="panel-bell-icon" />
      <span class="panel-title">Notificaciones</span>
    </div>

    <div class="panel-actions">
      <!-- Cerrar -->
      <b-button type="is-ghost" icon-pack="fas" icon-left="times"
                size="is-small" @click="$emit('close')" aria-label="Cerrar" />
    </div>
  </header>
</template>

<style scoped src="./NotificationHeader.css"></style>
