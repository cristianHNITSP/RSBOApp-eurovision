<template>
  <div class="sidebar-wrapper">
    <aside
      class="sidebar"
      :class="{ 'is-collapsed': isCollapsed }"
      :style="{ width: isCollapsed ? '70px' : '240px' }"
    >
      <!-- Decor overlays (vibe banner) -->
      <div class="sidebar-decor" aria-hidden="true"></div>
      <div class="sidebar-decor sidebar-decor--bottom" aria-hidden="true"></div>

      <!-- HEADER -->
      <SidebarHeader
        :is-collapsed="isCollapsed"
        @toggle="toggleSidebar"
      />

      <!-- MENÚ -->
      <SidebarMenu
        :menu-items="menuItems"
        :is-collapsed="isCollapsed"
        :active-submenu="activeSubmenu"
        :is-child-active="isChildActive"
        @toggle-submenu="toggleSubmenu"
      />

      <!-- FOOTER USUARIO -->
      <SidebarFooter
        :loading="loading"
        :avatar-loaded="avatarLoaded"
        :avatar-url="avatarUrl"
        :is-collapsed="isCollapsed"
        :filtered-user="filteredUser"
        @avatar-load="onAvatarLoad"
        @avatar-error="onAvatarError"
      />
    </aside>

    <!-- SUBMENU LATERAL -->
    <SidebarSubmenuPanel
      ref="submenuRef"
      :active-submenu="activeSubmenu"
      :submenu-styles="submenuStyles"
      :is-active="isActive"
      @close="closeSubmenu"
      @navigate="navigateTo"
    />
  </div>
</template>

<script>
import SidebarHeader from "./sidebar/SidebarHeader.vue";
import SidebarMenu from "./sidebar/SidebarMenu.vue";
import SidebarFooter from "./sidebar/SidebarFooter.vue";
import SidebarSubmenuPanel from "./sidebar/SidebarSubmenuPanel.vue";

export default {
  name: "Sidebar",
  components: {
    SidebarHeader,
    SidebarMenu,
    SidebarFooter,
    SidebarSubmenuPanel
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
      activeSubmenu: null,
      avatarUrl: "https://github.com/octocat.png",
      avatarLoaded: false,
    };
  },
  computed: {
    filteredUser() {
      const name = this.user?.name || "Cargando...";
      const role = this.user?.role?.name || this.user?.role || "Usuario";
      return { name, role };
    },
    menuItems() {
      const count = this.pendingOrders;
      const labBadge = count > 0 ? String(count) : null;
      // Roles efectivos en frontend (root va al panel admin, no llega aquí)
      const userRole = this.user?.role?.name || this.user?.role || this.user?.roleName || "";
      const canSeeBackOrders = ["root", "eurovision", "supervisor", "ventas"].includes(String(userRole).toLowerCase());
      return [
        { group: "Principal" },
        { label: "Dashboard", icon: "tachometer-alt", path: "/l/home" },
        { label: "Analíticas", icon: "chart-line", path: "/l/analiticas", badge: "Nuevo", badgeType: "is-success" },
        { group: "Gestión" },
        { label: "Usuarios", icon: "users", path: "/l/usuarios" },
        {
          label: "Inventario",
          icon: "box-open",
          children: [
            { label: "Bases y Micas", icon: "glasses", path: "/l/inventario/bases-micas" },
            { label: "Óptica", icon: "eye", path: "/l/inventario/optica" },
            { label: "Lentes de Contacto", icon: "circle", path: "/l/inventario/lentes-contacto" },
          ],
        },
        {
          label: "Ventas",
          icon: "shopping-cart",
          badge: labBadge,
          badgeType: "is-warning",
          children: [
            { label: "Laboratorio", icon: "flask", path: "/l/ventas/laboratorio", badge: labBadge, badgeType: "is-warning" },
            { label: "Bases y Micas", icon: "glasses", path: "/l/ventas/bases-micas" },
            { label: "Óptica", icon: "eye", path: "/l/ventas/optica" },
            { label: "Lentes de Contacto", icon: "circle", path: "/l/ventas/lentes-contacto" },
            { label: "Historial", icon: "history", path: "/l/ventas/historial" },
            { label: "Mermas", icon: "trash-can", path: "/l/mermas" },
          ],
        },
        { label: "Devoluciones", icon: "rotate-left", path: "/l/devoluciones" },
        ...(canSeeBackOrders ? [{ label: "Encargos", icon: "clipboard-list", path: "/l/encargos" }] : []),
        { group: "Otros" },
        { label: "Ajustes", icon: "cog", path: "/l/config.panel" },
        { label: "Ayuda", icon: "question-circle", path: "/l/Ayuda" },
      ];
    },
    submenuStyles() {
      return {
        position: "fixed",
        top: "0",
        bottom: "0",
        width: "260px",
        left: this.isCollapsed ? "70px" : "240px",
        zIndex: 20,
        transition: "left 0.22s ease",
      };
    },
  },
  watch: {
    collapsed(newVal) {
      this.isCollapsed = !!newVal;
    },
    user: {
      immediate: true,
      handler(newUser) {
        let avatar = newUser?.avatar ? String(newUser.avatar).trim() : "";
        if (!avatar) avatar = "https://github.com/octocat.png";

        this.avatarLoaded = false;
        this.$nextTick(() => {
          this.avatarUrl = avatar;
          const img = new Image();
          img.src = avatar;
          img.onload = () => (this.avatarLoaded = true);
          img.onerror = () => {
            this.avatarUrl = "https://github.com/octocat.png";
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
      this.avatarUrl = "https://github.com/octocat.png";
      this.avatarLoaded = true;
    },
    toggleSidebar() {
      this.isCollapsed = !this.isCollapsed;
      this.$emit("toggle", this.isCollapsed);
    },
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

      // iOS-style fluid spring transition
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
    isActive(path) {
      return this.$route.path === path;
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
