<template>
  <div class="panel">
    <div class="panel__head panel__head--compact">
      <div>
        <h3 class="panel__title mb-0">
          <i class="fas fa-clipboard-list mr-2"></i>
          Bandeja de pedidos
        </h3>
        <p class="panel__hint mt-1">Historial · entradas · salidas (DB).</p>
      </div>
      <div class="panel__headActions">
        <b-button
          size="is-small"
          type="is-light"
          icon-left="download"
          :loading="lab.loadingExportOrders.value"
          @click="lab.exportOrdersCsv"
        >
          Excel
        </b-button>
        <b-button
          v-if="!standalone"
          size="is-small"
          type="is-light"
          :icon-left="open ? 'chevron-up' : 'chevron-down'"
          @click="open = !open"
        >
          {{ open ? "Ocultar" : "Mostrar" }}
        </b-button>
      </div>
    </div>

    <b-collapse :open="standalone || open" animation="slide">
      <div class="panel__body">
        <OrderStatusTabs
          v-model="lab.orderStatusFilter.value"
          :counts="lab.orderCounts.value"
        />

        <b-field class="mb-3">
          <b-input
            v-model="lab.orderQuery.value"
            icon="search"
            placeholder="Folio, cliente, nota…"
            size="is-small"
            expanded
          />
        </b-field>

        <OrderCardsList
          :orders="lab.filteredOrders.value"
          :loading="lab.loadingOrders.value"
          :selectedId="lab.selectedOrderId.value"
          :total="lab.ordersDB.value.length"
          :filterLabel="activeFilterLabel"
          @select="lab.selectedOrderId.value = $event"
        />

        <hr class="soft-hr" />

        <DayEventsPanel
          :entryEvents="lab.entryEvents.value"
          :exitEvents="lab.exitEvents.value"
          :loading="lab.loadingEvents.value"
        />
      </div>
    </b-collapse>
  </div>
</template>

<script setup>
import { inject, ref, computed } from "vue";
import OrderStatusTabs from "./pendingOrders/OrderStatusTabs.vue";
import OrderCardsList from "./pendingOrders/OrderCardsList.vue";
import DayEventsPanel from "./pendingOrders/DayEventsPanel.vue";

const lab = inject("lab");
const props = defineProps({
  standalone: { type: Boolean, default: false },
});

const open = ref(!props.standalone ? false : true);

const activeFilterLabel = computed(() => {
  const labels = { open: "Abiertos", pendiente: "Pendiente", parcial: "Parcial", cerrado: "Cerrado", all: "Todos" };
  return labels[lab.orderStatusFilter.value] || "Todos";
});
</script>

<style scoped>
.soft-hr { margin: 1.5rem 0; opacity: 0.1; }
</style>