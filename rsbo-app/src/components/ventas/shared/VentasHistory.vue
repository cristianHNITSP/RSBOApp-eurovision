<template>
  <div class="ventas-history-root">
    <!-- Filtro de Categoría Glass (Solo Vista) -->
    <div class="history-filters-glass">
      <div class="glass-pill-selector">
        <button 
          v-for="cat in CATEGORIES" 
          :key="cat.id"
          class="glass-pill-btn"
          :class="{ 'is-active': localCategory === cat.id }"
          @click="localCategory = cat.id"
        >
          {{ cat.label }}
        </button>
      </div>
      
      <b-button
        type="is-ghost"
        icon-left="sync"
        size="is-small"
        :loading="loading"
        @click="$emit('refresh')"
      />
    </div>

    <div class="history-body-container">
      <b-loading :is-full-page="false" :active="loading" />

      <transition name="fade" mode="out-in">
        <!-- Estado Vacío -->
        <div v-if="(!rows || rows.length === 0)" :key="'empty'" class="empty-state-glass">
          <div class="empty-state-glass__icon">
            <i class="fas fa-history"></i>
          </div>
          <p class="empty-state-glass__title">Sin historial</p>
          <p class="empty-state-glass__text">Las ventas aparecerán aquí.</p>
        </div>

        <div v-else :key="'list'" class="liquid-list">
          <div
            v-for="sale in rows"
            :key="sale.id"
            class="liquid-item"
            :class="{ 'is-expanded': expandedId === sale.id }"
          >
            <!-- Header -->
            <div 
              class="liquid-item__header"
              @click="toggleRow(sale.id)"
            >
              <div class="header-main">
                <div class="folio-badge-group">
                  <div v-if="sale.ventaFolio" class="folio-tag folio-tag--venta">
                    <i class="fas fa-receipt"></i> {{ sale.ventaFolio }}
                  </div>
                  <div v-if="sale.labFolio" class="folio-tag folio-tag--lab">
                    <i class="fas fa-flask"></i> {{ sale.labFolio }}
                  </div>
                </div>
                <div class="header-info">
                  <span class="header-title">{{ sale.clienteDisplay || sale.cliente }}</span>
                  <span class="header-meta">{{ fmtDate(sale.fecha) }} · {{ sale.totalPiezas }} pzas</span>
                </div>
              </div>
              
              <div class="header-side">
                <div class="status-stack">
                  <b-tag
                    v-if="sale.labStatus"
                    :type="`${labStatusClass(sale.labStatus)} is-light`"
                    class="lab-liquid-badge"
                  >
                    {{ labStatusHuman(sale.labStatus) }}
                  </b-tag>
                  <b-tag v-else type="is-success is-light" class="lab-liquid-badge">
                    Venta Directa
                  </b-tag>
                </div>
                
                <div class="expand-icon">
                  <i class="fas fa-chevron-down"></i>
                </div>
              </div>
            </div>

            <!-- Body -->
            <div class="liquid-item__body-wrapper">
              <div class="liquid-item__body">
                <div class="body-inner-content">
                  <div class="columns is-variable is-5">
                    <div class="column is-7">
                      <p class="label-tiny">Resumen de Ticket</p>
                      <div class="compact-ticket">
                        <table class="ticket-table-mini">
                          <thead>
                            <tr>
                              <th>CANT</th>
                              <th>PRODUCTO</th>
                              <th class="has-text-right">TOTAL</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="(line, i) in sale.lineas" :key="i">
                              <td class="font-900">{{ line.qty }}</td>
                              <td class="ticket-prod-name">{{ line.title }}</td>
                              <td class="has-text-right">{{ line.precio ? (line.qty * line.precio).toFixed(2) : '—' }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div class="column is-5">
                      <div class="info-sidebar">
                        <div class="total-hero-card mb-4">
                          <div class="total-hero-card__label">TOTAL</div>
                          <div class="total-hero-card__val">{{ formatCurrency(sale.totalMonto) }}</div>
                        </div>

                        <div class="meta-grid">
                          <div class="meta-item">
                            <span class="meta-item__label">Vendedor</span>
                            <span class="meta-item__val">{{ sale.actor }}</span>
                          </div>
                          <div class="meta-item">
                            <span class="meta-item__label">Pago</span>
                            <span class="meta-item__val">{{ sale.pagoDisplay }}</span>
                          </div>
                        </div>

                        <div v-if="sale.note" class="note-block mt-3">
                          <p class="note-text">{{ sale.note }}</p>
                        </div>

                        <div class="actions-group mt-4">
                          <b-button 
                            expanded 
                            type="is-primary" 
                            icon-left="print" 
                            class="premium-btn"
                            @click.stop="$emit('select-order', sale)"
                          >
                            Ver / Imprimir Comprobante
                          </b-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div> <!-- liquid-item end -->
        </div> <!-- liquid-list end -->
      </transition>

      <!-- Paginación de Servidor -->
      <nav v-if="totalPages > 1" class="history-pager mt-5">
        <b-button
          size="is-small"
          type="is-light"
          icon-left="chevron-left"
          :disabled="page === 1"
          @click="$emit('update:page', page - 1)"
        >
          Anterior
        </b-button>
        
        <div class="pager-info">
          <span class="pager-info__current">{{ page }}</span>
          <span class="pager-info__divider">/</span>
          <span class="pager-info__total">{{ totalPages }}</span>
        </div>

        <b-button
          size="is-small"
          type="is-light"
          icon-right="chevron-right"
          :disabled="page >= totalPages"
          @click="$emit('update:page', page + 1)"
        >
          Siguiente
        </b-button>
      </nav>
    </div> <!-- history-body-container end -->
  </div> <!-- ventas-history-root end -->
</template>

<script setup>
import { computed, ref } from 'vue';
import { fmtDate } from '@/utils/formatters';
import { labStatusHuman, labStatusClass } from '@/utils/statusHelpers';

const props = defineProps({
  category:   { type: String, default: 'all' },
  rows:       { type: Array,  default: () => [] },
  loading:    { type: Boolean, default: false },
  page:       { type: Number,  default: 1 },
  totalPages: { type: Number,  default: 1 }
});

const emit = defineEmits(['update:category', 'update:page', 'refresh', 'select-order']);

const expandedId = ref(null);

const CATEGORIES = [
  { id: 'all',             label: 'Todas' },
  { id: 'bases-micas',     label: 'Bases y Micas' },
  // { id: 'optica',          label: 'Óptica' },
  { id: 'lentes-contacto', label: 'Lentes Contacto' }
];

const localCategory = computed({
  get: () => props.category,
  set: (v) => emit('update:category', v)
});

function toggleRow(id) {
  expandedId.value = expandedId.value === id ? null : id;
}

function formatCurrency(val) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
}
</script>

