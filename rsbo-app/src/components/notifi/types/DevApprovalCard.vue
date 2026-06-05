<script setup>
import { ref, computed } from "vue";
import { updateDevolutionStatus } from "@/services/devolutions.js";
import { labToast } from "@/composables/shared/useLabToast.js";
import { formatReason, condLabel } from "../shared/useNotifFormat.js";

const props = defineProps({ notif: { type: Object, required: true } });
const emit = defineEmits(["dismiss"]);

const isExpanded = ref(false);
const meta = computed(() => props.notif.metadata || {});

async function handleDevAction(devId, folio, action) {
  try {
    const status = action === "approve" ? "aprobada" : "rechazada";
    await updateDevolutionStatus(devId, status, "Acción rápida desde notificación");
    labToast.success(`Devolución ${folio} ${action === "approve" ? "aprobada" : "rechazada"}`);
    if (props.notif.metadata?.devolutions) {
      props.notif.metadata.devolutions = props.notif.metadata.devolutions.filter((d) => d.id !== devId);
      if (props.notif.metadata.devolutions.length === 0) emit("dismiss", props.notif);
    }
  } catch (e) {
    labToast.danger(e?.response?.data?.error || "Error al procesar acción");
  }
}
</script>

<template>
  <div>
    <p class="notif-message">{{ notif.message }}</p>

    <button class="detail-toggle" @click="isExpanded = !isExpanded">
      <span>{{ isExpanded ? "Ocultar detalle" : "Ver detalle" }}</span>
      <b-icon pack="fas" :icon="isExpanded ? 'chevron-up' : 'chevron-down'" size="is-small" />
    </button>

    <transition name="detail-expand">
      <div v-if="isExpanded" class="detail-panel">
        <div class="detail-header">
          <span class="detail-header__label">Pendientes de revisión</span>
          <span class="level-badge level-badge--bajo">{{ meta.devolutions?.length || 0 }} activas</span>
        </div>
        <ul class="dev-grid-list">
          <li v-for="dev in meta.devolutions" :key="dev.id" class="dev-grid-item">
            <div class="dev-grid-info">
              <div class="dev-grid-row">
                <span class="order-folio">{{ dev.folio }}</span>
                <span v-if="dev.type" class="dev-type-tag" :class="`type-${dev.type}`">
                  {{ dev.type === "lab" ? "Laboratorio" : "Venta Directa" }}
                </span>
              </div>
              <div class="dev-grid-row">
                <span class="order-client">{{ dev.cliente }}</span>
              </div>
              <div class="dev-grid-row">
                <span class="dev-reason-text">
                  {{ formatReason(dev.reason) }} · <b>{{ dev.itemsCount }} producto(s)</b>
                </span>
              </div>

              <div v-if="dev.items?.length" class="dev-grid-items mt-1">
                <span v-for="(it, i) in dev.items.slice(0, 3)" :key="i" class="dev-item-chip">
                  <span class="dic-cb">{{ it.codebar || it.sku || "—" }}</span>
                  <span class="dic-qty">×{{ it.qty }}</span>
                  <span class="dic-cond" :class="`cond-${it.condition}`">{{ condLabel(it.condition) }}</span>
                </span>
                <span v-if="dev.items.length > 3" class="dev-item-more">+{{ dev.items.length - 3 }}</span>
              </div>

              <div class="dev-grid-row dev-requester-meta">
                <b-icon pack="fas" icon="user-edit" size="is-small" />
                <span>Solicitado por: <b>{{ dev.createdBy?.name || dev.createdBy || dev.requestedBy || dev.username || "Usuario" }}</b></span>
              </div>
            </div>

            <div class="dev-grid-actions">
              <b-button type="is-success is-light" size="is-small" icon-left="check"
                @click.stop="handleDevAction(dev.id, dev.folio, 'approve')">Aprobar</b-button>
              <b-button type="is-danger is-light" size="is-small" icon-left="times"
                @click.stop="handleDevAction(dev.id, dev.folio, 'reject')">Rechazar</b-button>
            </div>
          </li>
        </ul>
      </div>
    </transition>
  </div>
</template>
