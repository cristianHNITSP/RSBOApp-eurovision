<template>
  <form @submit.prevent="handleSubmit" class="payment-glass-form">
    <div class="pg-grid">
      <div class="field">
        <label class="pg-label">Monto</label>
        <div class="control has-icons-left">
          <input
            v-model.number="form.monto"
            type="number"
            step="0.01"
            min="0"
            class="pg-input"
            required
            placeholder="0.00"
          />
          <span class="icon is-small is-left">
            <i class="fas fa-dollar-sign"></i>
          </span>
        </div>
      </div>

      <div class="field">
        <label class="pg-label">Método de Pago</label>
        <div class="control">
          <div class="pg-select-wrapper">
            <select v-model="form.metodoPago" class="pg-select" required>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
        </div>
      </div>

      <div class="field">
        <label class="pg-label">Tipo de Pago</label>
        <div class="control">
          <div class="pg-select-wrapper">
            <select v-model="form.tipo" class="pg-select" required>
              <option value="ANTICIPO">Anticipo</option>
              <option value="ABONO">Abono</option>
              <option value="PAGO_COMPLETO">Pago Completo</option>
              <option value="PAGO_FINAL">Pago Final</option>
              <option value="REEMBOLSO">Reembolso</option>
            </select>
          </div>
        </div>
      </div>

      <div class="field">
        <label class="pg-label">Referencia</label>
        <div class="control">
          <input
            v-model="form.referencia"
            type="text"
            class="pg-input"
            placeholder="Nº trans / Aut."
          />
        </div>
      </div>
    </div>

    <div class="field mt-4">
      <label class="pg-label">Notas</label>
      <div class="control">
        <textarea
          v-model="form.notas"
          class="pg-input pg-textarea"
          rows="2"
          placeholder="Notas adicionales del pago..."
        ></textarea>
      </div>
    </div>

    <div class="pg-actions mt-5">
      <button type="submit" class="button pg-btn-primary" :class="{ 'is-loading': isSubmitting }">
        <i class="fas fa-plus-circle mr-2"></i> Registrar Pago
      </button>
      <button type="button" class="button pg-btn-ghost" @click="$emit('cancel')">
        Cancelar
      </button>
    </div>

    <transition name="fade">
      <div v-if="error" class="pg-error mt-3">
        <i class="fas fa-exclamation-circle mr-2"></i> {{ error }}
      </div>
    </transition>
  </form>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  boId: { type: String, required: true },
  category: { type: String, required: true },
});

const emit = defineEmits(["submit", "cancel"]);

const form = ref({
  monto: null,
  metodoPago: "EFECTIVO",
  tipo: "ANTICIPO",
  referencia: "",
  notas: "",
});

const isSubmitting = ref(false);
const error = ref("");

async function handleSubmit() {
  if (!form.value.monto || form.value.monto <= 0) {
    error.value = "El monto debe ser mayor a 0";
    return;
  }

  isSubmitting.value = true;
  error.value = "";

  try {
    // El padre se encarga de la API
    await emit("submit", { ...form.value });
    
    // Reset solo si el padre confirma éxito (opcional, aquí lo hacemos directo)
    form.value = {
      monto: null,
      metodoPago: "EFECTIVO",
      tipo: "ANTICIPO",
      referencia: "",
      notas: "",
    };
  } catch (err) {
    error.value = err.message || "Error al procesar el pago";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.payment-glass-form {
  background: var(--surface-overlay);
  backdrop-filter: blur(8px);
  padding: 1.5rem;
  border-radius: var(--radius-lg, 16px);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}

.pg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.pg-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.pg-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  font-size: 0.9rem;
  color: var(--text-primary);
  transition: all 0.2s;
}

.pg-input:focus {
  outline: none;
  border-color: var(--c-primary);
  background: #fff;
  box-shadow: 0 0 0 3px var(--c-primary-alpha);
}

.pg-textarea {
  resize: none;
}

.pg-select-wrapper {
  position: relative;
}

.pg-select {
  width: 100%;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  appearance: none;
  font-size: 0.9rem;
  cursor: pointer;
}

.pg-actions {
  display: flex;
  gap: 0.75rem;
}

.pg-btn-primary {
  background: var(--c-primary);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1.25rem;
  font-weight: 600;
  transition: transform 0.2s;
}

.pg-btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-primary);
}

.pg-btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

.pg-error {
  background: var(--c-danger-alpha);
  color: var(--c-danger);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
}

[data-theme="dark"] .pg-input,
[data-theme="dark"] .pg-select {
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
}
</style>
