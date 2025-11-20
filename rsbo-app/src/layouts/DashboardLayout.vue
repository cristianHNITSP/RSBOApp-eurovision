<script setup>
import {
    ref,
    watch,
    onMounted,
    onBeforeUnmount,
    onBeforeMount,
    computed,
    nextTick
} from 'vue'
import { useRoute } from 'vue-router'

import Sidebar from '../components/Sidebar.vue'
import NotificationPanel from '../components/NotificationPanel.vue'

import { useSidebarState } from '../composables/useSidebarState'
import { useMotionEffects } from '../composables/useMotionEffects'
import { useNotifications } from '../composables/useNotificationsState'

// ---- Sidebar & motion ----
const { isSidebarCollapsed, toggleSidebar, setSidebarState } = useSidebarState()
const { motionRef, animateSidebarShift } = useMotionEffects()

// ---- Notificaciones ----
const { showPanel, openPanel, closePanel } = useNotifications()
const unreadNotifications = ref(0)

// ---- Breadcrumb dinámico ----
const route = useRoute()
const currentRouteName = computed(() => {
    return route.meta.breadcrumb || route.name || 'Dashboard'
})

const pageTitle = computed(() => {
    return 'Panel de Control'
})

// ---- Modo oscuro ----
const isDark = ref(document.documentElement.getAttribute('data-theme') === 'dark')

function toggleDarkMode() {
    const html = document.documentElement
    if (html.getAttribute('data-theme') === 'dark') {
        html.setAttribute('data-theme', 'light')
        html.style.colorScheme = 'light'
        localStorage.setItem('dark-mode', 'false')
        isDark.value = false
    } else {
        html.setAttribute('data-theme', 'dark')
        html.style.colorScheme = 'dark'
        localStorage.setItem('dark-mode', 'true')
        isDark.value = true
    }
}

// ---- Control de la altura del viewport en móviles ----
const viewportHeight = ref(window.innerHeight)

function updateViewportHeight() {
    viewportHeight.value = window.innerHeight
    document.documentElement.style.setProperty('--vh', `${viewportHeight.value * 0.01}px`)
}

onMounted(() => {
    updateViewportHeight()
    window.addEventListener('resize', updateViewportHeight)
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', updateViewportHeight)
})

// ---- Watch sidebar colapsada ----
watch(isSidebarCollapsed, (newVal) => {
    animateSidebarShift(newVal)

    // Solo cerrar el panel si estamos expandiendo la sidebar
    if (!newVal) {
        closePanel()
    }
})

// ---- Tamaño de fuente con persistencia ----
const FONT_SIZE_KEY = 'user-font-size'
const defaultFontSize = 'md'

const sizes = {
    xs: '85%',
    sm: '92.5%',
    md: '100%',
    lg: '112.5%'
}

// Aplicar tamaño antes de montar para evitar salto visual
function applyFontSizeImmediately() {
    const savedSize = localStorage.getItem(FONT_SIZE_KEY)
    const sizeToApply = savedSize && sizes[savedSize] ? savedSize : defaultFontSize
    document.documentElement.style.fontSize = sizes[sizeToApply]
}

// Ejecutar antes de onMounted
applyFontSizeImmediately()

const fontSize = ref(defaultFontSize)

function setFontSize(size) {
    fontSize.value = size
    document.documentElement.style.fontSize = sizes[size] || sizes[defaultFontSize]
    localStorage.setItem(FONT_SIZE_KEY, size)
}

onMounted(() => {
    const savedSize = localStorage.getItem(FONT_SIZE_KEY)
    if (savedSize && sizes[savedSize]) {
        fontSize.value = savedSize
    } else {
        fontSize.value = defaultFontSize
    }
    setFontSize(fontSize.value)
})

// ---- Estado de conexión ----
const isOffline = ref(!navigator.onLine)
const showLoading = ref(false)

function updateOnlineStatus() {
    if (navigator.onLine) {
        isOffline.value = false
        showLoading.value = false
    } else {
        isOffline.value = true
        showLoading.value = true
    }
}

onMounted(() => {
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    updateOnlineStatus()
})

