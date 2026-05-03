<template>
  <div class="ventas-dashboard-view mesh-bg">
    <div class="hero-glow">
      <div class="hero-glow--a"></div>
      <div class="hero-glow--b"></div>
    </div>
    <section class="view-main">
      <VentasHero class="mt-5" :category="activeTab" :counts="heroCounts" :loading="isLoadingAny"
        @refresh="onRefresh" />

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
        </DynamicTabs>
      </div>
    </section>

    <!-- Voucher Modal -->
    <b-modal v-model="voucherOpen" :width="560" scroll="keep" trap-focus destroy-on-hide>
      <VentasVoucher :order="currentOrder" @close="voucherOpen = false" @print="onPrintVoucher" />
    </b-modal>


  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import DynamicTabs from '@/components/DynamicTabs.vue';
import VentasHero from '@/components/ventas/shared/VentasHero.vue';
import VentasCatalog from '@/components/ventas/shared/VentasCatalog.vue';
import VentasCart from '@/components/ventas/shared/VentasCart.vue';
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
  if (!s || !s.catalog || !s.cart) return false;
  return s.catalog.loadingSheets || s.catalog.loadingItems || s.cart.loadingSale;
});

const heroCounts = computed(() => {
  if (activeTab.value === 'historial') return { items: history.rows?.value?.length || 0 };
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
    // Al usar reactive(), las propiedades se desenvuelven solas. No usar .value.
    if (s && s.voucherOpen) return s.lastVoucher;
  }
  return null;
});

watch(autoOpenVoucher, (newVal) => {
  if (newVal) {
    currentOrder.value = newVal;
    voucherOpen.value = true;
    const activeS = strategies[activeTab.value];
    // Resetear el estado en la estrategia (ya desenvuelto)
    if (activeS) activeS.voucherOpen = false;
  }
});

// Provide 'lab' context dynamically for SheetPickerInput
provide('lab', {
  sheetById: (id) => {
    if (!id) return null;
    const currentS = strategies[activeTab.value];

    // 1. Prioridad: Pestaña activa
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

    // 2. Respaldo: Búsqueda profunda en otras estrategias
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
  padding: 0 1.25rem;
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

/* Liquid effect only on the container border or very subtle */
.glass-container.liquid-glass::before {
  opacity: 0.4;
}

/* Transiciones de pestañas */
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

/* Hero Glow Dinámico */
.hero-glow {
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 600px;
  overflow: hidden;
  z-index: 0;
}

.hero-glow--a,
.hero-glow--b {
  position: absolute;
  width: 800px;
  height: 800px;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.15;
  animation: float-glow 20s infinite alternate ease-in-out;
}

.hero-glow--a {
  background: radial-gradient(circle, var(--primary) 0%, transparent 70%);
  top: -300px;
  left: -200px;
}

.hero-glow--b {
  background: radial-gradient(circle, var(--secondary, #00d1b2) 0%, transparent 70%);
  bottom: -100px;
  right: -200px;
  animation-delay: -5s;
}

@keyframes float-glow {
  0% {
    transform: translate(0, 0) scale(1);
  }

  100% {
    transform: translate(100px, 50px) scale(1.1);
  }
}
</style>
