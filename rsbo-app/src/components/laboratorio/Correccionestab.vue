<template>
  <div class="columns is-multiline is-variable is-4">

    <!-- ── Lista de pedidos ── -->
    <div class="column is-7">
      <div class="panel">
        <div class="panel__head">
          <div>
            <h2 class="panel__title">
              <i class="fas fa-tools mr-2" style="color: rgba(245, 158, 11, 0.85)"></i>
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
            <div style="height: 60px"></div>
          </div>

          <div v-else-if="!lab.ordersDB.value.length" class="empty">
            <i class="fas fa-check-circle empty__icon" style="color: rgba(34, 197, 94, 0.7)"></i>
            <p class="empty__title">Sin pedidos</p>
            <p class="empty__text">No hay pedidos con el filtro actual.</p>
          </div>

          <div v-else class="mgmt-list">
            <div
              v-for="o in lab.ordersDB.value"
              :key="o.id"
              class="mgmt-card"
              :class="{
                'mgmt-card--selected': o.id === selectedOrderId,
                'mgmt-card--done': o.status === 'cerrado',
                'mgmt-card--cancelled': o.status === 'cancelado'
              }"
              @click="selectOrder(o.id)"
            >
              <div class="mgmt-card__head">
                <span class="mgmt-card__folio mono">{{ o.folio }}</span>
                <span class="tag is-light" :class="lab.statusTagClass(o.status)">
                  {{ lab.statusHuman(o.status) }}
                </span>
              </div>
              <div class="mgmt-card__cliente">{{ o.cliente }}</div>
              <div class="mgmt-card__meta">
                <span><i class="fas fa-glasses mr-1"></i>{{ o.lines?.length || 0 }} micas · {{ lab.orderTotalCount(o) }} pzas</span>
                <span>{{ o.createdAtShort }}</span>
              </div>
              <div class="progress-mini mt-1">
                <div class="progress-mini__fill" :style="{ width: lab.orderProgressPct(o) + '%' }" />
              </div>
            </div>
          </div>
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

          <template v-else>
            <!-- Resumen -->
            <div class="order-summary mb-3">
              <div class="order-summary__row">
                <span class="mono font-bold">{{ selectedOrder.folio }}</span>
                <span class="tag is-light" :class="lab.statusTagClass(selectedOrder.status)">
                  {{ lab.statusHuman(selectedOrder.status) }}
                </span>
              </div>
              <div class="order-summary__meta">
                <div><i class="fas fa-building mr-1"></i><b>{{ selectedOrder.cliente }}</b></div>
                <div><i class="fas fa-clock mr-1"></i>{{ selectedOrder.createdAtShort }}</div>
                <div>
                  <i class="fas fa-glasses mr-1"></i>
                  {{ selectedOrder.lines?.length || 0 }} mica(s) ·
                  {{ lab.orderPickedCount(selectedOrder) }}/{{ lab.orderTotalCount(selectedOrder) }} surtidas
                </div>
              </div>
            </div>

            <!-- EDITAR (solo si no cerrado/cancelado) -->
            <template v-if="selectedOrder.status !== 'cerrado' && selectedOrder.status !== 'cancelado'">

              <!-- Toggle edición -->
              <b-button
                :type="editMode ? 'is-warning' : 'is-light'"
                expanded
                :icon-left="editMode ? 'times' : 'edit'"
                class="mb-3"
                @click="toggleEditMode"
              >
                {{ editMode ? "Cancelar edición" : "Editar pedido" }}
              </b-button>

              <template v-if="editMode">
                <!-- Editar cliente y nota -->
                <b-field label="Cliente" class="mb-2">
                  <b-input v-model="editCliente" icon="building" placeholder="Nombre del cliente" />
                </b-field>

                <b-field label="Referencia / nota" class="mb-3">
                  <b-input v-model="editNote" icon="sticky-note" placeholder="Opcional" />
                </b-field>

                <!-- Editar líneas -->
                <div class="lines-editor mb-3">
                  <div class="lines-editor__head">
                    <span>Micas del pedido</span>
                    <span class="muted" style="font-size:0.78rem">qty mínima = piezas ya surtidas</span>
                  </div>

                  <div class="edit-line" v-for="el in editLines" :key="el.lineId">
                    <div class="edit-line__info">
                      <div class="edit-line__title">
                        {{ lab.lineHuman(el, lab.sheetById(el.lineSheetId || selectedOrder.sheetId)) }}
                      </div>
                      <div class="edit-line__meta">
                        <span class="mica-type-tag-sm">{{ el.micaType || "—" }}</span>
                        <span class="muted" style="font-size:0.75rem">{{ el.picked }}/{{ el.qty }} surtidas</span>
                      </div>
                    </div>
                    <div class="edit-line__controls">
                      <b-button
                        size="is-small"
                        type="is-light"
                        icon-left="minus"
                        :disabled="el.qty <= Math.max(1, el.picked)"
                        @click="el.qty = Math.max(Math.max(1, el.picked), el.qty - 1)"
                      />
                      <span class="edit-line__qty mono">{{ el.qty }}</span>
                      <b-button
                        size="is-small"
                        type="is-light"
                        icon-left="plus"
                        @click="el.qty++"
                      />
                      <b-button
                        size="is-small"
                        type="is-danger"
                        outlined
                        icon-left="trash"
                        :disabled="el.picked > 0"
                        :title="el.picked > 0 ? 'Ya tiene piezas surtidas' : 'Eliminar línea'"
                        @click="removeLine(el.lineId)"
                      />
                    </div>
                  </div>
                </div>

                <b-button
                  type="is-warning"
                  expanded
                  icon-left="save"
                  :loading="lab.loadingEditOrder?.value"
                  :disabled="!editCliente.trim() || editLines.length === 0"
                  @click="saveEdit"
                >
                  Guardar cambios
                </b-button>
              </template>
            </template>

            <hr class="soft-hr" />

            <!-- CANCELAR (con rollback de stock) -->
            <div v-if="selectedOrder.status !== 'cancelado'">
              <div v-if="lab.orderPickedCount(selectedOrder) > 0" class="rollback-hint mb-2">
                <i class="fas fa-info-circle mr-1"></i>
                Se devolverán <b>{{ lab.orderPickedCount(selectedOrder) }}</b> pzas al inventario al cancelar.
              </div>

              <b-button
                type="is-danger"
                expanded
                outlined
                icon-left="ban"
                :loading="lab.loadingCancelOrder.value"
                @click="confirmCancel(selectedOrder.id, selectedOrder.folio)"
              >
                Cancelar pedido y devolver stock
              </b-button>
            </div>

            <div v-else class="cancelled-note">
              <i class="fas fa-ban mr-2"></i>
              Este pedido ya fue cancelado.
            </div>

          </template>
        </div>
      </div>
    </div>

    <!-- ── Modal confirmación cancelar ── -->
    <teleport to="body">
      <b-modal v-model="showConfirm" has-modal-card trap-focus :destroy-on-hide="true" aria-modal>
        <div class="modal-card" style="max-width: 420px; width: 100%">
          <header class="modal-card-head" style="background: rgba(254, 226, 226, 0.9)">
            <p class="modal-card-title" style="color: rgba(127, 29, 29, 0.9)">
              <i class="fas fa-exclamation-triangle mr-2" style="color: var(--c-danger)"></i>
              Confirmar cancelación
            </p>
            <button class="delete" @click="showConfirm = false"></button>
          </header>
          <section class="modal-card-body">
            <p>¿Cancelar el pedido <b class="mono">{{ confirmFolio }}</b>?</p>
            <p class="mt-2 muted" style="font-size: 0.85rem">
              Esta acción marcará el pedido como cancelado y devolverá el stock surtido al inventario. No se puede deshacer.
            </p>
          </section>
          <footer class="modal-card-foot">
            <b-button @click="showConfirm = false">No, cancelar</b-button>
            <b-button
              type="is-danger"
              icon-left="ban"
              :loading="lab.loadingCancelOrder.value"
              @click="executeCancel"
            >
              Sí, cancelar pedido
            </b-button>
          </footer>
        </div>
      </b-modal>
    </teleport>

  </div>
