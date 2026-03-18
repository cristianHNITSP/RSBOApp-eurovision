<script>
import { ref } from 'vue';
import { labToast } from '@/composables/useLabToast.js';
import { fetchNotifications, markNotifRead, markAllNotifRead, pinNotification, dismissNotifApi } from '@/services/notifications';

const TYPE_TAG = {
  info:    'is-info',
  warning: 'is-warning',
  danger:  'is-danger',
  success: 'is-success',
};
const TYPE_ICON = {
  info:    'info-circle',
  warning: 'exclamation-triangle',
  danger:  'times-circle',
  success: 'check-circle',
};
const PRIORITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'ahora mismo';
  if (mins < 60)  return `hace ${mins} min`;
  if (hours < 24) return `hace ${hours} h`;
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

export default {
  name: 'NotificationPanel',
  props: {
    visible: Boolean,
    pinned:  { type: Boolean, default: false },
  },
  emits: ['close', 'update-unread', 'toggle-pin'],

  setup() {
    const activeMobileMenu = ref(null);
    return {
      activeMobileMenu,
      toggleMobileMenu(id) { activeMobileMenu.value = activeMobileMenu.value === id ? null : id; },
      closeMobileMenu()    { activeMobileMenu.value = null; },
    };
  },

  data() {
    return {
      notifications: [],
      loading: false,
      showRead: false,
      readingIds: [],   // IDs animándose al marcarse como leídas
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
    visible(val)     { if (val) this.load(); },
  },

  methods: {
    tagClass(type)  { return TYPE_TAG[type]  ?? 'is-info'; },
    icon(type)      { return TYPE_ICON[type] ?? 'info-circle'; },
    timeAgo,
    isPinned(notif)  { return notif.isPinned === true; },
    isReading(notif) { return this.readingIds.includes(String(notif._id)); },

    async load() {
      this.loading = true;
      try {
        const { data } = await fetchNotifications({ limit: 80 });
        this.notifications = data.notifications ?? data ?? [];
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
      if (e?.detail?.type === 'NOTIFICATION_NEW') this.load();
    },
  },

  mounted() {
    this.load();
    window.addEventListener('lab:ws', this._onWs);
  },

  beforeUnmount() {
    window.removeEventListener('lab:ws', this._onWs);
  },
};
</script>

<template>
  <transition name="slide-fade">
    <div v-show="visible" class="notification-panel">
      <div class="aside-container">

        <!-- ── Header ─────────────────────────────────────────────────────── -->
        <header class="panel-heading">
          <span class="panel-title">Notificaciones</span>

          <div class="panel-actions">
            <!-- Toggle leídas -->
            <b-tooltip :label="showRead ? 'Ocultar leídas' : 'Mostrar leídas'"
                       position="is-left" append-to-body>
              <b-button :type="showRead ? 'is-primary' : 'is-light'"
                        icon-pack="fas" icon-left="eye"
                        size="is-small" @click="showRead = !showRead" />
            </b-tooltip>

            <!-- Marcar todas leídas -->
            <b-tooltip v-if="unreadCount > 0" label="Marcar todas como leídas"
                       position="is-left" append-to-body>
              <b-button type="is-light" icon-pack="fas" icon-left="check-double"
                        size="is-small" @click="markAllRead" />
            </b-tooltip>

            <!-- Pin panel (solo desktop ≥1280px) -->
            <b-tooltip :label="pinned ? 'Desanclar panel' : 'Anclar panel'"
                       position="is-left" append-to-body class="notif-pin-btn">
              <b-button :type="pinned ? 'is-primary' : 'is-light'"
                        icon-pack="fas" icon-left="thumbtack" size="is-small"
                        :class="{ 'pin-active': pinned }"
                        @click="$emit('toggle-pin')" aria-label="Anclar panel" />
            </b-tooltip>

            <!-- Cerrar -->
            <b-button type="is-light" icon-pack="fas" icon-left="times"
                      size="is-small" @click="$emit('close')" aria-label="Cerrar" />
          </div>
        </header>

        <!-- ── Lista ──────────────────────────────────────────────────────── -->
        <div class="notification-list">

          <div v-if="loading" class="empty-state">
            <b-icon pack="fas" icon="spinner" custom-class="fa-spin" />
            <span>Cargando...</span>
          </div>

          <template v-else>

            <article
              v-for="notif in visibleNotifications"
              :key="notif._id"
              class="notif-card"
              :data-notif-id="notif._id"
              :class="{
                'notif-card--unread':   !notif.isRead,
                'notif-card--read':     notif.isRead && !isPinned(notif),
                'notif-card--pinned':   isPinned(notif),
                'notif-card--reading':  isReading(notif),
              }"
            >
              <!-- Indicador de tipo -->
              <div class="notif-type-bar" :class="`notif-type-bar--${notif.type || 'info'}`" />

              <div class="notif-body">

                <!-- Fila superior: icono + título + acciones -->
                <div class="notif-top">
                  <b-tag :type="tagClass(notif.type)" size="is-small" rounded class="notif-type-tag">
                    <b-icon :icon="icon(notif.type)" pack="fas" size="is-small" />
                  </b-tag>

                  <span class="notif-title">{{ notif.title }}</span>

                  <b-tag v-if="notif.count > 1" type="is-warning" size="is-small"
                         rounded class="notif-count-badge">
                    {{ notif.count }}
                  </b-tag>

                  <!-- Acciones desktop -->
                  <div class="notif-actions is-hidden-mobile">
                    <b-tooltip :label="isPinned(notif) ? 'Desfijar' : 'Fijar'"
                               position="is-bottom" append-to-body>
                      <b-icon :pack="isPinned(notif) ? 'fas' : 'far'"
                              icon="star" class="action-icon"
                              :class="{ 'action-icon--pinned': isPinned(notif) }"
                              @click="togglePin(notif)" />
                    </b-tooltip>

                    <b-tooltip v-if="!notif.isRead" label="Marcar como leída"
                               position="is-bottom" append-to-body>
                      <b-icon pack="fas" icon="check-circle"
                              class="action-icon action-icon--check"
                              @click="markAsRead(notif)" />
                    </b-tooltip>

                    <b-tooltip label="Descartar" position="is-bottom" append-to-body>
                      <b-icon pack="fas" icon="times"
                              class="action-icon action-icon--dismiss"
                              @click="dismissNotification(notif)" />
                    </b-tooltip>
                  </div>

                  <!-- Acciones móvil -->
                  <div class="is-hidden-tablet" style="position:relative;margin-left:auto;">
                    <b-button type="is-text" size="is-small" icon-pack="fas" icon-left="ellipsis-v"
                              @click="toggleMobileMenu(notif._id)" />
                    <transition name="fade-drop">
                      <div v-if="activeMobileMenu === notif._id"
                           class="mobile-menu" @click.stop>
                        <b-icon :pack="isPinned(notif) ? 'fas' : 'far'" icon="star"
                                class="action-icon"
                                :class="{ 'action-icon--pinned': isPinned(notif) }"
                                @click="togglePin(notif); closeMobileMenu()" />
                        <b-icon v-if="!notif.isRead" pack="fas" icon="check-circle"
                                class="action-icon action-icon--check"
                                @click="markAsRead(notif); closeMobileMenu()" />
                        <b-icon pack="fas" icon="times"
                                class="action-icon action-icon--dismiss"
                                @click="dismissNotification(notif); closeMobileMenu()" />
                      </div>
                    </transition>
                  </div>
                </div>

                <!-- Mensaje -->
                <p class="notif-message">{{ notif.message }}</p>

                <!-- Meta: quién creó + tiempo -->
                <div class="notif-meta">
                  <span v-if="notif.createdByName" class="notif-author">
                    <b-icon pack="fas" icon="user" size="is-small" />
                    {{ notif.createdByName }}
                  </span>
                  <span class="notif-time">
                    <b-icon pack="fas" icon="clock" size="is-small" />
                    {{ timeAgo(notif.updatedAt || notif.createdAt) }}
                  </span>
                </div>

              </div>
            </article>

            <!-- Estado vacío -->
            <div v-if="visibleNotifications.length === 0" class="empty-state">
              <b-icon pack="fas" :icon="showRead ? 'bell-slash' : 'bell'" size="is-medium" />
              <span>{{ showRead ? 'Sin notificaciones' : 'Sin notificaciones nuevas' }}</span>
              <button v-if="!showRead && notifications.length > 0"
                      class="show-read-link" @click="showRead = true">
                Ver notificaciones leídas
              </button>
            </div>

          </template>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* ── Panel ──────────────────────────────────────────────────────────────────── */
.notification-panel {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 15;
  width: 300px;
  height: 100%;
  background: var(--surface-solid);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-left: 1px solid var(--border-solid);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.aside-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ── Header ─────────────────────────────────────────────────────────────────── */
.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-solid);
  background: var(--bg-subtle);
  user-select: none;
  flex-shrink: 0;
}

