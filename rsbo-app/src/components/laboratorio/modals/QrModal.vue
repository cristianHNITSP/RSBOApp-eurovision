<template>
  <teleport to="body">
    <b-modal
      v-model="lab.qrOpen.value"
      has-modal-card
      trap-focus
      :destroy-on-hide="true"
      aria-role="dialog"
      aria-modal
    >
      <div class="modal-card" style="max-width: 420px; width: 100%;">
        <header class="modal-card-head">
          <p class="modal-card-title">
            <i class="fas fa-qrcode mr-2" style="color: var(--c-primary)"></i>
            Código QR
          </p>
          <button class="delete" aria-label="close" @click="lab.qrOpen.value = false"></button>
        </header>

        <section class="modal-card-body">
          <div class="qr-modal">
            <!-- Valor del código -->
            <div class="qr-modal__code mono">
              {{ lab.qrValue.value || "—" }}
            </div>

            <!-- Imagen QR -->
            <div class="qr-modal__img">
              <QrCode v-if="lab.qrValue.value" :value="lab.qrValue.value" :size="160" />
              <div v-else class="has-text-grey">Sin código</div>
            </div>

            <!-- Feedback de copia -->
            <transition name="fade-slide">
              <div v-if="copied" class="copy-feedback">
                <i class="fas fa-check-circle mr-2"></i>
                ¡Copiado al portapapeles!
              </div>
            </transition>

            <!-- Acciones -->
            <div class="columns is-mobile is-variable is-2 mt-3">
              <div class="column">
                <b-button
                  :type="copied ? 'is-success' : 'is-primary'"
                  expanded
                  :icon-left="copied ? 'check' : 'copy'"
                  :disabled="!lab.qrValue.value"
                  @click="handleCopy"
                >
                  {{ copied ? "¡Copiado!" : "Copiar código" }}
                </b-button>
              </div>
              <div class="column">
                <b-button
                  type="is-light"
                  expanded
                  icon-left="print"
                  :disabled="!lab.qrValue.value"
                  @click="lab.printQr(lab.qrValue.value)"
                >
                  Imprimir / PDF
                </b-button>
              </div>
            </div>
          </div>
        </section>

        <footer class="modal-card-foot">
          <b-button @click="lab.qrOpen.value = false">Cerrar</b-button>
        </footer>
      </div>
    </b-modal>
  </teleport>
</template>

<script setup>
import { inject, ref } from "vue";
import QrCode from "../qr/QrCode.vue";
import "./QrModal.css";

const lab = inject("lab");
if (!lab) throw new Error("QrModal necesita provide('lab', ...)");

const copied = ref(false);

async function handleCopy() {
  if (!lab.qrValue.value) return;
  await lab.copyQr(lab.qrValue.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2500);
}
</script>
