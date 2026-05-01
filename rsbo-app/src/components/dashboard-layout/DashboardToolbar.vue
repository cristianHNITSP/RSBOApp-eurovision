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

        <b-dropdown position="is-bottom-left" aria-role="menu" append-to-body class="user-dd">
          <template #trigger>
            <b-button class="toolbar-user" type="is-primary" icon-right="user-circle" label="Usuario" />
          </template>

          <b-dropdown-item aria-role="menu-item" @click="$emit('profile')" class="dropmenu-is-light">
            <b-icon icon="user" size="is-small" />&nbsp; Perfil
          </b-dropdown-item>

          <b-dropdown-item aria-role="menu-item" @click="$emit('accessibility')" class="dropmenu-is-light">
            <b-icon icon="universal-access" size="is-small" />&nbsp; Accesibilidad
          </b-dropdown-item>

          <b-dropdown-item aria-role="menu-item" @click="$emit('security')" class="dropmenu-is-light">
            <b-icon icon="shield-alt" size="is-small" />&nbsp; Seguridad
          </b-dropdown-item>

          <hr class="dropdown-divider" />

          <b-dropdown-item aria-role="menu-item" @click="$emit('logout')" class="dropmenu-is-light">
            <b-icon icon="sign-out-alt" size="is-small" />&nbsp; Cerrar sesión
          </b-dropdown-item>
        </b-dropdown>

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

defineEmits(['toggle-notifications', 'profile', 'accessibility', 'security', 'logout'])
</script>

<style scoped>
@import "./DashboardToolbar.css";
</style>
