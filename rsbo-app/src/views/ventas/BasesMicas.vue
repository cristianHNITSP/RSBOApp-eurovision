<template>
  <section class="lab-view bm-section" v-motion-fade-visible-once>

    <!-- ── Hero ───────────────────────────────────────────────────────────── -->
    <header class="lab-hero">
      <div class="lab-hero__left">
        <span class="bm-ventas-pill">
          <i class="fas fa-flask mr-1"></i>
          Ventas
        </span>
        <h1 class="lab-title">
          <span class="lab-title__dot" aria-hidden="true"></span>
          Bases y Micas · Ventas
        </h1>

        <div class="lab-chips">
          <span class="chip">
            <i class="fas fa-layer-group mr-2"></i>{{ sheetsDB.length }} planillas
          </span>
          <span class="chip">
            <i class="fas fa-boxes mr-2"></i>{{ filteredItems.length }} productos
          </span>
          <span class="chip chip--soft">
            <i class="fas fa-shopping-cart mr-2"></i>{{ cartItems.length }} en carrito
          </span>
          <span v-if="loadingSheets || loadingItems" class="chip chip--loading">
            <span class="loading-dot"></span>
            Cargando…
          </span>
        </div>
      </div>

      <div class="lab-hero__right">
        <div class="lab-hero__actions">
          <b-button
            type="is-primary"
            icon-left="sync"
            :loading="loadingSheets || loadingItems"
            @click="loadItems"
          >
            Actualizar
          </b-button>
        </div>
      </div>
    </header>

    <!-- ── Main glass ─────────────────────────────────────────────────────── -->
    <div class="glass">
      <b-tabs v-model="activeTab" type="is-toggle" class="main-tabs" expanded :animated="false">

        <!-- Tab: Nueva Venta -->
        <b-tab-item value="venta" label="Nueva Venta" icon="cash-register">
          <div class="columns is-multiline is-variable is-4">

            <!-- Catálogo de productos -->
            <div class="column is-8">
              <div class="panel">
                <div class="panel__head">
                  <div>
                    <h2 class="panel__title">
                      Catálogo
                      <span class="panel__badge">{{ filteredItems.length }}</span>
                    </h2>
                    <p class="panel__hint">Selecciona productos para agregar a la venta.</p>
                  </div>

                  <div class="panel__headActions">
                    <b-field label="Planilla" class="mb-0">
                      <b-select
                        v-model="selectedSheetId"
                        expanded
                        :disabled="loadingSheets"
                      >
                        <option v-for="s in sheetsDB" :key="s.id" :value="s.id">
                          {{ sheetTitle(s) }}
                        </option>
                      </b-select>
                    </b-field>
                  </div>
                </div>

                <div class="panel__body">
                  <!-- Filtros -->
                  <div class="columns is-mobile is-variable is-3 mb-3">
                    <div class="column is-8">
                      <b-field class="mb-0">
                        <b-input
                          v-model="itemQuery"
                          icon="search"
                          placeholder="Parámetros (SPH, CYL, ADD, BASE) o código de barra…"
                        />
                      </b-field>
                    </div>
                    <div class="column is-4">
                      <b-field class="mb-0">
                        <b-select v-model="stockFilter" expanded>
                          <option value="withStock">Con stock</option>
                          <option value="all">Todos</option>
                          <option value="zero">Sin stock</option>
                        </b-select>
                      </b-field>
                    </div>
                  </div>

                  <b-loading :is-full-page="false" :active="loadingItems" />

                  <!-- Estado vacío -->
                  <div v-if="!loadingItems && !filteredItems.length" class="empty">
                    <i class="fas fa-boxes empty__icon"></i>
                    <p class="empty__title">Sin productos</p>
                    <p class="empty__text">Cambia filtros o selecciona otra planilla.</p>
                  </div>

                  <!-- Tabla -->
                  <b-table
                    v-else-if="!loadingItems"
                    :data="paginatedItems"
                    hoverable
                    mobile-cards
                    class="nice-table"
                  >
                    <b-table-column field="existencias" label="PZAS." width="90" v-slot="{ row }">
                      <span
                        class="qty-pill"
                        :class="row.existencias > 0 ? 'qty-pill--ok' : 'qty-pill--zero'"
                      >
                        {{ row.existencias }}
                      </span>
                    </b-table-column>

                    <b-table-column field="product" label="PRODUCTO" v-slot="{ row }">
                      <div class="prod__name">
                        {{ buildRowTitle(row, selectedSheet) }}
                      </div>
                      <div class="prod__meta">
                        <span class="meta-k mono">
                          <i class="fas fa-barcode mr-1"></i>{{ row.codebar || "sin código" }}
                        </span>
                      </div>
                    </b-table-column>

                    <b-table-column label="" width="120" v-slot="{ row }">
                      <b-button
                        size="is-small"
                        type="is-primary"
                        icon-left="plus"
                        :disabled="row.existencias < 1"
                        @click="addToCart(row)"
                      >
                        Agregar
                      </b-button>
                    </b-table-column>
                  </b-table>

                  <!-- Paginación -->
                  <nav v-if="filteredItems.length > catalogPageSize" class="pager">
                    <b-button
                      size="is-small"
                      type="is-light"
                      icon-left="chevron-left"
                      :disabled="catalogPage === 1"
                      @click="catalogPage--"
                    >
                      Prev
                    </b-button>
                    <span class="pager__text">{{ catalogPage }} / {{ catalogPages }}</span>
                    <b-button
                      size="is-small"
                      type="is-light"
                      icon-right="chevron-right"
                      :disabled="catalogPage === catalogPages"
                      @click="catalogPage++"
                    >
                      Next
                    </b-button>
                  </nav>
                </div>
              </div>
            </div>

            <!-- Carrito -->
            <div class="column is-4">
              <div class="panel panel--sticky">
                <div class="panel__head panel__head--compact">
                  <div>
                    <h2 class="panel__title">
                      Carrito
                      <span class="panel__badge">{{ cartItems.length }}</span>
                    </h2>
                  </div>
                  <b-button
                    v-if="cartItems.length"
                    size="is-small"
                    type="is-light"
                    icon-left="trash"
                    @click="askClearCart"
                  >
                    Limpiar
                  </b-button>
                </div>

                <div class="panel__body">
                  <b-field label="Cliente *" class="mb-3">
                    <b-input
                      v-model="cartCliente"
                      placeholder="Nombre del cliente"
                      icon="user"
                    />
                  </b-field>

                  <b-field label="Notas" class="mb-3">
                    <b-input
                      v-model="cartNote"
                      placeholder="Observaciones (opcional)"
                      icon="sticky-note"
                    />
                  </b-field>

                  <hr class="soft-hr" />

                  <!-- Carrito vacío -->
                  <div v-if="!cartItems.length" class="empty empty--mini">
                    <i class="fas fa-shopping-cart empty__icon"></i>
                    <p class="empty__title">Carrito vacío</p>
                    <p class="empty__text">Agrega productos desde el catálogo.</p>
                  </div>

                  <!-- Items del carrito -->
                  <div v-else class="order-lines">
                    <div
                      v-for="ci in cartItems"
                      :key="ci.key"
                      class="order-line"
                    >
                      <div class="order-line__top">
                        <div>
                          <div class="order-line__title">{{ ci.title }}</div>
                          <span class="order-line__sub">{{ ci.params }}</span>
                          <span class="order-line__sub muted">{{ ci.sheet.nombre }}</span>
                        </div>
                        <b-button
                          size="is-small"
                          type="is-light"
                          icon-left="times"
                          @click="removeFromCart(ci.key)"
                        />
                      </div>

                      <div class="order-line__bottom">
                        <div class="qty-control">
                          <b-button
                            size="is-small"
                            type="is-light"
                            icon-left="minus"
                            @click="decCartQty(ci)"
                          />
                          <span class="mono" style="min-width:28px;text-align:center;font-weight:900">
                            {{ ci.qty }}
                          </span>
                          <b-button
                            size="is-small"
                            type="is-light"
                            icon-left="plus"
                            @click="incCartQty(ci)"
                          />
                        </div>
                        <span class="stock-hint">stock: {{ ci.row.existencias }}</span>
                      </div>
                    </div>
                  </div>

                  <hr class="soft-hr" />

                  <!-- Total -->
                  <div class="bm-cart-summary">
                    <span class="muted">Total piezas:</span>
                    <span class="bm-cart-summary__val">{{ cartTotal }}</span>
                  </div>

                  <b-button
                    type="is-primary"
                    icon-left="flask"
                    expanded
                    :loading="loadingSale"
                    :disabled="!cartItems.length || !cartCliente.trim()"
                    class="mt-3"
                    @click="askSendToLab"
                  >
                    Enviar a Laboratorio
                  </b-button>
                </div>
              </div>
            </div>

          </div>
        </b-tab-item>

        <!-- Tab: Historial -->
        <b-tab-item value="historial" label="Historial" icon="history">
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
                  @click="loadLabStatuses"
                >
                  Verificar estados
                </b-button>
                <b-button
                  type="is-light"
                  icon-left="sync"
                  size="is-small"
                  @click="loadHistory"
                >
                  Recargar
                </b-button>
              </div>
            </div>

            <div class="panel__body">
              <div v-if="!salesHistory.length" class="empty">
                <i class="fas fa-history empty__icon"></i>
                <p class="empty__title">Sin historial</p>
                <p class="empty__text">Los pedidos enviados al laboratorio aparecerán aquí.</p>
              </div>

              <div v-else class="order-lines">
                <div
                  v-for="sale in salesHistory"
                  :key="sale.id"
                  class="order-line order-line--history"
                  @click="lastVoucher = sale; voucherOpen = true"
                >
                  <div class="order-line__top">
                    <div>
                      <div class="order-line__title">{{ sale.cliente }}</div>
                      <span class="order-line__sub">
                        {{ fmtDate(sale.fecha) }} · {{ sale.totalPiezas }} pzas
                      </span>
                      <span v-if="sale.labFolio" class="order-line__sub mono muted">
                        <i class="fas fa-flask mr-1"></i>{{ sale.labFolio }}
                      </span>
                    </div>
                    <div class="is-flex is-flex-direction-column is-align-items-flex-end" style="gap:0.4rem">
                      <!-- Lab status badge -->
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
        </b-tab-item>

      </b-tabs>
    </div>

    <!-- ── Voucher modal ───────────────────────────────────────────────────── -->

    <teleport to="body">  <b-modal v-model="voucherOpen" :width="500" scroll="keep">
      <div class="bm-voucher" v-if="lastVoucher">
        <!-- Header del voucher -->
        <div class="bm-voucher__head">
          <div class="bm-voucher__logo">
            <i class="fas fa-receipt"></i>
          </div>
          <h2 class="bm-voucher__title">Comprobante de Venta</h2>
          <div class="bm-voucher__subtitle">Bases y Micas</div>
          <div class="bm-voucher__id mono">{{ lastVoucher.id }}</div>
        </div>

        <!-- Datos del cliente -->
        <div class="bm-voucher__meta">
          <div class="bm-voucher__row">
            <span class="bm-voucher__label">Cliente</span>
            <span class="bm-voucher__val">{{ lastVoucher.cliente }}</span>
          </div>
          <div class="bm-voucher__row">
            <span class="bm-voucher__label">Fecha</span>
            <span class="bm-voucher__val">{{ fmtDate(lastVoucher.fecha) }}</span>
          </div>
          <div v-if="lastVoucher.note" class="bm-voucher__row">
            <span class="bm-voucher__label">Notas</span>
            <span class="bm-voucher__val">{{ lastVoucher.note }}</span>
          </div>
          <div class="bm-voucher__row">
            <span class="bm-voucher__label">Atendido por</span>
            <span class="bm-voucher__val">{{ lastVoucher.actor }}</span>
          </div>
        </div>

        <hr class="soft-hr" />

        <!-- Líneas de venta -->
        <div class="bm-voucher__lines">
          <div class="bm-voucher__lines-head">
            <span>Producto</span>
            <span>Cant.</span>
          </div>
          <div
            v-for="(line, i) in lastVoucher.lineas"
            :key="i"
            class="bm-voucher__line"
          >
            <div class="bm-voucher__line-info">
              <div class="bm-voucher__line-title">{{ line.title }}</div>
              <div class="bm-voucher__line-sub">{{ line.params }}</div>
              <div v-if="line.codebar" class="mono muted" style="font-size:0.8rem">
                {{ line.codebar }}
              </div>
              <div class="muted" style="font-size:0.78rem">{{ line.sheetNombre }}</div>
            </div>
            <div class="bm-voucher__line-qty">{{ line.qty }}</div>
          </div>
        </div>

        <hr class="soft-hr" />

        <!-- Total -->
        <div class="bm-voucher__total">
          <span class="bm-voucher__total-label">Total piezas</span>
          <span class="bm-voucher__total-val">{{ lastVoucher.totalPiezas }}</span>
        </div>

        <!-- Lab order info -->
        <div v-if="lastVoucher.labFolio" class="bm-voucher__lab-order">
          <i class="fas fa-flask bm-voucher__lab-icon"></i>
          <div>
            <div class="bm-voucher__lab-folio mono">{{ lastVoucher.labFolio }}</div>
            <div class="bm-voucher__lab-status">
              <span
                v-if="lastVoucher.labOrderId && labStatuses[lastVoucher.labOrderId]"
                class="lab-status-pill"
                :class="`lab-status-pill--${labStatuses[lastVoucher.labOrderId]?.status}`"
              >
                {{ labStatusHuman(labStatuses[lastVoucher.labOrderId]?.status) }}
              </span>
              <span v-else class="lab-status-pill lab-status-pill--pendiente">
                Pendiente de surtir
              </span>
            </div>
          </div>
          <b-button
            v-if="lastVoucher.labOrderId"
            size="is-small"
            type="is-light"
            icon-left="sync"
            @click="checkVoucherStatus(lastVoucher)"
          />
        </div>

        <!-- Acciones -->
        <div class="bm-voucher__actions">
          <b-button
            type="is-primary"
            icon-left="print"
            expanded
            @click="printVoucher"
          >
            Imprimir / PDF
          </b-button>
          <b-button type="is-light" expanded @click="voucherOpen = false">
            Cerrar
          </b-button>
        </div>
      </div>
    </b-modal></teleport>

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
import { ref } from "vue";
import {
  useBasesMicasVentas,
  fmtDate,
  labStatusHuman,
  labStatusClass
} from "@/composables/useBasesMicasVentas.js";

