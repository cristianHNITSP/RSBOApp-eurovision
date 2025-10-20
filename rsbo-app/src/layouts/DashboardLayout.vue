<script setup>
import { ref, watch, onMounted, onBeforeUnmount, onBeforeMount, computed, nextTick } from 'vue'
import { useRoute } from 'vue-router'

import Sidebar from '../components/Sidebar.vue'
import NotificationPanel from '../components/NotificationPanel.vue'

import { useSidebarState } from '../composables/useSidebarState'
import { useMotionEffects } from '../composables/useMotionEffects'
//import { useUserActions } from '../composables/useUserActions'
import { useNotifications } from '../composables/useNotificationsState'

const { isSidebarCollapsed, toggleSidebar, setSidebarState } = useSidebarState()
const { motionRef, motionControls, animateSidebarShift } = useMotionEffects()
//const { profile, settings, logout } = useUserActions()

const { showPanel, openPanel, closePanel } = useNotifications()
const unreadNotifications = ref(0)

// Breadcrumb dinámico
const route = useRoute()
const currentRouteName = computed(() => {
    return route.meta.breadcrumb || route.name || 'Dashboard'
})

const pageTitle = computed(() => {
    return `Panel de Control / ${currentRouteName.value}`
})

console.log(unreadNotifications)

watch(isSidebarCollapsed, (newVal) => {
    animateSidebarShift(newVal)
})

// ⚙️ Estado del modo oscuro
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

// control de la resolución en app-layout para móviles
const viewportHeight = ref(window.innerHeight)

function updateViewportHeight() {
    viewportHeight.value = window.innerHeight
    document.documentElement.style.setProperty('--vh', `${viewportHeight.value * 0.01}px`)
}

onMounted(() => {
    updateViewportHeight()
    window.addEventListener('resize', updateViewportHeight)
})

// se cierra la sidebar 
watch(isSidebarCollapsed, (newVal) => {
    animateSidebarShift(newVal)

    // Solo cerrar el panel si estamos expandiendo la sidebar
    if (!newVal) {
        closePanel()
    }
})


// ———————— NUEVO: Control de tamaño de fuente con persistencia ————————
const FONT_SIZE_KEY = 'user-font-size'
const defaultFontSize = 'md'

const sizes = {
    xs: '85%',
    sm: '92.5%',
    md: '100%',
    lg: '112.5%',
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


// NO CONEXION 
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


//LOFICA PARA LA SIDEBAR COLLAPSADA Y NO OCUPE TANTO ESPACIO
// lógica de la sidebar
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

    el.addEventListener('animationend', () => {
        el.classList.remove('mobileSidebtraction-enter-active')
    }, { once: true })
}

function hideSidebarMobile() {
    const el = sidebarmobile.value?.$el
    if (!el) return

    el.classList.remove('mobileSidebtraction-enter-active')
    el.classList.add('mobileSidebtraction-leave-active')

    el.addEventListener('animationend', () => {
        el.classList.remove('mobileSidebtraction-leave-active')
        isMobileSidebarVisible.value = false
        localStorage.setItem('mobileSidebarVisible', 'false')
        updateMainClass(false)
    }, { once: true })
}

