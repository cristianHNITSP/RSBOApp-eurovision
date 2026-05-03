<template>
  <teleport to="body">
    <b-modal
      v-model="localIsOpen"
      has-modal-card
      trap-focus
      :destroy-on-hide="true"
      animation="zoom-in"
      :width="800"
    >
      <div class="modal-card bo-detail-modal">
        <header class="modal-card-head bo-modal-head">
          <div class="bo-modal-head__icon">
            <i class="fas fa-clipboard-list"></i>
          </div>
          <div class="bo-modal-head__title">
            <p class="modal-card-title">Encargo: {{ backorder?.folio || 'Cargando...' }}</p>
            <p class="bo-modal-head__sub">{{ categoryLabel }}</p>
          </div>
          <button type="button" class="delete" @click="closeModal"></button>
        </header>

        <section class="modal-card-body bo-modal-body">
          <div v-if="isLoading" class="bo-loader">
            <div class="spinner"></div>
            <p>Obteniendo detalles del cristal...</p>
          </div>

          <div v-else-if="backorder" class="bo-content animate-fade-in">
            <!-- TOP SUMMARY HERO -->
            <div class="bo-summary-hero">
              <div class="bo-summary-hero__left">
                <StatusBadge :status="backorder.status" class="mb-2" />
                <h3 class="bo-client-name">{{ backorder.cliente.nombre }}</h3>
                <p class="bo-client-contact">
                  <i class="fas fa-phone mr-1"></i> {{ backorder.cliente.telefono || 'Sin teléfono' }}
                  <span class="mx-2">|</span>
                  <i class="fas fa-envelope mr-1"></i> {{ backorder.cliente.email || 'Sin email' }}
                </p>
              </div>
              <div class="bo-summary-hero__right">
                <div class="bo-balance-card" :class="{ 'is-paid': backorder.saldoPendiente <= 0 }">
                  <p class="bo-balance-card__label">Saldo Pendiente</p>
                  <p class="bo-balance-card__value">{{ formatCurrency(backorder.saldoPendiente) }}</p>
                </div>
              </div>
            </div>

            <div class="columns is-multiline">
              <!-- DETALLES TÉCNICOS -->
              <div class="column is-7">
                <div class="bo-glass-box">
                  <h4 class="bo-box-title"><i class="fas fa-microscope mr-2"></i> Especificaciones del Item</h4>
                  <div class="bo-item-specs">
                    <div v-for="(val, key) in displaySpecs" :key="key" class="bo-spec-row">
                      <span class="bo-spec-key">{{ formatKey(key) }}</span>
                      <span class="bo-spec-val">{{ val }}</span>
                    </div>
                  </div>
                  <div v-if="backorder.item.observaciones" class="bo-box-note mt-3">
                    <strong>Observaciones:</strong> {{ backorder.item.observaciones }}
                  </div>
                </div>
              </div>

              <!-- FINANZAS -->
              <div class="column is-5">
                <div class="bo-glass-box">
                  <h4 class="bo-box-title"><i class="fas fa-wallet mr-2"></i> Resumen Financiero</h4>
                  <div class="bo-fin-row">
                    <span>Precio Estimado</span>
                    <strong>{{ formatCurrency(backorder.precioEstimado) }}</strong>
                  </div>
                  <div class="bo-fin-row">
                    <span>Precio Final</span>
                    <strong>{{ backorder.precioFinal ? formatCurrency(backorder.precioFinal) : '-' }}</strong>
                  </div>
                  <div class="bo-fin-row is-total">
                    <span>Total Pagado</span>
                    <strong class="has-text-success">{{ formatCurrency(backorder.totalPagado) }}</strong>
                  </div>
                </div>
              </div>

              <!-- ACCIONES DE ESTADO -->
              <div v-if="nextStates.length > 0" class="column is-12">
                <div class="bo-glass-box bo-actions-box">
                  <h4 class="bo-box-title">Próximo paso en el flujo</h4>
                  <div class="buttons">
                    <button
                      v-for="state in nextStates"
                      :key="state"
                      @click="handleTransition(state)"
                      class="button bo-action-btn"
                      :class="state === 'CANCELADO' ? 'is-ghost' : 'is-primary'"
                      :loading="isTransitioning"
                    >
                      {{ stateLabel(state) }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- PAGOS -->
              <div class="column is-12">
                <div class="bo-glass-box">
                  <div class="level is-mobile mb-4">
                    <div class="level-left">
                      <h4 class="bo-box-title mb-0"><i class="fas fa-history mr-2"></i> Historial de Pagos</h4>
                    </div>
                    <div class="level-right">
                      <button class="button is-small is-primary is-rounded" @click="showPaymentForm = !showPaymentForm">
                        <i class="fas" :class="showPaymentForm ? 'fa-times' : 'fa-plus'"></i>
                        <span class="ml-2">{{ showPaymentForm ? 'Cerrar' : 'Nuevo Pago' }}</span>
                      </button>
                    </div>
                  </div>

                  <div v-if="showPaymentForm" class="bo-payment-form-container animate-slide-down mb-4">
                    <PaymentAddForm
                      :bo-id="backorder._id"
                      :category="backorder.category"
                      @submit="handleAddPayment"
                      @cancel="showPaymentForm = false"
                    />
                  </div>

                  <div v-if="backorder.pagos?.length > 0" class="bo-payments-list">
                    <div v-for="pago in backorder.pagos" :key="pago._id" class="bo-payment-item">
                      <div class="bo-payment-item__info">
                        <p class="bo-p-type">{{ pago.tipo }} <small>via {{ pago.metodoPago }}</small></p>
                        <p class="bo-p-date">{{ formatDate(pago.fecha) }}</p>
                      </div>
                      <div class="bo-payment-item__amount">
                        {{ formatCurrency(pago.monto) }}
                      </div>
                    </div>
                  </div>
                  <div v-else class="has-text-centered has-text-grey py-4">
                    No hay pagos registrados aún.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="error" class="notification is-danger m-4">
            <i class="fas fa-exclamation-triangle mr-2"></i> {{ error }}
          </div>
        </section>

        <footer class="modal-card-foot bo-modal-foot">
          <button class="button is-ghost" @click="closeModal">Cerrar</button>
        </footer>
      </div>
    </b-modal>
  </teleport>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import StatusBadge from "./StatusBadge.vue";
import PaymentAddForm from "./PaymentAddForm.vue";
import { useBackOrders } from "../../composables/api/useBackOrders";
import { useDashboardStats } from "../../composables/api/useDashboardStats";
import { labToast } from "../../composables/shared/useLabToast";

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  boId: { type: String, default: null },
  category: { type: String, default: null },
});

