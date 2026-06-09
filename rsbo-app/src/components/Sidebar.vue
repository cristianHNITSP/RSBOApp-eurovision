<template>
  <div class="sidebar-wrapper">
    <aside
      class="sidebar"
      :class="{ 'is-collapsed': isCollapsed }"
      :style="{ width: isCollapsed ? sidebarConfig.WIDTH_COLLAPSED : sidebarConfig.WIDTH_EXPANDED }"
    >
      <!-- Decor overlays (vibe banner) -->
      <div class="sidebar-decor" aria-hidden="true"></div>
      <div class="sidebar-decor sidebar-decor--bottom" aria-hidden="true"></div>

      <!-- HEADER -->
      <SidebarHeader
        :is-collapsed="isCollapsed"
        @toggle="toggleSidebar"
      />

      <!-- MENÚ (modo árbol: submenús inline, igual que en móvil) -->
      <SidebarMenu
        :menu-items="computedMenuItems"
        :is-collapsed="isCollapsed"
        :is-child-active="isChildActive"
        mode="tree"
      />

      <!-- FOOTER USUARIO (avatar + menú: Perfil, Preferencias, Seguridad, Cerrar sesión) -->
      <SidebarFooter
        :loading="loading"
        :avatar-loaded="avatarLoaded"
        :avatar-url="avatarUrl"
        :is-collapsed="isCollapsed"
        :filtered-user="filteredUser"
        @avatar-load="onAvatarLoad"
        @avatar-error="onAvatarError"
        @profile="$emit('profile')"
        @accessibility="$emit('accessibility')"
        @security="$emit('security')"
        @logout="$emit('logout')"
      />
    </aside>

    <!--
      SUBMENU LATERAL (panel flotante) — DESACTIVADO.
      Se conserva comentado para poder retomar el diseño de panel en el futuro.
      Si se reactiva: pasar mode="panel" (o quitar mode) al SidebarMenu de arriba y
      volver a enlazar :active-submenu / @toggle-submenu, además de descomentar
      el import, los métodos (toggleSubmenu/openSubmenu/closeSubmenu/navigateTo)
      y el computed submenuStyles en el bloque <script>.

    <SidebarSubmenuPanel
      ref="submenuRef"
      :active-submenu="activeSubmenu"
      :submenu-styles="submenuStyles"
      :is-active="isActive"
      @close="closeSubmenu"
      @navigate="navigateTo"
    />
    -->
  </div>
</template>

<script>
import SidebarHeader from "./sidebar/SidebarHeader.vue";
import SidebarMenu from "./sidebar/SidebarMenu.vue";
import SidebarFooter from "./sidebar/SidebarFooter.vue";
// Panel flotante de submenú desactivado (modo árbol). Conservar para retomar en el futuro.
// import SidebarSubmenuPanel from "./sidebar/SidebarSubmenuPanel.vue";
import { SIDEBAR_MENU, SIDEBAR_CONFIG } from "../data/sidebar.data";
import { getAvatar, AVATAR_DEFAULTS } from "@/utils/avatarHelper";

export default {
  name: "Sidebar",
  emits: ["toggle", "profile", "accessibility", "security", "logout"],
  components: {
    SidebarHeader,
    SidebarMenu,
    SidebarFooter,
    // SidebarSubmenuPanel
  },
  props: {
    user: { type: Object, default: () => ({ name: "Cargando...", role: "", avatar: "" }) },
    loading: { type: Boolean, default: false },
    collapsed: { type: Boolean, default: false },
    logoeuro: { type: String, default: "https://via.placeholder.com/150x50" },
    pendingOrders: { type: Number, default: 0 },
  },
  data() {
    return {
      isCollapsed: this.collapsed,
      // activeSubmenu: null, // (panel flotante desactivado)
      avatarUrl: AVATAR_DEFAULTS.SIDEBAR,
      avatarLoaded: false,
      sidebarConfig: SIDEBAR_CONFIG
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
        
        // Handle Lab Badge
        if (newItem.children) {
          newItem.children = newItem.children.map(child => {
            if (child.needsBadge === 'lab') {
              return { ...child, badge: labBadge, badgeType: "is-warning" };
            }
            return child;
          });
          
          // If any child has a badge, the parent might need one too
          if (newItem.label === "Ventas" && labBadge) {
            newItem.badge = labBadge;
            newItem.badgeType = "is-warning";
          }
        }
        
        return newItem;
      });
    },
    // submenuStyles() { // (panel flotante desactivado — retomar en el futuro)
    //   return {
    //     position: "fixed",
    //     top: "0",
    //     bottom: "0",
    //     width: this.sidebarConfig.SUBMENU_WIDTH,
    //     left: this.isCollapsed ? this.sidebarConfig.WIDTH_COLLAPSED : this.sidebarConfig.WIDTH_EXPANDED,
    //     zIndex: 20,
    //     transition: "left 0.22s ease",
    //   };
    // },
  },
  watch: {
    collapsed(newVal) {
      this.isCollapsed = !!newVal;
    },
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
    onAvatarLoad() {
      this.avatarLoaded = true;
    },
    onAvatarError() {
      this.avatarUrl = SIDEBAR_CONFIG.DEFAULT_AVATAR;
      this.avatarLoaded = true;
    },
    toggleSidebar() {
      this.isCollapsed = !this.isCollapsed;
      this.$emit("toggle", this.isCollapsed);
    },
    /* === Panel flotante de submenú — DESACTIVADO (modo árbol) ===
       Conservar para retomar el diseño en el futuro.
    toggleSubmenu(item) {
      if (this.activeSubmenu === item) this.closeSubmenu();
      else {
        this.activeSubmenu = item;
        this.$nextTick(() => this.openSubmenu());
      }
    },
    openSubmenu() {
      const submenuEl = this.$refs.submenuRef?.submenu;
      if (!submenuEl) return;

      submenuEl.style.transition = "none";
      submenuEl.style.opacity = 0;
      submenuEl.style.transform = "translateX(-15px) scale(0.96)";
      submenuEl.style.pointerEvents = "none";
      void submenuEl.offsetWidth;

      submenuEl.style.transition = "opacity 0.4s cubic-bezier(0.32, 0.72, 0, 1), transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)";
      submenuEl.style.opacity = 1;
      submenuEl.style.transform = "translateX(0) scale(1)";
      submenuEl.style.pointerEvents = "auto";
    },
    closeSubmenu() {
      const submenuEl = this.$refs.submenuRef?.submenu;
      if (!submenuEl) {
        this.activeSubmenu = null;
        return;
      }

      submenuEl.style.transition = "opacity 0.3s cubic-bezier(0.32, 0.72, 0, 1), transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)";
      submenuEl.style.opacity = 0;
      submenuEl.style.transform = "translateX(-12px) scale(0.97)";
      submenuEl.style.pointerEvents = "none";

      setTimeout(() => {
        this.activeSubmenu = null;
        submenuEl.style.transition = null;
        submenuEl.style.opacity = null;
        submenuEl.style.transform = null;
        submenuEl.style.pointerEvents = null;
      }, 300);
    },
    navigateTo(path) {
      this.$router.push(path);
      this.activeSubmenu = null;
    },
    === fin panel flotante === */
    isActive(path) {
      // Usar fullPath para que coincidan rutas con query params (como ?tab=...)
      return this.$route.fullPath === path || this.$route.path === path;
    },
    isChildActive(children) {
      return children.some((child) => this.isActive(child.path));
    },
  },
};
</script>

<style>
@import "./SidebarBase.css";
</style>
