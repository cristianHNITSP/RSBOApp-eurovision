<template>
  <div class="sidebar-wrapper">
    <aside
      class="sidebar"
      :class="{ 'is-collapsed': isCollapsed }"
      :style="{ width: isCollapsed ? '70px' : '240px' }"
    >
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
          </div>

          <!-- ITEM CON SUBMENU -->
          <div
            v-else-if="item.children"
            class="menu-item has-submenu is-clickable"
            :class="{ 'is-active': isChildActive(item.children) }"
            @click="toggleSubmenu(item)"
            :title="isCollapsed ? item.label : ''"
          >
            <div class="menu-item-inner">
              <span class="menu-item-icon">
                <b-icon :icon="item.icon" size="is-small" />
              </span>
              <span v-if="!isCollapsed" class="menu-item-label">
                {{ item.label }}
              </span>
            </div>
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
                :width="32"
                :height="32"
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
        <p class="submenu-hint">
          Selecciona una sección:
        </p>
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
            <span class="submenu-item-label">
              {{ sub.label }}
            </span>
          </a>
        </nav>
      </div>
    </aside>

    <!-- OVERLAY -->
    <div
      v-if="activeSubmenu"
      class="submenu-overlay"
      @click="closeSubmenu"
    ></div>
  </div>
</template>

<script>
export default {
  name: 'Sidebar',
  props: {
    user: { type: Object, default: () => ({ name: 'Cargando...', role: '', avatar: '' }) },
    loading: { type: Boolean, default: false },
    collapsed: { type: Boolean, default: false },
    logoeuro: { type: String, default: 'https://via.placeholder.com/150x50' }
  },
  data() {
    const saved = localStorage.getItem('sidebar-collapsed')
    let collapsed = this.collapsed
    if (saved !== null) collapsed = saved === 'true'
    else if (typeof window !== 'undefined' && window.innerWidth <= 770) collapsed = true

    console.log('[Sidebar] data initialized, collapsed:', collapsed)

    return {
      isCollapsed: collapsed,
      activeSubmenu: null,
      menuItems: [
        { group: 'Principal' },
        { label: 'Dashboard', icon: 'tachometer-alt', path: '/layouts/home' },
        { label: 'Analíticas', icon: 'chart-line', path: '/analytics', badge: 'Nuevo', badgeType: 'is-success' },
        { group: 'Gestión' },
        { label: 'Usuarios', icon: 'users', path: '/users' },
        {
          label: 'Inventario', icon: 'box-open', children: [
            { label: 'Inventario', icon: 'boxes', path: '/layouts/inventario' },
            { label: 'Laboratorio', icon: 'flask', path: '/layouts/laboratorio' }
          ]
        },
        { label: 'Pedidos', icon: 'shopping-cart', path: '/orders', badge: '3' },
        { group: 'Otros' },
        { label: 'Ajustes', icon: 'cog', path: '/layouts/config.panel' },
        { label: 'Ayuda', icon: 'question-circle', path: '/help' }
      ],
      avatarUrl: 'https://github.com/octocat.png',
      avatarLoaded: false
    }
  },
  computed: {
    filteredUser() {
      const name = this.user?.name || 'Cargando...'
      const role = this.user?.role?.name || 'Usuario'
      return { name, role }
    },
    submenuStyles() {
      return {
        position: 'fixed',
        top: '0',
        bottom: '0',
        width: '240px',
        left: this.isCollapsed ? '70px' : '240px',
        zIndex: 20,
        borderLeft: '1px solid #dbdbdb',
        transition: 'left 0.3s ease'
      }
    }
  },
  watch: {
    user: {
      immediate: true,
      handler(newUser) {
        console.log('[Sidebar] watch user triggered:', newUser)
        let avatar = newUser?.avatar ? String(newUser.avatar).trim() : ''
        if (!avatar) {
          console.log('[Sidebar] Avatar vacío, usando valor por defecto Octocat')
          avatar = 'https://github.com/octocat.png'
        }
        this.avatarLoaded = false
        this.$nextTick(() => {
          this.avatarUrl = avatar
          const img = new Image()
          img.src = avatar
          img.onload = () => (this.avatarLoaded = true)
          img.onerror = () => {
            console.warn('[Sidebar] Error cargando avatar, se usa Octocat por defecto')
            this.avatarUrl = 'https://github.com/octocat.png'
            this.avatarLoaded = true
          }
        })
      }
    }
  },
  methods: {
    onAvatarLoad() {
      this.avatarLoaded = true
    },
    onAvatarError() {
      this.avatarUrl = 'https://github.com/octocat.png'
      this.avatarLoaded = true
      console.warn('[Sidebar] Error loading avatar, using Octocat')
    },
    toggleSidebar() {
      const isMobile = window.innerWidth <= 770
      if (isMobile && this.activeSubmenu) this.closeSubmenu()
      this.isCollapsed = !this.isCollapsed
      localStorage.setItem('sidebar-collapsed', this.isCollapsed)
      this.$emit('toggle', this.isCollapsed)
    },
    toggleSubmenu(item) {
      const isMobile = window.innerWidth <= 770
      if (this.activeSubmenu === item) this.closeSubmenu()
      else {
        if (isMobile) {
          this.isCollapsed = true
          localStorage.setItem('sidebar-collapsed', 'true')
          this.$emit('toggle', this.isCollapsed)
        }
        this.activeSubmenu = item
        this.$nextTick(() => this.openSubmenu())
      }
    },
    openSubmenu() {
      const submenuEl = this.$refs.submenu
      if (!submenuEl) return
      submenuEl.style.transition = 'none'
      submenuEl.style.opacity = 0
      submenuEl.style.transform = 'translateX(-8px)'
      submenuEl.style.pointerEvents = 'none'
      void submenuEl.offsetWidth
      submenuEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease'
      submenuEl.style.opacity = 1
      submenuEl.style.transform = 'translateX(0)'
      submenuEl.style.pointerEvents = 'auto'
    },
    closeSubmenu() {
      const submenuEl = this.$refs.submenu
      if (!submenuEl) { this.activeSubmenu = null; return }
      submenuEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease'
      submenuEl.style.opacity = 0
      submenuEl.style.transform = 'translateX(-8px)'
      submenuEl.style.pointerEvents = 'none'
      setTimeout(() => {
        this.activeSubmenu = null
        submenuEl.style.transition = null
        submenuEl.style.opacity = null
        submenuEl.style.transform = null
        submenuEl.style.pointerEvents = null
      }, 200)
    },
    navigateTo(path) {
      this.$router.push(path)
      this.activeSubmenu = null
    },
    logout() {
      this.$buefy.notification.open({
        message: 'Sesión cerrada correctamente',
        type: 'is-success'
      })
    },
    autoCollapseSidebar() {
      if (window.innerWidth <= 770) {
        this.isCollapsed = true
        this.$emit('toggle', this.isCollapsed)
        localStorage.setItem('sidebar-collapsed', 'true')
      }
    },
    isActive(path) {
      return this.$route.path === path
    },
    isChildActive(children) {
      return children.some(child => this.isActive(child.path))
    }
  },
  mounted() {
    window.addEventListener('resize', this.autoCollapseSidebar)
    this.autoCollapseSidebar()
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.autoCollapseSidebar)
  }
}
</script>

