<template>
  <div class="panel__body" v-if="order">
    <!-- Resumen -->
    <div class="order-summary mb-3">
      <div class="order-summary__row">
        <span class="mono font-bold">{{ order.folio }}</span>
        <span class="tag is-light" :class="lab?.statusTagClass?.(order.status)">
          {{ lab?.statusHuman?.(order.status) || order.status }}
        </span>
      </div>
      <div class="order-summary__meta">
        <div><i class="fas fa-building mr-1"></i><b>{{ order.cliente }}</b></div>
        <div><i class="fas fa-clock mr-1"></i>{{ order.createdAtShort }}</div>
        <div>
          <i class="fas fa-glasses mr-1"></i>
          {{ order.lines?.length || 0 }} mica(s) ·
          {{ lab?.orderPickedCount?.(order) || 0 }}/{{ lab?.orderTotalCount?.(order) || 0 }} surtidas
        </div>
      </div>
    </div>

    <!-- EDITAR (solo si no cerrado/cancelado) -->
    <template v-if="order.status !== 'cerrado' && order.status !== 'cancelado'">

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
          <b-input v-model="editState.cliente" icon="building" placeholder="Nombre del cliente" />
        </b-field>

        <b-field label="Referencia / nota" class="mb-3">
          <b-input v-model="editState.note" icon="sticky-note" placeholder="Opcional" />
        </b-field>

        <!-- Editar líneas -->
        <div class="lines-editor mb-3">
          <div class="lines-editor__head">
            <span>Micas del pedido</span>
            <span class="muted" style="font-size:0.78rem">qty mínima = piezas ya surtidas</span>
          </div>

          <div class="edit-line" v-for="el in editState.lines" :key="el.lineId">
            <div class="edit-line__info">
              <div class="edit-line__title">
                {{ lab?.lineHuman?.(el, lab?.sheetById?.(el.lineSheetId || order.sheetId)) || el.codebar }}
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

        <!-- Motivo de edición (requerido) -->
        <b-field
          label="Motivo de la edición"
          class="mb-3"
          :type="editState.motivo.trim().length > 0 ? 'is-success' : 'is-warning'"
          :message="editState.motivo.trim().length === 0 ? 'Requerido: explica el motivo del cambio.' : `${editState.motivo.trim().length}/400 caracteres.`"
        >
          <b-input
            v-model="editState.motivo"
            type="textarea"
            rows="2"
            maxlength="400"
            placeholder="Ej: Cliente solicitó ajuste de cantidades, error en el pedido original…"
            icon="comment-alt"
          />
        </b-field>

        <b-button
          type="is-warning"
          expanded
          icon-left="save"
          :loading="lab.loadingEditOrder?.value"
          :disabled="!editState.cliente.trim() || editState.lines.length === 0 || editState.motivo.trim().length === 0"
          @click="saveEdit"
        >
          Guardar cambios
        </b-button>
      </template>
    </template>

    <hr class="soft-hr" />

    <!-- CANCELAR (con rollback de stock) -->
    <div v-if="order.status !== 'cancelado'">
      <div v-if="lab.orderPickedCount(order) > 0" class="rollback-hint mb-2">
        <i class="fas fa-info-circle mr-1"></i>
        Se devolverán <b>{{ lab.orderPickedCount(order) }}</b> pzas al inventario al cancelar.
      </div>

      <b-button
        type="is-danger"
        expanded
        outlined
        icon-left="ban"
        :loading="lab.loadingCancelOrder.value"
        @click="$emit('confirm-cancel')"
      >
        Cancelar pedido y devolver stock
      </b-button>
    </div>

    <div v-else class="cancelled-note">
      <i class="fas fa-ban mr-2"></i>
      Este pedido ya fue cancelado.
    </div>

    <!-- ── Historial del pedido ── -->
    <hr class="soft-hr" />
    <div class="history-section">
      <div class="history-section__head">
        <span><i class="fas fa-history mr-1"></i>Historial de cambios</span>
        <b-button
          size="is-small"
          type="is-ghost"
          icon-left="sync"
          :loading="lab.loadingOrderHistory?.value"
          @click="lab.loadOrderHistory?.(order.id)"
        />
      </div>

      <div v-if="lab.loadingOrderHistory?.value" class="history-loading">
        <b-loading :is-full-page="false" :active="true" />
        <div class="spacer-sm"></div>
      </div>

      <div v-else-if="!lab.orderHistory?.value?.length" class="history-empty">
        <i class="fas fa-inbox mr-1"></i> Sin registros aún.
      </div>

      <div v-else class="history-list">
        <div
          v-for="ev in (lab.orderHistory?.value || [])"
          :key="ev._id"
          class="history-item"
          :class="historyClass(ev.type)"
        >
          <div class="history-item__icon">
            <i :class="historyIcon(ev.type)"></i>
          </div>
          <div class="history-item__body">
            <div class="history-item__header">
              <span class="history-item__type">{{ historyLabel(ev.type) }}</span>
              <span class="history-item__date muted">{{ formatEvDate(ev.createdAt) }}</span>
            </div>
            <div class="history-item__actor muted" v-if="ev.actor?.name">
              <i class="fas fa-user mr-1"></i>{{ ev.actor.name }}
            </div>
            <!-- Motivo -->
            <div v-if="ev.details?.motivo" class="history-item__motivo">
              <i class="fas fa-comment-alt mr-1"></i>{{ ev.details.motivo }}
            </div>
            <!-- Mensaje de corrección -->
            <div v-else-if="ev.details?.message" class="history-item__motivo">
              <i class="fas fa-comment-alt mr-1"></i>{{ ev.details.message }}
            </div>
            <!-- Diff de edición -->
            <template v-if="ev.type === 'ORDER_EDIT'">
              <div v-if="ev.details?.diff?.cliente" class="history-item__diff">
                <span class="diff-label">Cliente:</span>
                <span class="diff-before">{{ ev.details.diff.cliente.before }}</span>
                <i class="fas fa-arrow-right diff-arrow"></i>
                <span class="diff-after">{{ ev.details.diff.cliente.after }}</span>
              </div>
              <div v-if="ev.details?.diff?.note" class="history-item__diff">
                <span class="diff-label">Nota:</span>
                <span class="diff-before">{{ ev.details.diff.note.before || "—" }}</span>
                <i class="fas fa-arrow-right diff-arrow"></i>
                <span class="diff-after">{{ ev.details.diff.note.after || "—" }}</span>
              </div>
              <div
                v-for="lc in (ev.details?.linesChanges || [])"
                :key="lc.lineId"
                class="history-item__diff"
              >
                <span class="diff-label">{{ lc.codebar }}:</span>
                <template v-if="lc.action === 'removed'">
                  <span class="diff-removed">Línea eliminada</span>
                </template>
                <template v-else>
                  <span class="diff-before">{{ lc.before }} pzas</span>
                  <i class="fas fa-arrow-right diff-arrow"></i>
                  <span class="diff-after">{{ lc.after }} pzas</span>
                </template>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject, ref, reactive, watch } from "vue";
