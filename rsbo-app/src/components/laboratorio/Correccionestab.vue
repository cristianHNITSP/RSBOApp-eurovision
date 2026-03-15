<template>
  <div class="columns is-multiline is-variable is-4">
    <!-- Lista de correcciones -->
    <div class="column is-8">
      <div class="panel">
        <div class="panel__head">
          <div>
            <h2 class="panel__title">
              <i class="fas fa-tools mr-2" style="color: rgba(245, 158, 11, 0.85)"></i>
              Correcciones enviadas
            </h2>
            <p class="panel__hint">
              Solicitudes registradas en el sistema. Aquí puedes ver el detalle y cancelar entradas con error.
            </p>
          </div>
          <b-button
            size="is-small"
            type="is-light"
            icon-left="sync"
            :loading="lab.loadingEvents.value"
            @click="lab.refreshAll"
          >
            Actualizar
          </b-button>
        </div>

        <div class="panel__body">
          <div v-if="lab.loadingEvents.value" class="empty">
            <b-loading :is-full-page="false" :active="true" />
            <div style="height: 80px"></div>
          </div>

          <div v-else-if="!lab.correctionEvents.value.length" class="empty">
            <i class="fas fa-check-circle empty__icon" style="color: rgba(34, 197, 94, 0.7)"></i>
            <p class="empty__title">Sin correcciones pendientes</p>
            <p class="empty__text">No hay solicitudes de corrección registradas en el sistema.</p>
          </div>

          <div v-else class="corr-list">
            <div
              v-for="c in lab.correctionEvents.value"
              :key="c.id"
              class="corr-card"
              :class="{ 'corr-card--selected': c.orderId === selectedCorrOrderId }"
              @click="selectedCorrOrderId = c.orderId || ''"
            >
              <div class="corr-card__head">
                <div class="corr-card__left">
                  <span class="corr-card__folio mono">
                    <i class="fas fa-receipt mr-1"></i>{{ c.folio }}
                  </span>
                  <span v-if="c.actorName !== '—'" class="corr-card__actor">
                    <i class="fas fa-user mr-1"></i>{{ c.actorName }}
                  </span>
                </div>
                <span class="corr-card__date">{{ c.at }}</span>
              </div>

              <div v-if="c.codebar" class="corr-card__code">
                <i class="fas fa-barcode mr-1"></i>
                <span class="mono">{{ c.codebar }}</span>
              </div>

              <div class="corr-card__msg">
                <i class="fas fa-comment-alt mr-1"></i>
                {{ c.message }}
              </div>

              <div class="corr-card__actions">
                <b-button
                  size="is-small"
                  type="is-danger"
                  outlined
                  icon-left="ban"
                  :loading="lab.loadingCancelOrder.value && c.orderId === cancelingId"
                  @click.stop="initCancel(c)"
                >
                  Cancelar esta entrada
                </b-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Panel lateral: Buscar y cancelar entradas -->
    <div class="column is-4">
      <div class="panel panel--sticky">
        <div class="panel__head panel__head--compact">
          <div>
            <h3 class="panel__title mb-0">
              <i class="fas fa-trash-alt mr-2" style="color: rgba(239, 68, 68, 0.8)"></i>
              Cancelar entrada
            </h3>
            <p class="panel__hint mt-1">
              Cancela un pedido incorrecto. El stock surtido se devuelve automáticamente al inventario.
            </p>
          </div>
        </div>

        <div class="panel__body">
          <b-field label="Buscar pedido" class="mb-3">
            <b-select v-model="selectedCorrOrderId" expanded>
              <option value="">— Selecciona —</option>
              <option
                v-for="o in lab.ordersDB.value.filter((o) => o.status !== 'cancelado')"
                :key="o.id"
                :value="o.id"
              >
                {{ o.folio }} · {{ o.cliente }} · {{ lab.statusHuman(o.status) }}
              </option>
            </b-select>
          </b-field>

          <div v-if="selectedOrder" class="corr-order-preview">
            <div class="corr-order-preview__head">
              <span class="mono font-bold">{{ selectedOrder.folio }}</span>
              <span class="tag is-light" :class="lab.statusTagClass(selectedOrder.status)">
                {{ lab.statusHuman(selectedOrder.status) }}
              </span>
            </div>

            <div class="corr-order-preview__meta">
              <div><i class="fas fa-building mr-1"></i><b>{{ selectedOrder.cliente }}</b></div>
              <div><i class="fas fa-clock mr-1"></i>{{ selectedOrder.createdAtShort }}</div>
              <div>
                <i class="fas fa-glasses mr-1"></i>
                {{ selectedOrder.lines?.length || 0 }} mica{{ (selectedOrder.lines?.length || 0) !== 1 ? "s" : "" }}
                · {{ lab.orderTotalCount(selectedOrder) }} pzas
              </div>
              <div v-if="lab.orderPickedCount(selectedOrder) > 0" class="corr-order-preview__rollback-hint">
                <i class="fas fa-info-circle mr-1"></i>
                Se devolverán {{ lab.orderPickedCount(selectedOrder) }} pzas al inventario.
              </div>
            </div>

            <!-- Micas del pedido -->
            <div class="corr-micas-list mt-2">
              <div v-for="l in selectedOrder.lines" :key="l.id" class="corr-mica-item">
                <span class="mica-type-tag-sm">{{ l.micaType || lab.getMicaTypeName(l.tipoMatriz) }}</span>
                <span class="muted">{{ lab.lineHuman(l, lab.sheetById(l.lineSheetId || selectedOrder.sheetId)) }}</span>
                <span class="corr-mica-qty">{{ l.picked }}/{{ l.qty }}</span>
              </div>
            </div>

            <b-button
              class="mt-3"
              type="is-danger"
              expanded
              icon-left="ban"
              :loading="lab.loadingCancelOrder.value"
              :disabled="!selectedCorrOrderId"
              @click="confirmCancel(selectedCorrOrderId, selectedOrder.folio)"
            >
              Cancelar y devolver stock
            </b-button>
          </div>

          <div v-else class="empty empty--mini">
            <i class="fas fa-hand-pointer empty__icon"></i>
            <p class="empty__title">Sin selección</p>
            <p class="empty__text">Selecciona un pedido o haz click en una corrección para gestionarlo.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación -->
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
              Sí, cancelar entrada
            </b-button>
          </footer>
        </div>
      </b-modal>
    </teleport>
  </div>
