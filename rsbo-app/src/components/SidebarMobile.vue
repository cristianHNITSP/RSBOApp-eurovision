<template>
  <div class="sidebar-mobile-wrapper">
    <aside class="sidebar-mobile">
      <!-- Decor overlays -->
      <div class="sidebar-decor" aria-hidden="true"></div>

      <!-- HEADER -->
      <SidebarHeader
        :is-collapsed="false"
        @toggle="$emit('close')"
      />

      <!-- MENÚ -->
      <SidebarMenu
        :menu-items="menuItems"
        :is-collapsed="false"
        :is-child-active="isChildActive"
        mode="tree"
        @navigate="$emit('close')"
      />

      <!-- FOOTER USUARIO -->
      <SidebarFooter
        :loading="loading"
        :avatar-loaded="avatarLoaded"
        :avatar-url="avatarUrl"
        :is-collapsed="false"
        :filtered-user="filteredUser"
        @avatar-load="onAvatarLoad"
        @avatar-error="onAvatarError"
      />
    </aside>
  </div>
</template>

<script>
import SidebarHeader from "./sidebar/SidebarHeader.vue";
import SidebarMenu from "./sidebar/SidebarMenu.vue";
import SidebarFooter from "./sidebar/SidebarFooter.vue";

export default {
  name: "SidebarMobile",
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
            { label: "Bases y Micas", icon: "glasses", path: "/l/ventas/bases-micas", badge: labBadge, badgeType: "is-warning" },
            { label: "Óptica", icon: "eye", path: "/l/ventas/optica" },
            { label: "Lentes de Contacto", icon: "circle", path: "/l/ventas/lentes-contacto" },
          ],
        },
        { label: "Devoluciones", icon: "rotate-left", path: "/l/devoluciones" },
        { group: "Otros" },
        { label: "Ajustes", icon: "cog", path: "/l/config.panel" },
        { label: "Ayuda", icon: "question-circle", path: "/l/Ayuda" },
      ];
    },
  },
  watch: {
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
    onAvatarLoad() { this.avatarLoaded = true; },
    onAvatarError() { this.avatarUrl = "https://github.com/octocat.png"; this.avatarLoaded = true; },
    navigateTo(path) {
      this.$router.push(path);
      this.$emit('close');
    },
    isActive(path) { return this.$route.path === path; },
    isChildActive(children) { return children.some((child) => this.isActive(child.path)); },
  }
};
</script>

<style>
@import "./SidebarBaseMobile.css";
</style>
