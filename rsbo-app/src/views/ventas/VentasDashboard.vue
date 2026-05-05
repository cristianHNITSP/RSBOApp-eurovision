<template>
  <div class="ventas-dashboard-view mesh-bg">

    <section class="view-main">
      <VentasHero :category="activeTab" :counts="heroCounts" :loading="isLoadingAny" @refresh="onRefresh">
        <template #actions>
          <b-button type="is-warning" icon-left="cash-register" class="premium-btn ml-2" @click="closureOpen = true">
            Corte de Caja
          </b-button>
        </template>
      </VentasHero>

      <div class="glass-container liquid-glass">
        <DynamicTabs v-model="activeTab" :tabs="VENTAS_TABS">
          <template v-for="key in CATEGORY_KEYS" #[key] :key="key">
            <transition name="fade-slide" mode="out-in" appear>
              <div class="columns is-multiline is-variable is-4" :key="activeTab">
                <div class="column is-8">
                  <VentasCatalog v-bind="strategies[key].catalog"
                    :filtered-items-length="strategies[key].catalog.filteredItems.length"
                    v-model:selectedSheetId="strategies[key].selectedSheetId"
                    v-model:itemQuery="strategies[key].itemQuery" v-model:stockFilter="strategies[key].stockFilter"
                    v-model:catalogPage="strategies[key].catalogPage"
                    :show-sheet-picker="key === 'bases-micas' || key === 'lentes-contacto' || key === 'optica'"
                    :picker-placeholder="key === 'optica' ? 'Seleccionar colección...' : 'Buscar planilla...'"
                    :picker-icon="key === 'optica' ? 'fa-tags' : (key === 'lentes-contacto' ? 'fa-circle' : 'fa-layer-group')"
                    :code-label="key === 'optica' ? 'SKU' : 'código'" @add-to-cart="strategies[key].addToCart">
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
            </transition>
          </template>

          <template #historial>
            <VentasHistory v-model:category="history.category" :rows="history.rows" :loading="history.loading"
              @refresh="history.reload" @select-order="onSelectOrder" />
          </template>

          <template #cortes>
            <CashClosureHistory />
          </template>
        </DynamicTabs>
      </div>
    </section>

    <!-- Voucher Modal -->
    <b-modal v-model="voucherOpen" :width="560" scroll="keep" trap-focus destroy-on-hide>
      <VentasVoucher :order="currentOrder" @close="voucherOpen = false" @print="onPrintVoucher" />
    </b-modal>

    <!-- Closure Modal -->
    <b-modal v-model="closureOpen" :width="500" scroll="keep" trap-focus destroy-on-hide>
      <CashClosureModal @close="closureOpen = false" @success="onClosureSuccess" />
    </b-modal>
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

const props = defineProps({
  user: { type: Object, default: null }
});

const labToast = useLabToast();
const CATEGORY_KEYS = ['bases-micas', 'optica', 'lentes-contacto'];

const { activeTab, strategies, history } = useVentasDashboard(() => props.user);

const voucherOpen = ref(false);
const closureOpen = ref(false);
const currentOrder = ref(null);

const isLoadingAny = computed(() => {
  if (activeTab.value === 'historial') return history.loading.value;
  if (activeTab.value === 'cortes') return false;
  const s = strategies[activeTab.value];
  if (!s || !s.catalog || !s.cart) return false;
  return s.catalog.loadingSheets || s.catalog.loadingItems || s.cart.loadingSale;
});

const heroCounts = computed(() => {
  if (activeTab.value === 'historial') return { items: history.rows?.value?.length || 0 };
  if (activeTab.value === 'cortes') return {};
  const s = strategies[activeTab.value];
  if (!s || !s.catalog || !s.cart) return { sheets: 0, items: 0, cart: 0 };
  return {
    sheets: s.sheetsDB?.length || 0,
    items: s.catalog.filteredItems?.length || 0,
    cart: s.cart.total || 0
  };
});

function onRefresh() {
  if (activeTab.value === 'historial') {
    history.reload();
  } else if (activeTab.value === 'cortes') {
    // handled by component
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
  activeTab.value = 'cortes';
}

const autoOpenVoucher = computed(() => {
  for (const k of CATEGORY_KEYS) {
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
      if (activeTab.value === 'lentes-contacto' && currentS.catalog?.availableAxes) {
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
    for (const k of CATEGORY_KEYS) {
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

<style scoped>
.ventas-dashboard-view {
  min-height: 100vh;
  padding-bottom: 3rem;
}

.view-main {
  padding: 1.5rem 1.25rem 0;
  margin-top: 0;
  position: relative;
  z-index: 1;
}

.glass-container {
  background: var(--surface);
  backdrop-filter: blur(var(--fx-blur));
  -webkit-backdrop-filter: blur(var(--fx-blur));
  border: 1px solid var(--border);
  border-top: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 24px;
  padding: 1.5rem;
  box-shadow:
    var(--shadow-lg),
    inset 0 0 0 1px rgba(255, 255, 255, 0.2);
  position: relative;
}

.glass-container.liquid-glass::before {
  opacity: 0.4;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
