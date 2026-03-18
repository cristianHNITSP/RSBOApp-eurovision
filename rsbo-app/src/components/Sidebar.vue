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
      <div class="sidebar-header">
        <!-- Logo + título -->
        <div class="sidebar-brand" v-if="!isCollapsed">
          <figure class="sidebar-logo">
            <img :src="logoeuro" alt="Logo RSBO" />
          </figure>
          <div class="sidebar-brand-text">
            <span class="sidebar-brand-title">RSBO</span>
            <span class="sidebar-brand-subtitle">Laboratorio Eurovisión</span>
          </div>
        </div>

        <!-- Logo compacto -->
        <div v-else class="sidebar-brand sidebar-brand--compact">
          <figure class="sidebar-logo sidebar-logo--compact">
            <img :src="logoeuro" alt="Logo RSBO" />
          </figure>
        </div>

        <!-- Toggle -->
        <b-button
          class="sidebar-toggle"
          type="is-text"
          rounded
          @click="toggleSidebar"
          :icon-right="isCollapsed ? 'arrow-right' : 'arrow-left'"
        />
      </div>

      <!-- MENÚ -->
      <div class="sidebar-menu">
        <template v-for="(item, index) in menuItems" :key="index">
          <!-- GRUPO -->
          <div v-if="item.group" class="menu-group">
            <span class="menu-group-title" v-if="!isCollapsed">{{ item.group }}</span>
            <span class="menu-group-divider" v-if="!isCollapsed"></span>
          </div>

          <!-- ITEM CON SUBMENU -->
          <div
            v-else-if="item.children"
            class="menu-item has-submenu is-clickable"
            :class="{ 'is-active': isChildActive(item.children) }"
            @click="toggleSubmenu(item)"
            :title="isCollapsed ? item.label : ''"
            role="button"
            tabindex="0"
          >
            <div class="menu-item-inner">
              <span class="menu-item-icon" style="position:relative;">
                <b-icon :icon="item.icon" size="is-small" />
                <span v-if="item.badge && isCollapsed" class="menu-item-dot-badge">{{ item.badge }}</span>
              </span>
              <span v-if="!isCollapsed" class="menu-item-label">
                {{ item.label }}
              </span>
            </div>

            <b-tag
              v-if="item.badge && !isCollapsed"
              class="menu-item-badge"
              rounded
              :type="item.badgeType || 'is-primary'"
            >
              {{ item.badge }}
            </b-tag>

            <b-icon
              v-if="!isCollapsed"
              icon="angle-right"
              size="is-small"
              class="menu-item-chevron"
              :class="{ 'is-open': activeSubmenu && activeSubmenu.label === item.label }"
            />
          </div>

          <!-- ITEM NORMAL -->
          <router-link
            v-else
            :to="item.path"
            class="menu-item"
            active-class="is-active"
            exact-active-class="is-exact-active"
            :title="isCollapsed ? item.label : ''"
          >
            <div class="menu-item-inner">
              <span class="menu-item-icon">
                <b-icon :icon="item.icon" size="is-small" />
              </span>
              <span class="menu-item-label" v-if="!isCollapsed">
                {{ item.label }}
              </span>
            </div>

            <b-tag
              v-if="item.badge && !isCollapsed"
              class="menu-item-badge"
              rounded
              :type="item.badgeType || 'is-primary'"
            >
              {{ item.badge }}
            </b-tag>
          </router-link>
        </template>
      </div>

      <!-- FOOTER USUARIO -->
      <div class="sidebar-footer">
        <div class="sidebar-footer-inner" v-if="!loading">
          <div class="user-profile">
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
                @load="onAvatarLoad"
                @error="onAvatarError"
              />
            </div>

            <div class="user-info" v-if="!isCollapsed">
              <span class="user-name">{{ filteredUser.name }}</span>
              <span class="user-role">{{ filteredUser.role }}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- SUBMENU LATERAL -->
    <aside
      v-if="activeSubmenu"
      ref="submenu"
      class="submenu-panel"
      :style="submenuStyles"
    >
      <div class="submenu-header">
        <div class="submenu-header-main">
          <span class="submenu-pill">Módulo</span>
          <span class="submenu-title">
            {{ activeSubmenu.label }}
          </span>
        </div>
        <b-button
          type="is-text"
          size="is-small"
          icon-right="times"
          class="submenu-close"
          @click="closeSubmenu"
        />
      </div>

      <div class="submenu-body">
        <p class="submenu-hint">Selecciona una sección:</p>
        <nav class="submenu-list">
          <a
            v-for="(sub, index) in activeSubmenu.children"
            :key="index"
            class="submenu-item"
            :class="{ 'is-active': isActive(sub.path) }"
            @click="navigateTo(sub.path)"
          >
            <span class="submenu-item-bar"></span>
            <span class="submenu-item-icon">
              <b-icon :icon="sub.icon" size="is-small" />
            </span>
            <span class="submenu-item-label">{{ sub.label }}</span>
            <b-tag
              v-if="sub.badge"
              class="submenu-item-badge"
              rounded
              :type="sub.badgeType || 'is-warning'"
              size="is-small"
            >{{ sub.badge }}</b-tag>
          </a>
        </nav>
      </div>
    </aside>

    <!-- OVERLAY -->
    <div v-if="activeSubmenu" class="submenu-overlay" @click="closeSubmenu"></div>
  </div>
