<script>
import { ref } from 'vue';
import { labToast } from '@/composables/shared/useLabToast.js';
import { fetchNotifications, pinNotification, dismissNotifApi } from '@/services/notifications';

import NotificationHeader from './notifi/NotificationHeader.vue';
import NotificationCard from './notifi/NotificationCard.vue';
import NotificationEmptyState from './notifi/NotificationEmptyState.vue';

const PRIORITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };

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
      scheduleLoad(fn, ms = 800) {
        clearTimeout(_wsDebounceTimer);
        _wsDebounceTimer = setTimeout(fn, ms);
      },
    };
  },

  data() {
    return {
      notifications: [],
      loading: false,
      _loadedAt: null,  // timestamp del último fetch (para control de stale)
    };
  },

  computed: {
    activeCount() {
      return this.notifications.length;
    },
    visibleNotifications() {
      return [...this.notifications].sort((a, b) => {
        const pa = a.isPinned ? 1 : 0;
        const pb = b.isPinned ? 1 : 0;
        if (pa !== pb) return pb - pa;
        const prioA = PRIORITY_ORDER[a.priority] ?? 0;
        const prioB = PRIORITY_ORDER[b.priority] ?? 0;
        if (prioA !== prioB) return prioB - prioA;
        return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      });
    },
  },

  watch: {
    // Carga al abrir el panel; si ya tiene datos y < 60 s, reutiliza
    visible(val) {
      if (!val) return;
      const stale = !this._loadedAt || (Date.now() - this._loadedAt) > 60_000;
      if (!this.notifications.length || stale) this.load();
    },
  },

  methods: {
    async load() {
      this.loading = true;
      try {
        const { data } = await fetchNotifications({ limit: 10 });
        this.notifications = data.notifications ?? data ?? [];
        this._loadedAt = Date.now();
      } catch { /* silencioso */ } finally {
        this.loading = false;
      }
    },

    // Descarta la notificación para el usuario de forma persistente en BD
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
        }, 300);
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

    _onWs(e) {
      if (e?.detail?.type !== 'NOTIFICATION_NEW') return;
      if (this.visible) {
        // Panel abierto: debounce 800 ms para no recargar en ráfaga
        this.scheduleLoad(() => this.load());
      }
      // Panel cerrado: el badge ya lo actualiza DashboardLayout vía lab:ws; no recargamos la lista
    },
  },

  mounted() {
    // Carga lazy: solo si el panel ya está visible al montar (poco común pero posible)
    if (this.visible) this.load();
    window.addEventListener('lab:ws', this._onWs);
  },

  beforeUnmount() {
    window.removeEventListener('lab:ws', this._onWs);
  },
};
</script>

<template>
  <transition name="panel-pop">
    <div v-show="visible" class="notification-panel" role="dialog" aria-label="Notificaciones">
      <!-- Drag handle (móvil) -->
      <div class="panel-drag-handle" aria-hidden="true"></div>

      <div class="aside-container">
        
        <NotificationHeader 
          @close="$emit('close')"
        />

        <div class="notification-list">
          
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
</template>

<style scoped src="./NotificationPanel.css"></style>