</template>

<script setup>
import { inject, ref, computed, watch } from "vue";

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
  editMode.value = false;
  syncEditState();
}

// ── Edit mode ──
const editMode   = ref(false);
const editCliente = ref("");
const editNote    = ref("");
const editLines   = ref([]);

function syncEditState() {
  if (!selectedOrder.value) return;
  editCliente.value = selectedOrder.value.cliente || "";
  editNote.value    = selectedOrder.value.note || "";
  editLines.value   = (selectedOrder.value.lines || []).map((l) => ({
    lineId:      l.lineId || l.id,
    qty:         Number(l.qty || 0),
    picked:      Number(l.picked || 0),
    tipoMatriz:  l.tipoMatriz,
    micaType:    l.micaType,
    lineSheetId: l.lineSheetId,
    codebar:     l.codebar,
    eye:         l.eye,
    params:      l.params || {}
  }));
}

function toggleEditMode() {
  editMode.value = !editMode.value;
  if (editMode.value) syncEditState();
}

function removeLine(lineId) {
  editLines.value = editLines.value.filter((l) => l.lineId !== lineId);
}

async function saveEdit() {
  if (!selectedOrder.value) return;
  const payload = {
    cliente: editCliente.value.trim(),
    note:    editNote.value.trim(),
    lines:   editLines.value.map((l) => ({ lineId: l.lineId, qty: l.qty }))
  };

  // Also handle removed lines (lines in selectedOrder that are not in editLines)
  const editIds = new Set(editLines.value.map((l) => l.lineId));
  for (const origLine of selectedOrder.value.lines || []) {
    const lineId = origLine.lineId || origLine.id;
    if (!editIds.has(lineId)) {
      payload.lines.push({ lineId, remove: true });
    }
  }

  try {
    await lab.editOrder(selectedOrder.value.id, payload);
    editMode.value = false;
  } catch {
    // error already toasted by editOrder
  }
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

async function executeCancel() {
  await lab.cancelOrderById(confirmId.value);
  showConfirm.value = false;
  if (selectedOrderId.value === confirmId.value) {
    selectedOrderId.value = "";
    editMode.value = false;
  }
  confirmId.value = "";
}

// Keep edit state in sync when order changes externally (e.g., after save)
watch(selectedOrder, (o) => {
  if (o && editMode.value) syncEditState();
}, { deep: true });
</script>

<style scoped>
/* Management list */
.mgmt-list {
  display: grid;
  gap: 0.55rem;
  max-height: 520px;
  overflow-y: auto;
  padding-right: 0.15rem;
}

.mgmt-card {
  border: 1.5px solid var(--border);
  border-radius: 14px;
  padding: 0.7rem 0.85rem;
  background: var(--surface);
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
}

.mgmt-card:hover {
  border-color: rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.04);
}

