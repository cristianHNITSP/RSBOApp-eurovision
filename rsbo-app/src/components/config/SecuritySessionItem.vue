<template>
  <div class="session-item" :class="{ 'session-item--current': session.isCurrent }">
    <div class="session-item__icon">
      <b-icon pack="fas" :icon="getOsIcon(session)" size="is-medium" />
    </div>

    <div class="session-item__info">
      <div class="session-item__device">
        {{ getDisplayDevice(session) }}
        <b-tag v-if="session.isCurrent" type="is-success" size="is-small" rounded class="ml-2">
          Esta sesión
        </b-tag>
      </div>

      <div class="session-item__meta">
        <span v-if="session.deviceInfo?.ip" class="session-meta-item">
          <b-icon pack="fas" icon="map-marker-alt" size="is-small" />
          <b-tooltip :label="session.deviceInfo.ip" position="is-top" append-to-body>
            {{ ipCache[session.deviceInfo.ip] || session.deviceInfo.ip }}
          </b-tooltip>
        </span>

        <span class="session-meta-item">
          <b-icon pack="fas" icon="clock" size="is-small" />
          {{ session.lastUsedAt
            ? 'Activo ' + timeAgo(session.lastUsedAt)
            : 'Inicio ' + timeAgo(session.createdAt) }}
        </span>

        <span v-if="session.expiresAt" class="session-meta-item">
          <b-icon pack="fas" icon="hourglass-half" size="is-small" />
          Expira {{ timeAgo(session.expiresAt, true) }}
        </span>
      </div>
    </div>

    <div class="session-item__actions">
      <b-tooltip
        v-if="!session.isCurrent"
        label="Cerrar esta sesión"
        position="is-left"
        append-to-body
      >
        <b-button
          type="is-danger is-light"
          size="is-small"
          icon-pack="fas"
          icon-left="times"
          :loading="revokingId === session.id"
          @click="$emit('revoke', session.id)"
        />
      </b-tooltip>

      <b-icon v-else pack="fas" icon="check-circle" class="current-icon" />
    </div>
  </div>
</template>

<script setup>
import './SecuritySessionItem.css';

defineProps({
  session:           { type: Object,   default: () => ({}) },
  revokingId:        { type: String,   default: null },
  ipCache:           { type: Object,   default: () => ({}) },
  getDisplayDevice:  { type: Function, default: () => 'Dispositivo desconocido' },
  getOsIcon:         { type: Function, default: () => 'laptop' },
  timeAgo:           { type: Function, default: () => '' },
});

defineEmits(['revoke']);
</script>
