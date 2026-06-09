<template>
  <div class="sidebar-mobile-wrapper">
    <aside class="sidebar-mobile">
      <div class="sidebar-decor" aria-hidden="true"></div>

      <SidebarHeader
        :is-collapsed="false"
        @toggle="$emit('close')"
      />

      <SidebarMenu
        :menu-items="computedMenuItems"
        :is-collapsed="false"
        :is-child-active="isChildActive"
        mode="tree"
        @navigate="$emit('close')"
      />

      <SidebarFooter
        :loading="loading"
        :avatar-loaded="avatarLoaded"
        :avatar-url="avatarUrl"
        :is-collapsed="false"
        :filtered-user="filteredUser"
        @avatar-load="onAvatarLoad"
        @avatar-error="onAvatarError"
        @profile="onUserAction('profile')"
        @accessibility="onUserAction('accessibility')"
        @security="onUserAction('security')"
        @logout="onUserAction('logout')"
      />
    </aside>
  </div>
</template>

<script>
import SidebarHeader from "./sidebar/SidebarHeader.vue";
import SidebarMenu from "./sidebar/SidebarMenu.vue";
import SidebarFooter from "./sidebar/SidebarFooter.vue";
import { SIDEBAR_MENU } from "../data/sidebar.data";
import { getAvatar, AVATAR_DEFAULTS } from "@/utils/avatarHelper";

export default {
  name: "SidebarMobile",
  emits: ["close", "profile", "accessibility", "security", "logout"],
  components: {
    SidebarHeader,
    SidebarMenu,
    SidebarFooter
  },
  props: {
    user: { type: Object, default: () => ({ name: "Cargando...", role: "", avatar: "" }) },
    loading: { type: Boolean, default: false },
    pendingOrders: { type: Number, default: 0 },
  },
  data() {
    return {
      activeSubmenu: null,
      avatarUrl: AVATAR_DEFAULTS.SIDEBAR,
      avatarLoaded: false,
    };
  },
  computed: {
    filteredUser() {
      const name = this.user?.name || "Cargando...";
      const role = this.user?.role?.name || this.user?.role || "Usuario";
      return { name, role };
    },
    computedMenuItems() {
      const count = this.pendingOrders;
      const labBadge = count > 0 ? String(count) : null;
      const userRole = String(this.user?.role?.name || this.user?.role || this.user?.roleName || "").toLowerCase();

      return SIDEBAR_MENU.filter(item => {
        if (item.roles && !item.roles.includes(userRole)) return false;
        return true;
      }).map(item => {
        const newItem = { ...item };
        if (newItem.children) {
          newItem.children = newItem.children.map(child => {
            if (child.needsBadge === 'lab') {
              return { ...child, badge: labBadge, badgeType: "is-warning" };
            }
            return child;
          });
          if (newItem.label === "Ventas" && labBadge) {
            newItem.badge = labBadge;
            newItem.badgeType = "is-warning";
          }
        }
        return newItem;
      });
    },
  },
  watch: {
    user: {
      immediate: true,
      handler(newUser) {
        const avatar = getAvatar(newUser?.avatar, 'SIDEBAR');

        this.avatarLoaded = false;
        this.$nextTick(() => {
          this.avatarUrl = avatar;
          const img = new Image();
          img.src = avatar;
          img.onload = () => (this.avatarLoaded = true);
          img.onerror = () => {
            this.avatarUrl = AVATAR_DEFAULTS.SIDEBAR;
            this.avatarLoaded = true;
          };
        });
      },
    },
  },
  methods: {
    onAvatarLoad() { this.avatarLoaded = true; },
    onAvatarError() { this.avatarUrl = AVATAR_DEFAULTS.SIDEBAR; this.avatarLoaded = true; },
    onUserAction(action) {
      // Propaga la acción al layout y cierra el overlay móvil.
      this.$emit(action);
      this.$emit('close');
    },
    navigateTo(path) {
      this.$router.push(path);
      this.$emit('close');
    },
    isActive(path) { return this.$route.fullPath === path || this.$route.path === path; },
    isChildActive(children) { return children.some((child) => this.isActive(child.path)); },
  }
};
</script>

<style>
@import "./SidebarBaseMobile.css";
</style>
