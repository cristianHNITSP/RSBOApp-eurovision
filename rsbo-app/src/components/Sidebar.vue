<template>
    <div class="sidebar-wrapper">
        <aside class="sidebar" :class="{ 'is-collapsed': isCollapsed }"
            :style="{ width: isCollapsed ? '70px' : '240px' }">
            <!-- Header -->
            <div class="sidebar-header is-flex is-align-items-center px-4 py-3">
                <div v-if="!isCollapsed" class="sidebar-logo is-flex is-align-items-start">
                    <figure class="mb-4" style="width: 150px;">
                        <img :src="logoeuro" alt="Logo" style="width: 100%;" />
                    </figure>
                </div>
                <b-button class="sidebar-toggle" type="is-text" @click="toggleSidebar"
                    :icon-right="isCollapsed ? 'arrow-right' : 'arrow-left'" />
            </div>

            <!-- Menú -->
            <div class="sidebar-menu">
                <template v-for="(item, index) in menuItems" :key="index">
                    <!-- GRUPO -->
                    <div v-if="item.group" class="menu-group">
                        <span class="menu-group-title" v-if="!isCollapsed">{{ item.group }}</span>
                    </div>

                    <!-- CON SUBMENU -->
                    <div v-else-if="item.children" class="menu-item has-submenu is-clickable"
                        :class="{ 'is-active': isChildActive(item.children) }" @click="toggleSubmenu(item)">
                        <b-icon :icon="item.icon" size="is-small" />
                        <span v-if="!isCollapsed" class="menu-item-label">{{ item.label }}</span>
                        <b-icon icon="angle-right" size="is-small" class="ml-auto" v-if="!isCollapsed" />
                    </div>

                    <!-- ITEM NORMAL -->
                    <router-link v-else :to="item.path" class="menu-item" active-class="is-active"
                        exact-active-class="is-exact-active">
                        <b-icon :icon="item.icon" size="is-small" />
                        <span class="menu-item-label" v-if="!isCollapsed">{{ item.label }}</span>
                        <b-tag v-if="item.badge && !isCollapsed" class="menu-item-badge" rounded
                            :type="item.badgeType || 'is-primary'">
                            {{ item.badge }}
                        </b-tag>
                    </router-link>
                </template>
            </div>

            <!-- Footer con usuario -->
            <div class="sidebar-footer">
                <div class="user-profile" v-if="!loading">
                    <figure v-if="!isCollapsed" class="image is-32x32" style="overflow: hidden; border-radius:50%;">
                        <!-- Skeleton redondo -->
                        <b-skeleton v-if="!avatarLoaded" :width="32" :height="32" :animated="true"
                            style="border-radius:50%;" />
                        <!-- Avatar -->
                        <img v-else :key="avatarUrl" class="is-rounded" :src="avatarUrl" alt="Avatar"
                            @load="onAvatarLoad" @error="onAvatarError" />
                    </figure>
                    <div class="user-info" v-if="!isCollapsed">
                        <span class="user-name">{{ filteredUser.name }}</span>
                        <span class="user-role">{{ filteredUser.role }}</span>
                    </div>
                </div>
            </div>

        </aside>

        <!-- SUBMENU SIDEBAR -->
        <aside v-if="activeSubmenu" ref="submenu" class="has-background-light" :style="submenuStyles">
            <div class="is-flex is-align-items-center is-justify-content-space-between px-4"
                style="height: 3.5rem; border-bottom: 1px solid #dbdbdb;">
                <span class="is-size-5 has-text-weight-semibold has-text-dark">
                    {{ activeSubmenu.label }}
                </span>
                <b-button type="is-text" icon-right="times" @click="closeSubmenu" />
            </div>

            <div>
                <a v-for="(sub, index) in activeSubmenu.children" :key="index" @click="navigateTo(sub.path)"
                    :class="['is-flex', 'is-align-items-center', 'px-4', 'has-text-dark', { 'is-active': isActive(sub.path) }]"
                    style="height: 3rem; font-size: 0.95rem; cursor: pointer;"
                    @mouseover="$event.currentTarget.style.background = '#eaeaea'"
                    @mouseleave="$event.currentTarget.style.background = isActive(sub.path) ? '#dbdbdb' : 'transparent'">
                    <b-icon :icon="sub.icon" size="is-small" class="mr-3" />
                    <span>{{ sub.label }}</span>
                </a>
            </div>
        </aside>

        <!-- Overlay -->
        <div v-if="activeSubmenu" class="submenu-overlay" @click="closeSubmenu"></div>
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
                { label: 'Ajustes', icon: 'cog', path: '/settings' },
                { label: 'Ayuda', icon: 'question-circle', path: '/help' }
            ],
            avatarUrl: 'https://github.com/octocat.png', // valor inicial por defecto
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
                    // Preload para cache
                    const img = new Image()
                    img.src = avatar
                    img.onload = () => this.avatarLoaded = true
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
        onAvatarLoad() { this.avatarLoaded = true },
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
            submenuEl.style.transform = 'translateX(-100%)'
            submenuEl.style.pointerEvents = 'none'
            void submenuEl.offsetWidth
            submenuEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
            submenuEl.style.opacity = 1
            submenuEl.style.transform = 'translateX(0)'
            submenuEl.style.pointerEvents = 'auto'
        },
        closeSubmenu() {
            const submenuEl = this.$refs.submenu
            if (!submenuEl) { this.activeSubmenu = null; return }
            submenuEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
            submenuEl.style.opacity = 0
            submenuEl.style.transform = 'translateX(-100%)'
            submenuEl.style.pointerEvents = 'none'
            setTimeout(() => {
                this.activeSubmenu = null
                submenuEl.style.transition = null
                submenuEl.style.opacity = null
                submenuEl.style.transform = null
                submenuEl.style.pointerEvents = null
            }, 300)
        },
        navigateTo(path) { this.$router.push(path); this.activeSubmenu = null },
        logout() { this.$buefy.notification.open({ message: 'Sesión cerrada correctamente', type: 'is-success' }) },
        autoCollapseSidebar() { if (window.innerWidth <= 770) { this.isCollapsed = true; this.$emit('toggle', this.isCollapsed); localStorage.setItem('sidebar-collapsed', 'true') } },
        isActive(path) { return this.$route.path === path },
        isChildActive(children) { return children.some(child => this.isActive(child.path)) }
    },
    mounted() { window.addEventListener('resize', this.autoCollapseSidebar); this.autoCollapseSidebar() },
    beforeDestroy() { window.removeEventListener('resize', this.autoCollapseSidebar) }
}
</script>

