<template>
  <div class="sidebar-footer">
    <div class="sidebar-footer-inner" v-if="!loading">
      <!-- Menú de usuario: popover que sube (Perfil, Preferencias, Seguridad, Cerrar sesión) -->
      <b-dropdown
        class="user-menu-dd"
        :class="{ 'is-collapsed': isCollapsed }"
        position="is-top-right"
        aria-role="menu"
        append-to-body
        :mobile-modal="false"
        expanded
      >
        <template #trigger="{ active }">
          <div
            class="user-profile is-clickable"
            :class="{ 'is-open': active }"
            role="button"
            tabindex="0"
            :title="isCollapsed ? filteredUser.name : ''"
          >
            <div class="user-avatar">
              <b-skeleton
                v-if="!avatarLoaded"
                :width="34"
                :height="34"
                :animated="true"
                style="border-radius:50%;"
              />
              <img
                v-else
                :key="avatarUrl"
                class="is-rounded"
                :src="avatarUrl"
                alt="Avatar"
                @load="$emit('avatar-load')"
                @error="$emit('avatar-error')"
              />
            </div>

            <div class="user-info" v-if="!isCollapsed">
              <span class="user-name">{{ filteredUser.name }}</span>
              <span class="user-role">{{ filteredUser.role }}</span>
            </div>

            <b-icon
              v-if="!isCollapsed"
              icon="chevron-up"
              size="is-small"
              class="user-menu-caret"
            />
          </div>
        </template>

        <!-- Cabecera del menú con nombre + rol -->
        <div class="user-menu-head">
          <span class="user-menu-head__name">{{ filteredUser.name }}</span>
          <span class="user-menu-head__role">{{ filteredUser.role }}</span>
        </div>

        <hr class="dropdown-divider" />

        <b-dropdown-item aria-role="menu-item" @click="$emit('profile')">
          <b-icon icon="user" size="is-small" />&nbsp; Perfil
        </b-dropdown-item>

        <b-dropdown-item aria-role="menu-item" @click="$emit('accessibility')">
          <b-icon icon="sliders-h" size="is-small" />&nbsp; Preferencias
        </b-dropdown-item>

        <b-dropdown-item aria-role="menu-item" @click="$emit('security')">
          <b-icon icon="shield-alt" size="is-small" />&nbsp; Seguridad
        </b-dropdown-item>

        <hr class="dropdown-divider" />

        <b-dropdown-item aria-role="menu-item" class="user-menu-logout" @click="$emit('logout')">
          <b-icon icon="sign-out-alt" size="is-small" />&nbsp; Cerrar sesión
        </b-dropdown-item>
      </b-dropdown>
    </div>
  </div>
</template>

<script setup>
defineProps({
  loading: Boolean,
  avatarLoaded: Boolean,
  avatarUrl: String,
  isCollapsed: Boolean,
  filteredUser: Object
})

defineEmits(['avatar-load', 'avatar-error', 'profile', 'accessibility', 'security', 'logout'])
</script>

<style scoped>
@import "./SidebarFooter.css";
</style>
