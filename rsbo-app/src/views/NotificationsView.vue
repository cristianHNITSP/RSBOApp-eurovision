<script setup>
import { ref, computed, onMounted } from 'vue';
import { fetchNotifications, pinNotification, dismissNotifApi as apiDismissNotification } from '@/services/notifications.js';

import { labToast } from '@/composables/shared/useLabToast.js';

const props = defineProps({
  user: { type: Object, default: null },
  loading: { type: Boolean, default: false }
});

const notifications = ref([]);
const isHistoryLoading = ref(true);

const filterType = ref(''); // '', 'info', 'warning', 'danger', 'success'
const showPinnedOnly = ref(false);
const currentPage = ref(1);
const perPage = 20;

const total = ref(0);

async function loadNotifications() {
  isHistoryLoading.value = true;
  try {
    const { data } = await fetchNotifications({
      limit: perPage,
      skip: (currentPage.value - 1) * perPage
    });
    // The backend lists ALL visible/not-dismissed notifications.
    notifications.value = data.notifications ?? [];
    total.value = data.total ?? 0;
  } catch (e) {
    console.error(e);
    labToast.warning('Error al cargar notificaciones');
  } finally {
    isHistoryLoading.value = false;
  }
}

const filteredNotifications = computed(() => {
  let list = notifications.value;
  if (filterType.value) {
    list = list.filter(n => n.type === filterType.value);
  }
  if (showPinnedOnly.value) {
    list = list.filter(n => n.isPinned);
  }
  // Sorting is already handled primarily by backend (createdAt desc). 
  // We can push pinned to top again.
  return list.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });
});

async function togglePin(notif) {
  const prev = notif.isPinned;
  notif.isPinned = !prev; // optimistic
  try {
    await pinNotification(notif._id);
  } catch {
    notif.isPinned = prev; // rollback
    labToast.warning('No se pudo actualizar el pin.');
  }
}

async function dismissNotification(notif) {
  try {
    await apiDismissNotification(notif._id);
    const idx = notifications.value.findIndex((n) => String(n._id) === String(notif._id));
    if (idx !== -1) notifications.value.splice(idx, 1);
  } catch {
    labToast.warning('No se pudo descartar la notificación.');
  }
}

function onPageChange(page) {
  currentPage.value = page;
  loadNotifications();
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  if (hours < 24) return `hace ${hours} h`;
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

function getSquareColor(type) {
  const map = {
    info: '#007bff',
    warning: '#ffc107',
    danger: '#dc3545',
    success: '#28a745',
  };
  return map[type] || '#6c757d';
}

function getIcon(type) {
  const map = {
    info: 'info-circle',
    warning: 'exclamation-triangle',
    danger: 'times-circle',
    success: 'check-circle',
  };
  return map[type] || 'bell';
}

onMounted(() => {
  loadNotifications();
});
</script>

<template>
  <div class="notifications-page">
    <div class="container is-max-desktop">
      <div class="notifications-container shadow-premium p-5">

        <div class="page-header mb-5">
          <h1 class="title is-4 has-text-weight-bold">Historial de Notificaciones</h1>
          <div class="filters">
            <b-field>
              <b-select v-model="filterType" placeholder="Filtrar" size="is-small" rounded>
                <option value="">Todos los tipos</option>
                <option value="info">Info</option>
                <option value="warning">Aviso</option>
                <option value="danger">Crítico</option>
                <option value="success">Éxito</option>
              </b-select>
            </b-field>
            <b-field>
              <b-checkbox v-model="showPinnedOnly" size="is-small" type="is-primary">
                Solo fijadas
              </b-checkbox>
            </b-field>
          </div>
        </div>

        <div v-if="isHistoryLoading" class="has-text-centered p-6">
          <b-icon pack="fas" icon="spinner" custom-class="fa-spin" size="is-large" type="is-primary" />
          <p class="mt-3 has-text-grey">Cargando historial...</p>
        </div>

        <div v-else-if="filteredNotifications.length === 0" class="has-text-centered p-6">
          <b-icon pack="fas" icon="bell-slash" size="is-large" class="has-text-grey-light" />
          <p class="mt-3 has-text-grey">No hay notificaciones para mostrar.</p>
        </div>

        <div v-else class="notifications-list">
          <div v-for="notif in filteredNotifications" :key="notif._id" class="notif-row-container">
            <div class="notif-row d-flex pt-3">
              <!-- Square Icon -->
              <div class="notif-square mr-3" :style="{ backgroundColor: getSquareColor(notif.type) }"
                aria-hidden="true">
                <b-icon :icon="getIcon(notif.type)" pack="fas" size="is-small" type="is-white" />
              </div>

              <!-- Content Body -->
              <div class="notif-content-body pb-3 border-bottom is-flex-grow-1">
                <div class="is-flex is-justify-content-space-between is-align-items-start">
                  <div>
                    <span class="is-flex is-align-items-center mb-1">
                      <b-tag type="is-dark" class="has-text-weight-bold mr-2" size="is-small">
                        @{{ notif.createdByName || 'SISTEMA' }}
                      </b-tag>
                      <span v-if="notif.count > 1" class="has-text-primary has-text-weight-bold is-size-7">
                        [{{ notif.count }} ALERTAS]
                      </span>
                    </span>
                    <h3 class="has-text-weight-bold is-size-6 mt-1 has-text-black">{{ notif.title }}</h3>
                  </div>

                  <!-- Row Actions -->
                  <div class="notif-row-actions">
                    <b-button type="is-ghost" size="is-small" :icon-pack="notif.isPinned ? 'fas' : 'far'"
                      icon-left="star" :class="{ 'has-text-warning': notif.isPinned }" @click="togglePin(notif)" />
                    <b-button type="is-ghost" size="is-small" icon-pack="fas" icon-left="times"
                      class="has-text-grey-light hover-danger" @click="dismissNotification(notif)" />
                  </div>
                </div>

                <p class="notif-message-text has-text-dark mt-2 mb-3">
                  {{ notif.message }}
                </p>

                <div class="is-flex is-align-items-center">
                  <span class="is-size-7 has-text-grey">
                    <b-icon pack="fas" icon="clock" size="is-small" class="mr-1" />
                    {{ timeAgo(notif.updatedAt || notif.createdAt) }}
                  </span>
                  <div class="ml-auto">
                    <b-tag v-if="notif.priority === 'critical'" type="is-danger" class="has-text-weight-bold">ALTA PRIORIDAD</b-tag>
                    <b-tag v-else-if="notif.type === 'warning'" type="is-warning" class="has-text-weight-bold">ATENCIÓN</b-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="pagination-wrapper mt-6" v-if="total > perPage">
            <b-pagination :total="total" :current.sync="currentPage" :per-page="perPage" @change="onPageChange"
              order="is-centered" rounded />
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.notifications-container {
  background: white;
  border-radius: 0.5rem;
}

.shadow-premium {
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.05);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.filters {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

/* Row Styling */
.notif-row {
  display: flex;
}

.notif-square {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notif-content-body {
  border-bottom: 1px solid #edf2f7;
}

.notif-row-container:last-child .notif-content-body {
  border-bottom: none;
}

.notif-message-text {
  font-size: 0.875rem;
  line-height: 1.4;
  white-space: pre-wrap;
}

.hover-danger:hover {
  color: #dc3545 !important;
  background: rgba(220, 53, 69, 0.05) !important;
}

.notif-row-actions {
  display: flex;
  gap: 0.25rem;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .notifications-page {
    padding: 1rem;
  }
}
</style>