</template>

<script>
export default {
  name: "Sidebar",
  props: {
    user: { type: Object, default: () => ({ name: "Cargando...", role: "", avatar: "" }) },
    loading: { type: Boolean, default: false },
    collapsed: { type: Boolean, default: false },
    logoeuro: { type: String, default: "https://via.placeholder.com/150x50" },
    pendingOrders: { type: Number, default: 0 },
  },
  data() {
    const saved = localStorage.getItem("sidebar-collapsed");
    let collapsed = this.collapsed;
    if (saved !== null) collapsed = saved === "true";
    else if (typeof window !== "undefined" && window.innerWidth <= 770) collapsed = true;

    return {
      isCollapsed: collapsed,
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
        { label: "Dashboard", icon: "tachometer-alt", path: "/layouts/home" },
        { label: "Analíticas", icon: "chart-line", path: "/layouts/analiticas", badge: "Nuevo", badgeType: "is-success" },
        { group: "Gestión" },
        { label: "Usuarios", icon: "users", path: "/layouts/usuarios" },
        {
          label: "Inventario",
          icon: "box-open",
          children: [
            { label: "Bases y Micas", icon: "glasses", path: "/layouts/inventario/bases-micas" },
            { label: "Óptica", icon: "eye", path: "/layouts/inventario/optica" },
            { label: "Lentes de Contacto", icon: "circle", path: "/layouts/inventario/lentes-contacto" },
          ],
        },
        {
          label: "Ventas",
          icon: "shopping-cart",
          badge: labBadge,
          badgeType: "is-warning",
          children: [
            { label: "Laboratorio", icon: "flask", path: "/layouts/ventas/laboratorio", badge: labBadge, badgeType: "is-warning" },
            { label: "Bases y Micas", icon: "glasses", path: "/layouts/ventas/bases-micas", badge: labBadge, badgeType: "is-warning" },
            { label: "Óptica", icon: "eye", path: "/layouts/ventas/optica" },
            { label: "Lentes de Contacto", icon: "circle", path: "/layouts/ventas/lentes-contacto" },
          ],
        },
        { group: "Otros" },
        { label: "Ajustes", icon: "cog", path: "/layouts/config.panel" },
        { label: "Ayuda", icon: "question-circle", path: "/layouts/Ayuda" },
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
      const isMobile = window.innerWidth <= 770;
      if (isMobile && this.activeSubmenu) this.closeSubmenu();

      this.isCollapsed = !this.isCollapsed;
      localStorage.setItem("sidebar-collapsed", this.isCollapsed);
      this.$emit("toggle", this.isCollapsed);
    },
    toggleSubmenu(item) {
      const isMobile = window.innerWidth <= 770;

      if (this.activeSubmenu === item) this.closeSubmenu();
      else {
        if (isMobile) {
          this.isCollapsed = true;
          localStorage.setItem("sidebar-collapsed", "true");
          this.$emit("toggle", this.isCollapsed);
        }
        this.activeSubmenu = item;
        this.$nextTick(() => this.openSubmenu());
      }
    },
    openSubmenu() {
      const submenuEl = this.$refs.submenu;
      if (!submenuEl) return;

      submenuEl.style.transition = "none";
      submenuEl.style.opacity = 0;
      submenuEl.style.transform = "translateX(-10px) scale(0.995)";
      submenuEl.style.pointerEvents = "none";
      void submenuEl.offsetWidth;

      submenuEl.style.transition = "opacity 0.20s ease, transform 0.20s ease";
      submenuEl.style.opacity = 1;
      submenuEl.style.transform = "translateX(0) scale(1)";
      submenuEl.style.pointerEvents = "auto";
    },
    closeSubmenu() {
      const submenuEl = this.$refs.submenu;
      if (!submenuEl) {
        this.activeSubmenu = null;
        return;
      }

      submenuEl.style.transition = "opacity 0.20s ease, transform 0.20s ease";
      submenuEl.style.opacity = 0;
      submenuEl.style.transform = "translateX(-10px) scale(0.995)";
      submenuEl.style.pointerEvents = "none";

      setTimeout(() => {
        this.activeSubmenu = null;
        submenuEl.style.transition = null;
        submenuEl.style.opacity = null;
        submenuEl.style.transform = null;
        submenuEl.style.pointerEvents = null;
      }, 200);
    },
    navigateTo(path) {
      this.$router.push(path);
      this.activeSubmenu = null;
    },
    autoCollapseSidebar() {
      if (window.innerWidth <= 770) {
        this.isCollapsed = true;
        this.$emit("toggle", this.isCollapsed);
        localStorage.setItem("sidebar-collapsed", "true");
      }
    },
    collapse() {
      if (!this.isCollapsed) {
        this.isCollapsed = true;
        localStorage.setItem("sidebar-collapsed", "true");
        this.$emit("toggle", true);
      }
    },
    isActive(path) {
      return this.$route.path === path;
    },
    isChildActive(children) {
      return children.some((child) => this.isActive(child.path));
    },
  },
  mounted() {
    window.addEventListener("resize", this.autoCollapseSidebar);
    this.autoCollapseSidebar();
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.autoCollapseSidebar);
  },
};
</script>

