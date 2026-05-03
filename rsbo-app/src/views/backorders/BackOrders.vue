<template>
  <div class="backorders-page animate-fade-in">
    <!-- LIQUID HERO -->
    <header class="bo-hero">
      <div class="bo-hero-accent"></div>
      <div class="bo-hero-inner">
        <div class="bo-hero-left">
          <span class="bo-pill">LOGÍSTICA</span>
          <h1 class="bo-hero-title">
            Gestionar <span class="bo-brand-grad">Encargos</span>
          </h1>
          <p class="bo-hero-sub">Seguimiento de cristales, lentes y trabajos de óptica en proceso.</p>
        </div>
        <div class="bo-hero-right">
          <button class="button bo-btn-add" @click="openCreateModal">
            <i class="fas fa-plus mr-2"></i> Nuevo Encargo
          </button>
        </div>
      </div>
    </header>

    <!-- KPI STRIP -->
    <section class="bo-kpis">
      <div class="bo-kpi-grid">
        <div class="bo-kpi-card" v-for="stat in summaryStats" :key="stat.label">
          <div class="bo-kpi-bar" :style="{ background: stat.color }"></div>
          <div class="bo-kpi-inner">
            <div class="bo-kpi-ico" :style="{ color: stat.color }">
              <i :class="stat.icon"></i>
            </div>
            <div>
              <span class="bo-kpi-lbl">{{ stat.label }}</span>
              <span class="bo-kpi-num">{{ stat.value }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- MAIN CONTENT -->
    <section class="bo-main">
      <div class="gcard bo-card">
        <div class="gcard-bar"></div>
        
        <!-- CARD HEADER / FILTERS -->
        <div class="gc-head gc-head-filter">
          <div class="gc-head-left">
            <div class="bo-tabs">
              <button 
                v-for="cat in categories" 
                :key="cat.id"
                @click="handleCategoryChange(cat.id)"
                :class="{ 'is-active': filters.category === cat.id }"
                class="bo-tab-item"
              >
                {{ cat.label }}
              </button>
            </div>
          </div>
          
          <div class="gc-head-right">
            <div class="bo-search">
              <i class="fas fa-search bo-search-ico"></i>
              <input 
                v-model="filters.search" 
                type="text" 
                class="bo-search-input" 
                placeholder="Buscar por folio o cliente..."
                @input="handleSearch"
              />
            </div>
            
            <div class="bo-filter-select ml-3">
              <div class="select is-small">
                <select v-model="filters.status" @change="handleStatusChange">
                  <option :value="null">Todos los estados</option>
                  <option value="SOLICITADO">Solicitados</option>
                  <option value="PEDIDO_PROVEEDOR">En Pedido</option>
                  <option value="RECIBIDO">Recibidos</option>
                  <option value="LISTO_ENTREGA">Listos para Entrega</option>
                  <option value="ENTREGADO">Entregados</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- CARD BODY / LIST -->
        <div class="gc-body bo-list-container">
          <div v-if="isLoading && !backorders.length" class="bo-empty-state">
            <div class="spinner"></div>
            <p>Sincronizando con el laboratorio...</p>
          </div>

          <div v-else-if="backorders.length > 0" class="bo-items-list">
            <div v-for="bo in backorders" :key="bo._id" class="bo-item" @click="openDetailModal(bo)">
              <div class="bo-item-stripe" :style="{ background: getStatusColor(bo.status) }"></div>
              
              <div class="bo-item-main">
                <div class="bo-item-id">
                  <span class="bo-folio">#{{ bo.folio }}</span>
                  <StatusBadge :status="bo.status" />
                </div>
                <div class="bo-item-user">
                  <p class="bo-client">{{ bo.cliente.nombre }}</p>
                  <p class="bo-date">Solicitado: {{ formatDate(bo.fechaSolicitud) }}</p>
                </div>
              </div>

              <div class="bo-item-financial">
                <div class="bo-price-info">
                  <span class="bo-price-lbl">Pendiente</span>
                  <span class="bo-price-val" :class="{ 'is-zero': bo.saldoPendiente <= 0 }">
                    {{ formatCurrency(bo.saldoPendiente) }}
                  </span>
                </div>
                <div class="bo-progress">
                  <div class="bo-progress-bar">
                    <div class="bo-progress-fill" :style="{ width: getPaymentProgress(bo) + '%' }"></div>
                  </div>
                </div>
              </div>

              <div class="bo-item-actions">
                <button class="button is-ghost is-small">
                  <i class="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>

          <div v-else class="bo-empty-state">
            <i class="fas fa-box-open mb-3 is-size-1"></i>
            <p>No se encontraron encargos en esta categoría.</p>
          </div>
        </div>

        <!-- CARD FOOTER / PAGINATION -->
        <div class="gc-foot bo-pagination">
          <div class="level is-mobile">
            <div class="level-left">
              <span class="is-size-7 has-text-grey">
                Mostrando {{ backorders.length }} de {{ pagination.total }} registros
              </span>
            </div>
            <div class="level-right">
              <div class="buttons are-small">
                <button 
                  class="button bo-pg-btn" 
                  :disabled="pagination.page <= 1"
                  @click="handlePreviousPage"
                >
                  <i class="fas fa-chevron-left"></i>
                </button>
                <span class="mx-3 is-size-7 font-weight-bold">{{ pagination.page }} / {{ pagination.pages }}</span>
                <button 
                  class="button bo-pg-btn" 
                  :disabled="pagination.page >= pagination.pages"
                  @click="handleNextPage"
                >
                  <i class="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- MODALES -->
    <BackOrderCreateModal
      v-model:is-open="createModalOpen"
      @close="createModalOpen = false"
      @created="handleCreated"
    />

    <BackOrderDetailModal
      v-model:is-open="detailModalOpen"
      :bo-id="selectedBoId"
      :category="selectedCategory"
      @close="detailModalOpen = false"
      @refresh="handleRefresh"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useBackOrders } from "../../composables/api/useBackOrders";