const props = defineProps({
  user:    { type: Object,  required: false, default: null },
  loading: { type: Boolean, required: false, default: false },
});

const {
  sheetsDB, salesHistory,
  activeTab,
  selectedSheetId,
  itemQuery, stockFilter,
  catalogPage, catalogPageSize,
  cartItems, cartCliente, cartNote,
  loadingSheets, loadingItems, loadingSale, loadingLabStatuses,
  voucherOpen, lastVoucher,
  labStatuses,
  selectedSheet, filteredItems, paginatedItems, catalogPages, cartTotal,
  buildRowTitle, sheetTitle,
  loadItems,
  addToCart, removeFromCart, incCartQty, decCartQty, clearCart,
  registrarVenta, loadHistory,
  checkVoucherStatus, loadLabStatuses
} = useBasesMicasVentas(() => props.user);

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
/* ── Shared structure (mirrors Laboratorio styles) ── */
.bm-section {
  border-radius: 14px;
  padding: 1.5rem;
  border: 1px solid var(--border-solid);
  box-shadow: var(--shadow-soft);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.lab-hero {
  display: flex;
  gap: 1.2rem;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  padding: 1rem 1.25rem;
  border-radius: 14px;
  background:
    radial-gradient(circle at 0 0,   rgba(79, 70, 229, 0.12),  transparent 55%),
    radial-gradient(circle at 100% 0, rgba(236, 72, 153, 0.10), transparent 55%),
    radial-gradient(circle at 60% 100%, rgba(249, 115, 22, 0.10), transparent 55%),
    var(--surface-solid);
  border: 1px solid var(--border);
  margin-bottom: 1.5rem;
}

.bm-ventas-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--c-primary);
  background: var(--c-primary-alpha);
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  margin-bottom: 0.35rem;
}

