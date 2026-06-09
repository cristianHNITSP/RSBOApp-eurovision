<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { fetchNotifications, pinNotification, dismissNotifApi } from '@/services/notifications.js';
import { labToast } from '@/composables/shared/useLabToast.js';
import NotificationCard from '@/components/notifi/NotificationCard.vue';

defineProps({
  user: { type: Object, default: null },
  loading: { type: Boolean, default: false }
});

const notifications = ref([]);
const isHistoryLoading = ref(true);

const filterType = ref('');            // '', 'info', 'warning', 'danger', 'success'
const dateRange = ref('indefinido');   // 'diario' | 'semana' | 'mes' | 'indefinido'
const showPinnedOnly = ref(false);
const currentPage = ref(1);
const perPage = 20;
const total = ref(0);

async function loadNotifications() {
  isHistoryLoading.value = true;
  try {
    const { data } = await fetchNotifications({
      limit: perPage,
      skip: (currentPage.value - 1) * perPage,
      dateRange: dateRange.value
    });
    notifications.value = data.notifications ?? [];
    total.value = data.total ?? 0;
  } catch (e) {
    console.error(e);
    labToast.warning('Error al cargar notificaciones');
  } finally {
    isHistoryLoading.value = false;
  }
}

// Filtros del lado cliente (tipo + fijadas); el server ya pagina/ordena por prioridad.
const filteredNotifications = computed(() => {
  let list = notifications.value;
  if (filterType.value) list = list.filter((n) => n.type === filterType.value);
  if (showPinnedOnly.value) list = list.filter((n) => n.isPinned);
  return [...list].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
});

async function togglePin(notif) {
  const prev = notif.isPinned;
  notif.isPinned = !prev; // optimista
  try {
    await pinNotification(notif._id);
  } catch {
    notif.isPinned = prev; // rollback
    labToast.warning('No se pudo actualizar el pin.');
  }
}

async function dismissNotification(notif) {
  try {
    await dismissNotifApi(notif._id);
    const idx = notifications.value.findIndex((n) => String(n._id) === String(notif._id));
    if (idx !== -1) notifications.value.splice(idx, 1);
  } catch {
    labToast.warning('No se pudo descartar la notificación.');
  }
}

function onPageChange(page) {
  currentPage.value = page;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  loadNotifications();
}

watch(dateRange, () => {
  currentPage.value = 1;
  loadNotifications();
});

onMounted(loadNotifications);
</script>

<template>
  <div class="notifications-page">
    <div class="container is-max-desktop">
      <div class="notifications-container shadow-premium p-5">

        <!-- Cabecera responsive con `level` nativo de Bulma (apila en móvil, sin @media) -->
        <div class="level mb-5">
          <div class="level-left">
            <h1 class="title is-4 has-text-weight-bold">Historial de Notificaciones</h1>
          </div>
          <div class="level-right">
            <div class="level-item">
              <b-field class="mb-0">
                <b-select v-model="filterType" placeholder="Filtrar" size="is-small" rounded>
                  <option value="">Todos los tipos</option>
                  <option value="info">Info</option>
                  <option value="warning">Aviso</option>
                  <option value="danger">Crítico</option>
                  <option value="success">Éxito</option>
                </b-select>
              </b-field>
            </div>
            <div class="level-item">
              <b-field class="mb-0">
                <b-select v-model="dateRange" size="is-small" rounded>
                  <option value="indefinido">Todas las fechas</option>
                  <option value="diario">Hoy</option>
                  <option value="semana">Última semana</option>
                  <option value="mes">Último mes</option>
                </b-select>
              </b-field>
            </div>
            <div class="level-item">
              <b-checkbox v-model="showPinnedOnly" size="is-small" type="is-primary">
                Solo fijadas
              </b-checkbox>
            </div>
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
          <NotificationCard
            v-for="notif in filteredNotifications"
            :key="notif._id"
            :notif="notif"
            @toggle-pin="togglePin"
            @dismiss="dismissNotification"
          />

          <div class="pagination-wrapper mt-6" v-if="total > perPage">
            <b-pagination
              :total="total"
              v-model="currentPage"
              :per-page="perPage"
              @change="onPageChange"
              order="is-centered"
              rounded
            />
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.notifications-container {
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: 0.75rem;
}

.shadow-premium {
  box-shadow: var(--shadow-lg);
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
</style>