const emit = defineEmits(["update:isOpen", "close", "refresh"]);

const localIsOpen = computed({
  get: () => props.isOpen,
  set: (v) => emit("update:isOpen", v)
});

const { getById, changeStatus, addPayment } = useBackOrders();
const { role } = useDashboardStats();

const backorder = ref(null);
const isLoading = ref(false);
const error = ref("");
const isTransitioning = ref(false);
const showPaymentForm = ref(false);

const NEXT_STATES = {
  SOLICITADO: ["PEDIDO_PROVEEDOR", "CANCELADO"],
  PEDIDO_PROVEEDOR: ["RECIBIDO", "CANCELADO"],
  RECIBIDO: ["LISTO_ENTREGA", "CANCELADO"],
  LISTO_ENTREGA: ["ENTREGADO", "CANCELADO"],
};

const STATE_LABELS = {
  PEDIDO_PROVEEDOR: "Pedido al Proveedor",
  RECIBIDO: "Recibido en Lab",
  LISTO_ENTREGA: "Listo para Entrega",
  ENTREGADO: "Entregado al Cliente",
  CANCELADO: "Anular Encargo",
};

const categoryLabel = computed(() => {
  const map = {
    BASES_MICAS: "Bases y Micas",
    LENTES_CONTACTO: "Lentes de Contacto",
    OPTICA: "Óptica",
  };
  return map[backorder.value?.category] || backorder.value?.category;
});

const displaySpecs = computed(() => {
  if (!backorder.value?.item) return {};
  const { observaciones, ...specs } = backorder.value.item;
  return specs;
});

const nextStates = computed(() => {
  const states = NEXT_STATES[backorder.value?.status] || [];
  const userRole = String(role.value).toLowerCase();
  const canTransition = ["root", "eurovision", "supervisor", "ventas"].includes(userRole);

  if (!canTransition) return [];
  return states;
});