.lab-title {
  font-size: 1.6rem;
  font-weight: 900;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--text-primary);
}

.lab-title__dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--p), #ec4899);
  box-shadow: 0 0 0 4px rgba(144, 111, 225, 0.12);
  flex-shrink: 0;
}

.lab-chips {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.chip {
  border: 1px solid var(--border);
  background: var(--surface-overlay);
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  font-weight: 800;
  color: var(--text-primary);
  font-size: 0.82rem;
  display: inline-flex;
  align-items: center;
}

.chip--soft {
  background: var(--c-primary-alpha);
  border-color: var(--c-primary-alpha);
}

.chip--loading {
  background: var(--c-primary-alpha);
  border-color: rgba(144, 111, 225, 0.3);
  animation: pulse-chip 1.5s ease-in-out infinite;
}

.loading-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--c-primary);
  margin-right: 0.4rem;
  animation: blink 1s ease-in-out infinite;
}

@keyframes pulse-chip {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.65; }
}

@keyframes blink {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%       { transform: scale(0.6); opacity: 0.5; }
}

.lab-hero__right { min-width: min(360px, 100%); }

.lab-hero__actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.6rem;
  flex-wrap: wrap;
  justify-content: flex-end;
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

.main-tabs :deep(.tab-content) { min-height: 600px; }
.main-tabs :deep(.tabs)        { margin-bottom: 0.75rem; }
.main-tabs :deep(.tabs a)      { border-radius: 14px !important; font-weight: 900; }

