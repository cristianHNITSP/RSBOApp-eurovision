<template>
  <div class="cash-closure-history-root">
    <b-loading :is-full-page="false" :active="loading" />

    <div v-if="!closures.length && !loading" class="empty-state">
      <div class="empty-state__visual">
        <i class="fas fa-cash-register"></i>
      </div>
      <p class="empty-state__title">Sin registros</p>
      <p class="empty-state__text">Los cortes de caja aparecerán aquí.</p>
    </div>

    <div v-else class="liquid-list">
      <div
        v-for="row in closures"
        :key="row.id || row.folio"
        class="liquid-item"
        :class="{ 'is-expanded': expandedId === (row.id || row.folio) }"
      >
        <!-- Header: La cara del cristal -->
        <div 
          class="liquid-item__header"
          @click="toggleRow(row.id || row.folio)"
        >
          <div class="header-main">
            <div class="folio-badge">{{ row.folio }}</div>
            <div class="header-info">
              <span class="header-title">Cierre de Caja</span>
              <span class="header-meta">{{ formatDate(row.endDate) }} · {{ row.closedBy?.name || 'Sistema' }}</span>
            </div>
          </div>
          
          <div class="header-side">
            <div class="amount-group">
              <span class="amount-val">{{ formatCurrency(row.sales?.total || 0) }}</span>
              <div class="amount-badges">
                <span v-if="row.merma?.count" class="merma-pill">
                  <i class="fas fa-exclamation-triangle"></i> {{ row.merma.count }}
                </span>
              </div>
            </div>
            
            <div class="expand-icon">
              <i class="fas fa-chevron-down"></i>
            </div>
          </div>
        </div>

        <!-- Body: El contenido líquido -->
        <div class="liquid-item__body-wrapper">
          <div class="liquid-item__body">
            <div class="body-inner">
              <div class="columns is-multiline">
                <div class="column is-4">
                  <p class="label-tiny">Periodo Operativo</p>
                  <div class="period-box">
                    <span class="date-val">{{ formatDate(row.startDate) }}</span>
                    <i class="fas fa-long-arrow-alt-right divider-icon"></i>
                    <span class="date-val">{{ formatDate(row.endDate) }}</span>
                  </div>
                </div>

                <div class="column is-8">
                  <p class="label-tiny">Distribución de Ingresos</p>
                  <div class="stats-grid">
                    <div v-for="(val, key) in row.sales?.byMethod" :key="key" class="stat-pill" v-show="val > 0">
                      <span class="stat-pill__label">{{ METHOD_LABELS[key] || key }}</span>
                      <span class="stat-pill__val">{{ formatCurrency(val) }}</span>
                    </div>
                  </div>
                </div>

                <div class="column is-12" v-if="row.merma?.count">
                  <p class="label-tiny text-danger">Reporte de Mermas</p>
                  <div class="merma-alert">
                    <div class="merma-alert__info">
                      <span class="merma-count">{{ row.merma.count }} ítems</span>
                      <span class="merma-impact">Impacto: {{ formatCurrency(row.merma.totalValue) }}</span>
                    </div>
                  </div>
                </div>

                <div class="column is-12" v-if="row.observations">
                  <p class="label-tiny">Observaciones</p>
                  <div class="obs-bubble">
                    {{ row.observations }}
                  </div>
                </div>

                <div class="column is-12 has-text-right pt-2">
                  <button class="print-ghost-btn" @click.stop="window.print()">
                    <i class="fas fa-print mr-2"></i>Imprimir Corte
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Paginación Glass -->
    <nav v-if="total > 10" class="glass-pager">
      <button :disabled="currentPage === 1" @click="onPageChange(currentPage - 1)">
        <i class="fas fa-chevron-left"></i>
      </button>
      <span class="pager-info">{{ currentPage }} / {{ Math.ceil(total / 10) }}</span>
      <button :disabled="currentPage >= Math.ceil(total / 10)" @click="onPageChange(currentPage + 1)">
        <i class="fas fa-chevron-right"></i>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useCashClosures } from '@/composables/api/useCashClosures';

const { closures, loading, total, fetchClosures } = useCashClosures();
const expandedId = ref(null);
const currentPage = ref(1);

const METHOD_LABELS = { 
  efec: 'Efectivo', 
  tarjeta: 'Tarjeta', 
  trans: 'Transf.', 
  credito: 'Crédito' 
};

onMounted(() => {
  fetchClosures();
});

