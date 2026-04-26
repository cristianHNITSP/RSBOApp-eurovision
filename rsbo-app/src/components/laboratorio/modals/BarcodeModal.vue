<template>
  <teleport to="body">
    <b-modal
      v-model="lab.barcodeOpen.value"
      has-modal-card
      trap-focus
      :destroy-on-hide="true"
      aria-role="dialog"
      aria-modal
    >
      <div class="modal-card" style="max-width: 420px; width: 100%;">
        <header class="modal-card-head">
          <p class="modal-card-title">
            <i class="fas fa-barcode mr-2" style="color: var(--c-primary)"></i>
            Código de barras
          </p>
          <button class="delete" aria-label="close" @click="lab.barcodeOpen.value = false"></button>
        </header>

        <section class="modal-card-body">
          <div class="barcode-modal">
            <!-- Code display -->
            <div class="barcode-modal__code mono">
              {{ lab.barcodeValue.value || "—" }}
            </div>

            <!-- EAN-13 validity badge -->
            <div class="barcode-modal__validity mb-3">
              <span
                v-if="lab.barcodeValue.value && lab.isEan13(lab.barcodeValue.value)"
                class="tag is-success is-light"
              >
                <i class="fas fa-check-circle mr-1"></i>
                EAN-13 válido
              </span>
              <span v-else-if="lab.barcodeValue.value" class="tag is-warning is-light">
                <i class="fas fa-exclamation-circle mr-1"></i>
                No es EAN-13 válido
              </span>
            </div>

            <!-- Barcode image -->
            <div class="barcode-modal__img">
              <BarcodeEAN13
                v-if="lab.barcodeValue.value && lab.isEan13(lab.barcodeValue.value)"
                :value="lab.barcodeValue.value"
                :scale="3"
                :height="120"
              />
              <div v-else class="barcode-fallback">
                <i class="fas fa-exclamation-circle mr-2"></i>
                Código inválido para EAN-13
              </div>
            </div>

            <!-- Copy feedback -->
            <transition name="fade-slide">
              <div v-if="copied" class="copy-feedback">
                <i class="fas fa-check-circle mr-2"></i>
                ¡Copiado al portapapeles!
              </div>
            </transition>

            <!-- Actions -->
            <div class="columns is-mobile is-variable is-2 mt-3">
              <div class="column">
                <b-button
                  :type="copied ? 'is-success' : 'is-primary'"
                  expanded
                  :icon-left="copied ? 'check' : 'copy'"
                  :disabled="!lab.barcodeValue.value"
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
                  :disabled="!lab.barcodeValue.value"
                  @click="lab.printBarcode(lab.barcodeValue.value)"
                >
                  Imprimir / PDF
                </b-button>
              </div>
            </div>
          </div>
        </section>

        <footer class="modal-card-foot">
          <b-button @click="lab.barcodeOpen.value = false">Cerrar</b-button>
        </footer>
      </div>
    </b-modal>
  </teleport>
</template>

<script setup>
import { inject, ref } from "vue";
import BarcodeEAN13 from "../barcode/BarcodeEAN13.vue";
import "./BarcodeModal.css";

const lab = inject("lab");
if (!lab) throw new Error("BarcodeModal necesita provide('lab', ...)");

const copied = ref(false);

async function handleCopy() {
  if (!lab.barcodeValue.value) return;
  await lab.copyCodebar(lab.barcodeValue.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2500);
}
</script>