<script setup>
import logoeuro from '@/assets/img/logoside.png'
</script>


<style scoped lang="scss">
.sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 240px;
    height: 100%;
    background: #ffffff;
    color: #363636;
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease;
    border-right: 1px solid #ddd;
    z-index: 21;
    /* justo debajo del submenu */

    &.is-collapsed {
        width: 70px;

        .menu-item-label,
        .menu-group-title,
        .user-info {
            display: none;
        }

        .menu-item {
            justify-content: center;
        }
    }
}

.sidebar-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    border-bottom: 1px solid #eaeaea;
    background: #f5f5f5;
}

.sidebar-toggle {
    color: #7a7a7a;
    margin-left: auto;

    &:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #363636;
    }
}

.sidebar-menu {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 1rem 0;
    background: #fff;
}

.menu-group {
    padding: 0.5rem 1.25rem;
    color: #b5b5b5;
    font-size: 0.75rem;
    text-transform: uppercase;
    font-weight: 500;
    letter-spacing: 0.5px;
}

.menu-item {
    display: flex;
    align-items: center;
    padding: 0.65rem 1.25rem;
    color: #4a4a4a;
    margin: 0.15rem 0;
    transition: background 0.2s ease, color 0.2s ease;
    text-decoration: none;
    border-left: 3px solid transparent;

    &:hover {
        background: #f5f5f5; // gris muy claro para hover
        color: #363636; // texto gris oscuro
    }

    &.is-active {
        background: #e6e6e6; // gris claro neutro para activo
        color: #4a4a4a; // gris oscuro, buen contraste para texto
        font-weight: 600;
        border-left: 3px solid #8e00d2; // gris medio para el borde izquierdo
    }

    &.is-exact-active {
        background: #dcdcdc; // gris un poco más oscuro para exact active
    }

}

.menu-item-label {
    margin-left: 0.75rem;
    flex: 1;
}

.menu-item-badge {
    margin-left: auto;
    font-size: 0.75rem;
    font-weight: 600;
}

.is-active {
    background-color: #dbdbdb !important;
}


.sidebar-footer {
    padding: 1rem;
    border-top: 1px solid #eaeaea;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #fafafa;
}

.user-profile {
    display: flex;
    align-items: center;
}

.user-info {
    margin-left: 0.75rem;
    display: flex;
    flex-direction: column;
}

.user-name {
    font-weight: 600;
    font-size: 0.875rem;
    color: #363636;
}

.user-role {
    font-size: 0.75rem;
    color: #7a7a7a;
}

/* Scrollbar personalizada */
.sidebar-menu::-webkit-scrollbar {
    width: 6px;
}

.sidebar-menu::-webkit-scrollbar-thumb {
    background: rgba(100, 116, 139, 0.3);
    border-radius: 4px;
}

.sidebar-menu::-webkit-scrollbar-track {
    background: transparent;
}

/* Responsive fallback */
@media screen and (max-width: 60px) {
    .sidebar {
        width: 70px !important;

        .menu-item-label,
        .menu-group-title,
        .user-info {
            display: none !important;
        }

        .menu-item {
            justify-content: center !important;
        }
    }
}

.submenu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(255, 255, 255, 0.05);
    /* más tenue */
    backdrop-filter: blur(2px);
    /* desenfoque muy leve */
    -webkit-backdrop-filter: blur(2px);
    /* soporte Safari */
    z-index: 19;
    transition: opacity 0.3s ease;
}
</style>