function toggleRow(id) {
  if (!id) return;
  expandedId.value = expandedId.value === id ? null : id;
}

function onPageChange(page) {
  currentPage.value = page;
  expandedId.value = null;
  fetchClosures(page);
}

function formatCurrency(val) {
  return new Intl.NumberFormat('es-MX', { 
    style: 'currency', 
    currency: 'MXN',
    maximumFractionDigits: 2
  }).format(val);
}

function formatDate(d) {
  if (!d) return '';
  return new Intl.DateTimeFormat('es-MX', { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  }).format(new Date(d));
}
</script>

<style scoped>
.cash-closure-history-root {
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-accent: var(--c-primary);
  padding: 0.5rem;
}

/* ── Liquid List ── */
.liquid-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.liquid-item {
  background: var(--surface-overlay);
  border: 1px solid var(--border-light);
  border-radius: 20px;
  overflow: hidden;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}

.liquid-item.is-expanded {
  background: white;
  border-color: var(--c-primary-alpha);
  box-shadow: 0 15px 35px rgba(0,0,0,0.08);
}

.liquid-item__header {
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
}

.liquid-item__header:hover {
  background: var(--c-primary-alpha);
}

.liquid-item__header:hover .expand-icon {
  color: var(--c-primary);
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.liquid-item__header:active {
  background: rgba(0, 0, 0, 0.05);
}

.header-main {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.folio-badge {
  background: var(--c-primary);
  color: white;
  padding: 0.25rem 0.6rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 800;
  font-family: ui-monospace, monospace;
}

.header-info {
  display: flex;
  flex-direction: column;
}

.header-title {
  font-weight: 800;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.header-meta {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 600;
}

.header-side {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.amount-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.amount-val {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-primary);
}

.merma-pill {
  font-size: 0.65rem;
  background: var(--c-danger-alpha);
  color: var(--c-danger);
  padding: 1px 6px;
  border-radius: 6px;
  font-weight: 800;
}

.expand-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--bg-muted);
  color: var(--text-muted);
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.is-expanded .expand-icon {
  transform: rotate(180deg);
  background: var(--c-primary);
  color: white;
}

/* ── Body: The Liquid Physics ── */
.liquid-item__body-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.is-expanded .liquid-item__body-wrapper {
  grid-template-rows: 1fr;
}

.liquid-item__body {
  overflow: hidden;
}

.body-inner {
  padding: 0 1.25rem 1.25rem;
  border-top: 1px solid rgba(0,0,0,0.03);
  padding-top: 1.25rem;
}

/* ── Internals ── */
.label-tiny {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.period-box {
  background: var(--bg-muted);
  padding: 0.75rem;
  border-radius: 14px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.divider-icon { opacity: 0.3; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.6rem;
}

.stat-pill {
  background: white;
  border: 1px solid var(--border-light);
  padding: 0.6rem 0.8rem;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 6px rgba(0,0,0,0.02);
}

.stat-pill__label { font-size: 0.6rem; color: var(--text-muted); font-weight: 700; }
.stat-pill__val   { font-size: 0.9rem; color: var(--text-primary); font-weight: 800; }

.merma-alert {
  background: rgba(241, 70, 104, 0.06);
  padding: 1rem;
  border-radius: 14px;
  border: 1px solid rgba(241, 70, 104, 0.1);
}

.merma-alert__info {
  display: flex;
  justify-content: space-between;
  font-weight: 700;
  font-size: 0.9rem;
}

.merma-count { color: var(--c-danger); }

.obs-bubble {
  background: #fdfdfd;
  border: 1px solid var(--border-light);
  padding: 0.85rem;
  border-radius: 14px;
  font-style: italic;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.print-ghost-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  transition: color 0.2s;
}

.print-ghost-btn:hover { color: var(--c-primary); }

/* ── Glass Pager ── */
.glass-pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}

.glass-pager button {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid var(--border-light);
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.glass-pager button:disabled { opacity: 0.4; cursor: not-allowed; }
.glass-pager button:not(:disabled):hover { border-color: var(--c-primary); color: var(--c-primary); }

.pager-info { font-weight: 800; font-size: 0.9rem; color: var(--text-primary); }

/* ── Empty State ── */
.empty-state {
  padding: 4rem 1rem;
  text-align: center;
}

.empty-state__visual {
  font-size: 3rem;
  color: var(--text-subtle);
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state__title { font-weight: 800; color: var(--text-secondary); }
.empty-state__text  { font-size: 0.85rem; color: var(--text-muted); }
</style>