.main-tabs :deep(.tabs li.is-active a) {
  background: linear-gradient(135deg, rgba(144, 111, 225, 0.18), rgba(236, 72, 153, 0.10));
  border-color: rgba(144, 111, 225, 0.35);
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

.panel__head {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.85rem;
  flex-wrap: wrap;
}

.panel__head--compact { padding: 0.85rem 1rem; }

.panel__title {
  margin: 0;
  font-weight: 1000;
  font-size: 1.05rem;
  color: var(--text-primary);
}

.panel__hint {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.85rem;
}

.panel__badge {
  margin-left: 0.5rem;
  font-size: 0.78rem;
  font-weight: 950;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  border: 1px solid var(--c-primary-alpha);
  background: var(--c-primary-alpha);
}

.panel__headActions {
  display: flex;
  gap: 0.6rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.panel__body { padding: 1rem; position: relative; }

/* ── Table ── */
.nice-table :deep(.table) { border-radius: 14px; overflow: hidden; }
.nice-table :deep(.table thead th) {
  background: var(--c-primary-alpha);
  color: var(--text-primary);
  font-weight: 1000;
  border: none;
}
.nice-table :deep(.table td) { vertical-align: middle; }

.qty-pill {
  display: inline-flex;
  min-width: 48px;
  justify-content: center;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  font-weight: 1000;
  border: 1px solid var(--border);
}
.qty-pill--ok   { background: var(--c-success-alpha); border-color: var(--c-success-alpha); }
.qty-pill--zero { background: var(--c-danger-alpha);  border-color: var(--c-danger-alpha); }

.prod__name { font-weight: 950; color: var(--text-primary); }
.prod__meta { display: flex; gap: 0.8rem; flex-wrap: wrap; margin-top: 0.15rem; }
.meta-k     { font-size: 0.82rem; color: var(--text-muted); font-weight: 700; }

/* ── Pager ── */
.pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
}
.pager__text { font-weight: 950; color: var(--text-primary); }

/* ── Order lines (cart) ── */
.order-lines   { display: grid; gap: 0.6rem; }

.order-line {
  border: 1px solid var(--border);
  background: var(--surface-overlay);
  border-radius: 16px;
  padding: 0.75rem;
}

.order-line--history { cursor: pointer; transition: background 120ms ease; }
.order-line--history:hover { background: var(--c-primary-alpha); }

.order-line__top    { display: flex; justify-content: space-between; gap: 0.75rem; }
.order-line__title  { font-weight: 950; color: var(--text-primary); }
.order-line__sub    {
  display: block;
  margin-top: 0.15rem;
  font-weight: 800;
  color: var(--text-muted);
  font-size: 0.82rem;
}
.order-line__bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.6rem;
}

