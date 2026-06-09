<script setup>
// Ítem de resultado: PRODUCTO de óptica. Presentacional puro.
defineProps({ item: { type: Object, required: true }, query: { type: String, default: "" } });
import { highlight } from "@/composables/search/useHighlight.js";
</script>

<template>
  <span class="gs-item__icon gs-item__icon--optica">
    <i :class="`fas fa-${item.icon || 'glasses'}`" />
  </span>
  <span class="gs-item__body">
    <span class="gs-item__title" v-html="highlight(item.label, query)" />
    <span class="gs-item__sub">
      <span class="gs-item__badge gs-item__badge--optica">{{ item.tipoLabel }}</span>
      <code v-if="item.sku" class="gs-item__sku" v-html="highlight(item.sku, query)" />
      <span v-if="item.stock != null" class="gs-item__material">· {{ item.stock }} uds</span>
    </span>
  </span>
  <i class="fas fa-arrow-right gs-item__arrow" />
</template>
