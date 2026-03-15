<template>
  <div class="columns is-multiline is-variable is-4">
    <!-- Columna principal: Inventario -->
    <div class="column is-8">
      <div class="panel">
        <div class="panel__head">
          <div>
            <h2 class="panel__title">
              Inventario
              <span class="panel__badge">{{ lab.selectedSheetLabel.value }}</span>
            </h2>
            <p class="panel__hint">
              Arma el pedido desde inventario. Puedes mezclar micas de distintas planillas en un mismo pedido.
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
              CSV
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

            <b-table-column field="actions" label="" width="235" v-slot="props">
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

                <b-button
                  size="is-small"
                  type="is-primary"
                  icon-left="plus"
                  :disabled="props.row.existencias <= 0"
                  @click="lab.addToDraft(props.row)"
                >
                  Agregar
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

    <!-- Panel lateral: Modo + Crear / Surtir -->
    <div class="column is-4">
      <div class="panel panel--sticky">
        <div class="panel__head panel__head--compact">
          <div>
            <h3 class="panel__title mb-0">
              <i class="fas fa-sliders-h mr-2"></i>
              Modo
            </h3>
            <p class="panel__hint mt-1">Crear pedido o surtir por escaneo.</p>
          </div>

          <div class="panel__headActions">
            <b-button
              size="is-small"
              :type="lab.mode.value === 'crear' ? 'is-primary' : 'is-light'"
              icon-left="cart-plus"
              @click="lab.mode.value = 'crear'"
            >
              Crear
            </b-button>
            <b-button
              size="is-small"
              :type="lab.mode.value === 'surtir' ? 'is-primary' : 'is-light'"
              icon-left="barcode"
              @click="lab.mode.value = 'surtir'"
            >
              Surtir
            </b-button>
          </div>
        </div>
      </div>

      <!-- ===== CREAR ===== -->
      <div v-if="lab.mode.value === 'crear'" class="panel mt-4">
        <div class="panel__head panel__head--compact">
          <div>
            <h3 class="panel__title mb-0"><i class="fas fa-shopping-cart mr-2"></i>Pedido en curso</h3>
            <p class="panel__hint mt-1">Puedes agregar micas de distintas planillas.</p>
          </div>

          <b-button
            size="is-small"
            type="is-light"
            icon-left="trash"
            :disabled="!lab.draftLines.value.length"
            @click="lab.clearDraft"
          >
            Limpiar
          </b-button>
        </div>

        <div class="panel__body">
          <b-field label="Cliente" class="mb-2">
            <b-input v-model="lab.draftCliente.value" placeholder="Ej: Óptica Rivera" icon="building" />
          </b-field>

          <b-field label="Referencia/nota" class="mb-2">
            <b-input v-model="lab.draftNote.value" placeholder="Opcional" icon="sticky-note" />
          </b-field>

          <div v-if="!lab.draftLines.value.length" class="empty empty--mini">
            <i class="fas fa-glasses empty__icon"></i>
            <p class="empty__title">Sin micas</p>
            <p class="empty__text">
              Agrega micas desde la tabla de inventario. Puedes mezclar progresivos, bifocales y
              monofocales.
            </p>
          </div>

          <div v-else class="order-lines">
            <article v-for="l in lab.draftLines.value" :key="l.key" class="order-line">
              <div class="order-line__top">
                <div class="order-line__title">
                  {{ l.title }}
                  <div class="mica-meta-row mt-1">
                    <span class="mica-type-tag">{{ l.micaType }}</span>
                    <span class="order-line__sub">
                      <i class="fas fa-layer-group mr-1"></i>{{ l.sheetName }}
                    </span>
                  </div>
                </div>
                <b-button size="is-small" type="is-text" icon-left="times" @click="lab.removeDraftLine(l.key)" />
              </div>

              <div class="order-line__bottom">
                <div class="qty-control">
                  <b-button size="is-small" @click="lab.decDraftQty(l.key)" icon-left="minus" />
                  <b-input type="number" min="1" v-model.number="l.qty" class="qty-input" />
                  <b-button size="is-small" @click="lab.incDraftQty(l.key)" icon-left="plus" />
                </div>
                <span class="stock-hint">stock: <b>{{ l.stock }}</b></span>
              </div>
            </article>
          </div>

          <!-- Resumen del draft -->
          <div v-if="lab.draftLines.value.length" class="draft-summary">
            <span>
              {{ lab.draftLines.value.length }} mica{{ lab.draftLines.value.length !== 1 ? "s" : "" }}
            </span>
            <span>
              {{ lab.draftLines.value.reduce((a, l) => a + Number(l.qty || 0), 0) }} piezas totales
            </span>
          </div>

          <!-- Desglose por tipo -->
          <div v-if="mixedTypes.length > 1" class="mica-breakdown mt-2">
            <div v-for="t in mixedTypes" :key="t.type" class="mica-breakdown__row">
              <span class="mica-type-tag mica-type-tag--sm">{{ t.type }}</span>
              <span class="muted">{{ t.count }} mica{{ t.count !== 1 ? "s" : "" }} · {{ t.qty }} pzas</span>
            </div>
          </div>

          <div class="mt-3">
            <b-button
              type="is-primary"
              expanded
              icon-left="clipboard-check"
              :disabled="!lab.canCreateOrder.value"
              :loading="lab.loadingCreateOrder.value"
              @click="lab.createOrderFromDraft"
            >
              Crear pedido
            </b-button>

            <b-button
              class="mt-2"
              type="is-light"
              expanded
              icon-left="exchange-alt"
              :disabled="!lab.ordersDB.value.length"
              @click="lab.mode.value = 'surtir'"
            >
              Ir a surtir
            </b-button>
          </div>
        </div>
      </div>

      <!-- ===== SURTIR ===== -->
      <div v-else class="panel mt-4">
        <div class="panel__head panel__head--compact">
          <div>
            <h3 class="panel__title mb-0"><i class="fas fa-qrcode mr-2"></i>Surtir por escaneo</h3>
            <p class="panel__hint mt-1">Escanea el código → salida en inventario + progreso (DB).</p>
          </div>
        </div>

        <div class="panel__body">
          <b-field label="Selecciona pedido" class="mb-2">
            <b-select v-model="lab.selectedOrderId.value" expanded>
              <option v-for="o in lab.ordersDB.value" :key="o.id" :value="o.id">
                {{ o.folio }} · {{ o.cliente }} · {{ lab.statusHuman(o.status) }}
              </option>
            </b-select>
          </b-field>

          <div v-if="lab.selectedOrder.value" class="mini-order-head mb-3">
            <div class="mini-order-title">
              <b>{{ lab.selectedOrder.value.folio }}</b>
              <span class="tag is-light ml-2" :class="lab.statusTagClass(lab.selectedOrder.value.status)">
                {{ lab.statusHuman(lab.selectedOrder.value.status) }}
              </span>
            </div>
            <div class="mini-order-sub">
              {{ lab.selectedOrder.value.cliente }}
              · {{ lab.selectedOrder.value.createdAtShort }}
            </div>

            <div class="progress-bar mt-2">
              <div class="progress-bar__fill" :style="{ width: lab.orderProgressPct(lab.selectedOrder.value) + '%' }" />
            </div>
            <div class="mini-order-sub mt-1 is-flex is-justify-content-space-between">
              <span><b>{{ lab.orderPickedCount(lab.selectedOrder.value) }}</b>/<b>{{ lab.orderTotalCount(lab.selectedOrder.value) }}</b> surtidas</span>
              <span>{{ lab.orderProgressPct(lab.selectedOrder.value) }}%</span>
            </div>

            <div v-if="lab.isOrderComplete(lab.selectedOrder.value)" class="complete-badge mt-2">
              <i class="fas fa-check-circle mr-2"></i>
              ¡Pedido completado! Listo para cerrar.
            </div>

            <div class="columns is-mobile is-variable is-2 mt-2">
              <div class="column">
                <b-button type="is-light" expanded icon-left="download" @click="lab.exportOrderCsv(lab.selectedOrder.value)">
                  CSV
                </b-button>
              </div>
              <div class="column">
                <b-button type="is-light" expanded icon-left="print" @click="lab.printOrder(lab.selectedOrder.value)">
                  PDF
                </b-button>
              </div>
            </div>
          </div>

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
          <div v-if="lab.selectedOrder.value" class="mt-3">
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
                @click="lab.resetPickedForSelectedOrder"
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
                @click="lab.closeSelectedOrder"
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
                Gestionar / eliminar entradas
              </b-button>
            </div>
          </div>

          <div v-else class="empty empty--mini">
            <i class="fas fa-hand-pointer empty__icon"></i>
            <p class="empty__title">Sin pedido seleccionado</p>
            <p class="empty__text">Selecciona uno arriba para surtir.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject, ref, computed, watch } from "vue";

