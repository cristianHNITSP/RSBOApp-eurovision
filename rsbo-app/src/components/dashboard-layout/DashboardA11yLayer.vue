<!-- DashboardA11yLayer.vue -->
<template>
  <div>
    <!-- Background (soft gradients) -->
    <div class="layout-bg" aria-hidden="true"></div>

    <!-- Aviso sin conexión -->
    <b-notification
      v-if="isOffline"
      type="is-danger"
      aria-close-label="Cerrar notificación"
      has-icon
      class="has-text-centered offline-bar"
    >
      No hay conexión a internet. Por favor verifica tu red.
    </b-notification>

    <!-- Aviso sin conexión (loading) -->
    <b-loading
      :active="showLoading"
      :is-full-page="true"
      :can-cancel="false"
      :is-fullscreen="true"
      aria-label="Cargando..."
    >
      <b-icon pack="fas" icon="sync-alt" size="is-large" custom-class="fa-spin" />
    </b-loading>

    <!-- SVG Filter for Liquid Glass effect (iOS 26 Style) -->
    <svg style="visibility: hidden; position: absolute;" width="0" height="0" aria-hidden="true">
      <filter id="liquid-goo">
        <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="goo" />
        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
      </filter>
    </svg>
  </div>
</template>

<script setup>
defineProps({
  isOffline: Boolean,
  showLoading: Boolean
})
</script>

<style scoped>
@import "./DashboardA11yLayer.css";
</style>
