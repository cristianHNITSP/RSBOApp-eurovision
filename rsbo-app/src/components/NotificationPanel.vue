<script>
import { ref } from 'vue';
import { labToast } from '@/composables/shared/useLabToast.js';
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
  },
  emits: ['close', 'update-unread'],

  setup() {
    const activeMobileMenu = ref(null);
    const expandedId = ref(null);
    // Timer para debounce del evento WS — evita recargas en ráfaga
    let _wsDebounceTimer = null;
    return {
      activeMobileMenu,
      expandedId,
      toggleMobileMenu(id) { activeMobileMenu.value = activeMobileMenu.value === id ? null : id; },
      closeMobileMenu()    { activeMobileMenu.value = null; },
      toggleExpand(id)     { expandedId.value = expandedId.value === id ? null : id; },
      isExpanded(id)       { return expandedId.value === id; },
      hasDetail(notif)     {
        return !!(notif.metadata && (
          notif.metadata.type === 'stock_alert' ||
          notif.metadata.type === 'pending_orders' ||
          notif.metadata.type === 'new_order' ||
          notif.metadata.type === 'correction'
        ));
      },
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
    tagClass(type)  { return TYPE_TAG[type]  ?? 'is-info'; },
    icon(type)      { return TYPE_ICON[type] ?? 'info-circle'; },
    timeAgo,
    isPinned(notif)  { return notif.isPinned === true; },
    isReading(notif) { return this.readingIds.includes(String(notif._id)); },

    statusLabel(status) {
      const map = { pendiente: 'Por iniciar', parcial: 'En proceso', cerrado: 'Cerrado', cancelado: 'Cancelado' };
      return map[status] || status;
    },

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

        <!-- ── Header ─────────────────────────────────────────────────────── -->
        <header class="panel-heading">
          <div class="panel-heading-left">
            <b-icon pack="fas" icon="bell" size="is-small" class="panel-bell-icon" />
            <span class="panel-title">Notificaciones</span>
            <transition name="badge-pop">
              <b-tag v-if="unreadCount > 0" type="is-primary" size="is-small" rounded class="panel-unread-badge">
                {{ unreadCount }}
              </b-tag>
            </transition>
          </div>

          <div class="panel-actions">
            <!-- Toggle leídas -->
            <b-tooltip :label="showRead ? 'Ocultar leídas' : 'Mostrar leídas'"
                       position="is-left" append-to-body>
              <b-button :type="showRead ? 'is-primary' : 'is-ghost'"
                        icon-pack="fas" icon-left="eye"
                        size="is-small" @click="showRead = !showRead" />
            </b-tooltip>

            <!-- Marcar todas leídas -->
            <b-tooltip v-if="unreadCount > 0" label="Marcar todas como leídas"
                       position="is-left" append-to-body>
              <b-button type="is-ghost" icon-pack="fas" icon-left="check-double"
                        size="is-small" @click="markAllRead" />
            </b-tooltip>

            <!-- Cerrar -->
            <b-button type="is-ghost" icon-pack="fas" icon-left="times"
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

                <!-- Botón expandir detalle -->
                <button
                  v-if="hasDetail(notif)"
                  class="detail-toggle"
                  @click="toggleExpand(notif._id)"
                >
                  <span>{{ isExpanded(notif._id) ? 'Ocultar detalle' : 'Ver detalle' }}</span>
                  <b-icon
                    pack="fas"
                    :icon="isExpanded(notif._id) ? 'chevron-up' : 'chevron-down'"
                    size="is-small"
                  />
                </button>

                <!-- Panel de detalle expandible -->
                <transition name="detail-expand">
                  <div v-if="hasDetail(notif) && isExpanded(notif._id)" class="detail-panel">

                    <!-- DETALLE: Alerta de stock -->
                    <template v-if="notif.metadata.type === 'stock_alert'">
                      <div class="detail-header">
                        <span class="detail-header__label">{{ notif.metadata.sheetLabel }}</span>
                        <span class="detail-header__counts">
                          <span v-if="notif.metadata.critCount > 0" class="level-badge level-badge--critico">
                            {{ notif.metadata.critCount }} CRÍTICO{{ notif.metadata.critCount > 1 ? 'S' : '' }}
                          </span>
                          <span v-if="notif.metadata.lowCount > 0" class="level-badge level-badge--bajo">
                            {{ notif.metadata.lowCount }} BAJO{{ notif.metadata.lowCount > 1 ? 'S' : '' }}
                          </span>
                        </span>
                      </div>
                      <ul class="cell-list">
                        <li
                          v-for="(cell, idx) in notif.metadata.cells"
                          :key="idx"
                          class="cell-row"
                        >
                          <span
                            class="level-badge"
                            :class="cell.level === 'CRITICO' ? 'level-badge--critico' : 'level-badge--bajo'"
                          >{{ cell.level }}</span>
                          <span class="cell-label">{{ cell.label }}</span>
                          <span class="cell-stock">{{ cell.existencias }} pza{{ cell.existencias !== 1 ? 's' : '' }}</span>
                        </li>
                      </ul>
                    </template>

                    <!-- DETALLE: Pedidos pendientes -->
                    <template v-else-if="notif.metadata.type === 'pending_orders'">
                      <div class="detail-header">
                        <span class="detail-header__label">Pedidos activos</span>
                        <span class="detail-header__counts">
                          <span v-if="notif.metadata.summary.pendiente > 0" class="level-badge level-badge--bajo">
                            {{ notif.metadata.summary.pendiente }} por iniciar
                          </span>
                          <span v-if="notif.metadata.summary.parcial > 0" class="level-badge level-badge--critico">
                            {{ notif.metadata.summary.parcial }} en proceso
                          </span>
                        </span>
                      </div>
                      <ul class="order-list">
                        <li
                          v-for="order in notif.metadata.orders"
                          :key="order.orderId"
                          class="order-item"
                        >
                          <div class="order-item__head">
                            <span class="order-folio">{{ order.folio }}</span>
                            <span
                              class="level-badge"
                              :class="order.status === 'parcial' ? 'level-badge--critico' : 'level-badge--bajo'"
                            >{{ statusLabel(order.status) }}</span>
                            <span class="order-client">{{ order.cliente }}</span>
                          </div>
                          <div class="order-item__progress">
                            <span class="progress-text">
                              {{ order.progress.picked }} / {{ order.progress.total }} pzas
                            </span>
                            <div class="progress-bar">
                              <div
                                class="progress-bar__fill"
                                :style="{ width: order.progress.total > 0 ? (order.progress.picked / order.progress.total * 100) + '%' : '0%' }"
                              />
                            </div>
                          </div>
                          <ul class="line-list">
                            <li
                              v-for="(line, li) in order.lines"
                              :key="li"
                              class="line-row"
                            >
                              <span class="line-label">{{ line.label }}</span>
                              <span class="line-qty">{{ line.picked }}/{{ line.qty }}</span>
                            </li>
                          </ul>
                        </li>
                      </ul>
                    </template>

                    <!-- DETALLE: Nuevo pedido individual -->
                    <template v-else-if="notif.metadata.type === 'new_order'">
                      <div class="detail-header">
                        <span class="detail-header__label">{{ notif.metadata.folio }}</span>
                        <span class="level-badge level-badge--bajo">{{ statusLabel(notif.metadata.status) }}</span>
                      </div>
                      <div class="order-item">
                        <div class="order-item__head">
                          <span class="order-client">{{ notif.metadata.cliente }}</span>
                          <span v-if="notif.metadata.note" class="notif-message" style="font-size:0.72rem">{{ notif.metadata.note }}</span>
                        </div>
                        <ul class="line-list">
                          <li v-for="(line, li) in notif.metadata.lines" :key="li" class="line-row">
                            <span class="line-label">{{ line.label }}</span>
                            <span class="line-qty">{{ line.qty }} pza{{ line.qty !== 1 ? 's' : '' }}</span>
                          </li>
                        </ul>
                      </div>
                    </template>

                    <!-- DETALLE: Corrección solicitada -->
                    <template v-else-if="notif.metadata.type === 'correction'">
                      <div class="detail-header">
                        <span class="detail-header__label">{{ notif.metadata.folio }}</span>
                        <span class="level-badge level-badge--critico">CORRECCIÓN</span>
                      </div>
                      <div class="order-item">
                        <p class="notif-message" style="margin:0">{{ notif.metadata.message || 'Sin detalle del motivo' }}</p>
                        <span v-if="notif.metadata.actor" class="notif-author" style="font-size:0.7rem;margin-top:0.3rem;display:flex;align-items:center;gap:0.25rem">
                          <b-icon pack="fas" icon="user" size="is-small" />{{ notif.metadata.actor }}
                        </span>
                      </div>
                    </template>

                  </div>
                </transition>

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
/* ══════════════════════════════════════════════════════
   Panel flotante — glassmorphism
   ══════════════════════════════════════════════════════ */
.notification-panel {
  position: fixed;
  top: 72px;           /* debajo del header sticky */
  right: 1rem;
  z-index: 200;

  width: min(400px, calc(100vw - 2rem));
  max-height: calc(var(--vh, 1vh) * 100 - 80px - 1.5rem);

  /* Glassmorphism */
  background: color-mix(in srgb, var(--surface-solid, #fff) 82%, transparent);
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);

  border: 1px solid color-mix(in srgb, var(--border, #e2e8f0) 70%, transparent);
  border-radius: 18px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.07),
    0 12px 40px -4px rgba(0, 0, 0, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);

  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Móvil: bottom sheet */
@media (max-width: 768px) {
  .notification-panel {
    top: auto;
    bottom: 0;
    right: 0;
    left: 0;
    width: 100%;
    max-height: 82dvh;
    border-radius: 20px 20px 0 0;
    border-bottom: none;
    border-left: none;
    border-right: none;
  }
}

/* Tablet vertical (portrait 769–1023px): panel más estrecho a la derecha */
@media (min-width: 769px) and (max-width: 1023px) {
  .notification-panel {
    width: min(360px, calc(100vw - 2rem));
    top: 68px;
  }
}

/* Drag handle (solo móvil) */
.panel-drag-handle {
  display: none;
  width: 40px;
  height: 4px;
  background: var(--border, #e2e8f0);
  border-radius: 2px;
  margin: 0.55rem auto 0;
  flex-shrink: 0;
}
@media (max-width: 768px) {
  .panel-drag-handle { display: block; }
}

.aside-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  flex: 1;
}

/* ── Header ─────────────────────────────────────────────────────────────────── */
.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border, #e2e8f0) 60%, transparent);
  user-select: none;
  flex-shrink: 0;
  gap: 0.5rem;
}

.panel-heading-left {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.panel-bell-icon {
  color: var(--c-primary);
  flex-shrink: 0;
}

.panel-title {
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--text-primary);
  white-space: nowrap;
}

.panel-unread-badge {
  font-size: 0.65rem !important;
  font-weight: 700;
  flex-shrink: 0;
}

.badge-pop-enter-active,
.badge-pop-leave-active { transition: opacity 0.15s, transform 0.15s; }
.badge-pop-enter-from,
.badge-pop-leave-to     { opacity: 0; transform: scale(0.7); }

.panel-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

/* ── Lista ──────────────────────────────────────────────────────────────────── */
.notification-list {
  flex: 1;
  min-height: 0;
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
  flex-shrink: 0;
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

/* ── Botón expandir detalle ─────────────────────────────────────────────────── */
.detail-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: none;
  border: none;
  padding: 0.15rem 0;
  margin-bottom: 0.4rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--c-primary);
  cursor: pointer;
  transition: opacity 0.15s;
}
.detail-toggle:hover { opacity: 0.75; }

/* ── Panel de detalle ───────────────────────────────────────────────────────── */
.detail-panel {
  background: var(--bg-subtle);
  border: 1px solid var(--border-solid);
  border-radius: 7px;
  padding: 0.55rem 0.65rem;
  margin-bottom: 0.45rem;
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
}

.detail-header__label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.detail-header__counts {
  display: flex;
  gap: 0.3rem;
  flex-shrink: 0;
}

/* ── Badges de nivel ────────────────────────────────────────────────────────── */
.level-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.level-badge--critico {
  background: var(--c-danger, #cc0f35);
  color: #fff;
}
.level-badge--bajo {
  background: var(--c-warning, #d97706);
  color: #fff;
}

/* ── Lista de celdas (stock alert) ──────────────────────────────────────────── */
.cell-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 200px;
  overflow-y: auto;
}

.cell-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.7rem;
}

.cell-label {
  flex: 1;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-stock {
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
}

/* ── Lista de pedidos (pending orders) ──────────────────────────────────────── */
.order-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-height: 280px;
  overflow-y: auto;
}

.order-item {
  border-top: 1px solid var(--border-solid);
  padding-top: 0.45rem;
}
.order-item:first-child {
  border-top: none;
  padding-top: 0;
}

.order-item__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.3rem;
}

.order-folio {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: monospace;
}

.order-client {
  font-size: 0.68rem;
  color: var(--text-secondary);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-item__progress {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.3rem;
}

.progress-text {
  font-size: 0.65rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: var(--border-solid);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: var(--c-primary);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.line-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.line-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.67rem;
}

.line-label {
  flex: 1;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.line-qty {
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
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

/* ── Animaciones ────────────────────────────────────────────────────────────── */
.slide-out-right {
  animation: slideOutRight 0.3s ease forwards;
}
@keyframes slideOutRight {
  to { opacity: 0; transform: translateX(100%); }
}

/* Desktop / tablet: aparece desde la esquina superior derecha (scale + fade) */
.panel-pop-enter-active,
.panel-pop-leave-active {
  transition: opacity 0.22s ease, transform 0.26s cubic-bezier(0.34, 1.4, 0.64, 1);
  transform-origin: top right;
}
.panel-pop-enter-from,
.panel-pop-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-10px);
}

/* Móvil: bottom sheet sube desde abajo */
@media (max-width: 768px) {
  .panel-pop-enter-active,
  .panel-pop-leave-active {
    transition: opacity 0.25s ease, transform 0.3s cubic-bezier(0.34, 1.2, 0.64, 1);
    transform-origin: bottom center;
  }
  .panel-pop-enter-from,
  .panel-pop-leave-to {
    opacity: 0;
    transform: translateY(100%);
  }
}

.fade-drop-enter-active,
.fade-drop-leave-active { transition: opacity 0.15s, transform 0.15s; }
.fade-drop-enter-from,
.fade-drop-leave-to     { opacity: 0; transform: translateY(-4px); }

/* ── Expansión del panel de detalle ─────────────────────────────────────────── */
.detail-expand-enter-active,
.detail-expand-leave-active {
  transition: max-height 0.28s ease, opacity 0.22s ease;
  max-height: 600px;
  overflow: hidden;
}
.detail-expand-enter-from,
.detail-expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
