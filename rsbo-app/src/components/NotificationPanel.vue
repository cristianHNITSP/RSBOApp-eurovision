<script>
import { ref } from 'vue';
import { labToast } from '@/composables/shared/useLabToast.js';
import { fetchNotifications, markNotifRead, markAllNotifRead, pinNotification, dismissNotifApi } from '@/services/notifications';

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
  emits: ['close', 'update-unread'],

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
      showRead: false,
      readingIds: [],   // IDs animándose al marcarse como leídas
      _loadedAt: null,  // timestamp del último fetch (para control de stale)
    };
  },

  computed: {
    unreadCount() {
      return this.notifications.filter((n) => !n.isRead).length;
    },
    visibleNotifications() {
      // Fijadas siempre visibles, independiente de showRead
      const base = this.showRead
        ? this.notifications
        : this.notifications.filter((n) => !n.isRead || n.isPinned);

      return [...base].sort((a, b) => {
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
    unreadCount(val) { this.$emit('update-unread', val); },
    // Carga al abrir el panel; si ya tiene datos y < 60 s, reutiliza
    visible(val) {
      if (!val) return;
      const stale = !this._loadedAt || (Date.now() - this._loadedAt) > 60_000;
      if (!this.notifications.length || stale) this.load();
    },
  },

  methods: {
    isReading(notif) { return this.readingIds.includes(String(notif._id)); },

    async load() {
      this.loading = true;
      try {
        const { data } = await fetchNotifications({ limit: 80 });
        this.notifications = data.notifications ?? data ?? [];
        this._loadedAt = Date.now();
        this.$emit('update-unread', this.unreadCount);
      } catch { /* silencioso */ } finally {
        this.loading = false;
      }
    },

    async markAsRead(notif) {
      if (notif.isRead) return;
      try {
        await markNotifRead(notif._id);
        // Animación "leída" antes de cambiar el estado
        const id = String(notif._id);
        this.readingIds.push(id);
        setTimeout(() => {
          const idx = this.readingIds.indexOf(id);
          if (idx !== -1) this.readingIds.splice(idx, 1);
        }, 700);
        notif.isRead = true;
        this.$emit('update-unread', this.unreadCount);
      } catch {
        labToast.warning('No se pudo marcar como leída.');
      }
    },

    async markAllRead() {
      try {
        await markAllNotifRead();
        this.notifications.forEach((n) => { n.isRead = true; });
        this.$emit('update-unread', 0);
      } catch {
        labToast.warning('No se pudo marcar todas como leídas.');
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
          this.$emit('update-unread', this.unreadCount);
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
        if (!notif.isRead && !prev) this.markAsRead(notif);
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
          :unreadCount="unreadCount"
          :showRead="showRead"
          @close="$emit('close')"
          @toggle-read="showRead = !showRead"
          @mark-all-read="markAllRead"
        />

        <div class="notification-list">
          
          <NotificationEmptyState 
            v-if="loading || visibleNotifications.length === 0"
            :loading="loading"
            :showRead="showRead"
            :hasNotifications="notifications.length > 0"
            @toggle-read="showRead = !showRead"
          />

          <template v-else>
            <NotificationCard
              v-for="notif in visibleNotifications"
              :key="notif._id"
              :notif="notif"
              :isReading="isReading(notif)"
              @toggle-pin="togglePin"
              @mark-read="markAsRead"
              @dismiss="dismissNotification"
            />
          </template>

        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped src="./NotificationPanel.css"></style>