import "./CorrectionDetail.css";

const props = defineProps({
  order: { type: Object, default: null }
});

const emit = defineEmits(["confirm-cancel", "save-edit"]);

const lab = inject("lab");
if (!lab) throw new Error("CorrectionDetail necesita provide('lab', ...)");

const editMode = ref(false);
const editState = reactive({
  cliente: "",
  note: "",
  motivo: "",
  lines: []
});

function syncEditState() {
  if (!props.order) return;
  editState.cliente = props.order.cliente || "";
  editState.note = props.order.note || "";
  editState.motivo = "";
  editState.lines = (props.order.lines || []).map((l) => ({
    lineId: l.lineId || l.id,
    qty: Number(l.qty || 0),
    picked: Number(l.picked || 0),
    tipoMatriz: l.tipoMatriz,
    micaType: l.micaType,
    lineSheetId: l.lineSheetId,
    codebar: l.codebar,
    eye: l.eye,
    params: l.params || {}
  }));
}

function toggleEditMode() {
  editMode.value = !editMode.value;
  if (editMode.value) syncEditState();
}

function removeLine(lineId) {
  editState.lines = editState.lines.filter((l) => l.lineId !== lineId);
}

async function saveEdit() {
  const payload = {
    cliente: editState.cliente.trim(),
    note: editState.note.trim(),
    motivo: editState.motivo.trim(),
    lines: editState.lines.map((l) => ({ lineId: l.lineId, qty: l.qty }))
  };

  const editIds = new Set(editState.lines.map((l) => l.lineId));
  for (const origLine of props.order.lines || []) {
    const lineId = origLine.lineId || origLine.id;
    if (!editIds.has(lineId)) {
      payload.lines.push({ lineId, remove: true });
    }
  }

  try {
    await lab.editOrder(props.order.id, payload);
    editMode.value = false;
    await lab.loadOrderHistory(props.order.id);
  } catch { }
}

// Historial helpers
function historyLabel(type) {
  const map = {
    ORDER_CREATE: "Creación de pedido",
    ORDER_EDIT: "Edición de pedido",
    ORDER_CANCEL: "Cancelación de pedido",
    ORDER_CLOSE: "Pedido cerrado y facturado",
    ORDER_RESET: "Reinicio de proceso",
    EXIT_SCAN: "Mica surtida (escaneo)",
    CORRECTION_REQUEST: "Solicitud de corrección"
  };
  return map[type] || type;
}

function historyIcon(type) {
  const map = {
    ORDER_CREATE: "fas fa-plus-circle",
    ORDER_EDIT: "fas fa-pen",
    ORDER_CANCEL: "fas fa-ban",
    ORDER_CLOSE: "fas fa-check-double",
    ORDER_RESET: "fas fa-undo",
    EXIT_SCAN: "fas fa-barcode",
    CORRECTION_REQUEST: "fas fa-exclamation-triangle"
  };
  return map[type] || "fas fa-circle";
}

function historyClass(type) {
  const map = {
    ORDER_EDIT: "history-item--edit",
    ORDER_CANCEL: "history-item--cancel",
    CORRECTION_REQUEST: "history-item--correction"
  };
  return map[type] || "";
}

function formatEvDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

watch(() => props.order, (o) => {
  if (o && editMode.value) syncEditState();
}, { deep: true });
</script>
