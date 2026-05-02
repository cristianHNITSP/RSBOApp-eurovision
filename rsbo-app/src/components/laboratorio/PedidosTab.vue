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
              <SheetPickerInput
                v-model="lab.selectedSheetId.value"
                :sheet-title="lab.sheetTitle"
                :search-fn="lab.searchSheets"
                :results="lab.sheetSearchResults.value"
                :loading="lab.sheetSearchLoading.value"
              />
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
            <i class="fas fa-search empty__icon muted"></i>
            <p class="empty__title">No se encontraron micas</p>
            <p class="empty__text">
              No hay coincidencias con el filtro 
              <b>"{{ lab.stockFilter.value === 'withStock' ? 'Solo con stock' : lab.stockFilter.value === 'zero' ? 'Sin stock' : 'Todos' }}"</b>
              {{ lab.itemQuery.value ? 'y la búsqueda "' + lab.itemQuery.value + '"' : '' }}.
            </p>
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
            <div class="spacer-lg"></div>
          </div>

          <div v-else-if="!lab.ordersDB.value.length" class="empty empty--mini">
            <i class="fas fa-hand-pointer empty__icon"></i>
            <p class="empty__title">Sin pedidos</p>
            <p class="empty__text">Los pedidos creados desde Ventas aparecen aquí.</p>
          </div>

          <div v-else-if="!lab.filteredOrders.value.length" class="empty empty--mini">
            <i class="fas fa-search empty__icon muted"></i>
            <p class="empty__title">Sin resultados</p>
            <p class="empty__text">{{ emptyMessage }}</p>
          </div>

          <div v-else class="order-card-list">
            <div
              v-for="o in lab.filteredOrders.value"
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
      <OrderDetail 
        :order="lab.selectedOrder.value" 
        @ask-reset="askReset" 
        @ask-close="askClose"
      />

      <!-- Empty surtir state -->
      <div v-if="!lab.selectedOrder.value" class="panel mt-4">
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
import { inject, ref, watch, computed } from "vue";
import OrderDetail from "./pedidos/OrderDetail.vue";
import SheetPickerInput from "@/components/ui/SheetPickerInput.vue";
import "./laboratorio-shared.css";
import "./PedidosTab.css";

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

const emptyMessage = computed(() => {
  const f = lab.orderStatusFilter.value;
  if (f === "open") return "No hay pedidos pendientes.";
  if (f === "cerrado") return "No hay pedidos cerrados.";
  if (f === "cancelado") return "No hay pedidos cancelados.";
  return "No se encontraron pedidos.";
});
</script>
