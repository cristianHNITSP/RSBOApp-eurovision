<template>
  <div class="mobile-topbar">
    <div class="mobile-topbar__left">
      <MenuToggle @click="$emit('toggle-sidebar')" />
      <div class="mobile-title-wrap">
        <div class="mobile-title">{{ pageTitle }}</div>
        <div class="mobile-subtitle">{{ currentRouteName }}</div>
      </div>
    </div>

    <div class="mobile-topbar__right">
      <b-tooltip label="Buscar" position="is-bottom" append-to-body>
        <b-button
          class="toolbar-btn"
          type="is-light"
          icon-pack="fas"
          icon-left="search"
          @click="$emit('toggle-search')"
        />
      </b-tooltip>

      <b-tooltip label="Notificaciones" position="is-bottom" append-to-body>
        <div class="has-badge-wrapper">
          <b-button
            class="toolbar-btn"
            type="is-light"
            :icon-right="showPanel ? 'close' : 'bell'"
            :class="{ 'bell-btn--ringing': bellRinging && !showPanel }"
            @click="$emit('toggle-notifications')"
          />
          <transition name="badge-fade">
            <b-tag v-if="unreadNotifications > 0" type="is-primary" size="is-small" rounded class="is-badge">
              {{ unreadNotifications }}
            </b-tag>
          </transition>
        </div>
      </b-tooltip>

      <b-dropdown position="is-bottom-left" aria-role="menu" append-to-body class="mobile-more">
        <template #trigger>
          <b-button class="toolbar-btn" type="is-light" icon-pack="fas" icon-left="ellipsis-v" />
        </template>

        <b-dropdown-item aria-role="menu-item" @click="$emit('profile')">
          <b-icon icon="user" size="is-small" />&nbsp; Perfil
        </b-dropdown-item>

        <b-dropdown-item aria-role="menu-item" @click="$emit('settings')">
          <b-icon icon="cog" size="is-small" />&nbsp; Configuración
        </b-dropdown-item>

        <hr class="dropdown-divider" />

        <b-dropdown-item aria-role="menu-item" @click="$emit('logout')">
          <b-icon icon="sign-out-alt" size="is-small" />&nbsp; Cerrar sesión
        </b-dropdown-item>
      </b-dropdown>
    </div>
  </div>
</template>

<script setup>
import MenuToggle from "../MenuToggle.vue";

defineProps({
  pageTitle: String,
  currentRouteName: String,
  showPanel: Boolean,
  bellRinging: Boolean,
  unreadNotifications: Number
})

defineEmits(['toggle-sidebar', 'toggle-search', 'toggle-notifications', 'profile', 'settings', 'logout'])
</script>

<style scoped>
@import "./DashboardMobileTopbar.css";
</style>
