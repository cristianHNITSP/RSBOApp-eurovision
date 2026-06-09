<script setup>
// Fila de historial reciente. Contenido + botón de quitar (emite 'remove').
import { TYPE_ICON } from "@/data/search/resultTypes.js";

defineProps({ entry: { type: Object, required: true } });
defineEmits(["remove"]);

const LABEL = { route: "Página", sheet: "Planilla", diopter: "Dioptría", optica: "Óptica" };
const BADGE = {
  route: "gs-item__badge--page", sheet: "gs-item__badge--tipo",
  diopter: "gs-item__badge--diopter", optica: "gs-item__badge--optica",
};
</script>

<template>
  <span class="gs-item__icon gs-item__icon--history">
    <i :class="`fas fa-${TYPE_ICON[entry.type] || 'clock-rotate-left'}`" />
  </span>
  <span class="gs-item__body">
    <span class="gs-item__title">{{ entry.label }}</span>
    <span class="gs-item__sub">
      <span class="gs-item__badge" :class="BADGE[entry.type] || 'gs-item__badge--page'">{{ LABEL[entry.type] || "Resultado" }}</span>
      <span v-if="entry.sub" class="gs-item__material">{{ entry.sub }}</span>
    </span>
  </span>
  <button class="gs-remove-history" title="Quitar del historial" @click.stop="$emit('remove', entry.id)">
    <i class="fas fa-times" />
  </button>
</template>
