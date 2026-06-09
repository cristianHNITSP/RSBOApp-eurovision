<template>
  <div class="dashboard-toolbar">
    <!-- LEFT -->
    <div class="dashboard-toolbar__left">
      <div class="breadcrumb-wrapper">
        <b-breadcrumb separator="succeeds" size="is-small" class="is-size-7-mobile">
          <b-breadcrumb-item href="/l/home">Dashboard</b-breadcrumb-item>
          <b-breadcrumb-item active>{{ currentRouteName }}</b-breadcrumb-item>
        </b-breadcrumb>
      </div>

      <div class="page-heading">
        <h1 class="dashboard-title">{{ pageTitle }}</h1>
      </div>
    </div>

    <!-- CENTER -->
    <div class="dashboard-toolbar__center">
      <slot name="search" />
    </div>

    <!-- RIGHT -->
    <div class="dashboard-toolbar__right">
      <div class="dashboard-actions">
        <b-tooltip label="Notificaciones" position="is-bottom" append-to-body :triggers="['hover']">
          <div class="has-badge-wrapper">
            <b-button class="toolbar-btn" type="is-light" :icon-right="showPanel ? 'close' : 'bell'"
              :class="{ 'bell-btn--ringing': bellRinging && !showPanel }" @click="$emit('toggle-notifications')" />
            <transition name="badge-fade">
              <b-tag v-if="unreadNotifications > 0" type="is-primary" size="is-small" rounded class="is-badge">
                {{ unreadNotifications }}
              </b-tag>
            </transition>
          </div>
        </b-tooltip>

        <!-- El menú de usuario (Perfil/Preferencias/Seguridad/Cerrar sesión) vive ahora en el footer de la sidebar -->
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  currentRouteName: String,
  pageTitle: String,
  showPanel: Boolean,
  bellRinging: Boolean,
  unreadNotifications: Number
})

defineEmits(['toggle-notifications'])
</script>

<style scoped>
@import "./DashboardToolbar.css";
</style>
