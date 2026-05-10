<template>
  <div class="cash-closure-modal">
    <div class="modal-card premium-glass-card animate__animated animate__zoomIn">
      <header class="modal-card-head glass-modal-header">
        <p class="modal-card-title glass-modal-title">
          <i class="fas fa-cash-register mr-2 text-primary"></i>
          Corte de Caja Actual
        </p>
        <button type="button" class="delete" @click="$emit('close')" />
      </header>

      <section class="modal-card-body glass-modal-body">
        <div v-if="loading" class="has-text-centered py-6">
          <b-icon icon="sync" custom-class="fa-spin fa-2x text-primary" />
          <p class="mt-2 text-muted font-900 uppercase-label">Calculando resumen...</p>
        </div>

        <div v-else-if="summary">
          <div class="summary-header-box mb-5">
            <div class="is-flex is-align-items-center">
              <div class="header-icon-box mr-3">
                <i class="fas fa-calendar-alt"></i>
              </div>
              <div>
                <p class="is-size-7 text-muted uppercase-label mb-0">Periodo de ventas</p>
                <p class="has-text-weight-bold is-size-6">
                  {{ formatDate(summary.startDate) }} <span class="mx-1 text-muted">→</span> Ahora
                </p>
              </div>
            </div>
          </div>

          <!-- Ventas -->
          <div class="summary-section mb-5">
            <h3 class="section-title-premium mb-3">Resumen de Ingresos</h3>
            <div class="total-ventas-hero mb-3">
              <span class="hero-label">Ventas Totales</span>
              <span class="hero-val">{{ formatCurrency(summary.sales.total) }}</span>
            </div>
            
            <div class="closure-grid">
              <div v-for="(val, key) in summary.sales.byMethod" :key="key" class="closure-stat-card" v-show="val > 0">
                <span class="closure-stat-label">{{ METHOD_LABELS[key] || key }}</span>
                <span class="closure-stat-val">{{ formatCurrency(val) }}</span>
              </div>
            </div>
          </div>

          <!-- Merma / Pérdidas -->
          <div class="summary-section mb-5">
            <h3 class="section-title-premium section-title-premium--danger mb-3">Pérdidas (Merma)</h3>
            <div class="merma-summary-box mb-3">
              <div class="is-flex is-justify-content-space-between is-align-items-center">
                <div>
                  <p class="has-text-weight-bold is-size-5 text-danger">{{ summary.merma.count }} pzs</p>
                  <p class="is-size-7 text-muted">Productos descartados</p>
                </div>
                <div class="has-text-right">
                  <p class="has-text-weight-bold is-size-5 text-danger">{{ formatCurrency(summary.merma.totalValue) }}</p>
                  <p class="is-size-7 text-muted">Valor en inventario</p>
                </div>
              </div>
            </div>
            
            <div v-if="Object.keys(summary.merma.byReason).length > 0" class="reason-pills">
              <div v-for="(qty, reason) in summary.merma.byReason" :key="reason" class="reason-pill">
                <span class="reason-label">{{ reason }}</span>
                <span class="reason-qty">{{ qty }}</span>
              </div>
            </div>
            <p v-else class="is-size-7 text-muted italic">No se registraron mermas en este periodo.</p>
          </div>

          <b-field label="Observaciones" custom-class="uppercase-label">
            <b-input 
              v-model="observations" 
              type="textarea" 
              placeholder="Escribe notas relevantes para este cierre..." 
              rows="2" 
              class="premium-input"
            />
          </b-field>

          <div class="alert-box mt-4">
            <i class="fas fa-shield-alt mr-2"></i>
            Este proceso generará un registro inmutable. Verifícalo antes de confirmar.
          </div>
        </div>
      </section>

      <footer class="modal-card-foot glass-modal-footer">
        <b-button @click="$emit('close')" class="is-rounded">Cancelar</b-button>
        <b-button 
          type="is-primary" 
          :loading="saving" 
          :disabled="!summary || loading"
          @click="handleConfirm"
          icon-left="check-double"
          class="premium-btn"
        >
          Confirmar y Cerrar Caja
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
  tarjeta: 'Tarjeta (C/D)',
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
.premium-glass-card {
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(20px) saturate(160%) !important;
  border: 1px solid rgba(255, 255, 255, 0.5) !important;
  border-radius: 28px !important;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.15) !important;
  width: auto;
  max-width: 520px;
}

.glass-modal-header {
  background: transparent !important;
  border-bottom: 1px solid rgba(0,0,0,0.05) !important;
  padding: 1.5rem !important;
}

.glass-modal-title {
  font-weight: 1000 !important;
  font-size: 1.4rem !important;
  color: var(--text-primary) !important;
  letter-spacing: -0.02em;
}

.glass-modal-body {
  background: transparent !important;
  padding: 1.5rem !important;
}

.glass-modal-footer {
  background: transparent !important;
  border-top: 1px solid rgba(0,0,0,0.05) !important;
  padding: 1.2rem 1.5rem !important;
  justify-content: flex-end !important;
  gap: 0.75rem;
}

.summary-header-box {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  padding: 1rem;
  border-radius: 18px;
}

.header-icon-box {
  width: 42px;
  height: 42px;
  background: var(--c-primary-alpha);
  color: var(--c-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 1.2rem;
}

.section-title-premium {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 950;
  color: var(--c-primary);
  border-bottom: 2px solid var(--c-primary-alpha);
  display: inline-block;
  padding-bottom: 2px;
}

.section-title-premium--danger {
  color: var(--c-danger);
  border-bottom-color: var(--c-danger-alpha);
}

.total-ventas-hero {
  background: linear-gradient(135deg, var(--c-primary), #7957d5);
  padding: 1.25rem;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  color: white;
  box-shadow: 0 10px 20px var(--c-primary-alpha);
}

.hero-label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  opacity: 0.9;
}

.hero-val {
  font-size: 2rem;
  font-weight: 1000;
  letter-spacing: -0.03em;
}

.closure-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.closure-stat-card {
  background: var(--surface-overlay);
  border: 1px solid var(--border);
  padding: 0.75rem;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
}

.closure-stat-label {
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
}

.closure-stat-val {
  font-size: 1rem;
  font-weight: 900;
  color: var(--text-primary);
}

.merma-summary-box {
  background: rgba(241, 70, 104, 0.05);
  border: 1px dashed var(--c-danger-alpha);
  padding: 1rem;
  border-radius: 18px;
}

.reason-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.reason-pill {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.reason-label { font-size: 0.7rem; font-weight: 700; color: var(--text-secondary); }
.reason-qty { background: var(--c-danger); color: white; font-size: 0.65rem; font-weight: 900; padding: 1px 6px; border-radius: 999px; }

.alert-box {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  padding: 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
}

.uppercase-label {
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 900;
  font-size: 0.7rem !important;
  color: var(--text-muted);
}

.text-danger { color: #f14668 !important; }
</style>