onBeforeUnmount(() => {
    window.removeEventListener('online', updateOnlineStatus)
    window.removeEventListener('offline', updateOnlineStatus)
})

// ---- Lógica de sidebar móvil ----
const isMobileSidebarVisible = ref(true)
const sidebarmobile = ref(null)
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value <= 768)

// Leer estado guardado para móviles
const savedSidebarState = localStorage.getItem('mobileSidebarVisible')
if (savedSidebarState !== null) {
    isMobileSidebarVisible.value = savedSidebarState === 'true'
}

onBeforeMount(() => {
    if (isMobile.value) {
        updateMainClass(isMobileSidebarVisible.value)
    } else {
        updateMainClass(true) // en escritorio: siempre visible
    }
})

function toggleMobileSidebar() {
    if (isMobileSidebarVisible.value) {
        hideSidebarMobile()
    } else {
        isMobileSidebarVisible.value = true
        localStorage.setItem('mobileSidebarVisible', 'true')
        nextTick(() => {
            showSidebarMobile()
            updateMainClass(true)
        })
    }
}

function showSidebarMobile() {
    const el = sidebarmobile.value?.$el
    if (!el) return

    el.classList.remove('mobileSidebtraction-leave-active')
    el.classList.add('mobileSidebtraction-enter-active')

    el.addEventListener(
        'animationend',
        () => {
            el.classList.remove('mobileSidebtraction-enter-active')
        },
        { once: true }
    )
}

function hideSidebarMobile() {
    const el = sidebarmobile.value?.$el
    if (!el) return

    el.classList.remove('mobileSidebtraction-enter-active')
    el.classList.add('mobileSidebtraction-leave-active')

    el.addEventListener(
        'animationend',
        () => {
            el.classList.remove('mobileSidebtraction-leave-active')
            isMobileSidebarVisible.value = false
            localStorage.setItem('mobileSidebarVisible', 'false')
            updateMainClass(false)
        },
        { once: true }
    )
}

// Manejar margin-left dinámico por tamaño de pantalla y colapso
function updateMainClass(sidebarVisible) {
    const mainEl = document.querySelector('main.main-content')
    if (!mainEl) return

    const collapsed = localStorage.getItem('sidebar-collapsed') === 'true'

    if (windowWidth.value <= 768) {
        if (sidebarVisible) {
            mainEl.classList.add('main-sidebar-visible')
            mainEl.classList.remove('main-sidebar-hidden')
        } else {
            mainEl.classList.add('main-sidebar-hidden')
            mainEl.classList.remove('main-sidebar-visible')
        }
    } else {
        if (collapsed) {
            mainEl.classList.add('main-sidebar-hidden')
            mainEl.classList.remove('main-sidebar-visible')
        } else {
            mainEl.classList.add('main-sidebar-visible')
            mainEl.classList.remove('main-sidebar-hidden')
        }
    }
}

function handleResize() {
    windowWidth.value = window.innerWidth
    const isNowMobile = windowWidth.value <= 768

    if (!isNowMobile) {
        isMobileSidebarVisible.value = true
        updateMainClass(true)
    } else {
        updateMainClass(isMobileSidebarVisible.value)
    }
}

onMounted(() => {
    window.addEventListener('resize', handleResize)
    handleResize()
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
})
</script>

<script>
import { useAuth } from '@/services/useAuth'

export default {
    name: 'DashboardLayout',

    data() {
        return {
            user: null,
            loading: true
        }
    },

    methods: {
        async fetchUserData() {
            const { fetchUser, user } = useAuth()
            await fetchUser()
            this.user = user.value
            this.loading = false
        },

        profile() {
            const { profile } = useAuth()
            profile(this.$router)
        },

        settings() {
            const { settings } = useAuth()
            settings(this.$router)
        },

        logout() {
            const { logout } = useAuth()
            logout(this.$router, this.$buefy)
        }
    },

    mounted() {
        this.fetchUserData()
    }
}
</script>

