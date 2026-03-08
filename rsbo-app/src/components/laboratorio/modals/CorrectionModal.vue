<template>
  <teleport to="body">
    <b-modal v-model="lab.correctionOpen.value" has-modal-card trap-focus :destroy-on-hide="true">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title"><i class="fas fa-exclamation-triangle mr-2"></i>Solicitar corrección</p>
          <button class="delete" aria-label="close" @click="lab.correctionOpen.value = false"></button>
        </header>

        <section class="modal-card-body">
          <b-field label="Pedido">
            <b-select v-model="lab.correction.orderId" expanded>
              <option v-for="o in lab.ordersDB.value" :key="o.id" :value="o.id">
                {{ o.folio }} · {{ o.cliente }}
              </option>
            </b-select>
          </b-field>

          <b-field label="Código (opcional)">
            <b-input v-model="lab.correction.codebar" placeholder="279…" icon="barcode" />
          </b-field>

          <b-field label="Mensaje">
            <b-input v-model="lab.correction.message" type="textarea" placeholder="Describe el problema…"
              maxlength="600" rows="5" />
          </b-field>
        </section>

        <footer class="modal-card-foot">
          <b-button @click="lab.correctionOpen.value = false">Cancelar</b-button>
          <b-button type="is-danger" icon-left="paper-plane" :disabled="!canSend" @click="lab.submitCorrection">
            Enviar
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
</script>