import StatusBadge from "../../components/backorders/StatusBadge.vue";
import BackOrderCreateModal from "../../components/backorders/BackOrderCreateModal.vue";
import BackOrderDetailModal from "../../components/backorders/BackOrderDetailModal.vue";
import { labToast } from "../../composables/shared/useLabToast";

const {
  backorders,
  filters,
  pagination,
  stats,
  isLoading,
  create,
  listByCategory,
  loadStats,
  setCategory,
  setStatus,
  setSearch,
  previousPage,
  nextPage,
} = useBackOrders();

const createModalOpen = ref(false);
const detailModalOpen = ref(false);
const selectedBoId = ref(null);
const selectedCategory = ref(null);

const categories = [
  { id: "BASES_MICAS", label: "Bases y Micas" },
  { id: "LENTES_CONTACTO", label: "Lentes de Contacto" },
  { id: "OPTICA", label: "Óptica" },
];

const summaryStats = computed(() => {
  const s = stats.value || {};
  return [
    { label: "Total Activos", value: s.global?.count || 0, icon: "fas fa-layer-group", color: "var(--c-primary)" },
    { label: "Bases y Micas", value: s.basesMicas?.totals?.count || 0, icon: "fas fa-glasses", color: "#3b82f6" },
    { label: "Contactología", value: s.lentes?.totals?.count || 0, icon: "fas fa-eye", color: "#06b6d4" },
    { label: "Óptica Gral", value: s.optica?.totals?.count || 0, icon: "fas fa-store", color: "#8b5cf6" },
  ];
});

function formatCurrency(amount) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount || 0);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("es-MX", { day: '2-digit', month: 'short' });
}

function getStatusColor(status) {
  const colors = {
    SOLICITADO: "#3b82f6",
    PEDIDO_PROVEEDOR: "#f59e0b",
    RECIBIDO: "#06b6d4",
    LISTO_ENTREGA: "#8b5cf6",
    ENTREGADO: "#10b981",
    CANCELADO: "#6b7280",
  };
  return colors[status] || "#ddd";
}

function getPaymentProgress(bo) {
  if (!bo.precioEstimado) return 0;
  return Math.min(100, (bo.totalPagado / bo.precioEstimado) * 100);
}

function openCreateModal() {
  console.log("[BackOrders] Opening Create Modal");
  createModalOpen.value = true;
}

function openDetailModal(bo) {
  selectedBoId.value = bo._id;
  selectedCategory.value = bo.category;
  detailModalOpen.value = true;
}

async function handleCategoryChange(catId) {
  setCategory(catId);
  await listByCategory();
}

async function handleStatusChange() {
  await listByCategory();
}

let searchTimeout = null;
function handleSearch() {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    setSearch(filters.value.search);
    await listByCategory();
  }, 400);
}

async function handlePreviousPage() {
  previousPage();
  await listByCategory();
}

async function handleNextPage() {
  nextPage();
  await listByCategory();
}

async function handleCreated(payload) {
  try {
    await create(payload.data, payload.category);
    createModalOpen.value = false;
    labToast.success("Encargo creado correctamente");
    await handleRefresh();
  } catch (err) {
    // El error ya se maneja en el composable o se puede mostrar aquí
    console.error("Error al crear encargo:", err);
  }
}