<script setup>
import logoeuro from '@/assets/img/logoside.png'
</script>

<style scoped lang="scss">
$primary: #906fe1;
$primary-soft: rgba($primary, 0.08);
$border: #dbdbdb;
$bg: #ffffff;
$text: #363636;
$text-muted: #7a7a7a;
$group: #b5b5b5;

.sidebar-wrapper {
  position: relative;
  z-index: 21;
}

/* SIDEBAR */

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 240px;
  height: 100%;
  background: $bg;
  color: $text;
  display: flex;
  flex-direction: column;
  border-right: 1px solid $border;
  transition: width 0.2s ease, transform 0.2s ease;
  z-index: 21;

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
      padding-left: 0.4rem;
      padding-right: 0.4rem;
    }

    .menu-item-inner {
      justify-content: center;
    }

    .sidebar-footer-inner {
      justify-content: center;
    }

    .user-profile {
      justify-content: center;
    }

    .sidebar-header {
      padding-inline: 0.5rem;
    }
  }
}

/* HEADER */

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem 0.85rem;
  border-bottom: 1px solid $border;
  background-color: #fafafa;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;

  &--compact {
    justify-content: center;
    flex: 1;
  }
}

.sidebar-logo {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;

  &--compact {
    border-radius: 999px;
  }

  img {
    width: 100%;
    height: auto;
    object-fit: contain;
  }
}

