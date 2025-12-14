<!-- DashboardLayout.vue -->
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
   Font size
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
   Reduce effects (blur/gradients/transparency)
   ========================= */
const REDUCED_EFFECTS_KEY = "ui-reduced-effects";
const reducedEffects = ref(false);

function applyReducedEffects(enabled) {
  const html = document.documentElement;
  if (enabled) html.setAttribute("data-reduced-effects", "true");
  else html.removeAttribute("data-reduced-effects");
}

// ✅ aplicar INMEDIATO (evita “flash”)
(function applyReducedEffectsImmediately() {
  const saved = localStorage.getItem(REDUCED_EFFECTS_KEY);
  const enabled = saved === "true";
  reducedEffects.value = enabled;
  applyReducedEffects(enabled);
})();

function setReducedEffects(val) {
  const enabled = !!val;
  reducedEffects.value = enabled;
  localStorage.setItem(REDUCED_EFFECTS_KEY, enabled ? "true" : "false");
  applyReducedEffects(enabled);
}

function toggleReducedEffects() {
  setReducedEffects(!reducedEffects.value);
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
   Mobile detection
   ========================= */
const mql = window.matchMedia("(max-width: 768px)");
const isMobile = ref(mql.matches);

function onMediaChange(e) {
  isMobile.value = !!e.matches;
}

/* =========================
   Viewport vh + resize
   ========================= */
function setVhVar() {
  document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
}

const onResize = rafThrottle(() => {
  setVhVar();
});

/* =========================
   Sidebar móvil (persistencia)
   ========================= */
const sidebarmobile = ref(null);
const isMobileSidebarVisible = ref(true);

const savedSidebarState = localStorage.getItem("mobileSidebarVisible");
if (savedSidebarState !== null) isMobileSidebarVisible.value = savedSidebarState === "true";

onBeforeMount(() => {
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

/* Cuando cambias a desktop: fuerza visible */
const mobileSearchOpen = ref(false);
watch(isMobile, (nowMobile) => {
  if (!nowMobile) {
    isMobileSidebarVisible.value = true;
    localStorage.setItem("mobileSidebarVisible", "true");
  } else {
    mobileSearchOpen.value = false;
  }
});

/* Sidebar collapse: animación + cerrar notifs */
watch(isSidebarCollapsed, (newVal) => {
  animateSidebarShift(newVal);
  if (!newVal) closePanel();
});

/* =========================
   Mobile Search overlay
   ========================= */
const mobileSearchQuery = ref("");
const mobileSearchInputRef = ref(null);

function openMobileSearch() {
  mobileSearchOpen.value = true;
  nextTick(() => {
    try {
      const el = mobileSearchInputRef.value?.$el?.querySelector?.("input");
      el?.focus?.();
    } catch {}
  });
}

function closeMobileSearch() {
  mobileSearchOpen.value = false;
}

function toggleMobileSearch() {
  mobileSearchOpen.value ? closeMobileSearch() : openMobileSearch();
}

watch(route, () => {
  mobileSearchOpen.value = false;
});

/* =========================
   Layout vars (CSS variables)
   ========================= */
const layoutStyleVars = computed(() => {
  const sidebarW = isMobile.value
    ? (isMobileSidebarVisible.value ? 70 : 0)
    : (isSidebarCollapsed.value ? 70 : 240);

  const notifW = showPanel.value ? 285 : 0;

  return {
    "--sidebar-w": `${sidebarW}px`,
    "--notif-w": `${notifW}px`,
  };
});

function closePanelFromOverlay() {
  if (isMobile.value && showPanel.value) closePanel();
}

/* =========================
   Mount / Unmount
   ========================= */
onMounted(() => {
  setVhVar();

  window.addEventListener("resize", onResize, { passive: true });

  window.addEventListener("online", updateOnlineStatus, { passive: true });
  window.addEventListener("offline", updateOnlineStatus, { passive: true });
  updateOnlineStatus();

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
import { useAuth } from "@/services/useAuth";

export default {
  name: "DashboardLayout",
  data() {
    return {
      user: null,
      loading: true,
    };
  },
  methods: {
    async fetchUserData() {
      const { fetchUser, user } = useAuth();
      await fetchUser();
      this.user = user.value;
      this.loading = false;
    },
    profile() {
      const { profile } = useAuth();
      profile(this.$router);
    },
    settings() {
      const { settings } = useAuth();
      settings(this.$router);
    },
    logout() {
      const { logout } = useAuth();
      logout(this.$router, this.$buefy);
    },
  },
  mounted() {
    this.fetchUserData();
  },
};
</script>

<template>
  <div class="app-layout" :style="layoutStyleVars">
    <!-- Background (soft gradients like banner) -->
    <div class="layout-bg" aria-hidden="true"></div>

    <!-- Aviso sin conexión -->
    <b-notification
      v-if="isOffline"
      type="is-danger"
      aria-close-label="Cerrar notificación"
      has-icon
      class="has-text-centered offline-bar"
    >
      No hay conexión a internet. Por favor verifica tu red.
    </b-notification>

    <!-- Aviso sin conexión (loading) -->
    <b-loading
      v-model="showLoading"
      :is-full-page="true"
      :can-cancel="false"
      :is-fullscreen="true"
      aria-label="Cargando..."
    >
      <b-icon pack="fas" icon="sync-alt" size="is-large" custom-class="fa-spin" />
    </b-loading>

    <div class="content-layout">
      <!-- Sidebar -->
      <Sidebar
        ref="sidebarmobile"
        class="sidebar-mobile-panel"
        v-if="!isMobile || isMobileSidebarVisible"
        @toggle="setSidebarState"
        :collapsed="isSidebarCollapsed"
        :user="user"
        :loading="loading"
      />

      <!-- Panel de notificaciones -->
      <NotificationPanel
        :visible="showPanel"
        @close="closePanel"
        @update-unread="unreadNotifications = $event"
      />

      <!-- Overlay blur notificaciones móvil -->
      <div v-if="isMobile && showPanel" class="blur-overlay" @click="closePanelFromOverlay"></div>

      <!-- Contenido principal -->
      <main
        class="main-content p-0"
        :class="{
          'ignore-grid-mobile': isMobile && showPanel,
          'visible-sidebar': isMobileSidebarVisible && isMobile && showPanel
        }"
      >
        <!-- Header -->
        <section class="dashboard-header" ref="motionRef" :class="{ 'dashboard-header--mobile': isMobile }">
          <!-- DESKTOP TOOLBAR -->
          <div v-if="!isMobile" class="dashboard-toolbar">
            <!-- LEFT -->
            <div class="dashboard-toolbar__left">
              <div class="breadcrumb-wrapper">
                <b-breadcrumb separator="succeeds" class="is-size-7-mobile">
                  <b-breadcrumb-item href="/layouts/home">Dashboard</b-breadcrumb-item>
                  <b-breadcrumb-item active>{{ currentRouteName }}</b-breadcrumb-item>
                </b-breadcrumb>
              </div>

              <div class="page-heading">
                <h1 class="dashboard-title">{{ pageTitle }}</h1>
              </div>
            </div>

            <!-- CENTER -->
            <div class="dashboard-toolbar__center">
              <b-field class="dashboard-search" position="is-centered">
                <b-input placeholder="Buscar en el panel..." rounded expanded icon-pack="fas" icon="search" />
              </b-field>
            </div>

            <!-- RIGHT -->
            <div class="dashboard-toolbar__right">
              <div class="dashboard-actions">
                <b-tooltip label="Notificaciones" position="is-bottom" append-to-body>
                  <div class="has-badge-wrapper">
                    <b-button
                      class="toolbar-btn"
                      type="is-light"
                      :icon-right="showPanel ? 'close' : 'bell'"
                      @click="showPanel ? closePanel() : openPanel()"
                    />
                    <transition name="badge-fade">
                      <b-tag
                        v-if="unreadNotifications > 0"
                        type="is-primary"
                        size="is-small"
                        rounded
                        class="is-badge"
                      >
                        {{ unreadNotifications }}
                      </b-tag>
                    </transition>
                  </div>
                </b-tooltip>

                <!-- ✅ NUEVO: reducir efectos -->
                <b-tooltip
                  :label="reducedEffects ? 'Efectos reducidos: activado' : 'Efectos reducidos: desactivado'"
                  position="is-bottom"
                  append-to-body
                >
                  <b-button
                    class="toolbar-btn"
                    :type="reducedEffects ? 'is-primary' : 'is-light'"
                    icon-pack="fas"
                    :icon-left="reducedEffects ? 'eye-slash' : 'eye'"
                    @click="toggleReducedEffects"
                  />
                </b-tooltip>

                <b-tooltip label="Modo oscuro (beta)" position="is-bottom" append-to-body>
                  <b-button
                    class="toolbar-btn"
                    :type="isDark ? 'is-dark' : 'is-light'"
                    icon-pack="fas"
                    icon-left="adjust"
                    @click="toggleDarkMode"
                  />
                </b-tooltip>

                <b-dropdown
                  aria-role="list"
                  icon-left="text-height"
                  position="is-bottom-left"
                  :close-on-click="true"
                  append-to-body
                >
                  <template #trigger>
                    <b-button class="toolbar-btn" size="is-light" icon-left="text-height" type="is-light">
                      Tamaño
                    </b-button>
                  </template>
                  <b-dropdown-item @click="setFontSize('xs')">🅰 Extra pequeña</b-dropdown-item>
                  <b-dropdown-item @click="setFontSize('sm')">🅰 Pequeña</b-dropdown-item>
                  <b-dropdown-item @click="setFontSize('md')">🅰 Mediana (recomendada)</b-dropdown-item>
                  <b-dropdown-item @click="setFontSize('lg')">🅰 Grande</b-dropdown-item>
                </b-dropdown>

                <b-dropdown position="is-bottom-left" aria-role="menu" append-to-body class="user-dd">
                  <template #trigger>
                    <b-button class="toolbar-user" type="is-primary" icon-right="user-circle" label="Usuario" />
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

          <!-- MOBILE TOPBAR -->
          <div v-else class="mobile-topbar">
            <div class="mobile-topbar__left">
              <b-button icon-left="bars" class="menu-toggle" type="is-primary" size="is-small" @click="toggleMobileSidebar" />
              <div class="mobile-title-wrap">
                <div class="mobile-title">{{ pageTitle }}</div>
                <div class="mobile-subtitle">{{ currentRouteName }}</div>
              </div>
            </div>

            <div class="mobile-topbar__right">
              <b-tooltip label="Buscar" position="is-bottom" append-to-body>
                <b-button class="toolbar-btn" type="is-light" icon-pack="fas" icon-left="search" @click="toggleMobileSearch" />
              </b-tooltip>

              <b-tooltip label="Notificaciones" position="is-bottom" append-to-body>
                <div class="has-badge-wrapper">
                  <b-button
                    class="toolbar-btn"
                    type="is-light"
                    :icon-right="showPanel ? 'close' : 'bell'"
                    @click="showPanel ? closePanel() : openPanel()"
                  />
                  <transition name="badge-fade">
                    <b-tag v-if="unreadNotifications > 0" type="is-primary" size="is-small" rounded class="is-badge">
                      {{ unreadNotifications }}
                    </b-tag>
                  </transition>
                </div>
              </b-tooltip>

              <b-dropdown position="is-bottom-left" aria-role="menu" append-to-body class="mobile-more">
                <template #trigger>
                  <b-button class="toolbar-btn" type="is-light" icon-pack="fas" icon-left="ellipsis-v" />
                </template>

                <b-dropdown-item aria-role="menu-item" @click="toggleDarkMode">
                  <b-icon icon="adjust" size="is-small" />&nbsp;
                  {{ isDark ? "Modo claro" : "Modo oscuro" }}
                </b-dropdown-item>

                <!-- ✅ NUEVO: reducir efectos -->
                <b-dropdown-item aria-role="menu-item" @click="toggleReducedEffects">
                  <b-icon :icon="reducedEffects ? 'eye-slash' : 'eye'" size="is-small" />&nbsp;
                  {{ reducedEffects ? "Efectos reducidos: ON" : "Efectos reducidos: OFF" }}
                </b-dropdown-item>

                <hr class="dropdown-divider" />

                <b-dropdown-item aria-role="menu-item" @click="setFontSize('xs')">🅰 Extra pequeña</b-dropdown-item>
                <b-dropdown-item aria-role="menu-item" @click="setFontSize('sm')">🅰 Pequeña</b-dropdown-item>
                <b-dropdown-item aria-role="menu-item" @click="setFontSize('md')">🅰 Mediana</b-dropdown-item>
                <b-dropdown-item aria-role="menu-item" @click="setFontSize('lg')">🅰 Grande</b-dropdown-item>

                <hr class="dropdown-divider" />

                <b-dropdown-item aria-role="menu-item" @click="profile">
                  <b-icon icon="user" size="is-small" />&nbsp; Perfil
                </b-dropdown-item>

                <b-dropdown-item aria-role="menu-item" @click="settings">
                  <b-icon icon="cog" size="is-small" />&nbsp; Configuración
                </b-dropdown-item>

                <hr class="dropdown-divider" />

                <b-dropdown-item aria-role="menu-item" @click="logout">
                  <b-icon icon="sign-out-alt" size="is-small" />&nbsp; Cerrar sesión
                </b-dropdown-item>
              </b-dropdown>
            </div>

            <!-- Overlay buscador -->
            <transition name="mobile-search">
              <div v-if="mobileSearchOpen" class="mobile-search-overlay" @click.self="closeMobileSearch">
                <div class="mobile-search-card">
                  <div class="mobile-search-head">
                    <span class="mobile-search-title">Buscar</span>
                    <b-button size="is-small" type="is-light" icon-pack="fas" icon-left="times" @click="closeMobileSearch" />
                  </div>

                  <b-field class="m-0">
                    <b-input
                      ref="mobileSearchInputRef"
                      v-model="mobileSearchQuery"
                      placeholder="Buscar en el panel..."
                      icon-pack="fas"
                      icon="search"
                      expanded
                      rounded
                    />
                  </b-field>

                  <p class="mobile-search-hint">Tip: aquí puedes conectar tu búsqueda global si quieres.</p>
                </div>
              </div>
            </transition>
          </div>
        </section>

        <!-- Body -->
        <section class="dashboard-body">
          <router-view v-slot="{ Component }">
            <component :is="Component" :user="user" :loading="loading" />
          </router-view>
        </section>

        <!-- Footer -->
        <footer class="dashboard-footer">
          <div class="content has-text-centered">
            <p>
              <strong>RSBO</strong> · Lightweight UI components for Vue 3 based on Bulma. <br />
              <small>
                Código bajo licencia <a href="https://opensource.org/license/mit">MIT</a> · Contenido bajo
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
/* =========
  Layout tokens
========= */
.app-layout {
  /* FX tokens (por defecto: premium glass/gradientes) */
  --fx-surface-a: 0.88;
  --fx-blur: 12px;

  --fx-grad-a1: 0.12;
  --fx-grad-a2: 0.10;
  --fx-grad-a3: 0.10;

  --fx-shadow-a: 0.12;

  --surface: rgba(255,255,255,var(--fx-surface-a));
  --border: rgba(148, 163, 184, 0.22);
  --text: #0f172a;
  --muted: rgba(15,23,42,0.62);
  --shadow: 0 18px 50px rgba(15, 23, 42, var(--fx-shadow-a));

  display: flex;
  flex-direction: column;
  height: calc(var(--vh, 1vh) * 100);
  width: 100%;
  min-width: 360px;
  position: relative;
  overflow: hidden;
}

/* soft background like banner system */
.layout-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;

  background:
    radial-gradient(circle at 0% 0%, rgba(121, 87, 213, var(--fx-grad-a1)), transparent 55%),
    radial-gradient(circle at 100% 70%, rgba(236, 72, 153, var(--fx-grad-a2)), transparent 55%),
    radial-gradient(circle at 40% 110%, rgba(249, 115, 22, var(--fx-grad-a3)), transparent 55%),
    #ffffff;
}

/* ensure content above bg */
.content-layout {
  position: relative;
  z-index: 1;

  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
  flex-direction: row;
}

/* Offline bar */
.offline-bar {
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 2000;
}

/* Main layout uses vars instead of inline style */
.main-content {
  margin-left: var(--sidebar-w);
  margin-right: var(--notif-w);
  transition: margin-left 0.22s ease, margin-right 0.22s ease;

  flex: 1;
  min-width: 0;
  overflow-y: auto;
  box-sizing: border-box;

  padding-bottom: 1rem;
}

/* =========
  Header (glass + sticky)
========= */
.dashboard-header {
  position: sticky;
  top: 0;
  z-index: 5;

  padding: 1rem 1.25rem 0.75rem;
  border-bottom: 1px solid var(--border);

  background: var(--surface);
  backdrop-filter: blur(var(--fx-blur));
  -webkit-backdrop-filter: blur(var(--fx-blur));
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.dashboard-header::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.65;
  background:
    radial-gradient(circle at 0 0, rgba(255,255,255,0.22), transparent 60%),
    radial-gradient(circle at 100% 100%, rgba(15,23,42,0.10), transparent 60%);
}

.dashboard-header > * { position: relative; z-index: 1; }

/* Toolbar grid */
.dashboard-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr) auto;
  grid-template-areas: "left center right";
  align-items: center;
  column-gap: 1rem;
  row-gap: 0.75rem;
}

.dashboard-toolbar__left { grid-area: left; display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
.dashboard-toolbar__center { grid-area: center; min-width: 0; }
.dashboard-toolbar__right { grid-area: right; min-width: 0; }

/* Title */
.dashboard-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 900;
  color: var(--text);
}

/* Search */
.dashboard-search {
  width: 100%;
  max-width: 540px;
  margin: 0 auto;
}

/* Actions */
.dashboard-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.toolbar-btn :deep(.button) {
  border-radius: 999px;
  box-shadow: 0 0 0 1px rgba(148,163,184,0.22);
}

.toolbar-user :deep(.button) {
  border-radius: 999px;
  box-shadow: 0 14px 30px rgba(88, 28, 135, 0.18);
}

/* Badge */
.has-badge-wrapper { position: relative; display: inline-block; }
.is-badge {
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(40%, -40%);
  font-size: 0.65rem;
  z-index: 1;
}

/* Badge anim */
.badge-fade-enter-active,
.badge-fade-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.badge-fade-enter-from,
.badge-fade-leave-to { opacity: 0; transform: translate(40%, -60%) scale(0.85); }

/* =========
  Mobile topbar
========= */
.dashboard-header--mobile { padding: 0.55rem 0.75rem; }

.mobile-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  min-height: 52px;
}