const lab = inject("lab");
if (!lab) throw new Error("PedidosTab necesita provide('lab', ...)");

const inventoryPage = ref(1);
watch([() => lab.itemQuery.value, () => lab.stockFilter.value, () => lab.selectedSheetId.value], () => {
  inventoryPage.value = 1;
});

const mixedTypes = computed(() => {
  const map = new Map();
  for (const l of lab.draftLines.value || []) {
    const t = l.micaType || "—";
    if (!map.has(t)) map.set(t, { type: t, count: 0, qty: 0 });
    const entry = map.get(t);
    entry.count += 1;
    entry.qty += Number(l.qty || 0);
  }
  return [...map.values()];
});
</script>

<style scoped>
.draft-summary {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0.65rem;
  margin-top: 0.6rem;
  background: var(--c-primary-alpha);
  border: 1px solid rgba(144, 111, 225, 0.2);
  border-radius: 12px;
  font-size: 0.82rem;
  font-weight: 900;
  color: var(--text-primary);
}

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

.mica-type-tag--sm {
  font-size: 0.68rem;
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

.mica-breakdown {
  background: rgba(148, 163, 184, 0.06);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.5rem 0.65rem;
  display: grid;
  gap: 0.3rem;
}

.mica-breakdown__row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  font-weight: 800;
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
</style>