<style scoped>
/* Estilos visuales únicamente, sin tocar lógica */
.ventas-history-root { display: flex; flex-direction: column; gap: 1.25rem; }
.history-filters-glass { display: flex; justify-content: space-between; align-items: center; background: var(--surface-glass); padding: 0.5rem; border-radius: 16px; border: 1px solid var(--border-light); }
.glass-pill-selector { display: flex; gap: 0.4rem; }
.glass-pill-btn { background: transparent; border: none; padding: 0.45rem 1rem; border-radius: 12px; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); cursor: pointer; transition: all 0.2s; }
.glass-pill-btn.is-active { background: var(--c-primary); color: white; }

.liquid-list { display: flex; flex-direction: column; gap: 0.75rem; }
.liquid-item { background: var(--surface-overlay); border: 1px solid var(--border-light); border-radius: 20px; overflow: hidden; transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.liquid-item.is-expanded { background: white; border-color: var(--c-primary-alpha); box-shadow: 0 15px 35px rgba(0,0,0,0.08); }
.liquid-item__header { padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
.liquid-item__header:hover { background: var(--c-primary-alpha); }

.folio-badge-group { display: flex; flex-direction: column; gap: 0.25rem; }
.folio-tag { font-size: 0.65rem; font-weight: 800; font-family: ui-monospace, monospace; padding: 0.15rem 0.5rem; border-radius: 6px; }
.folio-tag--venta { background: #eff6ff; color: var(--c-info); }
.folio-tag--lab { background: #fdf2f8; color: #db2777; }

.header-main { display: flex; align-items: center; gap: 1.25rem; }
.header-info { display: flex; flex-direction: column; }
.header-title { font-weight: 800; color: var(--text-primary); }
.header-meta { font-size: 0.78rem; color: var(--text-muted); }

.header-side { display: flex; align-items: center; gap: 1rem; }
.status-stack { display: flex; align-items: center; }
.lab-liquid-badge { font-weight: 800 !important; font-size: 0.7rem !important; text-transform: uppercase; }

.expand-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--bg-muted); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.is-expanded .expand-icon { transform: rotate(180deg); background: var(--c-primary); color: white; }

.liquid-item__body-wrapper { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.is-expanded .liquid-item__body-wrapper { grid-template-rows: 1fr; }
.liquid-item__body { overflow: hidden; }
.body-inner-content { padding: 1.25rem; border-top: 1px solid rgba(0,0,0,0.03); }

.compact-ticket { background: #fdfdfd; border: 1px solid var(--border-light); border-radius: 16px; padding: 1rem; }
.ticket-table-mini { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.ticket-table-mini th { border-bottom: 1px solid var(--border-light); padding: 0.4rem 0; color: var(--text-muted); text-align: left; }
.ticket-table-mini td { padding: 0.5rem 0; }

.total-hero-card { background: var(--c-primary); padding: 1rem; border-radius: 16px; color: white; }
.total-hero-card__label { font-size: 0.6rem; font-weight: 800; opacity: 0.8; }
.total-hero-card__val { font-size: 1.5rem; font-weight: 900; }

.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 1rem; }
.meta-item { background: var(--surface-raised); padding: 0.5rem; border-radius: 10px; display: flex; flex-direction: column; }
.meta-item__label { font-size: 0.6rem; color: var(--text-muted); font-weight: 700; }
.meta-item__val { font-size: 0.8rem; font-weight: 800; }

.note-block { background: rgba(0,0,0,0.02); padding: 0.75rem; border-radius: 10px; border: 1px solid var(--border-light); }
.note-text { font-size: 0.8rem; font-style: italic; }

.label-tiny { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem; display: block; }
.empty-state-glass { padding: 4rem 1rem; text-align: center; }
.empty-state-glass__icon { font-size: 3rem; color: var(--text-subtle); opacity: 0.5; margin-bottom: 1rem; }

/* ── Paginación ── */
.history-pager { display: flex; align-items: center; justify-content: center; gap: 1.5rem; padding: 0.75rem; background: var(--surface-glass); border-radius: 16px; border: 1px solid var(--border-light); }
.pager-info { display: flex; align-items: center; gap: 0.5rem; font-weight: 800; font-family: ui-monospace, monospace; font-size: 0.9rem; }
.pager-info__current { color: var(--c-primary); }
.pager-info__divider { opacity: 0.3; }
.pager-info__total { color: var(--text-muted); }

/* ── Transiciones de Fluidez ── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
