<script setup>
defineProps({
  unreadCount: { type: Number, default: 0 },
  showRead: { type: Boolean, default: false }
});

defineEmits(['close', 'toggle-read', 'mark-all-read']);
</script>

<template>
  <header class="panel-heading">
    <div class="panel-heading-left">
      <b-icon pack="fas" icon="bell" size="is-small" class="panel-bell-icon" />
      <span class="panel-title">Notificaciones</span>
      <transition name="badge-pop">
        <b-tag v-if="unreadCount > 0" type="is-primary" size="is-small" rounded class="panel-unread-badge">
          {{ unreadCount }}
        </b-tag>
      </transition>
    </div>

    <div class="panel-actions">
      <!-- Toggle leídas -->
      <b-tooltip :label="showRead ? 'Ocultar leídas' : 'Mostrar leídas'"
                 position="is-left" append-to-body>
        <b-button :type="showRead ? 'is-primary' : 'is-ghost'"
                  icon-pack="fas" icon-left="eye"
                  size="is-small" @click="$emit('toggle-read')" />
      </b-tooltip>

      <!-- Marcar todas leídas -->
      <b-tooltip v-if="unreadCount > 0" label="Marcar todas como leídas"
                 position="is-left" append-to-body>
        <b-button type="is-ghost" icon-pack="fas" icon-left="check-double"
                  size="is-small" @click="$emit('mark-all-read')" />
      </b-tooltip>

      <!-- Cerrar -->
      <b-button type="is-ghost" icon-pack="fas" icon-left="times"
                size="is-small" @click="$emit('close')" aria-label="Cerrar" />
    </div>
  </header>
</template>

<style scoped src="./NotificationHeader.css"></style>