.qty-control { display: flex; gap: 0.35rem; align-items: center; }
.stock-hint  { font-weight: 900; color: var(--text-muted); font-size: 0.82rem; }

/* ── Soft divider ── */
.soft-hr { border: none; border-top: 1px dashed var(--border); margin: 1rem 0; }

/* ── Cart summary ── */
.bm-cart-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 900;
}
.bm-cart-summary__val {
  font-size: 1.3rem;
  font-weight: 1000;
  color: var(--text-primary);
}

/* ── Empty state ── */
.empty      { padding: 2.2rem 1rem; text-align: center; color: var(--text-muted); }
.empty--mini { padding: 1.2rem 0.75rem; }
.empty__icon  { font-size: 1.6rem; color: rgba(144, 111, 225, 0.9); }
.empty__title { margin: 0.5rem 0 0; font-weight: 1000; color: var(--text-primary); }
.empty__text  { margin: 0.25rem 0 0; font-weight: 800; }

/* ── Mono ── */
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
}

/* ── Muted ── */
.muted { color: var(--text-muted); font-weight: 700; }

/* ── Voucher modal ── */
.bm-voucher {
  background: var(--card);
  border-radius: 20px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bm-voucher__head {
  text-align: center;
  padding-bottom: 1rem;
  border-bottom: 2px dashed var(--border);
  margin-bottom: 0.5rem;
}

.bm-voucher__logo {
  font-size: 2.5rem;
  color: var(--c-primary);
  margin-bottom: 0.5rem;
}

.bm-voucher__title {
  font-size: 1.25rem;
  font-weight: 1000;
  color: var(--text-primary);
  margin: 0;
}

.bm-voucher__subtitle {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--text-muted);
  margin-top: 0.15rem;
}

