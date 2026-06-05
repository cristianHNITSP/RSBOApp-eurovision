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
          <span class="detail-header__label">{{ meta.folio }}</span>
          <span class="level-badge level-badge--bajo">{{ statusLabel(meta.status) }}</span>
        </div>
        <div class="order-item">
          <div class="order-item__head">
            <span class="order-client">{{ meta.cliente }}</span>
            <span v-if="meta.note" class="notif-message-note">{{ meta.note }}</span>
          </div>
          <ul class="line-list">
            <li v-for="(line, li) in meta.lines" :key="li" class="line-row">
              <span class="line-label">{{ line.label }}</span>
              <span class="line-qty">{{ line.qty }} pza{{ line.qty !== 1 ? "s" : "" }}</span>
            </li>
          </ul>
        </div>
      </div>
    </transition>
  </div>
</template>
