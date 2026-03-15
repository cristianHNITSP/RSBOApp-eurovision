<template>
  <teleport to="body">
    <b-modal
      v-model="lab.correctionOpen.value"
      has-modal-card
      trap-focus
      :destroy-on-hide="true"
      aria-role="dialog"
      aria-modal
    >
      <div class="modal-card" style="max-width: 480px; width: 100%;">
        <header class="modal-card-head" style="background: rgba(254, 243, 199, 0.9);">
          <p class="modal-card-title" style="color: rgba(120, 53, 15, 0.9);">
            <i class="fas fa-exclamation-triangle mr-2" style="color: #f59e0b;"></i>
            Solicitar corrección
          </p>
          <button class="delete" aria-label="close" @click="lab.correctionOpen.value = false"></button>
        </header>

        <section class="modal-card-body">
          <!-- Info notice -->
          <div class="correction-notice mb-3">
            <i class="fas fa-info-circle mr-2"></i>
            Esta solicitud queda registrada en DB y notifica al equipo de laboratorio.
          </div>

          <b-field label="Pedido a corregir" class="mb-3">
            <b-select v-model="lab.correction.orderId" expanded>
              <option value="" disabled>— Selecciona un pedido —</option>
              <option v-for="o in lab.ordersDB.value" :key="o.id" :value="o.id">
                {{ o.folio }} · {{ o.cliente }} · {{ lab.statusHuman(o.status) }}
              </option>
            </b-select>
          </b-field>

          <b-field label="Código de barras (opcional)" class="mb-3">
            <b-input
              v-model="lab.correction.codebar"
              placeholder="Ej: 2790000000011"
              icon="barcode"
            />
          </b-field>

          <b-field
            label="Descripción del problema"
            class="mb-2"
            :message="messageHint"
            :type="messageType"
          >
            <b-input
              v-model="lab.correction.message"
              type="textarea"
              placeholder="Describe el problema con detalle para que el equipo pueda corregirlo…"
              maxlength="600"
              rows="4"
            />
          </b-field>
        </section>

        <footer class="modal-card-foot">
          <b-button
            @click="lab.correctionOpen.value = false"
            :disabled="lab.loadingSubmitCorrection.value"
          >
            Cancelar
          </b-button>
          <b-button
            type="is-warning"
            icon-left="paper-plane"
            :disabled="!canSend"
            :loading="lab.loadingSubmitCorrection.value"
            @click="lab.submitCorrection"
          >
            Enviar corrección
          </b-button>
        </footer>
      </div>
    </b-modal>
  </teleport>
</template>

<script setup>
import { inject, computed } from "vue";

const lab = inject("lab");
if (!lab) throw new Error("CorrectionModal necesita provide('lab', ...)");

const canSend = computed(() => {
  const msg = String(lab.correction.message || "").trim();
  const orderId = lab.correction.orderId || lab.selectedOrderId?.value;
  return !!orderId && msg.length >= 3;
});

const messageHint = computed(() => {
  const len = String(lab.correction.message || "").trim().length;
  if (len === 0) return "Mínimo 3 caracteres.";
  if (len < 3) return `Faltan ${3 - len} caracteres más.`;
  return `${len}/600 caracteres.`;
});

const messageType = computed(() => {
  const len = String(lab.correction.message || "").trim().length;
  if (len === 0) return "";
  if (len < 3) return "is-warning";
  return "is-success";
});
</script>

<style scoped>
.correction-notice {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  padding: 0.6rem 0.75rem;
  background: var(--c-info-alpha);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--c-info);
}

.correction-notice i {
  margin-top: 1px;
  flex-shrink: 0;
}
</style>