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
      config: NOTIFICATION_CONFIG
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
      const stale = !this._loadedAt || (Date.now() - this._loadedAt) > this.config.STALE_TIME_MS;
      if (!this.notifications.length || stale) this.load();
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

    _onWs(e) {
      if (e?.detail?.type !== 'NOTIFICATION_NEW') return;
      if (this.visible) {
        this.scheduleLoad(() => this.load());
      }
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
  <transition name="panel-pop">
    <div v-show="visible" class="notification-panel" role="dialog" aria-label="Notificaciones">
      <div class="panel-drag-handle" aria-hidden="true"></div>

      <div class="aside-container">
        <NotificationHeader @close="$emit('close')" />

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
