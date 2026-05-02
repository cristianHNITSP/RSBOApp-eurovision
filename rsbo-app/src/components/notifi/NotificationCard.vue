<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  notif: {
    type: Object,
    required: true
  },
  notif: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['toggle-pin', 'dismiss']);

const isExpanded = ref(false);
const showMobileMenu = ref(false);
const selectedAxisMap = ref({});

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

const tagClass = computed(() => TYPE_TAG[props.notif.type] ?? 'is-info');
const iconClass = computed(() => TYPE_ICON[props.notif.type] ?? 'info-circle');
const isPinned = computed(() => props.notif.isPinned === true);

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

function statusLabel(status) {
  const map = { pendiente: 'Por iniciar', parcial: 'En proceso', cerrado: 'Cerrado', cancelado: 'Cancelado' };
  return map[status] || status;
}

const hasDetail = computed(() => {
  return !!(props.notif.metadata && (
    props.notif.metadata.type === 'stock_alert' ||
    props.notif.metadata.type === 'pending_orders' ||
    props.notif.metadata.type === 'new_order' ||
    props.notif.metadata.type === 'correction'
  ));
});

function hasAxisData(notif) {
  const cells = notif.metadata?.cells || [];
  return cells.some(c => c.axis !== null && c.axis !== undefined);
}

function getAxes(notif) {
  const cells = notif.metadata?.cells || [];
  const axes = [...new Set(cells.map(c => String(c.axis)).filter(a => a !== 'null' && a !== 'undefined'))];
  return axes.sort((a, b) => Number(b) - Number(a));
}

function getAlertsForAxis(notif, axis) {
  const cells = notif.metadata?.cells || [];
  return cells.filter(c => String(c.axis) === String(axis));
}

function getCurrentAlerts(notif) {
  if (!hasAxisData(notif)) return notif.metadata?.cells || [];
  const axis = selectedAxisMap.value[notif._id] || getAxes(notif)[0];
  return getAlertsForAxis(notif, axis);
}

function selectAxis(notifId, axis) {
  selectedAxisMap.value[notifId] = axis;
}

function toggleExpand() {
  isExpanded.value = !isExpanded.value;
}

function toggleMobileMenu() {
  showMobileMenu.value = !showMobileMenu.value;
}

function closeMobileMenu() {
  showMobileMenu.value = false;
}
</script>

<template>
  <article
    class="notif-card"
    :data-notif-id="notif._id"
    :class="{
      'notif-card--pinned':   isPinned,
    }"
  >
    <!-- Indicador de tipo -->
    <div class="notif-type-bar" :class="`notif-type-bar--${notif.type || 'info'}`" />

    <div class="notif-body">

      <!-- Fila superior: icono + título + acciones -->
      <div class="notif-top">
        <b-tag :type="tagClass" size="is-small" rounded class="notif-type-tag">
          <b-icon :icon="iconClass" pack="fas" size="is-small" />
        </b-tag>

        <span class="notif-title">{{ notif.title }}</span>

        <b-tag v-if="notif.count > 1" type="is-warning" size="is-small"
               rounded class="notif-count-badge">
          {{ notif.count }}
        </b-tag>

        <!-- Acciones desktop -->
        <div class="notif-actions is-hidden-mobile">
          <b-tooltip :label="isPinned ? 'Desfijar' : 'Fijar'"
                     position="is-bottom" append-to-body>
            <b-icon :pack="isPinned ? 'fas' : 'far'"
                    icon="star" class="action-icon"
                    :class="{ 'action-icon--pinned': isPinned }"
                    @click="$emit('toggle-pin', notif)" />
          </b-tooltip>

          <b-tooltip label="Descartar" position="is-bottom" append-to-body>
            <b-icon pack="fas" icon="times"
                    class="action-icon action-icon--dismiss"
                    @click="$emit('dismiss', notif)" />
          </b-tooltip>
        </div>

        <!-- Acciones móvil -->
        <div class="is-hidden-tablet" style="position:relative;margin-left:auto;">
          <b-button type="is-text" size="is-small" icon-pack="fas" icon-left="ellipsis-v"
                    @click="toggleMobileMenu" />
          <transition name="fade-drop">
            <div v-if="showMobileMenu"
                 class="mobile-menu" @click.stop>
              <b-icon :pack="isPinned ? 'fas' : 'far'" icon="star"
                      class="action-icon"
                      :class="{ 'action-icon--pinned': isPinned }"
                      @click="$emit('toggle-pin', notif); closeMobileMenu()" />
              <b-icon pack="fas" icon="times"
                      class="action-icon action-icon--dismiss"
                      @click="$emit('dismiss', notif); closeMobileMenu()" />
            </div>
          </transition>
        </div>
      </div>

      <!-- Mensaje -->
      <p class="notif-message">{{ notif.message }}</p>

      <!-- Botón expandir detalle -->
      <button
        v-if="hasDetail"
        class="detail-toggle"
        @click="toggleExpand"
      >
        <span>{{ isExpanded ? 'Ocultar detalle' : 'Ver detalle' }}</span>
        <b-icon
          pack="fas"
          :icon="isExpanded ? 'chevron-up' : 'chevron-down'"
          size="is-small"
        />
      </button>

      <!-- Panel de detalle expandible -->
      <transition name="detail-expand">
        <div v-if="hasDetail && isExpanded" class="detail-panel">

          <!-- DETALLE: Alerta de stock -->
          <template v-if="notif.metadata.type === 'stock_alert'">
            <div class="detail-header">
              <span class="detail-header__label">{{ notif.metadata.sheetLabel }}</span>
              <span class="detail-header__counts">
                <span v-if="notif.metadata.critCount > 0" class="level-badge level-badge--critico">
                  {{ notif.metadata.critCount }} CRÍTICO
                </span>
              </span>
            </div>

            <!-- Navegador de Grados (Ejes) -->
            <div v-if="hasAxisData(notif)" class="axis-navigator-mini mb-3">
              <div class="axis-pills-mini">
                <button 
                  v-for="axisLabel in getAxes(notif)" 
                  :key="axisLabel"
                  class="axis-pill-mini"
                  :class="{ 'active': (selectedAxisMap[notif._id] || getAxes(notif)[0]) === axisLabel }"
                  @click.stop="selectAxis(notif._id, axisLabel)"
                >
                  {{ axisLabel }}°
                </button>
              </div>
            </div>

            <!-- Lista con Scroll Interno -->
            <div class="cell-list-container-mini" :style="{ maxHeight: hasAxisData(notif) ? '250px' : '400px' }">
              <ul class="cell-list">
                <li
                  v-for="(cell, idx) in getCurrentAlerts(notif)"
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
            </div>
            
            <div v-if="hasAxisData(notif)" class="detail-footer-mini pt-2">
              Mostrando eje {{ selectedAxisMap[notif._id] || getAxes(notif)[0] }}° ({{ getCurrentAlerts(notif).length }} ítems)
            </div>
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
                <span v-if="notif.metadata.note" class="notif-message-note">{{ notif.metadata.note }}</span>
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
              <p class="notif-message-detail">{{ notif.metadata.message || 'Sin detalle del motivo' }}</p>
              <span v-if="notif.metadata.actor" class="notif-author-meta">
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
</template>

<style scoped src="./NotificationCard.css"></style>