.mgmt-card--selected {
  border-color: rgba(245, 158, 11, 0.65);
  background: rgba(245, 158, 11, 0.07);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
}

.mgmt-card--done {
  border-color: rgba(34, 197, 94, 0.3);
  background: rgba(34, 197, 94, 0.04);
}

.mgmt-card--cancelled { opacity: 0.55; }

.mgmt-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.2rem;
}

.mgmt-card__folio {
  font-size: 0.82rem;
  font-weight: 1000;
  color: var(--text-primary);
}

.mgmt-card__cliente {
  font-size: 0.9rem;
  font-weight: 900;
  color: var(--text-primary);
}

.mgmt-card__meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--text-muted);
  margin-top: 0.2rem;
}

/* Progress mini */
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

/* Order summary */
.order-summary {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.85rem;
  background: var(--surface-overlay);
}

.order-summary__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 0.5rem;
}

.order-summary__meta {
  display: grid;
  gap: 0.2rem;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--text-muted);
}

/* Lines editor */
.lines-editor {
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
}

.lines-editor__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.55rem 0.75rem;
  background: var(--c-primary-alpha);
  font-size: 0.8rem;
  font-weight: 1000;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
}

.edit-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.edit-line:last-child { border-bottom: none; }

.edit-line__info { flex: 1; min-width: 0; }

.edit-line__title {
  font-size: 0.82rem;
  font-weight: 950;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.edit-line__meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.15rem;
}

.edit-line__controls {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
}

.edit-line__qty {
  min-width: 28px;
  text-align: center;
  font-weight: 1000;
  font-size: 0.9rem;
  color: var(--text-primary);
}

/* Mica type */
.mica-type-tag-sm {
  display: inline-flex;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  background: var(--c-primary-alpha);
  border: 1px solid rgba(144, 111, 225, 0.2);
  font-size: 0.68rem;
  font-weight: 900;
  color: var(--c-primary);
  flex-shrink: 0;
}

/* Rollback hint */
.rollback-hint {
  padding: 0.4rem 0.6rem;
  background: var(--c-danger-alpha);
  border: 1px solid rgba(239, 68, 68, 0.18);
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 900;
  color: var(--c-danger);
}

/* Cancelled note */
.cancelled-note {
  display: flex;
  align-items: center;
  padding: 0.6rem 0.75rem;
  background: rgba(148, 163, 184, 0.08);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 0.84rem;
  font-weight: 900;
  color: var(--text-muted);
}

/* Soft divider */
.soft-hr { border: none; border-top: 1px dashed var(--border); margin: 1rem 0; }

/* Font bold util */
.font-bold { font-weight: 1000; }
.muted { color: var(--text-muted); font-weight: 700; }
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
}

.empty { padding: 2rem 1rem; text-align: center; color: var(--text-muted); }
.empty--mini { padding: 1.2rem 0.75rem; }
.empty__icon { font-size: 1.6rem; color: rgba(144, 111, 225, 0.9); }
.empty__title { margin: 0.5rem 0 0; font-weight: 1000; color: var(--text-primary); }
.empty__text { margin: 0.25rem 0 0; font-weight: 800; }
</style>
