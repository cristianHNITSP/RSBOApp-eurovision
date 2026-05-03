<template>
  <div class="app-layout" :style="layoutStyleVars">
    <!-- Capa A11y y Estados -->
    <DashboardA11yLayer :is-offline="isOffline" :show-loading="showLoading" />

    <div class="content-layout">
      <!-- Desktop Sidebar -->
      <Sidebar
        v-if="!isMobile"
        @toggle="handleSidebarToggle"
        :collapsed="isSidebarCollapsed"
        :user="user"
        :loading="loading"
        :pending-orders="pendingOrdersCount"
      />

      <!-- Mobile Sidebar -->
      <transition name="mobile-liquid">
        <SidebarMobile
          v-if="isMobile && isMobileSidebarVisible"
          :user="user"
          :loading="loading"
          :pending-orders="pendingOrdersCount"
          @close="collapseSidebar"
        />
      </transition>

      <!-- Panel de notificaciones (flotante) -->
      <NotificationPanel
        :visible="showPanel"
        @close="handleClosePanel"
        @update-count="activeNotifications = $event"
      />

      <!-- Overlay blur sidebar móvil -->
      <transition name="fade-glass">
        <div v-if="isMobile && isMobileSidebarVisible" class="blur-overlay sidebar-mobile-overlay" @click="collapseSidebar"></div>
      </transition>

      <!-- Overlay transparente para cerrar panel flotante -->
      <div v-if="showPanel" class="notif-overlay" @click="closePanelFromOverlay"></div>

      <!-- Contenido principal -->
      <main class="main-content p-0">
        <!-- Header -->
        <section class="dashboard-header" ref="motionRef" :class="{ 'dashboard-header--mobile': isMobile }">
          <!-- DESKTOP TOOLBAR -->
          <DashboardToolbar
            v-if="!isMobile"
            :current-route-name="currentRouteName"
            :page-title="pageTitle"
            :show-panel="showPanel"
            :bell-ringing="bellRinging"
            :unread-notifications="activeNotifications"
            @toggle-notifications="showPanel ? handleClosePanel() : openPanelMobile()"
            @profile="profile"
            @accessibility="goToAccessibility"
            @security="goToSecurity"
            @logout="logout"
          >
            <template #search>
              <GlobalSearch />
            </template>
          </DashboardToolbar>

          <!-- MOBILE TOPBAR -->
          <DashboardMobileTopbar
            v-else
            :current-route-name="currentRouteName"
            :page-title="pageTitle"
            :show-panel="showPanel"
            :bell-ringing="bellRinging"
            :unread-notifications="activeNotifications"
            @toggle-sidebar="toggleMobileSidebar"
            @toggle-search="toggleMobileSearch"
            @toggle-notifications="showPanel ? closePanel() : openPanelMobile()"
            @profile="profile"
            @accessibility="goToAccessibility"
            @security="goToSecurity"
            @logout="logout"
          />

          <!-- Overlay buscador móvil -->
          <DashboardSearchOverlay
            :is-open="mobileSearchOpen"
            v-model="mobileSearchQuery"
            @close="closeMobileSearch"
          />
        </section>

        <!-- Body -->
        <section class="dashboard-body">
          <router-view v-slot="{ Component, route }">
            <transition name="page" mode="out-in">
              <component :is="Component" :user="user" :loading="loading" :key="route.path" />
            </transition>
          </router-view>
        </section>

        <!-- Footer -->
        <DashboardFooter />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, onBeforeMount, computed, nextTick, getCurrentInstance } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "@/composables/auth/useAuth";

// Componentes externos
import Sidebar from "../components/Sidebar.vue";
import SidebarMobile from "../components/SidebarMobile.vue";
import MenuToggle from "../components/MenuToggle.vue"; // Usado en MobileTopbar
import NotificationPanel from "../components/NotificationPanel.vue";
import GlobalSearch from "../components/GlobalSearch.vue";

// Componentes atómicos de Layout
import DashboardA11yLayer from "../components/dashboard-layout/DashboardA11yLayer.vue";
import DashboardToolbar from "../components/dashboard-layout/DashboardToolbar.vue";
import DashboardMobileTopbar from "../components/dashboard-layout/DashboardMobileTopbar.vue";
import DashboardSearchOverlay from "../components/dashboard-layout/DashboardSearchOverlay.vue";
import DashboardFooter from "../components/dashboard-layout/DashboardFooter.vue";

