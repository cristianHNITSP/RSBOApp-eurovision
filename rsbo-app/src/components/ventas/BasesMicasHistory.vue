<template>
  <div class="panel">
    <div class="panel__head">
      <div>
        <h2 class="panel__title">Historial de Pedidos</h2>
        <p class="panel__hint">Pedidos enviados al laboratorio (últimos 200).</p>
      </div>
      <div class="panel__headActions">
        <b-button
          type="is-light"
          icon-left="satellite-dish"
          size="is-small"
          :loading="loadingLabStatuses"
          @click="$emit('refresh-statuses')"
        >
          Verificar estados
        </b-button>
        <b-button
          type="is-light"
          icon-left="sync"
          size="is-small"
          @click="$emit('refresh-history')"
        >
          Recargar
        </b-button>
      </div>
    </div>

    <div class="panel__body">
      <div v-if="!history.length" class="empty">
        <i class="fas fa-history empty__icon"></i>
        <p class="empty__title">Sin historial</p>
        <p class="empty__text">Los pedidos enviados al laboratorio aparecerán aquí.</p>
      </div>

      <div v-else class="order-lines">
        <div
          v-for="sale in history"
          :key="sale.id"
          class="order-line order-line--history"
          @click="$emit('select-order', sale)"
        >
          <div class="order-line__top">
            <div>
              <div class="order-line__title">{{ sale.cliente }}</div>
              <span class="order-line__sub">
                {{ fmtDate(sale.fecha) }} · {{ sale.totalPiezas }} pzas
              </span>
              <span v-if="sale.ventaFolio" class="order-line__sub mono muted">
                <i class="fas fa-receipt mr-1"></i>{{ sale.ventaFolio }}
              </span>
              <span v-if="sale.labFolio" class="order-line__sub mono muted">
                <i class="fas fa-flask mr-1"></i>{{ sale.labFolio }}
              </span>
            </div>
            <div class="is-flex is-flex-direction-column is-align-items-flex-end" style="gap:0.4rem">
              <b-tag
                v-if="sale.labOrderId && labStatuses[sale.labOrderId]"
                :type="`${labStatusClass(labStatuses[sale.labOrderId]?.status)} is-light`"
                class="lab-hist-badge"
              >
                <i class="fas fa-circle mr-1" style="font-size:0.55rem"></i>
                {{ labStatusHuman(labStatuses[sale.labOrderId]?.status) }}
              </b-tag>
              <b-tag v-else-if="sale.labOrderId" type="is-light" class="lab-hist-badge">
                <i class="fas fa-circle mr-1" style="font-size:0.55rem"></i>
                Pendiente
              </b-tag>
              <b-tag type="is-light" style="font-size:0.75rem">
                {{ sale.lineas?.length || 0 }} ítem(s)
              </b-tag>
              <i class="fas fa-chevron-right muted" style="font-size:0.8rem"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  history: { type: Array, default: () => [] },
  labStatuses: { type: Object, default: () => ({}) },
  loadingLabStatuses: { type: Boolean, default: false },
  fmtDate: { type: Function, required: true },
  labStatusClass: { type: Function, required: true },
  labStatusHuman: { type: Function, required: true }
});

defineEmits(["refresh-statuses", "refresh-history", "select-order"]);
</script>

<style src="./BasesMicasHistory.css" scoped></style>
