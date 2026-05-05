<template>
  <div class="cash-closure-modal">
    <div class="modal-card premium-glass" style="width: auto; max-width: 500px; border-radius: 20px;">
      <header class="modal-card-head" style="background: transparent; border-bottom: 1px solid var(--border);">
        <p class="modal-card-title has-text-weight-bold">
          <i class="fas fa-cash-register mr-2 text-primary"></i>
          Corte de Caja
        </p>
        <button type="button" class="delete" @click="$emit('close')" />
      </header>

      <section class="modal-card-body" style="background: transparent;">
        <div v-if="loading" class="has-text-centered py-6">
          <b-icon icon="sync" custom-class="fa-spin fa-2x" />
          <p class="mt-2 text-muted">Calculando resumen...</p>
        </div>

        <div v-else-if="summary">
          <div class="summary-header mb-4">
            <p class="is-size-7 text-muted mb-1">Periodo actual:</p>
            <p class="is-size-6 has-text-weight-semibold">
              {{ formatDate(summary.startDate) }} → Ahora
            </p>
          </div>

          <!-- Ventas -->
          <div class="summary-section mb-4">
            <div class="is-flex is-justify-content-space-between is-align-items-center mb-2">
              <h3 class="has-text-weight-bold is-size-5">Ventas Totales</h3>
              <span class="tag is-primary is-medium">{{ formatCurrency(summary.sales.total) }}</span>
            </div>
            <div class="method-grid">
              <div v-for="(val, key) in summary.sales.byMethod" :key="key" class="method-pill" v-show="val > 0">
                <span class="method-label">{{ METHOD_LABELS[key] || key }}</span>
                <span class="method-val">{{ formatCurrency(val) }}</span>
              </div>
            </div>
          </div>

          <hr class="my-4" style="background-color: var(--border); height: 1px;">

          <!-- Merma / Pérdidas -->
          <div class="summary-section mb-4">
            <div class="is-flex is-justify-content-space-between is-align-items-center mb-2">
              <h3 class="has-text-weight-bold is-size-6 text-danger">Pérdidas (Merma)</h3>
              <div class="has-text-right">
                <span class="tag is-danger is-light">{{ summary.merma.count }} piezas</span>
                <p class="is-size-7 has-text-weight-bold text-danger mt-1">
                  Valor estimado: {{ formatCurrency(summary.merma.totalValue) }}
                </p>
              </div>
            </div>
            <div v-if="Object.keys(summary.merma.byReason).length > 0" class="reason-list">
              <div v-for="(qty, reason) in summary.merma.byReason" :key="reason" class="reason-item">
                <span class="text-muted">{{ reason }}:</span>
                <span class="has-text-weight-medium">{{ qty }}</span>
              </div>
            </div>
            <p v-else class="is-size-7 text-muted italic">No se registraron mermas en este periodo.</p>
          </div>

          <b-field label="Observaciones (opcional)">
            <b-input v-model="observations" type="textarea" placeholder="Notas sobre el cierre..." rows="2" />
          </b-field>

          <div class="notification is-warning is-light is-size-7 mt-4">
            <i class="fas fa-exclamation-triangle mr-1"></i>
            Al confirmar, se generará un registro histórico inmutable y el próximo corte iniciará desde este momento.
          </div>
        </div>
      </section>

      <footer class="modal-card-foot" style="background: transparent; border-top: 1px solid var(--border); justify-content: flex-end;">
        <b-button @click="$emit('close')">Cancelar</b-button>
        <b-button 
          type="is-primary" 
          :loading="saving" 
          :disabled="!summary || loading"
          @click="handleConfirm"
          icon-left="check"
          class="premium-btn"
        >
          Confirmar Corte
        </b-button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useCashClosures } from '@/composables/api/useCashClosures';

const emit = defineEmits(['close', 'success']);
const { getSummary, performClosure } = useCashClosures();

const summary = ref(null);
const loading = ref(true);
const saving  = ref(false);
const observations = ref('');

const METHOD_LABELS = {
  efec: 'Efectivo',
  tarjeta: 'Tarjeta',
  trans: 'Transferencia',
  credito: 'Crédito'
};

onMounted(async () => {
  summary.value = await getSummary();
  loading.value = false;
});

async function handleConfirm() {
  saving.value = true;
  try {
    const result = await performClosure(observations.value);
    if (result) {
      emit('success', result);
    }
  } catch (err) {
    // Error handled by composable/axios
  } finally {
    saving.value = false;
  }
}

function formatCurrency(val) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
}

function formatDate(d) {
  if (!d) return '';
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
}
</script>

<style scoped>
.method-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
.method-pill {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  padding: 0.4rem 0.75rem;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
}
.method-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 700;
}
.method-val {
  font-size: 0.9rem;
  font-weight: 600;
}
.reason-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.reason-item {
  font-size: 0.75rem;
  background: rgba(255, 0, 0, 0.05);
  padding: 0.2rem 0.5rem;
  border-radius: 5px;
}
.text-danger { color: #f14668 !important; }
</style>