// Composables
import { useSidebarState } from "@/composables/ui/useSidebarState";
import { useMotionEffects } from "@/composables/ui/useMotionEffects";
import { useNotifications } from "@/composables/notifi/useNotificationsState";
import { useAccessibility } from "@/composables/ui/useAccessibility";
import { useOrdersBadge, pendingOrdersCount } from "@/composables/ui/useOrdersBadge.js";
import { fetchActiveCount } from "@/services/notifications.js";
import { labToast } from "@/composables/shared/useLabToast.js";

/* =========================
   Sidebar & motion
   ========================= */
const { isSidebarCollapsed, setSidebarState } = useSidebarState();
const { motionRef, animateSidebarShift } = useMotionEffects();

/* =========================
   Notificaciones
   ========================= */
const { showPanel, openPanel, closePanel } = useNotifications();
useOrdersBadge();
const activeNotifications = ref(0);
const bellRinging = ref(false);
const _prevActive = ref(0);

watch(activeNotifications, (newVal) => {
  if (newVal > _prevActive.value) {
    bellRinging.value = true;
    setTimeout(() => { bellRinging.value = false; }, 800);
  }
  _prevActive.value = newVal;
});

/* =========================
   Route & Title
   ========================= */
const route = useRoute();
const currentRouteName = computed(() => route.meta.breadcrumb || route.name || "Dashboard");
const pageTitle = computed(() => "Panel de Control");

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

const mql1020 = window.matchMedia("(max-width: 1020px)");
const isBelow1020 = ref(mql1020.matches);

function onMediaChange1020(e) {
  isBelow1020.value = !!e.matches;
  if (isBelow1020.value && !isMobile.value) {
    setSidebarState(true);
  }
}

/* =========================
   Viewport vh
   ========================= */
function setVhVar() {
  document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
}

function onResize() {
  setVhVar();
}

/* =========================
   Sidebar móvil
   ========================= */
const isMobileSidebarVisible = ref(!isMobile.value);

onBeforeMount(() => {
  if (isMobile.value) {
    isMobileSidebarVisible.value = false;
  } else {
    isMobileSidebarVisible.value = true;
  }
});

function toggleMobileSidebar() {
  if (!isMobile.value) return;
  if (isMobileSidebarVisible.value) {
    isMobileSidebarVisible.value = false;
  } else {
    if (showPanel.value) closePanel();
    isMobileSidebarVisible.value = true;
  }
}

function collapseSidebar() {
  if (!isMobile.value || !isMobileSidebarVisible.value) return;
  isMobileSidebarVisible.value = false;
}

function handleSidebarToggle(nextCollapsed) {
  if (isMobile.value) return;
  setSidebarState(nextCollapsed);
}

function openPanelMobile() {
  if (isMobile.value && isMobileSidebarVisible.value) {
    isMobileSidebarVisible.value = false;
  }
  openPanel();
}

watch(showPanel, (newVal) => {
  if (newVal && user.value?.id) {
    // Cuando el panel se abre, actualizamos lastSeenAt
    localStorage.setItem(`lastSeenNotif_${user.value.id}`, new Date().toISOString());
    activeNotifications.value = 0; // reset local count
  }
});

watch(isMobile, (nowMobile) => {
  if (!nowMobile) {
    isMobileSidebarVisible.value = true;
  } else {
    isMobileSidebarVisible.value = false;
    mobileSearchOpen.value = false;
  }
});

watch(isSidebarCollapsed, (newVal) => {
  animateSidebarShift(newVal);
});

/* =========================
   Mobile Search
   ========================= */
const mobileSearchOpen = ref(false);
const mobileSearchQuery = ref("");

function toggleMobileSearch() {
  mobileSearchOpen.value = !mobileSearchOpen.value;
}

function closeMobileSearch() {
  mobileSearchOpen.value = false;
}

watch(route, () => {
  mobileSearchOpen.value = false;
});

/* =========================
   Layout vars
   ========================= */
const layoutStyleVars = computed(() => {
  const sidebarShift = isMobile.value
    ? 0
    : (isSidebarCollapsed.value ? 70 : 240);

  return {
    "--sidebar-shift": `${sidebarShift}px`,
  };
});