<style scoped lang="scss">
/* Colores de branding (banner/header) — no cambian con el tema */
$warm1: #f97316;
$pink1: #ec4899;

.sidebar-wrapper {
  position: relative;
  z-index: 21;
}

/* ===== SIDEBAR BASE ===== */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  color: var(--text-primary);
  display: flex;
  flex-direction: column;

  border-right: 1px solid var(--border);
  box-shadow: var(--shadow-soft);
  transition: width 0.22s ease, transform 0.22s ease;
  z-index: 21;

  /* soft background */
  background:
    radial-gradient(circle at 0% 0%, rgba(121, 87, 213, 0.08), transparent 55%),
    radial-gradient(circle at 100% 80%, rgba(236, 72, 153, 0.06), transparent 55%),
    var(--surface-solid);

  /* overlays */
  .sidebar-decor {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.65;
    z-index: 0;
    background:
      radial-gradient(circle at 0 0, rgba(255,255,255,0.22), transparent 55%),
      radial-gradient(circle at 100% 100%, rgba(15,23,42,0.14), transparent 60%);
  }

  .sidebar-decor--bottom {
    opacity: 0.45;
    background:
      radial-gradient(circle at 30% 100%, rgba(249,115,22,0.16), transparent 55%),
      radial-gradient(circle at 90% 60%, rgba(154,109,255,0.14), transparent 55%);
  }

  /* content above */
  > * {
    position: relative;
    z-index: 1;
  }

  &.is-collapsed {
    width: 70px;

    .menu-item-label,
    .menu-group-title,
    .user-info,
    .sidebar-brand-text {
      display: none;
    }

    .menu-item {
      justify-content: center;
      padding-left: 0.35rem;
      padding-right: 0.35rem;
    }

    .menu-item-inner {
      justify-content: center;
    }

    .sidebar-footer-inner,
    .user-profile {
      justify-content: center;
    }

    .sidebar-header {
      padding-inline: 0.5rem;
    }
  }
}

/* ===== HEADER (tipo banner) ===== */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0.85rem;

  border-bottom: 1px solid rgba(255,255,255,0.18);

  background: linear-gradient(120deg, var(--c-primary-dark), var(--c-primary-light), $warm1, $pink1);
  background-size: 200% 200%;
  color: #f9fafb;

  box-shadow: 0 14px 28px rgba(88, 28, 135, 0.26);
  position: sticky;
  top: 0;
  z-index: 2;

  animation: sidebar-gradient-shift 16s ease-in-out infinite alternate;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 0 0, rgba(255,255,255,.22), transparent 60%),
      radial-gradient(circle at 100% 100%, rgba(15,23,42,.22), transparent 60%);
    opacity: 0.7;
    pointer-events: none;
  }

  > * { position: relative; z-index: 1; }
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;

  &--compact {
    justify-content: center;
    flex: 1;
  }
}

.sidebar-logo {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  overflow: hidden;

  background: rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow: 0 0 0 1px rgba(255,255,255,0.22), 0 10px 20px rgba(15,23,42,0.18);

  display: flex;
  align-items: center;
  justify-content: center;

  &--compact { border-radius: 999px; }

  img { width: 100%; height: 100%; object-fit: cover; }
}

