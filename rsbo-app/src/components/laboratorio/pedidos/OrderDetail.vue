<template>
  <div class="panel mt-4" v-if="order">
    <div class="panel__head panel__head--compact">
      <div>
        <h3 class="panel__title mb-0">
          <i class="fas fa-qrcode mr-2"></i>
          Surtir pedido
        </h3>
        <p class="panel__hint mt-1">
          <b>{{ order.folio }}</b> ·
          {{ order.cliente }}
        </p>
      </div>
    </div>

    <div class="panel__body">
      <!-- Progress -->
      <div class="mini-order-head mb-3">
        <div class="progress-bar">
          <div class="progress-bar__fill" :style="{ width: lab.orderProgressPct(order) + '%' }" />
        </div>
        <div class="mini-order-sub mt-1 is-flex is-justify-content-space-between">
          <span>
            <b>{{ lab.orderPickedCount(order) }}</b>/
            <b>{{ lab.orderTotalCount(order) }}</b> surtidas
          </span>
          <span>{{ lab.orderProgressPct(order) }}%</span>
        </div>

        <div v-if="order.status === 'cerrado'" class="complete-badge complete-badge--closed mt-2">
          <i class="fas fa-lock mr-2"></i>
          Este pedido ha sido cerrado y no admite más cambios.
        </div>

        <div v-else-if="lab.isOrderComplete(order)" class="complete-badge mt-2">
          <i class="fas fa-check-circle mr-2"></i>
          ¡Pedido completado! Listo para cerrar.
        </div>

        <div class="columns is-mobile is-variable is-2 mt-2">
          <div class="column">
            <b-button type="is-light" expanded icon-left="download" size="is-small"
              @click="lab.exportOrderCsv(order)">Excel</b-button>
          </div>
          <div class="column">
            <b-button type="is-light" expanded icon-left="print" size="is-small"
              @click="lab.printOrder(order)">PDF</b-button>
          </div>
        </div>
      </div>

      <!-- Scanner -->
      <b-field :label="order.status === 'cerrado' ? 'Pedido cerrado' : 'Código (EAN-13)'" class="mb-2">
        <b-input
          ref="barcodeInput"
          v-model="lab.scanCode.value"
          :placeholder="order.status === 'cerrado' ? 'No se puede surtir un pedido cerrado' : 'Escanea o escribe el código…'"
          icon="barcode"
          :disabled="order.status === 'cerrado' || order.status === 'cancelado'"
          @keyup.enter="lab.scanAndDispatch"
        />
      </b-field>

      <div class="columns is-mobile is-variable is-2">
        <div class="column">
          <b-button
            type="is-primary"
            expanded
            icon-left="check"
            :loading="lab.loadingScan.value"
            :disabled="!lab.scanCode.value || !order || order.status === 'cerrado' || order.status === 'cancelado'"
            @click="lab.scanAndDispatch"
          >
            Marcar salida
          </b-button>
        </div>
        <div class="column is-narrow">
          <b-button
            type="is-light"
            icon-left="times"
            :disabled="!lab.scanCode.value"
            @click="lab.scanCode.value = ''"
          />
        </div>
      </div>

      <!-- Micas del pedido -->
      <div class="mt-3">
        <div class="micas-section-label">
          <i class="fas fa-glasses mr-2"></i>
          Micas del pedido
          <span class="micas-count">{{ order.lines?.length || 0 }}</span>
        </div>

        <div class="order-lines mt-2">
          <OrderLineItem 
            v-for="l in order.lines" 
            :key="l.id" 
            :line="l" 
            :order-sheet-id="order.sheetId" 
          />
        </div>

        <div class="mt-3">
          <b-button
            type="is-light"
            expanded
            icon-left="redo"
            :loading="lab.loadingReset.value"
            :disabled="!order || order.status === 'cerrado' || order.status === 'cancelado'"
            @click="$emit('ask-reset')"
          >
            Reiniciar surtido
          </b-button>

          <b-button
            class="mt-2"
            type="is-primary"
            expanded
            icon-left="lock"
            :disabled="!order || !lab.isOrderComplete(order) || order.status === 'cerrado'"
            :loading="lab.loadingCloseOrder.value"
            @click="$emit('ask-close')"
          >
            Cerrar pedido
          </b-button>

          <b-button
            class="mt-2"
            type="is-warning"
            expanded
            outlined
            icon-left="exclamation-triangle"
            :disabled="!order || order.status === 'cerrado' || order.status === 'cancelado'"
            @click="lab.correctionOpen.value = true"
          >
            Solicitar corrección
          </b-button>

          <b-button
            class="mt-2"
            type="is-light"
            expanded
            icon-left="tools"
            @click="lab.activeMainTab.value = 'correcciones'"
          >
            Gestionar / editar pedido
          </b-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject, ref, watch, nextTick } from "vue";
import OrderLineItem from "./OrderLineItem.vue";
import "./OrderDetail.css";

const props = defineProps({
  order: { type: Object, default: null }
});

const emit = defineEmits(["ask-reset", "ask-close"]);

const lab = inject("lab");
if (!lab) throw new Error("OrderDetail necesita provide('lab', ...)");

const barcodeInput = ref(null);

// Escenario A: Auto-enviar si se detecta un EAN-13 válido (soluciona escáneres sin tecla Enter)
watch(() => lab.scanCode.value, (newVal) => {
  if (lab.isEan13(newVal) && props.order?.status !== "cerrado" && props.order?.status !== "cancelado") {
    lab.scanAndDispatch();
  }
});

// Escenario B: Recuperar el foco automáticamente después de procesar un escaneo
watch(() => lab.loadingScan.value, (loading) => {
  if (!loading) {
    nextTick(() => {
      barcodeInput.value?.focus();
    });
  }
});
</script>
