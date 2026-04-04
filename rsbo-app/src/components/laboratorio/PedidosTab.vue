<template>
  <div class="columns is-multiline is-variable is-4">
    <!-- Columna principal: Inventario de referencia -->
    <div class="column is-8">
      <div class="panel">
        <div class="panel__head">
          <div>
            <h2 class="panel__title">
              Inventario
              <span class="panel__badge">{{ lab.selectedSheetLabel.value }}</span>
            </h2>
            <p class="panel__hint">
              Consulta el stock disponible mientras surtes los pedidos.
            </p>
          </div>

          <div class="panel__headActions">
            <b-field class="mb-0" label="Planilla">
              <b-select v-model="lab.selectedSheetId.value" expanded>
                <option v-for="s in lab.filteredSheets.value" :key="s.id" :value="s.id">
                  {{ lab.sheetTitle(s) }}
                </option>
              </b-select>
            </b-field>

            <b-button
              type="is-light"
              icon-left="download"
              :disabled="!lab.selectedSheetId.value"
              :loading="lab.loadingExportInv.value"
              @click="lab.exportInventoryCsv"
            >
              Excel
            </b-button>
          </div>
        </div>

        <div class="panel__body">
          <!-- Filtros -->
          <div class="columns is-multiline is-variable is-3 mb-2">
            <div class="column is-8">
              <b-field label="Buscar dentro de la planilla" class="mb-0">
                <b-input
                  v-model="lab.itemQuery.value"
                  icon="search"
                  placeholder="Parámetros (SPH, CYL, ADD, BASE) o código de barra…"
                />
              </b-field>
            </div>

            <div class="column is-4">
              <b-field label="Mostrar" class="mb-0">
                <b-select v-model="lab.stockFilter.value" expanded>
                  <option value="all">Todas las combinaciones</option>
                  <option value="withStock">Solo con stock</option>
                  <option value="zero">Sin stock</option>
                </b-select>
              </b-field>
            </div>
          </div>

          <b-loading :is-full-page="false" :active="lab.loadingItems.value" />

          <!-- Tabla de inventario -->
          <b-table
            :data="lab.filteredItems.value"
            :paginated="true"
            :per-page="15"
            :current-page.sync="inventoryPage"
            hoverable
            mobile-cards
            class="nice-table"
          >
            <b-table-column field="existencias" label="PZAS." width="110" v-slot="props">
              <span class="qty-pill" :class="props.row.existencias > 0 ? 'qty-pill--ok' : 'qty-pill--zero'">
                {{ props.row.existencias }}
              </span>
            </b-table-column>

            <b-table-column field="product" label="PRODUCTO" v-slot="props">
              <div class="prod">
                <div class="prod__name">{{ lab.buildRowTitle(props.row, lab.selectedSheet.value) }}</div>
                <div class="prod__meta">
                  <span class="meta-k">
                    <i class="fas fa-barcode mr-1"></i>
                    <span class="mono big-code">{{ props.row.codebar || "sin código" }}</span>
                  </span>
                  <span class="mica-type-badge">
                    {{ lab.getMicaTypeName(lab.selectedSheet.value?.tipo_matriz) }}
                  </span>
                </div>
              </div>
            </b-table-column>

            <b-table-column field="actions" label="" width="150" v-slot="props">
              <div class="is-flex is-justify-content-flex-end is-align-items-center" style="gap: 0.4rem">
                <b-button
                  size="is-small"
                  type="is-light"
                  icon-left="eye"
                  :disabled="!props.row.codebar || !lab.isEan13(props.row.codebar)"
                  @click="lab.openBarcode(props.row.codebar)"
                >
                  Ver
                </b-button>

                <b-button
                  size="is-small"
                  type="is-light"
                  icon-left="copy"
                  :disabled="!props.row.codebar"
                  @click="lab.copyCodebar(props.row.codebar)"
                >
                  Copiar
                </b-button>
              </div>
            </b-table-column>
          </b-table>

          <div v-if="!lab.filteredItems.value.length && !lab.loadingItems.value" class="empty">
            <i class="fas fa-inbox empty__icon"></i>
            <p class="empty__title">No hay resultados</p>
            <p class="empty__text">Prueba cambiar el filtro o la búsqueda.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Panel lateral: Pedidos y Surtir -->
    <div class="column is-4">

      <!-- ── Lista de pedidos (selector de tarjetas) ── -->
      <div class="panel">
        <div class="panel__head panel__head--compact">
          <div>
            <h3 class="panel__title mb-0">
              <i class="fas fa-clipboard-list mr-2"></i>
              Pedidos
              <span class="panel__badge">{{ lab.ordersDB.value.length }}</span>
            </h3>
            <p class="panel__hint mt-1">Selecciona un pedido para surtirlo.</p>
          </div>
          <b-button
            size="is-small"
            type="is-light"
            icon-left="sync"
            :loading="lab.loadingOrders.value"
            @click="lab.refreshAll"
          />
        </div>

        <div class="panel__body" style="padding: 0.65rem">
          <!-- Filtro de estado -->
          <b-field class="mb-2">
            <b-select v-model="lab.orderStatusFilter.value" expanded size="is-small">
              <option value="open">Pendientes / En proceso</option>
              <option value="cerrado">Cerrados</option>
              <option value="cancelado">Cancelados</option>
              <option value="all">Todos</option>
            </b-select>
          </b-field>

          <div v-if="lab.loadingOrders.value" class="empty empty--mini">
            <b-loading :is-full-page="false" :active="true" />
            <div style="height:60px"></div>
          </div>

          <div v-else-if="!lab.ordersDB.value.length" class="empty empty--mini">
            <i class="fas fa-hand-pointer empty__icon"></i>
            <p class="empty__title">Sin pedidos</p>
            <p class="empty__text">Los pedidos creados desde Ventas aparecen aquí.</p>
          </div>

          <div v-else class="order-card-list">
            <div
              v-for="o in lab.ordersDB.value"
              :key="o.id"
              class="order-card"
              :class="{
                'order-card--active': lab.selectedOrderId.value === o.id,
                'order-card--done': o.status === 'cerrado',
                'order-card--cancelled': o.status === 'cancelado'
              }"
              @click="lab.selectedOrderId.value = o.id"
            >
              <div class="order-card__top">
                <span class="order-card__folio mono">{{ o.folio }}</span>
                <span class="tag is-light order-card__tag" :class="lab.statusTagClass(o.status)">
                  {{ lab.statusHuman(o.status) }}
                </span>
              </div>
              <div class="order-card__cliente">{{ o.cliente }}</div>
              <div class="order-card__meta">
                <span>{{ lab.orderPickedCount(o) }}/{{ lab.orderTotalCount(o) }} pzas</span>
                <span>{{ o.createdAtShort }}</span>
              </div>
              <div class="progress-mini mt-1">
                <div
                  class="progress-mini__fill"
                  :style="{ width: lab.orderProgressPct(o) + '%' }"
                  :class="{ 'progress-mini__fill--done': o.status === 'cerrado' }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Detalle + Surtir ── -->
      <div class="panel mt-4" v-if="lab.selectedOrder.value">
        <div class="panel__head panel__head--compact">
          <div>
            <h3 class="panel__title mb-0">
              <i class="fas fa-qrcode mr-2"></i>
              Surtir pedido
            </h3>
            <p class="panel__hint mt-1">
              <b>{{ lab.selectedOrder.value.folio }}</b> ·
              {{ lab.selectedOrder.value.cliente }}
            </p>
          </div>
        </div>

        <div class="panel__body">
          <!-- Progress -->
          <div class="mini-order-head mb-3">
            <div class="progress-bar">
              <div class="progress-bar__fill" :style="{ width: lab.orderProgressPct(lab.selectedOrder.value) + '%' }" />
            </div>
            <div class="mini-order-sub mt-1 is-flex is-justify-content-space-between">
              <span>
                <b>{{ lab.orderPickedCount(lab.selectedOrder.value) }}</b>/
                <b>{{ lab.orderTotalCount(lab.selectedOrder.value) }}</b> surtidas
              </span>
              <span>{{ lab.orderProgressPct(lab.selectedOrder.value) }}%</span>
            </div>

            <div v-if="lab.isOrderComplete(lab.selectedOrder.value)" class="complete-badge mt-2">
              <i class="fas fa-check-circle mr-2"></i>
              ¡Pedido completado! Listo para cerrar.
            </div>

            <div class="columns is-mobile is-variable is-2 mt-2">
              <div class="column">
                <b-button type="is-light" expanded icon-left="download" size="is-small"
                  @click="lab.exportOrderCsv(lab.selectedOrder.value)">Excel</b-button>
              </div>
              <div class="column">
                <b-button type="is-light" expanded icon-left="print" size="is-small"
                  @click="lab.printOrder(lab.selectedOrder.value)">PDF</b-button>
              </div>
            </div>
          </div>

          <!-- Scanner -->
          <b-field label="Código (EAN-13)" class="mb-2">
            <b-input
              v-model="lab.scanCode.value"
              placeholder="Escanea o escribe el código…"
              icon="barcode"
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
                :disabled="!lab.scanCode.value || !lab.selectedOrder.value"
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
              <span class="micas-count">{{ lab.selectedOrder.value.lines?.length || 0 }}</span>
            </div>

            <div class="order-lines mt-2">
              <article
                v-for="l in lab.selectedOrder.value.lines"
                :key="l.id"
                class="order-line"
                :class="{ 'order-line--done': l.picked >= l.qty }"
              >
                <div class="order-line__top">
                  <div class="order-line__title">
                    {{ lab.lineHuman(l, lab.sheetById(l.lineSheetId || lab.selectedOrder.value.sheetId)) }}
                    <div class="mica-meta-row mt-1">
                      <span class="mica-type-tag">{{ l.micaType || lab.getMicaTypeName(l.tipoMatriz) }}</span>
                      <span class="order-line__sub">{{ l.picked }}/{{ l.qty }} surtidas</span>
                    </div>
                  </div>
                  <span class="tag is-light qty-tag" :class="l.picked >= l.qty ? 'is-success' : ''">
                    {{ l.picked >= l.qty ? "✓ OK" : "Pendiente" }}
                  </span>
                </div>
              </article>
            </div>

            <div class="mt-3">
              <b-button
                type="is-light"
                expanded
                icon-left="redo"
                :loading="lab.loadingReset.value"
                :disabled="!lab.selectedOrder.value"
                @click="askReset"
              >
                Reiniciar surtido
              </b-button>

              <b-button
                class="mt-2"
                type="is-primary"
                expanded
                icon-left="lock"
                :disabled="!lab.selectedOrder.value || !lab.isOrderComplete(lab.selectedOrder.value)"
                :loading="lab.loadingCloseOrder.value"
                @click="askClose"
              >
                Cerrar pedido
              </b-button>

              <b-button
                class="mt-2"
                type="is-warning"
                expanded
                outlined
                icon-left="exclamation-triangle"
                :disabled="!lab.selectedOrder.value"
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

      <!-- Empty surtir state -->
      <div v-else class="panel mt-4">
        <div class="panel__body">
          <div class="empty empty--mini">
            <i class="fas fa-hand-pointer empty__icon"></i>
            <p class="empty__title">Sin pedido seleccionado</p>
            <p class="empty__text">Selecciona un pedido de la lista de arriba para surtirlo.</p>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- Confirmar: Reiniciar surtido -->
  <teleport to="body">
    <b-modal v-model="confirmResetOpen" has-modal-card :width="420" trap-focus scroll="keep">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">
            <i class="fas fa-redo mr-2"></i>Reiniciar surtido
          </p>
        </header>
        <section class="modal-card-body">
          <p>
            ¿Confirmas reiniciar el surtido del pedido
            <strong>{{ lab.selectedOrder.value?.folio }}</strong>?
            Se eliminarán todos los escaneos registrados y el pedido volverá a estado
            <em>pendiente</em>.
          </p>
        </section>
        <footer class="modal-card-foot" style="gap: 0.5rem">
          <b-button type="is-warning" icon-left="redo" @click="doReset">
            Sí, reiniciar
          </b-button>
          <b-button @click="confirmResetOpen = false">Cancelar</b-button>
        </footer>
      </div>
    </b-modal>

    <!-- Confirmar: Cerrar pedido -->
    <b-modal v-model="confirmCloseOpen" has-modal-card :width="420" trap-focus scroll="keep">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">
            <i class="fas fa-lock mr-2"></i>Cerrar pedido
          </p>
        </header>
        <section class="modal-card-body">
          <p>
            ¿Confirmas cerrar el pedido
            <strong>{{ lab.selectedOrder.value?.folio }}</strong>?
            Esta acción es <strong>irreversible</strong> y marcará el pedido como completado.
          </p>
        </section>
        <footer class="modal-card-foot" style="gap: 0.5rem">
          <b-button type="is-primary" icon-left="lock" @click="doClose">
            Sí, cerrar
          </b-button>
          <b-button @click="confirmCloseOpen = false">Cancelar</b-button>
        </footer>
      </div>
    </b-modal>
  </teleport>
