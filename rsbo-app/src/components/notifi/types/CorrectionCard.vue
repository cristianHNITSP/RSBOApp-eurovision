<script setup>
import { ref, computed } from "vue";

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
          <span class="level-badge level-badge--critico">CORRECCIÓN</span>
        </div>
        <div class="order-item">
          <p class="notif-message-detail">{{ meta.message || "Sin detalle del motivo" }}</p>
          <span v-if="meta.actor" class="notif-author-meta">
            <b-icon pack="fas" icon="user" size="is-small" />{{ meta.actor }}
          </span>
        </div>
      </div>
    </transition>
  </div>
</template>
