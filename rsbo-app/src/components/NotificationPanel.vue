<script>
import { labToast } from '@/composables/shared/useLabToast.js';
import { fetchNotifications, pinNotification, dismissNotifApi } from '@/services/notifications';
import { NOTIFICATION_CONFIG } from '@/data/notifications.data';

import NotificationHeader from './notifi/NotificationHeader.vue';
import NotificationCard from './notifi/NotificationCard.vue';
import NotificationEmptyState from './notifi/NotificationEmptyState.vue';

export default {
  name: 'NotificationPanel',
  components: {
    NotificationHeader,
    NotificationCard,
    NotificationEmptyState
  },
  props: {
    visible: Boolean,
  },
  emits: ['close', 'update-count'],

  setup() {
    let _wsDebounceTimer = null;
    return {
      scheduleLoad(fn, ms = NOTIFICATION_CONFIG.DEBOUNCE_MS) {
        clearTimeout(_wsDebounceTimer);
        _wsDebounceTimer = setTimeout(fn, ms);
      },
    };
  },

  data() {
    return {
      notifications: [],
      loading: false,
      _loadedAt: null,
      config: NOTIFICATION_CONFIG,
      // Swipe-to-close (móvil)
      dragY: 0,
      dragging: false,
      _startY: 0,
      _canDrag: false
    };
  },

  computed: {
    panelStyle() {
      // Durante el arrastre el panel sigue el dedo, sin transición (snap inmediato);
      // al soltar, el CSS base anima el regreso.
      if (!this.dragging) return {};
      return { transform: `translateY(${this.dragY}px)`, transition: 'none' };
    },
    activeCount() {
      return this.notifications.length;
    },
    visibleNotifications() {
      return [...this.notifications].sort((a, b) => {
        const pa = a.isPinned ? 1 : 0;
        const pb = b.isPinned ? 1 : 0;
        if (pa !== pb) return pb - pa;
        const prioA = this.config.PRIORITY_ORDER[a.priority] ?? 0;
        const prioB = this.config.PRIORITY_ORDER[b.priority] ?? 0;
        if (prioA !== prioB) return prioB - prioA;
        return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      });
    },
  },

  watch: {
    visible(val) {
      if (!val) return;
      // Secuencia: primero la animación de apertura, luego la API.
      // Marcamos si hace falta cargar y mostramos el loader durante la animación;
      // el fetch real se dispara en @after-enter (onPanelOpened).
      const stale = !this._loadedAt || (Date.now() - this._loadedAt) > this.config.STALE_TIME_MS;
      this._needsLoad = !this.notifications.length || stale;
      if (this._needsLoad) this.loading = true; // loader centrado mientras abre
    },
  },

  methods: {
    async load() {
      this.loading = true;
      try {
        const { data } = await fetchNotifications({ limit: this.config.FETCH_LIMIT });
        this.notifications = data.notifications ?? data ?? [];
        this._loadedAt = Date.now();
      } catch { /* silencioso */ } finally {
        this.loading = false;
      }
    },

    async dismissNotification(notif) {
      if (notif.isPinned) {
        labToast.warning('Desfija la notificación antes de descartarla.');
        return;
      }
      const el = this.$el?.querySelector(`[data-notif-id="${notif._id}"]`);
      if (el) el.classList.add('slide-out-right');
      try {
        await dismissNotifApi(notif._id);
        setTimeout(() => {
          const idx = this.notifications.findIndex((n) => String(n._id) === String(notif._id));
          if (idx !== -1) this.notifications.splice(idx, 1);
        }, this.config.ANIMATION_DURATION_MS);
      } catch {
        if (el) el.classList.remove('slide-out-right');
        labToast.warning('No se pudo descartar la notificación.');
      }
    },

    async togglePin(notif) {
      const prev = notif.isPinned;
      notif.isPinned = !prev; // optimistic
      try {
        await pinNotification(notif._id);
      } catch {
        notif.isPinned = prev; // rollback
        labToast.warning('No se pudo actualizar el pin.');
      }
    },

    // La animación de apertura terminó → ahora sí golpeamos la API.
    onPanelOpened() {
      if (this._needsLoad) {
        this._needsLoad = false;
        this.load();
      }
    },

    _onWs(e) {
      if (e?.detail?.type !== 'NOTIFICATION_NEW') return;
      if (this.visible) {
        this.scheduleLoad(() => this.load());
      }
    },

    // ── Swipe-down para cerrar (solo móvil) ──────────────────────────────
    onTouchStart(e) {
      if (window.innerWidth > 768) return;
      this._startY = e.touches[0].clientY;
      // Permitir arrastre solo si la lista está arriba (no pelear con su scroll).
      const list = this.$refs.list;
      this._canDrag = !list || list.scrollTop <= 0;
      this.dragY = 0;
    },
    onTouchMove(e) {
      if (!this._canDrag || window.innerWidth > 768) return;
      const dy = e.touches[0].clientY - this._startY;
      if (dy <= 0) { this.dragging = false; this.dragY = 0; return; } // solo hacia abajo
      this.dragging = true;
      this.dragY = dy;
      if (e.cancelable) e.preventDefault(); // evita el scroll/bounce mientras arrastra
    },
    onTouchEnd() {
      if (!this.dragging) return;
      const h = this.$refs.panel?.offsetHeight || 600;
      const shouldClose = this.dragY > Math.min(0.25 * h, 160);
      this.dragging = false;
      this.dragY = 0;
      this._canDrag = false;
      if (shouldClose) this.$emit('close');
    },
  },

  mounted() {
    if (this.visible) this.load();
    window.addEventListener('lab:ws', this._onWs);
  },

  beforeUnmount() {
    window.removeEventListener('lab:ws', this._onWs);
  },
};
</script>

<template>
  <!-- Teleport a <body>: evita que un ancestro con transform/filter capture el
       position:fixed; así el panel se ancla al viewport (pegado al fondo en móvil). -->
  <Teleport to="body">
  <div class="notification-portal">
    <!-- Scrim (solo móvil): tap fuera cierra -->
    <transition name="scrim">
      <div v-if="visible" class="panel-scrim" @click="$emit('close')" aria-hidden="true"></div>
    </transition>

    <transition name="panel-pop" @after-enter="onPanelOpened">
      <div
        v-show="visible"
        ref="panel"
        class="notification-panel"
        role="dialog"
        aria-label="Notificaciones"
        :style="panelStyle"
        @touchstart.passive="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <div class="panel-drag-handle" aria-hidden="true"></div>

      <div class="aside-container">
        <NotificationHeader @close="$emit('close')" />

        <div class="notification-list" ref="list">
          <NotificationEmptyState 
            v-if="loading || visibleNotifications.length === 0"
            :loading="loading"
            :hasNotifications="notifications.length > 0"
          />

          <template v-else>
            <NotificationCard
              v-for="notif in visibleNotifications"
              :key="notif._id"
              :notif="notif"
              @toggle-pin="togglePin"
              @dismiss="dismissNotification"
            />
            
            <div v-if="visibleNotifications.length > 0" class="panel-view-all">
              <router-link to="/l/notificaciones" @click="$emit('close')">
                <b-button type="is-text" expanded>Ver todas las notificaciones</b-button>
              </router-link>
            </div>
          </template>
        </div>
      </div>
      </div>
    </transition>
  </div>
  </Teleport>
</template>

<style scoped src="./NotificationPanel.css"></style>