<template>
    <div class="app-layout" style="background-color: white;">
        <!-- 🔌 Aviso sin conexión -->
        <b-notification v-if="isOffline" type="is-danger" aria-close-label="Cerrar notificación" has-icon
            class="has-text-centered" style="position: fixed; top: 0; width: 100%; z-index: 2000;">
            No hay conexión a internet. Por favor verifica tu red.
        </b-notification>

        <!--Loading global -->
        <b-loading v-model="showLoading" :is-full-page="true" :can-cancel="false" :is-fullscreen="true"
            aria-label="Cargando...">
            <b-icon pack="fas" icon="sync-alt" size="is-large" custom-class="fa-spin" />
        </b-loading>

        <div class="content-layout">
            <!--Sidebar -->
            <Sidebar ref="sidebarmobile" class="sidebar-mobile-panel" v-if="!isMobile || isMobileSidebarVisible"
                @toggle="setSidebarState" :collapsed="isSidebarCollapsed" :user="user" :loading="loading" />

            <!--Panel de notificaciones -->
            <NotificationPanel :visible="showPanel" @close="closePanel" @update-unread="unreadNotifications = $event" />

            <!-- DIV overlay que aplica el blur y fondo en móvil -->
            <div v-if="isMobile && showPanel" class="blur-overlay"></div>

            <!--Contenido principal -->
            <main class="main-content p-0" :class="{
                'is-hidden-mobile': !isSidebarCollapsed,
                'is-collapsed': isSidebarCollapsed,
                'ignore-grid-mobile': isMobile && showPanel,
                'visible-sidebar': isMobileSidebarVisible && isMobile && showPanel
            }" :style="{
            marginLeft: isMobile
                ? (isMobileSidebarVisible ? '70px' : '0px')
                : (isSidebarCollapsed ? '70px' : '240px'),
            marginRight: showPanel ? '285px' : '0px',
            transition: 'margin-left 0.3s ease, margin-right 0.3s ease'
        }">
                <!--Header / Panel superior -->
                <section class="dashboard-header" ref="motionRef">
                    <div class="dashboard-toolbar">
                        <!-- LEFT: breadcrumb + título -->
                        <div class="dashboard-toolbar__left">
                            <div class="breadcrumb-wrapper">
                                <!-- Botón solo visible en móvil -->
                                <b-button icon-left="bars" class="menu-toggle is-hidden-desktop is-hidden-tablet mr-2"
                                    type="is-primary" size="is-small" @click="toggleMobileSidebar" />

                                <b-breadcrumb separator="succeeds" class="is-size-7-mobile">
                                    <b-breadcrumb-item href="/layouts/home">Dashboard</b-breadcrumb-item>
                                    <b-breadcrumb-item active>{{ currentRouteName }}</b-breadcrumb-item>
                                </b-breadcrumb>
                            </div>

                            <div class="page-heading">
                                <h1 class="dashboard-title">
                                    {{ pageTitle }}
                                </h1>

                            </div>
                        </div>

                        <!-- CENTER: buscador -->
                        <div class="dashboard-toolbar__center">
                            <b-field class="dashboard-search" position="is-centered">
                                <b-input placeholder="Buscar en el panel..." rounded expanded icon="search"
                                    icon-pack="fas">
                                    <template #icon>
                                        <b-icon icon="magnify" />
                                    </template>
                                </b-input>
                            </b-field>
                        </div>

                        <!-- RIGHT: acciones -->
                        <div class="dashboard-toolbar__right">
                            <div class="dashboard-actions">
                                <!-- Notificaciones -->
                                <b-tooltip label="Notificaciones" position="is-bottom" append-to-body>
                                    <div class="has-badge-wrapper">
                                        <b-button type="is-light" :icon-right="showPanel ? 'close' : 'bell'"
                                            @click="showPanel ? closePanel() : openPanel()" />
                                        <transition name="badge-fade">
                                            <b-tag v-if="unreadNotifications > 0" type="is-primary" size="is-small"
                                                rounded class="is-badge">
                                                {{ unreadNotifications }}
                                            </b-tag>
                                        </transition>
                                    </div>
                                </b-tooltip>

                                <!-- Modo oscuro -->
                                <b-tooltip label="Modo oscuro (beta)" position="is-bottom" append-to-body>
                                    <b-button :type="isDark ? 'is-dark' : 'is-light'" icon-pack="fas" icon-left="adjust"
                                        @click="toggleDarkMode" />
                                </b-tooltip>

                                <!-- Tamaño de fuente -->
                                <b-dropdown aria-role="list" icon-left="text-height" position="is-bottom-left"
                                    :close-on-click="true" append-to-body>
                                    <template #trigger>
                                        <b-button size="is-light" icon-left="text-height" type="is-light">
                                            Tamaño
                                        </b-button>
                                    </template>
                                    <b-dropdown-item @click="setFontSize('xs')">🅰 Extra pequeña</b-dropdown-item>
                                    <b-dropdown-item @click="setFontSize('sm')">🅰 Pequeña</b-dropdown-item>
                                    <b-dropdown-item @click="setFontSize('md')">🅰 Mediana
                                        (recomendada)</b-dropdown-item>
                                    <b-dropdown-item @click="setFontSize('lg')">🅰 Grande</b-dropdown-item>
                                </b-dropdown>

                                <!-- Menú usuario -->
                                <b-dropdown position="is-bottom-left" aria-role="menu" append-to-body
                                    class="is-light is-radiusless m-0 p-0">
                                    <template #trigger>
                                        <b-button type="is-primary" icon-right="user-circle" label="Usuario" />
                                    </template>

                                    <b-dropdown-item aria-role="menu-item" @click="profile" class="dropmenu-is-light">
                                        <b-icon icon="user" size="is-small" />&nbsp; Perfil
                                    </b-dropdown-item>

                                    <b-dropdown-item aria-role="menu-item" @click="settings" class="dropmenu-is-light">
                                        <b-icon icon="cog" size="is-small" />&nbsp; Configuración
                                    </b-dropdown-item>

                                    <hr class="dropdown-divider" />

                                    <b-dropdown-item aria-role="menu-item" @click="logout" class="dropmenu-is-light">
                                        <b-icon icon="sign-out-alt" size="is-small" />&nbsp; Cerrar sesión
                                    </b-dropdown-item>
                                </b-dropdown>
                            </div>
                        </div>
                    </div>
                </section>

                <!--Contenido de las vistas -->
                <section class="dashboard-body">
                    <router-view v-slot="{ Component }">
                        <component :is="Component" :user="user" :loading="loading" />
                    </router-view>
                </section>

                <!-- ⚓ Footer -->
                <footer class="dashboard-footer mt-2 mb-2">
                    <div class="content has-text-centered">
                        <p>
                            <strong>RSBO</strong> · Lightweight UI components for Vue 3 based on Bulma. <br />
                            <small>
                                Código bajo licencia
                                <a href="https://opensource.org/license/mit">MIT</a> · Contenido bajo
                                <a href="https://creativecommons.org/licenses/by-nc-sa/4.0//">CC BY NC SA 4.0</a>.
                            </small>
                        </p>
                    </div>
                </footer>

            </main>
        </div>
    </div>