</template>

<script setup>
import { inject, ref, watch } from "vue";

const lab = inject("lab");
if (!lab) throw new Error("PedidosTab necesita provide('lab', ...)");

const inventoryPage = ref(1);
watch([() => lab.itemQuery.value, () => lab.stockFilter.value, () => lab.selectedSheetId.value], () => {
  inventoryPage.value = 1;
});

// Confirmaciones para acciones destructivas
const confirmResetOpen = ref(false);
const confirmCloseOpen = ref(false);

function askReset() {
  if (!lab.selectedOrder.value) return;
  confirmResetOpen.value = true;
}

function doReset() {
  confirmResetOpen.value = false;
  lab.resetPickedForSelectedOrder();
}

function askClose() {
  if (!lab.selectedOrder.value || !lab.isOrderComplete(lab.selectedOrder.value)) return;
  confirmCloseOpen.value = true;
}

function doClose() {
  confirmCloseOpen.value = false;
  lab.closeSelectedOrder();
}
</script>

<style scoped>
/* Order card list */
.order-card-list {
  display: grid;
  gap: 0.5rem;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 0.15rem;
}

.order-card {
  border: 1.5px solid var(--border);
  border-radius: 14px;
  padding: 0.7rem 0.85rem;
  background: var(--surface);
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
}