.bm-voucher__id {
  margin-top: 0.35rem;
  font-size: 0.78rem;
  color: var(--text-muted);
  background: var(--surface-overlay);
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
  display: inline-block;
}

.bm-voucher__meta { display: grid; gap: 0.45rem; }

.bm-voucher__row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.9rem;
}

.bm-voucher__label {
  font-weight: 800;
  color: var(--text-muted);
}

.bm-voucher__val {
  font-weight: 900;
  color: var(--text-primary);
  text-align: right;
}

.bm-voucher__lines { display: grid; gap: 0.5rem; }

.bm-voucher__lines-head {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  font-weight: 1000;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--border);
}

.bm-voucher__line {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px dashed var(--border);
}
.bm-voucher__line:last-child { border-bottom: none; }

.bm-voucher__line-info { flex: 1; }
.bm-voucher__line-title { font-weight: 950; color: var(--text-primary); font-size: 0.9rem; }
.bm-voucher__line-sub   { font-size: 0.82rem; color: var(--text-muted); font-weight: 800; }

.bm-voucher__line-qty {
  font-size: 1.1rem;
  font-weight: 1000;
  color: var(--text-primary);
  min-width: 32px;
  text-align: right;
  align-self: center;
}

.bm-voucher__total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 900;
  font-size: 1rem;
  color: var(--text-muted);
}

.bm-voucher__total-val {
  font-size: 1.6rem;
  font-weight: 1000;
  color: var(--text-primary);
}

.bm-voucher__actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

/* Lab order badge in voucher */
.bm-voucher__lab-order {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.9rem;
  margin-top: 0.25rem;
  background: rgba(144, 111, 225, 0.07);
  border: 1px solid rgba(144, 111, 225, 0.2);
  border-radius: 14px;
}
.bm-voucher__lab-icon {
  font-size: 1.2rem;
  color: var(--c-primary);
  flex-shrink: 0;
}
.bm-voucher__lab-folio {
  font-size: 0.9rem;
  font-weight: 1000;
  color: var(--text-primary);
}
.bm-voucher__lab-status { margin-top: 0.2rem; }

.lab-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 900;
}
.lab-status-pill--pendiente {
  background: rgba(245, 158, 11, 0.12);
  color: rgba(245, 158, 11, 0.95);
  border: 1px solid rgba(245, 158, 11, 0.25);
}
.lab-status-pill--parcial {
  background: rgba(59, 130, 246, 0.12);
  color: rgba(59, 130, 246, 0.95);
  border: 1px solid rgba(59, 130, 246, 0.25);
}
.lab-status-pill--cerrado {
  background: rgba(34, 197, 94, 0.12);
  color: rgba(34, 197, 94, 0.95);
  border: 1px solid rgba(34, 197, 94, 0.3);
}
.lab-status-pill--cancelado {
  background: rgba(239, 68, 68, 0.1);
  color: rgba(239, 68, 68, 0.9);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

/* Lab badge in history */
.lab-hist-badge { font-size: 0.72rem !important; font-weight: 900 !important; }

/* Print: solo el voucher */
@media print {
  body * { visibility: hidden; }
  .bm-voucher,
  .bm-voucher * { visibility: visible; }
  .bm-voucher {
    position: fixed;
    top: 0; left: 0;
    width: 100%;
    box-shadow: none;
    border-radius: 0;
    padding: 1.5rem;
  }
  .bm-voucher__actions { display: none; }
}
</style>
