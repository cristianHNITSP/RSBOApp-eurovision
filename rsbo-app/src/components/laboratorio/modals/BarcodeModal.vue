<template>
    <teleport to="body">
        <b-modal v-model="lab.barcodeOpen.value" has-modal-card trap-focus :destroy-on-hide="true">
            <div class="modal-card">
                <header class="modal-card-head">
                    <p class="modal-card-title"><i class="fas fa-barcode mr-2"></i>Código de barras</p>
                    <button class="delete" aria-label="close" @click="lab.barcodeOpen.value = false"></button>
                </header>

                <section class="modal-card-body">
                    <div class="barcode-modal">
                        <div class="barcode-modal__code mono">{{ lab.barcodeValue.value || "—" }}</div>

                        <div class="barcode-modal__img">
                            <BarcodeEAN13 v-if="lab.barcodeValue.value && lab.isEan13(lab.barcodeValue.value)"
                                :value="lab.barcodeValue.value" :scale="3" :height="120" />
                            <div v-else class="barcode-fallback">
                                <i class="fas fa-exclamation-circle mr-1"></i>
                                Código inválido para EAN-13
                            </div>
                        </div>

                        <div class="columns is-mobile is-variable is-2 mt-3">
                            <div class="column">
                                <b-button type="is-primary" expanded icon-left="copy"
                                    :disabled="!lab.barcodeValue.value"
                                    @click="lab.copyCodebar(lab.barcodeValue.value)">
                                    Copiar
                                </b-button>
                            </div>
                            <div class="column">
                                <b-button type="is-light" expanded icon-left="print" @click="lab.noop">Imprimir
                                    (mock)</b-button>
                            </div>
                        </div>

                        <p class="help mt-2">Barcode SVG EAN-13 (mock).</p>
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
import { inject } from "vue";
import BarcodeEAN13 from "../barcode/BarcodeEAN13.vue";

const lab = inject("lab");
if (!lab) throw new Error("BarcodeModal necesita provide('lab', ...)");
</script>