.panel-title {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-primary);
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

/* ── Lista ──────────────────────────────────────────────────────────────────── */
.notification-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* ── Tarjeta ────────────────────────────────────────────────────────────────── */
.notif-card {
  display: flex;
  border-radius: 10px;
  border: 1px solid var(--border-solid);
  background: var(--bg-muted);
  overflow: hidden;
  transition: box-shadow 0.2s, border-color 0.2s;
  position: relative;
}

.notif-card--unread {
  background: var(--bg-subtle);
  border-color: var(--c-primary);
}

.notif-card--read {
  opacity: 0.6;
}

.notif-card--pinned {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 2px var(--c-primary), 0 0 14px color-mix(in srgb, var(--c-primary) 35%, transparent);
  animation: pinGlow 2.4s ease-in-out infinite;
}

/* Fijadas leídas: mantener opacidad completa */
.notif-card--pinned.notif-card--read {
  opacity: 1;
}

/* Flash al marcar como leída */
.notif-card--reading {
  animation: markReadFlash 0.7s ease forwards !important;
}

@keyframes markReadFlash {
  0%   { box-shadow: 0 0 0 2px var(--c-success, #257953), 0 0 18px color-mix(in srgb, var(--c-success, #257953) 50%, transparent); border-color: var(--c-success, #257953); }
  55%  { box-shadow: 0 0 0 2px var(--c-success, #257953), 0 0 18px color-mix(in srgb, var(--c-success, #257953) 50%, transparent); border-color: var(--c-success, #257953); }
  100% { box-shadow: none; border-color: var(--border-solid); }
}

@keyframes pinGlow {
  0%, 100% { box-shadow: 0 0 0 2px var(--c-primary), 0 0 8px  color-mix(in srgb, var(--c-primary) 25%, transparent); }
  50%       { box-shadow: 0 0 0 2px var(--c-primary), 0 0 18px color-mix(in srgb, var(--c-primary) 45%, transparent); }
}

/* Barra lateral de tipo */
.notif-type-bar {
  width: 4px;
  flex-shrink: 0;
}
.notif-type-bar--info    { background: var(--c-info,    #3e8ed0); }
.notif-type-bar--warning { background: var(--c-warning, #d97706); }
.notif-type-bar--danger  { background: var(--c-danger,  #cc0f35); }
.notif-type-bar--success { background: var(--c-success, #257953); }

.notif-body {
  flex: 1;
  padding: 0.6rem 0.75rem;
  min-width: 0;
}

/* ── Fila superior ──────────────────────────────────────────────────────────── */
.notif-top {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.35rem;
  flex-wrap: nowrap;
}

.notif-type-tag {
  flex-shrink: 0;
}

.notif-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notif-count-badge {
  flex-shrink: 0;
  font-weight: 700;
  background: #d97706 !important;
  border-color: #d97706 !important;
  color: #fff !important;
}

/* ── Acciones ───────────────────────────────────────────────────────────────── */
.notif-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: auto;
  flex-shrink: 0;
}

.action-icon {
  cursor: pointer;
  color: var(--text-muted);
  transition: color 0.15s, transform 0.15s;
  font-size: 0.8rem;
}

.action-icon:hover        { color: var(--text-primary); transform: scale(1.15); }
.action-icon--pinned      { color: #d97706 !important; }
.action-icon--check:hover { color: var(--c-success, #257953) !important; }
.action-icon--dismiss:hover { color: var(--c-danger, #cc0f35) !important; }

/* ── Mensaje ────────────────────────────────────────────────────────────────── */
.notif-message {
  font-size: 0.775rem;
  color: var(--text-secondary);
  margin-bottom: 0.35rem;
  line-height: 1.4;
}

/* ── Meta ───────────────────────────────────────────────────────────────────── */
.notif-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.notif-author,
.notif-time {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  color: var(--text-muted);
}

/* ── Estado vacío ───────────────────────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2.5rem 1rem;
  color: var(--text-muted);
  font-size: 0.85rem;
  text-align: center;
}

.show-read-link {
  background: none;
  border: none;
  color: var(--c-primary);
  font-size: 0.75rem;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  margin-top: 0.25rem;
}

/* ── Mobile menu ────────────────────────────────────────────────────────────── */
.mobile-menu {
  position: absolute;
  right: 0;
  top: 28px;
  background: var(--surface-solid);
  border: 1px solid var(--border-solid);
  border-radius: 8px;
  padding: 0.4rem 0.6rem;
  display: flex;
  gap: 0.6rem;
  z-index: 10;
  box-shadow: var(--shadow-lg);
}

/* ── Pin btn (solo ≥1280px) ─────────────────────────────────────────────────── */
.notif-pin-btn { display: none; }
@media (min-width: 1280px) { .notif-pin-btn { display: inline-flex; } }

/* ── Pin activo ──────────────────────────────────────────────────────────────── */
.pin-active :deep(.fa-thumbtack) { transform: rotate(-45deg); }

/* ── Animaciones ────────────────────────────────────────────────────────────── */
.slide-out-right {
  animation: slideOutRight 0.3s ease forwards;
}
@keyframes slideOutRight {
  to { opacity: 0; transform: translateX(100%); }
}

.slide-fade-enter-active,
.slide-fade-leave-active { transition: all 0.28s ease; }
.slide-fade-enter-from,
.slide-fade-leave-to     { opacity: 0; transform: translateX(16px); }

.fade-drop-enter-active,
.fade-drop-leave-active { transition: opacity 0.15s, transform 0.15s; }
.fade-drop-enter-from,
.fade-drop-leave-to     { opacity: 0; transform: translateY(-4px); }
</style>