</template>

<style scoped>
/* ===========================
   HEADER / TOOLBAR
   =========================== */

.dashboard-header {
    position: sticky;
    top: 0;
    z-index: 5;
    padding: 1rem 1.5rem 0.75rem;
    background-color: #ffffff;
    border-bottom: 1px solid rgba(10, 10, 10, 0.06);
}

.dashboard-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr) auto;
    grid-template-areas: 'left center right';
    align-items: center;
    column-gap: 1rem;
    row-gap: 0.75rem;
}

.dashboard-toolbar__left {
    grid-area: left;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
}

.dashboard-toolbar__center {
    grid-area: center;
    min-width: 0;
}

.dashboard-toolbar__right {
    grid-area: right;
    min-width: 0;
}

/* Breadcrumb + título */
.breadcrumb-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
}

.page-heading {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
}

.dashboard-title {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 600;
    color: #363636;
}



/* Buscador */
.dashboard-search {
    width: 100%;
    max-width: 520px;
    margin: 0 auto;
}

/* Acciones */
.dashboard-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.menu-toggle {
    border-radius: 999px;
}


/* Badge de notificación */
.has-badge-wrapper {
    position: relative;
    display: inline-block;
}

.is-badge {
    position: absolute;
    top: 0;
    right: 0;
    transform: translate(40%, -40%);
    font-size: 0.65rem;
    z-index: 1;
}