.sidebar-brand-text {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  min-width: 0;
}

.sidebar-brand-title {
  font-size: 0.92rem;
  font-weight: 800;
  color: rgba(255,255,255,0.98);
  letter-spacing: 0.02em;
}

.sidebar-brand-subtitle {
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255,255,255,0.88);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.sidebar-toggle {
  margin-left: auto;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  min-height: 2rem;

  background: rgba(15, 23, 42, 0.18);
  color: rgba(255,255,255,0.95);

  box-shadow: 0 0 0 1px rgba(255,255,255,0.22);
  transition: transform 120ms ease, background-color 120ms ease, box-shadow 120ms ease;

  &:hover {
    transform: translateY(-1px);
    background: rgba(15, 23, 42, 0.26);
    box-shadow: 0 10px 22px rgba(15,23,42,0.18), 0 0 0 1px rgba(255,255,255,0.28);
  }
}

/* ===== MENU ===== */
.sidebar-menu {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.6rem 0.45rem 0.75rem;
}

/* scrollbar */
.sidebar-menu::-webkit-scrollbar { width: 8px; }
.sidebar-menu::-webkit-scrollbar-thumb {
  background: rgba(148,163,184,0.35);
  border-radius: 999px;
}
.sidebar-menu::-webkit-scrollbar-thumb:hover {
  background: rgba(148,163,184,0.55);
}

.menu-group {
  padding: 0.55rem 0.75rem 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.menu-group-title {
  font-size: 0.70rem;
  text-transform: uppercase;
  letter-spacing: 0.10em;
  font-weight: 900;
  color: var(--text-subtle);
}

.menu-group-divider {
  flex: 1;
  height: 1px;
  background: rgba(148,163,184,0.26);
  border-radius: 999px;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 0.58rem 0.75rem;
  margin: 0.14rem 0;

  color: var(--text-secondary);
  text-decoration: none;

  border-radius: 12px;
  border: 1px solid transparent;

  transition: transform 120ms ease, background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease;

  &.has-submenu { cursor: pointer; }

  &:hover {
    transform: translateY(-1px);
    background: rgba(148, 163, 184, 0.12);
    border-color: rgba(148, 163, 184, 0.22);
    box-shadow: 0 10px 24px rgba(15,23,42,0.08);
  }

  &.is-active,
  &.is-exact-active {
    background:
      radial-gradient(circle at 20% 0%, rgba(121,87,213,0.16), transparent 55%),
      linear-gradient(90deg, var(--c-primary-alpha), rgba(236,72,153,0.10));
    border-color: var(--c-primary-alpha);
    color: var(--c-primary);
    box-shadow: var(--shadow-primary);

    position: relative;

    &::before {
      content: "";
      position: absolute;
      left: 6px;
      top: 10px;
      bottom: 10px;
      width: 4px;
      border-radius: 999px;
      background: linear-gradient(180deg, var(--c-primary-dark), var(--c-primary-light), $pink1);
      box-shadow: 0 0 0 1px var(--c-primary-alpha);
    }

    .menu-item-label { font-weight: 800; }
    .menu-item-icon { color: var(--c-primary); }
  }
}

.menu-item-inner {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  flex: 1;
  min-width: 0;
}

.menu-item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;

  border-radius: 10px;
  background: rgba(148,163,184,0.12);
  color: var(--text-muted);

  box-shadow: inset 0 0 0 1px rgba(148,163,184,0.14);
  transition: transform 120ms ease, background-color 120ms ease;

  .icon { font-size: 0.9rem; }
}

.menu-item:hover .menu-item-icon {
  transform: translateY(-1px);
  background: rgba(144,111,225,0.14);
}