.mobile-topbar__left { display: flex; align-items: center; gap: 0.6rem; min-width: 0; }
.menu-toggle { border-radius: 999px; }

.mobile-title-wrap { display: flex; flex-direction: column; gap: 0.05rem; min-width: 0; }
.mobile-title {
  font-weight: 900;
  font-size: 0.98rem;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mobile-subtitle {
  font-size: 0.78rem;
  color: rgba(17, 24, 39, 0.65);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mobile-topbar__right { display: flex; align-items: center; gap: 0.45rem; }

/* Mobile search overlay */
.mobile-search-overlay {
  position: fixed;
  inset: 0;
  z-index: 1001;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(var(--fx-blur));
  -webkit-backdrop-filter: blur(var(--fx-blur));
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0.9rem 0.75rem;
}

.mobile-search-card {
  width: min(720px, 100%);
  background: rgba(255,255,255,0.92);
  border-radius: 14px;
  padding: 0.75rem;
  border: 1px solid rgba(17, 24, 39, 0.08);
  box-shadow: var(--shadow);
}

.mobile-search-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.55rem; }
.mobile-search-title { font-weight: 900; color: #111827; }
.mobile-search-hint { margin: 0.55rem 0 0; font-size: 0.8rem; color: rgba(17, 24, 39, 0.6); }

.mobile-search-enter-active,
.mobile-search-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
.mobile-search-enter-from,
.mobile-search-leave-to { opacity: 0; transform: translateY(-10px); }

/* =========
  Body + Footer
========= */
.dashboard-body {
  padding: 1rem 1.25rem 1.25rem;
}

.dashboard-footer {
  padding: 0.75rem 1.25rem 1.25rem;
  color: rgba(15,23,42,0.65);
}

/* Overlay notifs */
.blur-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(var(--fx-blur));
  -webkit-backdrop-filter: blur(var(--fx-blur));
  z-index: 9;
  pointer-events: auto;
}

/* ===== Mobile behavior fixes ===== */
@media screen and (max-width: 768px) {
  .dashboard-body { padding: 0.75rem 0.9rem 1rem; }
  .dashboard-footer { padding: 0.75rem 0.9rem 1.25rem; }

  .ignore-grid-mobile {
    all: unset !important;
    display: block !important;
    width: 100vw !important;
    height: 100vh !important;
    overflow-y: auto !important;
    position: fixed !important;
    top: 0;
    left: 0;
    background-color: transparent;
    z-index: 10;
    box-sizing: border-box !important;
    overscroll-behavior: contain !important;
  }
}

/* =========
  Mobile sidebar animations (same as yours)
========= */
@keyframes mobileSidebtractionIn {
  0% { transform: translateX(-110%); opacity: 0; }
  60% { transform: translateX(15%); opacity: 1; }
  80% { transform: translateX(-5%); }
  100% { transform: translateX(0); }
}
@keyframes mobileSidebtractionOut {
  0% { transform: translateX(0); opacity: 1; }
  100% { transform: translateX(-110%); opacity: 0; }
}
.mobileSidebtraction-enter-active {
  animation: mobileSidebtractionIn 0.4s forwards cubic-bezier(0.4, 0, 0.2, 1);
}
.mobileSidebtraction-leave-active {
  animation: mobileSidebtractionOut 0.3s forwards cubic-bezier(0.4, 0, 0.2, 1);
}

/* =========================
   ✅ MODO EFECTOS REDUCIDOS (global)
   - menos transparencia
   - sin blur
   - gradientes casi apagados
   - sombra más ligera
   ========================= */
:global(html[data-reduced-effects="true"]) {
  --fx-surface-a: 0.98;
  --fx-blur: 0px;

  --fx-grad-a1: 0.03;
  --fx-grad-a2: 0.02;
  --fx-grad-a3: 0.02;

  --fx-shadow-a: 0.08;
}

/* opcional: reduce duraciones de transición para sentirlo más rápido */
:global(html[data-reduced-effects="true"]) * {
  transition-duration: 120ms !important;
}
</style>
