<template>
  <BasesMicasHero
    :sheets-count="sheetsDB.length"
    :filtered-count="filteredItems.length"
    :cart-count="cartItems.length"
    :loading-sheets="loadingSheets"
    :loading-items="loadingItems"
    @refresh="loadItems"
  />

  <section class="view-main">
    <!-- ── Main glass ─────────────────────────────────────────────────────── -->

    <div class="glass">
      <DynamicTabs v-model="activeTab" :tabs="BM_TABS">
        <template #venta>
          <div class="columns is-multiline is-variable is-4">
            <!-- Catálogo de productos -->
            <div class="column is-8">
              <BasesMicasCatalog
                :filtered-items-length="filteredItems.length"
                :sheets-d-b="sheetsDB"
                :selected-sheet-id="selectedSheetId"
                :loading-sheets="loadingSheets"
                :item-query="itemQuery"
                :stock-filter="stockFilter"
                :loading-items="loadingItems"
                :paginated-items="paginatedItems"
                :catalog-page="catalogPage"
                :catalog-pages="catalogPages"
                :catalog-page-size="catalogPageSize"
                :selected-sheet="selectedSheet"
                :sheet-title="sheetTitle"
                :build-row-title="buildRowTitle"
                :sheet-search-loading="sheetSearchLoading"
                :sheet-search-results="sheetSearchResults"
                :search-sheets="searchSheets"
                @update:selectedSheetId="selectedSheetId = $event"
                @update:itemQuery="itemQuery = $event"
                @update:stockFilter="stockFilter = $event"
                @update:catalogPage="catalogPage = $event"
                @add-to-cart="addToCart"
              />
            </div>

            <!-- Carrito -->
            <div class="column is-4">
              <BasesMicasCart
                :cart-items="cartItems"
                v-model:cartCliente="cartCliente"
                v-model:cartNote="cartNote"
                v-model:cartClienteNombres="cartClienteNombres"
                v-model:cartClienteApellidos="cartClienteApellidos"
                v-model:cartClienteEmpresa="cartClienteEmpresa"
                v-model:cartClienteContacto="cartClienteContacto"
                v-model:cartPago="cartPago"
                :cliente-suggestions="clienteSuggestions"
                :cart-total="cartTotal"
                :cart-total-monto="cartTotalMonto"
                :loading-sale="loadingSale"
                @select-cliente="selectCliente"
                @ask-clear-cart="askClearCart"
                @remove-from-cart="removeFromCart"
                @dec-cart-qty="decCartQty"
                @inc-cart-qty="incCartQty"
                @ask-send-to-lab="askSendToLab"
              />
            </div>
          </div>
        </template>

        <template #historial>
          <BasesMicasHistory
            :history="salesHistory"
            :lab-statuses="labStatuses"
            :loading-lab-statuses="loadingLabStatuses"
            :fmt-date="fmtDate"
            :lab-status-class="labStatusClass"
            :lab-status-human="labStatusHuman"
            @refresh-statuses="loadLabStatuses"
            @refresh-history="loadHistory"
            @select-order="val => { lastVoucher = val; voucherOpen = true }"
          />
        </template>
      </DynamicTabs>
    </div>

    <!-- ── Voucher modal ───────────────────────────────────────────────────── -->

    <teleport to="body">
      <b-modal v-model="voucherOpen" :width="560" scroll="keep">
        <BasesMicasVoucher
          :order="lastVoucher"
          :lab-statuses="labStatuses"
          :fmt-date-short="fmtDateShort"
          :lab-status-human="labStatusHuman"
          @close="voucherOpen = false"
          @print="printVoucher"
          @check-status="checkVoucherStatus"
        />
      </b-modal>
    </teleport>

  <!-- Confirmar: Enviar a laboratorio -->
  <teleport to="body">
    <b-modal v-model="confirmLabOpen" has-modal-card :width="420" trap-focus scroll="keep">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">
            <i class="fas fa-flask mr-2"></i>Confirmar envío al laboratorio
          </p>
        </header>
        <section class="modal-card-body">
          <p>
            ¿Enviar <strong>{{ cartTotal }}</strong> pieza(s) para
            <strong>{{ cartCliente }}</strong> al laboratorio?
          </p>
          <p class="mt-2" style="font-size:0.85rem;color:var(--text-muted)">
            Se creará un pedido y se descontará del inventario.
          </p>
        </section>
        <footer class="modal-card-foot" style="gap:0.5rem">
          <b-button type="is-primary" icon-left="flask" @click="doSendToLab">Confirmar envío</b-button>
          <b-button @click="confirmLabOpen = false">Cancelar</b-button>
        </footer>
      </div>
    </b-modal>
  </teleport>

  <!-- Confirmar: Limpiar carrito -->
  <teleport to="body">
    <b-modal v-model="confirmClearOpen" has-modal-card :width="400" trap-focus scroll="keep">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">
            <i class="fas fa-trash mr-2"></i>Limpiar carrito
          </p>
        </header>
        <section class="modal-card-body">
          <p>¿Eliminar los <strong>{{ cartItems.length }}</strong> artículo(s) del carrito y borrar los datos del cliente?</p>
        </section>
        <footer class="modal-card-foot" style="gap: 0.5rem">
          <b-button type="is-danger" icon-left="trash" @click="doClearCart">Limpiar</b-button>
          <b-button @click="confirmClearOpen = false">Cancelar</b-button>
        </footer>
      </div>
    </b-modal>
  </teleport>
  </section>