function closePanelFromOverlay() {
  if (showPanel.value) closePanel();
}

function handleClosePanel() {
  closePanel();
}

/* =========================
   Auth / User
   ========================= */
const router = useRouter();
const { user, fetchUser, logout: _authLogout } = useAuth();
const loading = ref(true);
const _instance = getCurrentInstance();

function profile()  { router.push('/l/mi.perfil.panel'); }
function goToAccessibility() { router.push({ path: '/l/config.panel', query: { tab: 'preferences' } }); }
function goToSecurity()      { router.push({ path: '/l/config.panel', query: { tab: 'security' } }); }
function logout()   { _authLogout(router, _instance?.proxy?.$buefy); }

/* =========================
   Lifecycle / WS
   ========================= */
async function refreshActiveCount() {
  if (!user.value?.id) return;
  try {
    const since = localStorage.getItem(`lastSeenNotif_${user.value.id}`);
    const { data } = await fetchActiveCount(since);
    activeNotifications.value = data?.count ?? 0;
  } catch { /* silencioso */ }
}

function _onLabWs(e) {
  const type = e?.detail?.type;
  if (type === "NOTIFICATION_NEW" || type === "STOCK_ALERT") {
    refreshActiveCount();
  }
  
  // Real-time feedback para eventos de laboratorio
  if (type === "LAB_ORDER_CREATE") {
    labToast.info(`📦 Nuevo pedido: ${e.detail.payload?.folio} de ${e.detail.payload?.cliente}`);
  } else if (type === "LAB_ORDER_SCAN") {
    // Solo si queremos feedback global de escaneos
  } else if (type === "LAB_ORDER_CANCEL") {
    labToast.warning(`🚫 Pedido cancelado: ${e.detail.payload?.folio}`);
  } else if (type === "LAB_ORDER_CLOSED_TX") {
    labToast.success(`✅ Lote cerrado: ${e.detail.payload?.folio}`);
  } else if (type === "MERMA_CREATED") {
    labToast.warning(`🗑️ Merma registrada: ${e.detail.payload?.folio} (${e.detail.payload?.origin})`);
    window.dispatchEvent(new CustomEvent("mermas:refresh"));
  } else if (type === "DEVOLUTION_UPDATED") {
    labToast.info(`✏️ Devolución actualizada: ${e.detail.payload?.folio}`);
    window.dispatchEvent(new CustomEvent("devoluciones:refresh"));
  } else if (type === "BACKORDER_CREATED") {
    labToast.info(`📋 Nuevo encargo: ${e.detail.payload?.folio}`);
    window.dispatchEvent(new CustomEvent("backorders:refresh"));
  } else if (type === "BACKORDER_STATUS_CHANGED") {
    labToast.info(`📋 Estado de encargo cambió: ${e.detail.payload?.folio} (${e.detail.payload?.to})`);
    window.dispatchEvent(new CustomEvent("backorders:refresh"));
  } else if (type === "BACKORDER_PAYMENT_ADDED") {
    labToast.success(`💰 Pago registrado en encargo: ${e.detail.payload?.folio}`);
    window.dispatchEvent(new CustomEvent("backorders:refresh"));
  }
}

onMounted(async () => {
  setVhVar();
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("online", updateOnlineStatus, { passive: true });
  window.addEventListener("offline", updateOnlineStatus, { passive: true });
  updateOnlineStatus();

  if (mql.addEventListener) mql.addEventListener("change", onMediaChange);
  else mql.addListener(onMediaChange);

  if (mql1020.addEventListener) mql1020.addEventListener("change", onMediaChange1020);
  else mql1020.addListener(onMediaChange1020);

  await fetchUser();
  refreshActiveCount();
  
  window.addEventListener("lab:ws", _onLabWs);

  loading.value = false;
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
  window.removeEventListener("online", updateOnlineStatus);
  window.removeEventListener("offline", updateOnlineStatus);

  if (mql.removeEventListener) mql.removeEventListener("change", onMediaChange);
  else mql.removeListener(onMediaChange);

  if (mql1020.removeEventListener) mql1020.removeEventListener("change", onMediaChange1020);
  else mql1020.removeListener(onMediaChange1020);

  window.removeEventListener("lab:ws", _onLabWs);
});
</script>

<style>
@import "../components/dashboard-layout/DashboardLayoutGrid.css";
</style>