</template>

<script setup>
import { inject, ref, computed } from "vue";

const lab = inject("lab");
if (!lab) throw new Error("CorreccionesTab necesita provide('lab', ...)");

const selectedCorrOrderId = ref("");
const showConfirm = ref(false);
const confirmFolio = ref("");
const cancelingId = ref("");

const selectedOrder = computed(() =>
  selectedCorrOrderId.value ? lab.ordersDB.value.find((o) => o.id === selectedCorrOrderId.value) || null : null
);

function initCancel(c) {
  selectedCorrOrderId.value = c.orderId || "";
  if (c.orderId) confirmCancel(c.orderId, c.folio);
}

function confirmCancel(orderId, folio) {
  selectedCorrOrderId.value = orderId;
  confirmFolio.value = folio || "—";
  showConfirm.value = true;
}

async function executeCancel() {
  cancelingId.value = selectedCorrOrderId.value;
  await lab.cancelOrderById(selectedCorrOrderId.value);
  showConfirm.value = false;
  cancelingId.value = "";
  selectedCorrOrderId.value = "";
}
</script>

<style scoped>
.corr-list {
  display: grid;
  gap: 0.65rem;
}

.corr-card {
  border: 1.5px solid rgba(245, 158, 11, 0.2);
  border-radius: 16px;
  padding: 0.85rem;
  background: var(--surface);
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
  cursor: pointer;
}

.corr-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.corr-card--selected {
  border-color: rgba(245, 158, 11, 0.6);
  background: rgba(245, 158, 11, 0.05);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
}

.corr-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.45rem;
  gap: 0.5rem;
}

.corr-card__left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.corr-card__folio {
  font-size: 0.9rem;
  font-weight: 1000;
  color: var(--text-primary);
}

.corr-card__actor {
  font-size: 0.76rem;
  font-weight: 800;
  color: var(--text-muted);
}

.corr-card__date {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--text-muted);
  white-space: nowrap;
}

.corr-card__code {
  font-size: 0.82rem;
  font-weight: 900;
  color: var(--text-primary);
  margin-bottom: 0.3rem;
}

.corr-card__msg {
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--text-secondary);
  line-height: 1.4;
  margin-bottom: 0.5rem;
  padding: 0.4rem 0.55rem;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.15);
  border-radius: 10px;
}

.corr-card__actions {
  display: flex;
  justify-content: flex-end;
}

.corr-order-preview {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.85rem;
  background: var(--surface-overlay);
}

.corr-order-preview__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
  gap: 0.5rem;
}

.corr-order-preview__meta {
  display: grid;
  gap: 0.25rem;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--text-muted);
}

.corr-order-preview__rollback-hint {
  padding: 0.35rem 0.5rem;
  margin-top: 0.2rem;
  background: var(--c-danger-alpha);
  border: 1px solid rgba(239, 68, 68, 0.18);
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 900;
  color: var(--c-danger);
}

.corr-micas-list {
  display: grid;
  gap: 0.3rem;
  max-height: 200px;
  overflow-y: auto;
}

.corr-mica-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--text-secondary);
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--border);
}

.corr-mica-qty {
  margin-left: auto;
  font-weight: 1000;
  background: var(--border);
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  font-size: 0.72rem;
}

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
</style>