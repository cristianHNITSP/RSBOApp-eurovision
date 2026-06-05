<script setup>
import { ref, computed } from "vue";
import { statusLabel } from "../shared/useNotifFormat.js";

const props = defineProps({ notif: { type: Object, required: true } });
const isExpanded = ref(false);
const meta = computed(() => props.notif.metadata || {});
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
          <span class="detail-header__label">Pedidos activos</span>
          <span class="detail-header__counts">
            <span v-if="meta.summary?.pendiente > 0" class="level-badge level-badge--bajo">
              {{ meta.summary.pendiente }} por iniciar
            </span>
            <span v-if="meta.summary?.parcial > 0" class="level-badge level-badge--critico">
              {{ meta.summary.parcial }} en proceso
            </span>
          </span>
        </div>
        <ul class="order-list">
          <li v-for="order in meta.orders" :key="order.orderId" class="order-item">
            <div class="order-item__head">
              <span class="order-folio">{{ order.folio }}</span>
              <span class="level-badge" :class="order.status === 'parcial' ? 'level-badge--critico' : 'level-badge--bajo'">
                {{ statusLabel(order.status) }}
              </span>
              <span class="order-client">{{ order.cliente }}</span>
            </div>
            <div class="order-item__progress">
              <span class="progress-text">{{ order.progress.picked }} / {{ order.progress.total }} pzas</span>
              <div class="progress-bar">
                <div
                  class="progress-bar__fill"
                  :style="{ width: order.progress.total > 0 ? (order.progress.picked / order.progress.total * 100) + '%' : '0%' }"
                />
              </div>
            </div>
            <ul class="line-list">
              <li v-for="(line, li) in order.lines" :key="li" class="line-row">
                <span class="line-label">{{ line.label }}</span>
                <span class="line-qty">{{ line.picked }}/{{ line.qty }}</span>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </transition>
  </div>
</template>