// ✅ ACTUALIZADA: manejar margin-left dinámico por tamaño de pantalla y colapso
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

        <b-notification v-if="isOffline" type="is-danger" aria-close-label="Cerrar notificación" has-icon
            class="has-text-centered" style="position: fixed; top: 0; width: 100%; z-index: 2000;">
            No hay conexión a internet. Por favor verifica tu red.
        </b-notification>

        <b-loading v-model="showLoading" :is-full-page="true" :can-cancel="false" :is-fullscreen="true"
            aria-label="Cargando...">
            <b-icon pack="fas" icon="sync-alt" size="is-large" custom-class="fa-spin">
            </b-icon>
        </b-loading>

        <div class="content-layout">

            <Sidebar ref="sidebarmobile" class="sidebar-mobile-panel" v-if="!isMobile || isMobileSidebarVisible"
                @toggle="setSidebarState" :collapsed="isSidebarCollapsed" :user="user" :loading="loading" />

            <NotificationPanel :visible="showPanel" @close="closePanel" @update-unread="unreadNotifications = $event" />

            <!-- DIV overlay que aplica el blur y fondo -->
            <div v-if="isMobile && showPanel" class="blur-overlay"></div>

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

                <!-- Panel superior del dashboard -->
                <section class="hero dashboard-panel" ref="motionRef">

                    <div class="columns is-vcentered is-multiline">

                        <!-- Botón solo visible en móviles -->

                        <!-- Título y breadcrumb -->
                        <div class="column is-full-mobile is-4-desktop">
                            <!-- Contenedor en fila para el botón y el breadcrumb -->
                            <div class="is-flex is-align-items-center">
                                <!-- Botón solo visible en móvil -->
                                <b-button icon-left="bars" class="is-hidden-desktop is-hidden-tablet mr-2"
                                    type="is-primary" @click="toggleMobileSidebar" size="is-small" />

                                <!-- Breadcrumb -->
                                <b-breadcrumb separator="succeeds">
                                    <b-breadcrumb-item href="/layouts/home">Dashboard</b-breadcrumb-item>
                                    <b-breadcrumb-item active>{{ currentRouteName }}</b-breadcrumb-item>
                                </b-breadcrumb>
                            </div>

                            <!-- Título -->
                            <h1 class="title is-4 mt-2">{{ pageTitle }}</h1>
                        </div>


                        <!-- Buscador -->
                        <div class="column is-full-mobile is-4-desktop">
                            <b-field position="is-centered">
                                <b-input placeholder="Buscar..." rounded icon="search" icon-pack="fas" expanded>
                                    <template #icon>
                                        <b-icon icon="magnify"></b-icon>
                                    </template>
                                </b-input>
                            </b-field>
                        </div>

                        <!-- Iconos de acciones -->
                        <div class="column is-12-mobile is-4-desktop">
                            <div
                                class="buttons is-flex is-flex-wrap-wrap is-justify-content-flex-end-desktop is-justify-content-flex-start-mobile">
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
                                    <b-dropdown-item @click="setFontSize('xs')">🅰 Extra Pequeña</b-dropdown-item>
                                    <b-dropdown-item @click="setFontSize('sm')">🅰 Pequeña</b-dropdown-item>
                                    <b-dropdown-item @click="setFontSize('md')">🅰 Mediana
                                        (Recomendado)</b-dropdown-item>
                                    <b-dropdown-item @click="setFontSize('lg')">🅰 Grande</b-dropdown-item>
                                </b-dropdown>

                                <!-- Menú usuario -->
                                <b-dropdown position="is-bottom-left" aria-role="menu" append-to-body
                                    class="is-light is-radiusless m-0 p-0" menu-class="">
                                    <template #trigger>
                                        <b-button type="is-primary" icon-right="user-circle" label="Usuario" />
                                    </template>

                                    <b-dropdown-item aria-role="menu-item" @click="profile" class="dropmenu-is-light">
                                        <b-icon icon="user" size="is-small" /> Perfil
                                    </b-dropdown-item>

                                    <b-dropdown-item aria-role="menu-item" @click="settings" class="dropmenu-is-light">
                                        <b-icon icon="cog" size="is-small" /> Configuración
                                    </b-dropdown-item>

                                    <hr class="dropdown-divider" />

                                    <b-dropdown-item aria-role="menu-item" @click="logout" class="dropmenu-is-light">
                                        <b-icon icon="sign-out-alt" size="is-small" /> Cerrar sesión
                                    </b-dropdown-item>
                                </b-dropdown>
                            </div>
                        </div>


                    </div>

                </section>

                <!-- Aquí puedes poner tu sidebar, header, etc. -->
                <router-view v-slot="{ Component }">
                    <component :is="Component" :user="user" :loading="loading" />
                </router-view>




                <footer class="mt-2 mb-2">
                    <div class="content has-text-centered">
                        <p>
                            <strong>RSBO</strong> by <a href="https://jgthms.com">Jeremy Thomas</a>.
                            The source code is licensed
                            <a href="https://opensource.org/license/mit">MIT</a>. The
                            website content is licensed
                            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0//">CC BY NC SA 4.0</a>.
                        </p>
                    </div>
                </footer>

            </main>

        </div>
    </div>
