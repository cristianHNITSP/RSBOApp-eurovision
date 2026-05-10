<template>
  <div class="ventas-dashboard-view mesh-bg">
    <section class="view-main">
      <VentasHero :category="activeTab" :counts="heroCounts" :loading="isLoadingAny" @refresh="onRefresh">
        <template #actions>
          <b-button type="is-warning" icon-left="cash-register" class="premium-btn ml-2" @click="closureOpen = true">
            {{ config.labels.BUTTONS.CASH_CLOSURE }}
          </b-button>
        </template>
      </VentasHero>

      <div class="glass-container liquid-glass">
        <DynamicTabs v-model="activeTab" :tabs="VENTAS_TABS">
          <template v-for="key in config.CATEGORY_KEYS" #[key] :key="key">
            <div class="columns is-multiline is-variable is-4" :key="activeTab">
              <div class="column is-8">
                <VentasCatalog v-bind="strategies[key].catalog"
                  :filtered-items-length="strategies[key].catalog.filteredItems.length"
                  v-model:selectedSheetId="strategies[key].selectedSheetId"
                  v-model:itemQuery="strategies[key].itemQuery" v-model:stockFilter="strategies[key].stockFilter"
                  v-model:catalogPage="strategies[key].catalogPage"
                  :show-sheet-picker="config.CATEGORY_KEYS.includes(key)"
                  :picker-placeholder="catalogMeta[key]?.placeholder || catalogMeta.default.placeholder"
                  :picker-icon="catalogMeta[key]?.icon || catalogMeta.default.icon"
                  :code-label="catalogMeta[key]?.codeLabel || catalogMeta.default.codeLabel" 
                  @add-to-cart="strategies[key].addToCart">
                  
                  <template v-if="key === 'lentes-contacto' && strategies[key].catalog.isToric" #extra-filters>
                    <b-field label="Eje" class="mb-0 catalog-sheet-field">
                      <SheetPickerInput v-model="strategies[key].catalog.selectedAxis"
                        :sheet-title="(a) => a ? a.name : 'Todos los ejes'"
                        :results="strategies[key].catalog.availableAxes" :search-fn="(q) => { }"
                        placeholder="Filtrar por eje..." icon="fa-compass" />
                    </b-field>
                  </template>
                </VentasCatalog>
              </div>
              <div class="column is-4">
                <VentasCart :kind="strategies[key].kind" :cart-items="strategies[key].cart.items"
                  :cart-total="strategies[key].cart.total" :cart-total-monto="strategies[key].cart.totalMonto"
                  :loading-sale="strategies[key].cart.loadingSale" v-model:cartCliente="strategies[key].cartCliente"
                  v-model:cartNote="strategies[key].cartNote"
                  v-model:cartClienteNombres="strategies[key].cartClienteNombres"
                  v-model:cartClienteApellidos="strategies[key].cartClienteApellidos"
                  v-model:cartClienteEmpresa="strategies[key].cartClienteEmpresa"
                  v-model:cartClienteContacto="strategies[key].cartClienteContacto"
                  v-model:cartPago="strategies[key].cartPago" @checkout="strategies[key].registrarVenta"
                  @remove-from-cart="strategies[key].removeFromCart" @inc-cart-qty="strategies[key].incCartQty"
                  @dec-cart-qty="strategies[key].decCartQty" @ask-clear-cart="strategies[key].clearCart" />
              </div>
            </div>
          </template>

          <template #historial>
            <VentasHistory 
              v-model:category="history.category" 
              v-model:page="history.page"
              :total-pages="history.totalPages"
              :rows="history.rows" 
              :loading="history.loading"
              @refresh="history.reload" 
              @select-order="onSelectOrder" 
            />
          </template>

          <template #cortes>
            <CashClosureHistory />
          </template>
        </DynamicTabs>
      </div>
    </section>

    <!-- Modals -->
    <Teleport to="body">
      <b-modal v-model="voucherOpen" :width="config.VOUCHER_WIDTH" scroll="keep" trap-focus destroy-on-hide>
        <VentasVoucher :order="currentOrder" @close="voucherOpen = false" @print="onPrintVoucher" />
      </b-modal>
    </Teleport>

    <Teleport to="body">
      <b-modal v-model="closureOpen" :width="config.CLOSURE_MODAL_WIDTH" scroll="keep" trap-focus destroy-on-hide>
        <CashClosureModal @close="closureOpen = false" @success="onClosureSuccess" />
      </b-modal>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, ref, watch, provide } from 'vue';
