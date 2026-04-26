<template>
  <div class="columns is-multiline is-variable is-4">

    <!-- ── Lista de pedidos ── -->
    <div class="column is-7">
      <div class="panel">
        <div class="panel__head">
          <div>
            <h2 class="panel__title">
              <i class="fas fa-tools mr-2 icon--urgent"></i>
              Gestión de pedidos
            </h2>
            <p class="panel__hint">
              Edita, cancela o elimina cualquier pedido. Selecciona uno de la lista para gestionar.
            </p>
          </div>
          <b-button
            size="is-small"
            type="is-light"
            icon-left="sync"
            :loading="lab.loadingOrders.value"
            @click="lab.refreshAll"
          >
            Actualizar
          </b-button>
        </div>

        <div class="panel__body" style="padding: 0.75rem">
          <!-- Filtro -->
          <b-field class="mb-3">
            <b-select v-model="lab.orderStatusFilter.value" expanded size="is-small">
              <option value="open">Pendientes / En proceso</option>
              <option value="cerrado">Cerrados</option>
              <option value="cancelado">Cancelados</option>
              <option value="all">Todos</option>
            </b-select>
          </b-field>

          <div v-if="lab.loadingOrders.value" class="empty">
            <b-loading :is-full-page="false" :active="true" />
            <div class="spacer-lg"></div>
          </div>

          <div v-else-if="!lab.filteredOrders.value.length" class="empty">
            <i class="fas fa-check-circle empty__icon icon--entry"></i>
            <p class="empty__title">Sin pedidos</p>
            <p class="empty__text">No hay pedidos con el filtro actual.</p>
          </div>

          <CorrectionList
            v-else
            :orders="lab.filteredOrders.value"
            :selected-order-id="selectedOrderId"
            @select="selectOrder"
          />
        </div>
      </div>
    </div>

    <!-- ── Panel de gestión ── -->
    <div class="column is-5">
      <div class="panel panel--sticky">
        <div class="panel__head panel__head--compact">
          <div>
            <h3 class="panel__title mb-0">
              <i class="fas fa-edit mr-2"></i>
              Gestionar pedido
            </h3>
            <p class="panel__hint mt-1">Edita datos o cancela el pedido seleccionado.</p>
          </div>
        </div>

        <div class="panel__body">
          <div v-if="!selectedOrder" class="empty empty--mini">
            <i class="fas fa-hand-pointer empty__icon"></i>
            <p class="empty__title">Sin selección</p>
            <p class="empty__text">Haz click en un pedido de la lista para gestionarlo.</p>
          </div>

          <CorrectionDetail 
            v-else 
            :order="selectedOrder" 
            @confirm-cancel="confirmCancel(selectedOrder.id, selectedOrder.folio)" 
          />
        </div>
      </div>
    </div>

    <!-- Modal confirmación cancelar -->
    <CorrectionDeleteModal 
      v-model="showConfirm" 
      :folio="confirmFolio" 
      @confirm="executeCancel" 
    />

  </div>
</template>

<script setup>
import { inject, ref, computed } from "vue";
import CorrectionList from "./correcciones/CorrectionList.vue";
import CorrectionDetail from "./correcciones/CorrectionDetail.vue";
import CorrectionDeleteModal from "./correcciones/CorrectionDeleteModal.vue";
import "./laboratorio-shared.css";
import "./CorreccionesTab.css";

const lab = inject("lab");
if (!lab) throw new Error("CorreccionesTab necesita provide('lab', ...)");

// ── Selection ──
const selectedOrderId = ref("");

const selectedOrder = computed(() =>
  selectedOrderId.value
    ? lab.ordersDB.value.find((o) => o.id === selectedOrderId.value) || null
    : null
);

function selectOrder(id) {
  selectedOrderId.value = id;
  lab.loadOrderHistory(id);
}

// ── Cancel ──
const showConfirm  = ref(false);
const confirmFolio = ref("");
const confirmId    = ref("");

function confirmCancel(orderId, folio) {
  confirmId.value    = orderId;
  confirmFolio.value = folio || "—";
  showConfirm.value  = true;
}

async function executeCancel(motivo) {
  await lab.cancelOrderById(confirmId.value, motivo.trim());
  showConfirm.value = false;
  if (selectedOrderId.value === confirmId.value) {
    await lab.loadOrderHistory(confirmId.value);
    selectedOrderId.value = "";
  }
  confirmId.value = "";
}
</script>