/* Animación del badge */
.badge-fade-enter-active,
.badge-fade-leave-active {
    transition: opacity 0.15s ease, transform 0.15s ease;
}

.badge-fade-enter-from,
.badge-fade-leave-to {
    opacity: 0;
    transform: translate(40%, -60%) scale(0.85);
}

/* ===========================
   LAYOUT GENERAL
   =========================== */

.app-layout {
    display: flex;
    flex-direction: column;
    height: calc(var(--vh, 1vh) * 100);
    width: 100%;
    min-width: 360px;
}

.content-layout {
    display: flex;
    flex: 1;
    min-height: 0;
    min-width: 0;
    position: relative;
    flex-direction: row;
    min-width: 360px;
}

.main-content {
    margin-left: 240px;
    transition: margin-left 0.3s ease, margin-right 0.3s ease;
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    box-sizing: border-box;
}

.main-content.is-collapsed {
    margin-left: 70px;
}

/* Para cuando sidebar visible/oculta desde JS */
.main-sidebar-hidden {
    margin-left: 70px;
}

.main-sidebar-visible {
    margin-left: 240px;
}

/* Overlay blur para notificaciones en móvil */
.blur-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    z-index: 9;
    pointer-events: auto;
}

/* ===========================
   RESPONSIVE
   =========================== */

.hidden-when-sidebar-open-on-mobile {
    display: none;
}

@media (min-width: 361px) {
    .hidden-when-sidebar-open-on-mobile {
        display: block !important;
    }
}

/* Mobile / Tablet */
@media screen and (max-width: 768px) {
    .main-sidebar-hidden {
        margin-left: 0 !important;
        transition: margin-left 0.2s ease;
    }

    .main-sidebar-visible {
        margin-left: 70px !important;
        transition: margin-left 0.2s ease;
    }

    .ignore-grid-mobile {
        all: unset !important;
        display: block !important;
        width: 100vw !important;
        height: 100vh !important;
        overflow-y: auto !important;
        position: fixed !important;
        top: 0;
        left: 0;
        background-color: #030303;
        z-index: 10;
        box-sizing: border-box !important;
        overscroll-behavior: contain !important;
    }

    .ignore-grid-mobile.visible-sidebar {
        margin-left: 70px !important;
    }

    .dashboard-header {
        padding: 0.75rem 1rem 0.5rem;
    }

    .dashboard-toolbar {
        grid-template-columns: 1fr;
        grid-template-areas:
            'left'
            'center'
            'right';
    }

    .dashboard-actions {
        justify-content: flex-start;
    }

    .dashboard-body {
        padding: 0.75rem 1rem 1rem;
    }

    .dashboard-footer {
        padding: 0.75rem 1rem 1.25rem;
    }
}

/* Desktop un poco más compacto en altura pero relajado en ancho */
@media screen and (min-width: 1024px) {
    .dashboard-header {
        padding-top: 1.1rem;
        padding-bottom: 0.9rem;
    }
}

/* ===========================
   ANIMACIONES SIDEBAR
   =========================== */

@keyframes mobileSidebtractionIn {
    0% {
        transform: translateX(-110%);
        opacity: 0;
    }

    60% {
        transform: translateX(15%);
        opacity: 1;
    }

    80% {
        transform: translateX(-5%);
    }

    100% {
        transform: translateX(0);
    }
}

@keyframes mobileSidebtractionOut {
    0% {
        transform: translateX(0);
        opacity: 1;
    }

    100% {
        transform: translateX(-110%);
        opacity: 0;
    }
}

.mobileSidebtraction-enter-active {
    animation: mobileSidebtractionIn 0.4s forwards cubic-bezier(0.4, 0, 0.2, 1);
}

.mobileSidebtraction-leave-active {
    animation: mobileSidebtractionOut 0.3s forwards cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