.sidebar-brand-text {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}

.sidebar-brand-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: $text;
}

.sidebar-brand-subtitle {
  font-size: 0.7rem;
  font-weight: 500;
  color: $text-muted;
}

/* Toggle */

.sidebar-toggle {
  margin-left: auto;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  min-height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 1px rgba(10, 10, 10, 0.08);
  transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;

  &:hover {
    background-color: #f0f0f0;
    box-shadow: 0 0 0 1px rgba(10, 10, 10, 0.15);
    transform: translateY(-1px);
  }
}

/* MENÚ */

.sidebar-menu {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.5rem 0;
}

.menu-group {
  padding: 0.4rem 1rem 0.2rem;
}

.menu-group-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
  color: $group;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 0.55rem 0.9rem;
  color: $text;
  margin: 0;
  text-decoration: none;
  border-left: 3px solid transparent;
  font-size: 0.875rem;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;

  &.has-submenu {
    cursor: pointer;
  }

  &:hover {
    background-color: #f5f5f5;
  }

  &.is-active,
  &.is-exact-active {
    background-color: $primary-soft;
    border-left-color: $primary;
    color: $primary;

    .menu-item-label {
      font-weight: 600;
    }

    .menu-item-icon {
      color: $primary;
    }
  }
}

.menu-item-inner {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  flex: 1;
  min-width: 0;
}

.menu-item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: $text-muted;
  flex-shrink: 0;

  .icon {
    font-size: 0.8rem;
  }
}

.menu-item-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: inherit;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.menu-item-badge {
  margin-left: auto;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
}

/* Chevron */

.menu-item-chevron {
  margin-left: 0.25rem;
  transition: transform 0.18s ease;
  color: $text-muted;

  &.is-open {
    transform: rotate(90deg);
    color: $primary;
  }
}

/* FOOTER / USUARIO */

.sidebar-footer {
  padding: 0.65rem 0.75rem;
  border-top: 1px solid $border;
  background-color: #fafafa;
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
  gap: 0.55rem;
  min-width: 0;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  overflow: hidden;
  background: #e5e5e5;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}

.user-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: $text;
}

.user-role {
  font-size: 0.75rem;
  color: $text-muted;
}

/* SUBMENU PANEL */

.submenu-panel {
  background: $bg;
  border-left: 1px solid $border;
  display: flex;
  flex-direction: column;
}

.submenu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem 0.9rem;
  border-bottom: 1px solid $border;
  background-color: #fafafa;
}

.submenu-header-main {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.submenu-pill {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background-color: #f5f5f5;
  color: $text-muted;
}

.submenu-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: $text;
}

.submenu-close {
  border-radius: 999px;
  padding: 0.15rem 0.4rem;

  &:hover {
    background-color: #f0f0f0;
  }
}

.submenu-body {
  padding: 0.55rem 0.6rem 0.9rem;
}

.submenu-hint {
  font-size: 0.75rem;
  color: $text-muted;
  margin-bottom: 0.4rem;
}

.submenu-list {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.submenu-item {
  display: flex;
  align-items: center;
  padding: 0.45rem 0.6rem;
  font-size: 0.85rem;
  cursor: pointer;
  color: $text;
  text-decoration: none;
  border-radius: 0.35rem;
  border-left: 3px solid transparent;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.submenu-item-bar {
  width: 2px;
  align-self: stretch;
  border-radius: 999px;
  background-color: transparent;
  margin-right: 0.5rem;
}

.submenu-item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 0.5rem;
  color: $text-muted;
}

.submenu-item-label {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.submenu-item:hover {
  background-color: #f5f5f5;
}

/* ⚡ Estado activo del submenu: solo bar + color, sin fondo pesado */
.submenu-item.is-active {
  border-left-color: $primary;
  color: $primary;

  .submenu-item-bar {
    background-color: $primary;
  }

  .submenu-item-icon {
    color: $primary;
  }

  .submenu-item-label {
    font-weight: 600;
  }
}

/* OVERLAY */

.submenu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(10, 10, 10, 0.03);
  backdrop-filter: blur(1px);
  -webkit-backdrop-filter: blur(1px);
  z-index: 19;
  transition: opacity 0.2s ease;
}

/* Responsive */

@media screen and (max-width: 768px) {
  .sidebar {
    border-right: 1px solid $border;
  }
}
</style>