</template>

<style scoped>
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

.app-layout {
    display: flex;
    flex-direction: column;
    height: calc(var(--vh, 1vh) * 100);
    width: 100%;
    /* Quitar overflow hidden para permitir scroll horizontal si se reduce más */
    /* overflow: hidden; */
    min-width: 360px;
    /* <-- Agregado para que no se reduzca más allá de 360px */
}

.content-layout {
    display: flex;
    flex: 1;
    min-height: 0;
    min-width: 0;
    position: relative;
    /* Mantener row para que sidebar y main estén lado a lado */
    flex-direction: row;
    min-width: 360px;
    /* <-- Agregado para mantener mínimo ancho */
}

/* Aquí asumes que Sidebar.vue tiene su propio CSS para ancho y colapsado,
   pero si quieres que main-content se ajuste, haces flex:1 sin margen */

.main-content {
    margin-left: 240px;
    /* o ajusta según sidebar colapsado */
    transition: margin-left 0.3s ease, margin-right 0.3s ease;
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    /*   background-color: #f5f5f5; 
    padding: 1.5rem; */
    min-height: auto;

    box-sizing: border-box;

    /* o usa height:auto según necesidad */
}

/* Si quieres animar main-content según sidebar colapsado,
   mejor hacerlo con flex-basis o padding, no margin-left */
.main-content.is-collapsed {
    /* Por ejemplo, podrías ajustar padding para que luzca diferente */
    margin-left: 70px;
}

.dashboard-panel {
    border-bottom: 1px solid #ccc;
    padding-bottom: 1rem;

    padding: 1.5rem;

}

/* 
.dashboard-panel {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 3px rgba(10, 10, 10, 0.1);
}

.content-container {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 3px rgba(10, 10, 10, 0.1);
}
*/


/* Responsive */
/* Importante: NO cambiar flex-direction a column para .content-layout */
.hidden-when-sidebar-open-on-mobile {
    display: none;
}

@media screen and (max-width: 768px) {
    .is-hidden-on-mobile-panel {
        display: none !important;
    }
}

@media (min-width: 361px) {
    .hidden-when-sidebar-open-on-mobile {
        display: block !important;
    }
}

@media screen and (max-width: 768px) {
    .ignore-grid-mobile {
        all: unset !important;
        /* resetea TODO */

        /* Mantener un contenedor block que ocupe toda la pantalla */
        display: block !important;
        width: 100vw !important;
        /* ancho completo viewport */
        height: 100vh !important;
        /* alto completo viewport */
        overflow-y: auto !important;

        position: fixed !important;
        top: 0;
        left: 0;
        background-color: rgb(3, 3, 3);
        /* o color de fondo que corresponda */
        z-index: 10;

        /* Mantener box-sizing para evitar apachurramientos */
        box-sizing: border-box !important;

        /* Opcional: para evitar scroll horizontal */
        overscroll-behavior: contain !important;
    }

    /* Variante cuando mobileSidebarVisible es true */
    .ignore-grid-mobile.visible-sidebar {
        margin-left: 70px !important;
    }


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
        /* Más alto que ignore-grid-mobile */
        pointer-events: auto;
        /* Ahora bloquea clics debajo */
        /* Para que no bloquee clicks */
    }
}
</style>

<style scoped>
/* Animación para sidebar móvil */
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


.main-sidebar-hidden {
    margin-left: 70px;
}

.main-sidebar-visible {
    margin-left: 240px;
}

@media screen and (max-width: 768px) {
    .main-sidebar-hidden {
        margin-left: 0 !important;
        transition: margin-left 0.2s ease;

    }

    .main-sidebar-visible {
        margin-left: 70px !important;
        transition: margin-left 0.2s ease;

    }
}
</style>