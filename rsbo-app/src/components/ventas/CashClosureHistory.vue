<template>
  <div class="cash-closure-history">
    <div class="level mb-4">
      <div class="level-left">
        <h2 class="title is-4 mb-0">Historial de Cortes</h2>
      </div>
      <div class="level-right">
        <b-button icon-left="sync" @click="fetchClosures(1)" :loading="loading">Actualizar</b-button>
      </div>
    </div>

    <b-table
      :data="closures"
      :loading="loading"
      hoverable
      striped
      paginated
      backend-pagination
      :total="total"
      :per-page="10"
      @page-change="onPageChange"
      class="premium-table"
    >
      <b-table-column field="folio" label="Folio" v-slot="props" numeric centered>
        <span class="tag is-dark is-family-monospace">{{ props.row.folio }}</span>
      </b-table-column>

      <b-table-column field="endDate" label="Fecha Cierre" v-slot="props">
        {{ formatDate(props.row.endDate) }}
      </b-table-column>

      <b-table-column field="sales" label="Total Ventas" v-slot="props">
        <span class="has-text-weight-bold">{{ formatCurrency(props.row.sales.total) }}</span>
      </b-table-column>

      <b-table-column field="merma" label="Pérdidas" v-slot="props">
        <div :class="props.row.merma.count > 0 ? 'has-text-danger' : 'text-muted'">
          <p class="has-text-weight-bold">{{ props.row.merma.count }} pzs</p>
          <p class="is-size-7" v-if="props.row.merma.totalValue">{{ formatCurrency(props.row.merma.totalValue) }}</p>
        </div>
      </b-table-column>

      <b-table-column field="closedBy" label="Cerrado por" v-slot="props">
        <span class="is-size-7">{{ props.row.closedBy.name }}</span>
      </b-table-column>

      <b-table-column label="Acciones" v-slot="props">
        <b-button size="is-small" icon-left="eye" @click="selectedClosure = props.row; detailOpen = true">Ver detalle</b-button>
      </b-table-column>

      <template #empty>
        <div class="has-text-centered py-6">
          <p class="text-muted">No hay registros de cortes de caja.</p>
        </div>
      </template>
    </b-table>

    <!-- Detail Modal -->
    <b-modal v-model="detailOpen" :width="500">
      <div v-if="selectedClosure" class="modal-card premium-glass" style="border-radius: 20px;">
        <header class="modal-card-head" style="background: transparent;">
          <p class="modal-card-title">Detalle Corte {{ selectedClosure.folio }}</p>
        </header>
        <section class="modal-card-body" style="background: transparent;">
          <div class="columns is-multiline">
            <div class="column is-6">
              <p class="is-size-7 text-muted">Desde</p>
              <p>{{ formatDate(selectedClosure.startDate) }}</p>
            </div>
            <div class="column is-6">
              <p class="is-size-7 text-muted">Hasta</p>
              <p>{{ formatDate(selectedClosure.endDate) }}</p>
            </div>
            <div class="column is-12">
              <h4 class="has-text-weight-bold mb-2">Desglose de Ventas</h4>
              <div class="method-grid">
                <div v-for="(val, key) in selectedClosure.sales.byMethod" :key="key" class="method-pill" v-show="val > 0">
                  <span class="method-label">{{ METHOD_LABELS[key] || key }}</span>
                  <span class="method-val">{{ formatCurrency(val) }}</span>
                </div>
              </div>
            </div>
            <div class="column is-12" v-if="selectedClosure.observations">
              <p class="is-size-7 text-muted">Observaciones</p>
              <p class="is-italic">"{{ selectedClosure.observations }}"</p>
            </div>
          </div>
        </section>
      </div>
    </b-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useCashClosures } from '@/composables/api/useCashClosures';

const { closures, loading, total, fetchClosures } = useCashClosures();
const detailOpen = ref(false);
const selectedClosure = ref(null);

const METHOD_LABELS = { efec: 'Efectivo', tarjeta: 'Tarjeta', trans: 'Transferencia', credito: 'Crédito' };

onMounted(() => {
  fetchClosures();
});

function onPageChange(page) {
  fetchClosures(page);
}

function formatCurrency(val) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
}

function formatDate(d) {
  if (!d) return '';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));
}
</script>

<style scoped>
.method-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.method-pill { background: var(--bg-subtle); border: 1px solid var(--border); padding: 0.4rem 0.75rem; border-radius: 10px; display: flex; flex-direction: column; }
.method-label { font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; }
.method-val { font-size: 0.9rem; font-weight: 600; }
</style>
