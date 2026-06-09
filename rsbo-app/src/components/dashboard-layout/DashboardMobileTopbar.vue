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
      <!-- Buscador: Buefy convierte el dropdown en modal nativo en móvil -->
      <GlobalSearch class="mobile-topbar__search" />

      <ScanMenu />

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

      <!-- El menú de usuario (Perfil/Preferencias/Seguridad/Cerrar sesión) vive ahora en el footer de la sidebar -->
    </div>
  </div>
</template>

<script setup>
import MenuToggle from "../MenuToggle.vue";
import GlobalSearch from "../search/GlobalSearch.vue";
import ScanMenu from "../scan/ScanMenu.vue";

defineProps({
  pageTitle: String,
  currentRouteName: String,
  showPanel: Boolean,
  bellRinging: Boolean,
  unreadNotifications: Number
})

defineEmits(['toggle-sidebar', 'toggle-notifications'])
</script>

<style scoped>
@import "./DashboardMobileTopbar.css";


</style>