async function handleRefresh() {
  await listByCategory();
  await loadStats();
}

// Escuchar eventos de actualización (WebSockets desde DashboardLayout)
const onWsRefresh = () => {
  handleRefresh();
};

onMounted(async () => {
  await listByCategory();
  await loadStats();
  window.addEventListener("backorders:refresh", onWsRefresh);
});

onUnmounted(() => {
  window.removeEventListener("backorders:refresh", onWsRefresh);
});
</script>

<style scoped>
.backorders-page {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* HERO */
.bo-hero {
  position: relative;
  background: white;
  border-radius: 20px;
  padding: 2.5rem;
  margin-bottom: 2rem;
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}

.bo-hero-accent {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 4px;
  background: linear-gradient(90deg, #906fe1, #f06292, #4fc3f7);
}

.bo-hero-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bo-hero-title {
  font-size: 2.25rem;
  font-weight: 900;
  color: var(--text-primary);
  margin: 0.5rem 0;
}

.bo-hero-sub {
  color: var(--text-muted);
  font-size: 1.1rem;
}

.bo-brand-grad {
  background: linear-gradient(135deg, #906fe1 0%, #6366f1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.bo-pill {
  background: var(--c-primary-alpha);
  color: var(--c-primary);
  padding: 0.2rem 0.75rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
}

/* KPI STRIP */
.bo-kpis {
  margin-bottom: 2rem;
}

.bo-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.bo-kpi-card {
  background: white;
  border-radius: 16px;
  padding: 1.25rem;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
}

.bo-kpi-bar {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
}

.bo-kpi-inner {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.bo-kpi-ico {
  width: 40px;
  height: 40px;
  background: rgba(148, 163, 184, 0.05);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.bo-kpi-lbl {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
}

.bo-kpi-num {
  display: block;
  font-size: 1.5rem;
  font-weight: 900;
  line-height: 1;
}

/* LIST CONTAINER */
.bo-card {
  background: var(--surface-overlay);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  border: 1px solid var(--border);
}

.gc-head-filter {
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
}

.bo-tabs {
  display: flex;
  background: rgba(148, 163, 184, 0.08);
  padding: 0.35rem;
  border-radius: 12px;
}

.bo-tab-item {
  border: none;
  background: transparent;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.bo-tab-item.is-active {
  background: white;
  color: var(--c-primary);
  box-shadow: var(--shadow-sm);
}

.bo-search {
  position: relative;
  width: 280px;
}

.bo-search-ico {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.bo-search-input {
  width: 100%;
  padding: 0.5rem 1rem 0.5rem 2.5rem;
  border-radius: 99px;
  border: 1px solid var(--border);
  font-size: 0.85rem;
  background: white;
}

/* ITEMS LIST */
.bo-items-list {
  padding: 0.5rem;
}

.bo-item {
  display: flex;
  align-items: center;
  padding: 1rem 1.25rem;
  background: white;
  border-radius: 14px;
  margin-bottom: 0.75rem;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.bo-item:hover {
  border-color: var(--c-primary-alpha);
  transform: translateX(4px);
  background: var(--surface-raised);
}

.bo-item-stripe {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 5px;
  opacity: 0.8;
}

.bo-item-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 2rem;
}

.bo-item-id {
  width: 180px;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.bo-folio {
  font-family: 'Satoshi', sans-serif;
  font-weight: 900;
  font-size: 1rem;
  color: var(--text-primary);
}

.bo-item-user {
  flex: 1;
}

.bo-client {
  font-weight: 700;
  color: var(--text-primary);
}

.bo-date {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.bo-item-financial {
  width: 200px;
  margin-right: 2rem;
}

.bo-price-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
}

.bo-price-lbl { font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); }
.bo-price-val { font-weight: 800; }
.bo-price-val.is-zero { color: var(--c-success); }

.bo-progress {
  height: 4px;
  background: rgba(148, 163, 184, 0.1);
  border-radius: 2px;
}

.bo-progress-fill {
  height: 100%;
  background: var(--c-primary);
  border-radius: 2px;
}

.bo-pg-btn {
  border-radius: 8px;
  border: 1px solid var(--border);
}

.bo-empty-state {
  padding: 4rem;
  text-align: center;
  color: var(--text-muted);
}

[data-theme="dark"] .bo-hero,
[data-theme="dark"] .bo-kpi-card,
[data-theme="dark"] .bo-item,
[data-theme="dark"] .bo-tab-item.is-active,
[data-theme="dark"] .bo-search-input {
  background: #1e293b;
  border-color: rgba(255,255,255,0.1);
}
</style>