.menu-item-label {
  font-size: 0.88rem;
  font-weight: 650;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.menu-item-badge {
  margin-left: auto;
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
  border-radius: 999px;
  box-shadow: 0 0 0 1px rgba(148,163,184,0.18);
}

/* Chevron */
.menu-item-chevron {
  margin-left: 0.25rem;
  transition: transform 0.18s ease, color 0.18s ease;
  color: var(--text-muted);

  &.is-open {
    transform: rotate(90deg);
    color: var(--c-primary);
  }
}

/* ===== FOOTER ===== */
.sidebar-footer {
  padding: 0.75rem 0.75rem;
  border-top: 1px solid var(--border);

  background:
    radial-gradient(circle at 0% 0%, rgba(121,87,213,0.10), transparent 55%),
    radial-gradient(circle at 100% 100%, rgba(236,72,153,0.08), transparent 60%),
    var(--surface);

  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.sidebar-footer-inner {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

.user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  overflow: hidden;

  background: rgba(15,23,42,0.10);
  box-shadow: 0 0 0 1px rgba(148,163,184,0.18), 0 10px 18px rgba(15,23,42,0.10);

  display: flex;
  align-items: center;
  justify-content: center;

  img { width: 100%; height: 100%; object-fit: cover; }
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  min-width: 0;
}

.user-name {
  font-weight: 900;
  font-size: 0.86rem;
  color: var(--text-primary);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.user-role {
  font-size: 0.74rem;
  color: var(--text-muted);
}

/* ===== SUBMENU PANEL (glass) ===== */
.submenu-panel {
  background:
    radial-gradient(circle at 0 0, rgba(121,87,213,0.10), transparent 55%),
    radial-gradient(circle at 100% 100%, rgba(236,72,153,0.08), transparent 60%),
    var(--surface-raised);

  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-left: 1px solid var(--border);
  box-shadow: -18px 0 40px rgba(15,23,42,0.12);
  display: flex;
  flex-direction: column;
}

.submenu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 0.8rem 0.9rem;
  border-bottom: 1px solid var(--border);

  background: linear-gradient(120deg, rgba(121,87,213,0.14), rgba(236,72,153,0.10));
}

.submenu-header-main {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.submenu-pill {
  display: inline-block;
  padding: 0.12rem 0.55rem;
  border-radius: 999px;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.10em;
  background: var(--c-primary-alpha);
  color: var(--text-muted);
  box-shadow: inset 0 0 0 1px var(--border);
  width: fit-content;
}

.submenu-title {
  font-size: 0.95rem;
  font-weight: 900;
  color: var(--text-primary);
}

.submenu-close {
  border-radius: 999px;
  padding: 0.15rem 0.45rem;

  &:hover {
    background: rgba(148,163,184,0.16);
  }
}

.submenu-body {
  padding: 0.6rem 0.6rem 0.9rem;
}

.submenu-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 0.4rem;
}

.submenu-list {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.submenu-item {
  display: flex;
  align-items: center;
  padding: 0.55rem 0.6rem;
  font-size: 0.88rem;
  cursor: pointer;
  color: var(--text-secondary);

  text-decoration: none;
  border-radius: 12px;
  border: 1px solid transparent;

  transition: transform 120ms ease, background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease;

  &:hover {
    transform: translateY(-1px);
    background: rgba(148, 163, 184, 0.12);
    border-color: rgba(148, 163, 184, 0.22);
    box-shadow: 0 10px 24px rgba(15,23,42,0.08);
  }

  &.is-active {
    background:
      radial-gradient(circle at 20% 0%, rgba(121,87,213,0.16), transparent 55%),
      linear-gradient(90deg, var(--c-primary-alpha), rgba(236,72,153,0.10));
    border-color: var(--c-primary-alpha);
    color: var(--c-primary);

    .submenu-item-bar {
      background: linear-gradient(180deg, var(--c-primary-dark), var(--c-primary-light), $pink1);
    }

    .submenu-item-icon { color: var(--c-primary); }
    .submenu-item-label { font-weight: 900; }
  }
}

.submenu-item-bar {
  width: 3px;
  align-self: stretch;
  border-radius: 999px;
  background-color: transparent;
  margin-right: 0.55rem;
}

.submenu-item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 0.55rem;

  border-radius: 10px;
  background: rgba(148,163,184,0.10);
  color: var(--text-muted);
  box-shadow: inset 0 0 0 1px var(--border-light);
}

.submenu-item-label {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

/* OVERLAY */
.submenu-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(10, 10, 10, 0.06);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  z-index: 19;
  transition: opacity 0.2s ease;
}

/* Animación gradiente header */
@keyframes sidebar-gradient-shift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@media screen and (max-width: 768px) {
  .sidebar {
    border-right: 1px solid var(--border);
  }
}

.menu-item-dot-badge {
  position: absolute;
  top: -4px;
  right: -6px;
  background: var(--c-warning, #f59e0b);
  color: #fff;
  border-radius: 999px;
  font-size: 0.6rem;
  font-weight: 900;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  line-height: 1;
}

.submenu-item-badge {
  margin-left: auto;
  font-size: 0.65rem !important;
  height: 18px !important;
  min-width: 20px;

  /* Fuerza color sólido visible en modo claro y oscuro */
  background: #d97706 !important;
  border-color: #d97706 !important;
  color: #fff !important;
}

.menu-item-badge {
  /* Override Buefy is-warning (muy pálido en modo claro) */
  background: #d97706 !important;
  border-color: #d97706 !important;
  color: #fff !important;
}
</style>
