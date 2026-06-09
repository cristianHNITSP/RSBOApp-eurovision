<script setup>
// Ítem de resultado: PLANILLA (bases/micas o lentes de contacto). Presentacional.
import { computed } from "vue";
import { highlight } from "@/composables/search/useHighlight.js";
import { formatRangeChips } from "@/data/search/rangeLabels.js";

const props = defineProps({ item: { type: Object, required: true }, query: { type: String, default: "" } });

const isLC = computed(() => props.item.category === "Lentes de contacto");
const chips = computed(() => formatRangeChips(props.item.ranges));
</script>

<template>
  <span class="gs-item__icon" :class="isLC ? 'gs-item__icon--lc' : 'gs-item__icon--sheet'">
    <i :class="isLC ? 'fas fa-eye' : 'fas fa-glasses'" />
  </span>
  <span class="gs-item__body">
    <span class="gs-item__title" v-html="highlight(item.nombre, query)" />
    <span class="gs-item__sub">
      <span class="gs-item__badge gs-item__badge--tipo">{{ item.tipoLabel }}</span>
      <span v-if="item.material" class="gs-item__material" v-html="highlight(item.material, query)" />
      <span v-if="item.proveedor" class="gs-item__trat">· <span v-html="highlight(item.proveedor, query)" /></span>
      <span v-if="item.marca" class="gs-item__trat">· <span v-html="highlight(item.marca, query)" /></span>
    </span>
    <span v-if="chips.length" class="gs-item__chips">
      <span v-for="chip in chips" :key="chip" class="gs-chip">{{ chip }}</span>
    </span>
  </span>
  <i class="fas fa-arrow-right gs-item__arrow" />
</template>