</template>



<script setup>
import { ref, provide } from "vue";
import BasesMicasHero from "@/components/ventas/BasesMicasHero.vue";
import BasesMicasCatalog from "@/components/ventas/BasesMicasCatalog.vue";
import BasesMicasCart from "@/components/ventas/BasesMicasCart.vue";
import BasesMicasHistory from "@/components/ventas/BasesMicasHistory.vue";
import BasesMicasVoucher from "@/components/ventas/BasesMicasVoucher.vue";
import DynamicTabs from "@/components/DynamicTabs.vue";
import {
  useBasesMicasVentas,
  fmtDate,
  fmtDateShort,
  labStatusHuman,
  labStatusClass
} from "@/composables/api/useBasesMicasVentas.js";

const props = defineProps({
  user:    { type: Object,  required: false, default: null },
  loading: { type: Boolean, required: false, default: false },
});

const lab = useBasesMicasVentas(() => props.user);
provide("lab", lab);

const {
  sheetsDB, salesHistory,
  activeTab,
  selectedSheetId,
  itemQuery, stockFilter,
  catalogPage, catalogPageSize,
  cartItems, cartCliente, cartNote,
  cartClienteNombres, cartClienteApellidos,
  cartClienteEmpresa, cartClienteContacto, cartPago,
  loadingSheets, loadingItems, loadingSale, loadingLabStatuses,
  voucherOpen, lastVoucher,
  labStatuses,
  sheetSearchLoading, sheetSearchResults,
  selectedSheet, filteredItems, paginatedItems, catalogPages, cartTotal,
  cartTotalMonto, cartClienteDisplay,
  recentClientes, clienteSuggestions,
  buildRowTitle, sheetTitle,
  loadItems,
  addToCart, removeFromCart, incCartQty, decCartQty, clearCart, selectCliente,
  registrarVenta, loadHistory,
  checkVoucherStatus, loadLabStatuses,
  searchSheets
} = lab;

const BM_TABS = [
  { key: "venta",     label: "Nueva Venta", icon: "cash-register" },
  { key: "historial", label: "Historial",   icon: "history"       },
];



const confirmClearOpen = ref(false);
const confirmLabOpen   = ref(false);

function askClearCart() {
  if (!cartItems.value.length) return;
  confirmClearOpen.value = true;
}

function doClearCart() {
  confirmClearOpen.value = false;
  clearCart();
}

function askSendToLab() {
  if (!cartItems.value.length || !cartCliente.value.trim()) return;
  confirmLabOpen.value = true;
}

function doSendToLab() {
  confirmLabOpen.value = false;
  registrarVenta();
}

function printVoucher() {
  window.print();
}
</script>

<style>

.view-main {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.glass {
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--card2);
  -webkit-backdrop-filter: blur(var(--fx-blur));
  backdrop-filter: blur(var(--fx-blur));
  box-shadow: var(--shadow);
  overflow: hidden;
  padding: 0.75rem;
}



/* ── Panel ── */
.panel {
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--card);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.panel--sticky { position: sticky; top: 0.85rem; }

/* .panel__* → global.css */




</style>