import DynamicTabs from '@/components/DynamicTabs.vue';
import VentasHero from '@/components/ventas/shared/VentasHero.vue';
import VentasCatalog from '@/components/ventas/shared/VentasCatalog.vue';
import VentasCart from '@/components/ventas/shared/VentasCart.vue';
import VentasHistory from '@/components/ventas/shared/VentasHistory.vue';
import VentasVoucher from '@/components/ventas/shared/VentasVoucher.vue';
import CashClosureModal from '@/components/ventas/CashClosureModal.vue';
import CashClosureHistory from '@/components/ventas/CashClosureHistory.vue';
import SheetPickerInput from '@/components/ui/SheetPickerInput.vue';

import { useVentasDashboard, VENTAS_TABS } from '@/composables/api/useVentasDashboard';
import { useLabToast } from '@/composables/shared/useLabToast';
import { VENTAS_CONFIG, CATALOG_METADATA, SALES_LABELS } from '@/data/ventas.data';

const props = defineProps({
  user: { type: Object, default: null }
});

const labToast = useLabToast();
const config = { ...VENTAS_CONFIG, labels: SALES_LABELS };
const catalogMeta = CATALOG_METADATA;

const { activeTab, strategies, history } = useVentasDashboard(() => props.user);

const voucherOpen = ref(false);
const closureOpen = ref(false);
const currentOrder = ref(null);

const isLoadingAny = computed(() => {
  if (activeTab.value === config.TABS.HISTORIAL) return history.loading.value;
  if (activeTab.value === config.TABS.CORTES) return false;
  const s = strategies[activeTab.value];
  if (!s || !s.catalog || !s.cart) return false;
  return s.catalog.loadingSheets || s.catalog.loadingItems || s.cart.loadingSale;
});

const heroCounts = computed(() => {
  if (activeTab.value === config.TABS.HISTORIAL) return { items: history.rows?.value?.length || 0 };
  if (activeTab.value === config.TABS.CORTES) return {};
  const s = strategies[activeTab.value];
  if (!s || !s.catalog || !s.cart) return { sheets: 0, items: 0, cart: 0 };
  return {
    sheets: s.sheetsDB?.length || 0,
    items: s.catalog.filteredItems?.length || 0,
    cart: s.cart.total || 0
  };
});

function onRefresh() {
  if (activeTab.value === config.TABS.HISTORIAL) {
    history.reload();
  } else {
    const s = strategies[activeTab.value];
    if (s && s.loadItems) s.loadItems();
  }
}

function onSelectOrder(order) {
  currentOrder.value = order;
  voucherOpen.value = true;
}

function onPrintVoucher() {
  window.print();
}

function onClosureSuccess(result) {
  closureOpen.value = false;
  labToast.success(`Corte ${result.folio} realizado con éxito.`);
  activeTab.value = config.TABS.CORTES;
}

const autoOpenVoucher = computed(() => {
  for (const k of config.CATEGORY_KEYS) {
    const s = strategies[k];
    if (s && s.voucherOpen) return s.lastVoucher;
  }
  return null;
});

watch(autoOpenVoucher, (newVal) => {
  if (newVal) {
    currentOrder.value = newVal;
    voucherOpen.value = true;
    const activeS = strategies[activeTab.value];
    if (activeS) activeS.voucherOpen = false;
  }
});

provide('lab', {
  sheetById: (id) => {
    if (!id) return null;
    const currentS = strategies[activeTab.value];
    if (currentS) {
      if (activeTab.value === config.TABS.CONTACTO && currentS.catalog?.availableAxes) {
        const axes = Array.isArray(currentS.catalog.availableAxes) ? currentS.catalog.availableAxes : [];
        const foundAxis = axes.find(a => String(a.id) === String(id));
        if (foundAxis) return foundAxis;
      }
      if (currentS.sheetsDB) {
        const sheets = Array.isArray(currentS.sheetsDB) ? currentS.sheetsDB : [];
        const found = sheets.find(sheet => String(sheet.id) === String(id));
        if (found) return found;
      }
    }
    for (const k of config.CATEGORY_KEYS) {
      const s = strategies[k];
      if (s?.sheetsDB) {
        const sheets = Array.isArray(s.sheetsDB) ? s.sheetsDB : [];
        const found = sheets.find(sheet => String(sheet.id) === String(id));
        if (found) return found;
      }
    }
    return null;
  }
});

provide('ventas', { strategies, activeTab });
</script>

<style src="./VentasDashboard.css" scoped></style>
