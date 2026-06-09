<script setup>
// Ítem de resultado: PÁGINA (ruta de la app). Presentacional puro.
defineProps({ item: { type: Object, required: true }, query: { type: String, default: "" } });
import { highlight } from "@/composables/search/useHighlight.js";
</script>

<template>
  <span class="gs-item__icon gs-item__icon--route">
    <i :class="`fas fa-${item.icon || 'link'}`" />
  </span>
  <span class="gs-item__body">
    <span class="gs-item__title" v-html="highlight(item.label, query)" />
    <span class="gs-item__badge gs-item__badge--page">Página</span>
  </span>
  <i class="fas fa-arrow-right gs-item__arrow" />
</template>