.order-card:hover {
  border-color: rgba(144, 111, 225, 0.45);
  background: var(--c-primary-alpha);
}

.order-card--active {
  border-color: rgba(144, 111, 225, 0.7);
  background: rgba(144, 111, 225, 0.08);
  box-shadow: 0 0 0 3px rgba(144, 111, 225, 0.15);
}

.order-card--done {
  border-color: rgba(34, 197, 94, 0.35);
  background: rgba(34, 197, 94, 0.04);
}

.order-card--cancelled {
  opacity: 0.55;
}

.order-card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.2rem;
}

.order-card__folio {
  font-size: 0.82rem;
  font-weight: 1000;
  color: var(--text-primary);
}

.order-card__tag {
  font-size: 0.7rem !important;
  padding: 0.1rem 0.45rem !important;
}

.order-card__cliente {
  font-size: 0.88rem;
  font-weight: 900;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-card__meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--text-muted);
  margin-top: 0.2rem;
}

/* Progress bars */
.progress-mini {
  height: 4px;
  border-radius: 999px;
  background: var(--border);
  overflow: hidden;
}

.progress-mini__fill {
  height: 100%;
  border-radius: 999px;
  background: var(--c-primary);
  transition: width 300ms ease;
}

.progress-mini__fill--done {
  background: var(--c-success, #22c55e);
}

.progress-bar {
  height: 6px;
  border-radius: 999px;
  background: var(--border);
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--c-primary), #ec4899);
  border-radius: 999px;
  transition: width 300ms ease;
}