function stateLabel(state) {
  return STATE_LABELS[state] || state;
}

function formatKey(key) {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount || 0);
}

function formatDate(date) {
  return new Date(date).toLocaleString("es-MX", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

async function loadDetails() {
  if (!props.boId || !props.category) return;
  isLoading.value = true;
  error.value = "";
  try {
    backorder.value = await getById(props.boId, props.category);
  } catch (err) {
    error.value = "No se pudo cargar el detalle del encargo.";
    console.error(err);
  } finally {
    isLoading.value = false;
  }
}

async function handleTransition(newState) {
  isTransitioning.value = true;
  try {
    await changeStatus(backorder.value._id, newState, backorder.value.category);
    labToast.success(`Estado actualizado a ${stateLabel(newState)}`);
    await loadDetails();
    emit("refresh");
  } catch (err) {
    labToast.danger("Error al cambiar de estado");
  } finally {
    isTransitioning.value = false;
  }
}

async function handleAddPayment(paymentData) {
  try {
    await addPayment(backorder.value._id, paymentData, backorder.value.category);
    labToast.success("Pago registrado correctamente");
    showPaymentForm.value = false;
    await loadDetails();
    emit("refresh");
  } catch (err) {
    labToast.danger("No se pudo registrar el pago");
  }
}

function closeModal() {
  backorder.value = null;
  showPaymentForm.value = false;
  localIsOpen.value = false;
  emit("close");
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) loadDetails();
});
</script>

<style scoped>
.bo-detail-modal {
  border-radius: var(--radius-xl, 24px);
  overflow: hidden;
  border: 1px solid var(--border);
}

.bo-modal-head {
  background: var(--surface-overlay);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.bo-modal-head__icon {
  width: 42px;
  height: 42px;
  background: var(--c-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 1.25rem;
  box-shadow: var(--shadow-primary);
}

.bo-modal-head__sub {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.bo-modal-body {
  background: var(--bg-subtle, #f8fafc);
  padding: 1.5rem;
}

/* SUMMARY HERO */
.bo-summary-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  background: white;
  padding: 1.5rem;
  border-radius: 18px;
  border: 1px solid var(--border);
}

.bo-client-name {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.1;
}

.bo-client-contact {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 0.5rem;
}

.bo-balance-card {
  text-align: right;
  padding-left: 1.5rem;
  border-left: 2px solid var(--border);
}

.bo-balance-card__label {
  font-size: 0.7rem;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--text-muted);
}

.bo-balance-card__value {
  font-size: 1.5rem;
  font-weight: 900;
  color: var(--c-danger, #ef4444);
}

.bo-balance-card.is-paid .bo-balance-card__value {
  color: var(--c-success, #10b981);
}

/* GLASS BOX */
.bo-glass-box {
  background: white;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.25rem;
  height: 100%;
}

.bo-box-title {
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
}

.bo-spec-row, .bo-fin-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  font-size: 0.9rem;
}

.bo-spec-key { color: var(--text-secondary); }
.bo-spec-val { font-weight: 600; color: var(--text-primary); }

.bo-fin-row.is-total {
  border-top: 2px solid var(--border);
  border-bottom: none;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  font-size: 1.1rem;
}

/* ACTIONS */
.bo-actions-box {
  background: var(--c-primary-alpha);
  border-color: var(--c-primary);
}

.bo-action-btn {
  border-radius: 999px;
  font-weight: 700;
}

/* PAYMENTS */
.bo-payment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgba(148, 163, 184, 0.05);
  border-radius: 10px;
  margin-bottom: 0.5rem;
}

.bo-p-type { font-weight: 700; font-size: 0.9rem; }
.bo-p-date { font-size: 0.75rem; color: var(--text-muted); }
.bo-p-amount { font-weight: 800; color: var(--text-primary); }

.bo-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.bo-modal-foot {
  justify-content: flex-end;
  background: white;
  border-top: 1px solid var(--border);
}

.animate-fade-in { animation: fadeIn 0.4s ease-out; }
.animate-slide-down { animation: slideDown 0.3s ease-out; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

[data-theme="dark"] .bo-summary-hero,
[data-theme="dark"] .bo-glass-box,
[data-theme="dark"] .bo-modal-body,
[data-theme="dark"] .bo-modal-foot {
  background: #1e293b;
}
</style>
