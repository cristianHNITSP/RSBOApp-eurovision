<template>
  <div class="ventas-dashboard-view">
    <VentasHero
      :category="activeTab"
      :counts="heroCounts"
      :loading="isLoadingAny"
      @refresh="onRefresh"
    />

    <section class="view-main">
      <div class="glass">
        <DynamicTabs v-model="activeTab" :tabs="VENTAS_TABS">
          <template v-for="key in CATEGORY_KEYS" #[key] :key="key">
            <div class="columns is-multiline is-variable is-4">
              <div class="column is-8">
                <VentasCatalog
                  v-bind="strategies[key].catalog"
                  :filtered-items-length="strategies[key].catalog.filteredItems.length"
                  v-model:selectedSheetId="strategies[key].selectedSheetId"
                  v-model:itemQuery="strategies[key].itemQuery"
                  v-model:stockFilter="strategies[key].stockFilter"
                  v-model:catalogPage="strategies[key].catalogPage"
                  :show-sheet-picker="key === 'bases-micas' || key === 'lentes-contacto' || key === 'optica'"
                  :picker-placeholder="key === 'optica' ? 'Seleccionar colección...' : 'Buscar planilla...'"
                  :picker-icon="key === 'optica' ? 'fa-tags' : (key === 'lentes-contacto' ? 'fa-circle' : 'fa-layer-group')"
                  :code-label="key === 'optica' ? 'SKU' : 'código'"
                  @add-to-cart="strategies[key].addToCart"
                >
                  <template v-if="key === 'lentes-contacto' && strategies[key].catalog.isToric" #extra-filters>
                    <b-field label="Eje" class="mb-0 catalog-sheet-field">
                      <SheetPickerInput
                        v-model="strategies[key].catalog.selectedAxis"
                        :sheet-title="(a) => a ? a.name : 'Todos los ejes'"
                        :results="strategies[key].catalog.availableAxes"
                        :search-fn="(q) => {}"
                        placeholder="Filtrar por eje..."
                        icon="fa-compass"
                      />
                    </b-field>
                  </template>
                </VentasCatalog>
              </div>
              <div class="column is-4">
                <VentasCart
                  :kind="strategies[key].kind"
                  :cart-items="strategies[key].cart.items"
                  :cart-total="strategies[key].cart.total"
                  :cart-total-monto="strategies[key].cart.totalMonto"
                  :loading-sale="strategies[key].cart.loadingSale"
                  :cliente-suggestions="[]"
                  v-model:cartCliente="strategies[key].cartCliente"
                  v-model:cartNote="strategies[key].cartNote"
                  v-model:cartClienteNombres="strategies[key].cartClienteNombres"
                  v-model:cartClienteApellidos="strategies[key].cartClienteApellidos"
                  v-model:cartClienteEmpresa="strategies[key].cartClienteEmpresa"
                  v-model:cartClienteContacto="strategies[key].cartClienteContacto"
                  v-model:cartPago="strategies[key].cartPago"
                  @checkout="strategies[key].registrarVenta"
                  @remove-from-cart="strategies[key].removeFromCart"
                  @inc-cart-qty="strategies[key].incCartQty"
                  @dec-cart-qty="strategies[key].decCartQty"
                  @ask-clear-cart="strategies[key].clearCart"
                />
              </div>
            </div>
          </template>

          <template #historial>
            <VentasHistory 
              v-model:category="history.category"
              :rows="history.rows"
              :loading="history.loading"
              @refresh="history.reload" 
              @select-order="onSelectOrder"
            />
          </template>
        </DynamicTabs>
      </div>
    </section>

    <!-- Voucher Modal -->
    <b-modal 
      v-model="voucherOpen" 
      :width="560" 
      scroll="keep"
      trap-focus
      destroy-on-hide
    >
      <VentasVoucher 
        :order="currentOrder" 
        @close="voucherOpen = false"
        @print="onPrintVoucher"
      />
    </b-modal>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import DynamicTabs from '@/components/DynamicTabs.vue';
import VentasHero    from '@/components/ventas/shared/VentasHero.vue';
import VentasCatalog from '@/components/ventas/shared/VentasCatalog.vue';
import VentasCart    from '@/components/ventas/shared/VentasCart.vue';
import VentasHistory from '@/components/ventas/shared/VentasHistory.vue';
import VentasVoucher from '@/components/ventas/shared/VentasVoucher.vue';
import SheetPickerInput from '@/components/ui/SheetPickerInput.vue';
import { useVentasDashboard, VENTAS_TABS } from '@/composables/api/useVentasDashboard';

const props = defineProps({
  user: { type: Object, default: null }
});

const CATEGORY_KEYS = ['bases-micas', 'optica', 'lentes-contacto'];

const { activeTab, strategies, history } = useVentasDashboard(() => props.user);

const voucherOpen = ref(false);
const currentOrder = ref(null);

const isLoadingAny = computed(() => {
  if (activeTab.value === 'historial') return history.loading.value;
  const s = strategies[activeTab.value];
  if (!s) return false;
  return s.catalog.loadingSheets || s.catalog.loadingItems || s.cart.loadingSale;
});

const heroCounts = computed(() => {
  if (activeTab.value === 'historial') return { items: history.rows.value?.length };
  const s = strategies[activeTab.value];
  if (!s) return {};
  return {
    sheets: s.sheetsDB?.length,
    items:  s.catalog.filteredItems?.length,
    cart:   s.cart.total
  };
});

function onRefresh() {
  if (activeTab.value === 'historial') {
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


import { watch, provide } from 'vue';

const autoOpenVoucher = computed(() => {
  for (const k of CATEGORY_KEYS) {
    const s = strategies[k];
    if (s && s.voucherOpen.value) return s.lastVoucher.value;
  }
  return null;
});

watch(autoOpenVoucher, (newVal) => {
  if (newVal) {
    currentOrder.value = newVal;
    voucherOpen.value = true;
    const activeS = strategies[activeTab.value];
    if (activeS && activeS.voucherOpen) activeS.voucherOpen.value = false;
  }
});

// Provide 'lab' context dynamically for SheetPickerInput
provide('lab', {
  sheetById: (id) => {
    if (!id) return null;
    const s = strategies[activeTab.value];
    
    // Support for axis lookup (for Toric contact lenses)
    if (activeTab.value === 'lentes-contacto' && s?.catalog?.availableAxes) {
      const foundAxis = s.catalog.availableAxes.find(a => String(a.id) === String(id));
      if (foundAxis) return foundAxis;
    }

    if (s && s.sheetsDB) {
      const found = s.sheetsDB.find(sheet => String(sheet.id) === String(id));
      if (found) return found;
    }
    // Deep search if not found in active tab (e.g. during transition)
    for (const k in strategies) {
      if (strategies[k].sheetsDB) {
        const found = strategies[k].sheetsDB.find(sheet => String(sheet.id) === String(id));
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
  padding: 0 1.25rem;
}

.glass {
  background: var(--surface-glass);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 1.5rem;
}
</style>
