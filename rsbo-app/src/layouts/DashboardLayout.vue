<script setup>
import { ref, watch, onMounted, onBeforeUnmount, onBeforeMount, computed, nextTick } from "vue";
import { useRoute } from "vue-router";

import Sidebar from "../components/Sidebar.vue";
import NotificationPanel from "../components/NotificationPanel.vue";

import { useSidebarState } from "../composables/useSidebarState";
import { useMotionEffects } from "../composables/useMotionEffects";
import { useNotifications } from "../composables/useNotificationsState";

/* =========================
   Helpers perf
   ========================= */
function rafThrottle(fn) {
  let rafId = 0;
  return (...args) => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      fn(...args);
    });
  };
}

/* =========================
   Sidebar & motion
   ========================= */
const { isSidebarCollapsed, setSidebarState } = useSidebarState();
const { motionRef, animateSidebarShift } = useMotionEffects();

/* =========================
   Notificaciones
   ========================= */
const { showPanel, openPanel, closePanel } = useNotifications();
const unreadNotifications = ref(0);

/* =========================
   Breadcrumb / título
   ========================= */
const route = useRoute();
const currentRouteName = computed(() => route.meta.breadcrumb || route.name || "Dashboard");
const pageTitle = computed(() => "Panel de Control");

/* =========================
   Dark mode
   ========================= */
const isDark = ref(document.documentElement.getAttribute("data-theme") === "dark");

function toggleDarkMode() {
  const html = document.documentElement;
  const next = html.getAttribute("data-theme") !== "dark" ? "dark" : "light";
  html.setAttribute("data-theme", next);
  html.style.colorScheme = next;
  localStorage.setItem("dark-mode", next === "dark" ? "true" : "false");
  isDark.value = next === "dark";
}

/* =========================
   Font size (1 paso)
   ========================= */
const FONT_SIZE_KEY = "user-font-size";
const sizes = { xs: "85%", sm: "92.5%", md: "100%", lg: "112.5%" };

const fontSize = ref("md");
(function applyFontSizeImmediately() {
  const saved = localStorage.getItem(FONT_SIZE_KEY);
  const size = saved && sizes[saved] ? saved : "md";
  fontSize.value = size;
  document.documentElement.style.fontSize = sizes[size];
})();

function setFontSize(size) {
  const next = sizes[size] ? size : "md";
  fontSize.value = next;
  document.documentElement.style.fontSize = sizes[next];
  localStorage.setItem(FONT_SIZE_KEY, next);
}

/* =========================
   Online / Offline
   ========================= */
const isOffline = ref(!navigator.onLine);
const showLoading = ref(false);

function updateOnlineStatus() {
  const online = navigator.onLine;
  isOffline.value = !online;
  showLoading.value = !online;
}

/* =========================
   Mobile detection (matchMedia)
   ========================= */
const mql = window.matchMedia("(max-width: 768px)");
const isMobile = ref(mql.matches);

function onMediaChange(e) {
  isMobile.value = !!e.matches;
}

/* =========================
   Viewport vh + resize
   (1 solo listener, throttled)
   ========================= */
function setVhVar() {
  document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
}

const onResize = rafThrottle(() => {
  setVhVar();
  // (no hacemos windowWidth reactive; mobile lo define matchMedia)
});

/* =========================
   Sidebar móvil (persistencia)
   ========================= */
const sidebarmobile = ref(null);
const isMobileSidebarVisible = ref(true);

const savedSidebarState = localStorage.getItem("mobileSidebarVisible");
if (savedSidebarState !== null) isMobileSidebarVisible.value = savedSidebarState === "true";

onBeforeMount(() => {
  // En desktop, siempre visible
  if (!isMobile.value) {
    isMobileSidebarVisible.value = true;
    localStorage.setItem("mobileSidebarVisible", "true");
  }
});

function showSidebarMobile() {
  const el = sidebarmobile.value?.$el;
  if (!el) return;

  el.classList.remove("mobileSidebtraction-leave-active");
  el.classList.add("mobileSidebtraction-enter-active");

  el.addEventListener(
    "animationend",
    () => el.classList.remove("mobileSidebtraction-enter-active"),
    { once: true }
  );
}

function hideSidebarMobile() {
  const el = sidebarmobile.value?.$el;
  if (!el) return;

  el.classList.remove("mobileSidebtraction-enter-active");
  el.classList.add("mobileSidebtraction-leave-active");

  el.addEventListener(
    "animationend",
    () => {
      el.classList.remove("mobileSidebtraction-leave-active");
      isMobileSidebarVisible.value = false;
      localStorage.setItem("mobileSidebarVisible", "false");
    },
    { once: true }
  );
}

function toggleMobileSidebar() {
  if (!isMobile.value) return;

  if (isMobileSidebarVisible.value) {
    hideSidebarMobile();
  } else {
    isMobileSidebarVisible.value = true;
    localStorage.setItem("mobileSidebarVisible", "true");
    nextTick(showSidebarMobile);
  }
}

/* Cuando cambias a desktop: fuerza visible (evita estados raros) */
watch(isMobile, (nowMobile) => {
  if (!nowMobile) {
    isMobileSidebarVisible.value = true;
    localStorage.setItem("mobileSidebarVisible", "true");
  }
});

/* Sidebar collapse: animación + cerrar notifs */
watch(isSidebarCollapsed, (newVal) => {
  animateSidebarShift(newVal);
  if (!newVal) closePanel();
});

/* =========================
   Clases del main
   ========================= */
const mainClasses = computed(() => ({
  "is-sidebar-narrow": !!isSidebarCollapsed.value,
  "is-sidebar-wide": !isSidebarCollapsed.value,
  "is-notifications-open": !!showPanel.value,
  "is-mobile": !!isMobile.value,
  "is-mobile-sidebar-open": !!(isMobile.value && isMobileSidebarVisible.value),
}));

function closePanelFromOverlay() {
  if (isMobile.value && showPanel.value) closePanel();
}

/* =========================
   Mount / Unmount (1 sola vez)
   ========================= */
onMounted(() => {
  setVhVar();

  // resize (1)
  window.addEventListener("resize", onResize, { passive: true });

  // online/offline (2)
  window.addEventListener("online", updateOnlineStatus, { passive: true });
  window.addEventListener("offline", updateOnlineStatus, { passive: true });
  updateOnlineStatus();

  // matchMedia (3)
  if (mql.addEventListener) mql.addEventListener("change", onMediaChange);
  else mql.addListener(onMediaChange);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);

  window.removeEventListener("online", updateOnlineStatus);
  window.removeEventListener("offline", updateOnlineStatus);

  if (mql.removeEventListener) mql.removeEventListener("change", onMediaChange);
  else mql.removeListener(onMediaChange);
});
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
        <!-- Aviso sin conexión   -->
        <b-notification v-if="isOffline" type="is-danger" aria-close-label="Cerrar notificación" has-icon
            class="has-text-centered" style="position: fixed; top: 0; width: 100%; z-index: 2000;">
            No hay conexión a internet. Por favor verifica tu red.
        </b-notification>

        <!-- Aviso sin conexión (loading)  -->
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