/* Complete badge */
.complete-badge {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.65rem;
  background: var(--c-success-alpha);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 12px;
  font-size: 0.82rem;
  font-weight: 900;
  color: var(--c-success);
}

/* Mica type tags */
.mica-type-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: var(--c-primary-alpha);
  border: 1px solid rgba(144, 111, 225, 0.25);
  font-size: 0.72rem;
  font-weight: 900;
  color: var(--c-primary);
}

.mica-type-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.4rem;
  border-radius: 8px;
  background: var(--c-info-alpha);
  border: 1px solid rgba(59, 130, 246, 0.2);
  font-size: 0.7rem;
  font-weight: 900;
  color: var(--c-info);
  margin-left: 0.35rem;
}

.mica-meta-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.micas-section-label {
  display: flex;
  align-items: center;
  font-size: 0.82rem;
  font-weight: 1000;
  color: var(--text-primary);
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.micas-count {
  margin-left: 0.4rem;
  background: var(--c-primary-alpha);
  border: 1px solid rgba(144, 111, 225, 0.25);
  border-radius: 999px;
  padding: 0.05rem 0.45rem;
  font-size: 0.72rem;
  font-weight: 900;
}

.mini-order-sub {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--text-muted);
}

.order-lines { display: grid; gap: 0.5rem; }

.order-line {
  border: 1.5px solid var(--border);
  border-radius: 14px;
  padding: 0.65rem 0.75rem;
  background: var(--surface);
  transition: border-color 120ms ease;
}

.order-line--done {
  border-color: rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.04);
}

.order-line__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.order-line__title { font-weight: 950; color: var(--text-primary); font-size: 0.88rem; }

.order-line__sub {
  display: block;
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--text-muted);
  margin-top: 0.1rem;
}

.qty-tag { font-size: 0.72rem !important; white-space: nowrap; }
</style>
