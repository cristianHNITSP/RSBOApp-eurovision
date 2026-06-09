<script setup>
// Ítem de resultado: DIOPTRÍA. Muestra el MODO (Fila / Columna / Intersección),
// los valores buscados y resalta el/los chip(s) de rango que casan.
import { computed } from "vue";
import { formatRangeChips, chipContains, fmtDiop } from "@/data/search/rangeLabels.js";

const props = defineProps({ item: { type: Object, required: true }, query: { type: String, default: "" } });

const isLC = computed(() => props.item.category === "Lentes de contacto");
const chips = computed(() => formatRangeChips(props.item.ranges));

const mode = computed(() => props.item.mode || "row");
const modeLabel = computed(() => ({ row: "Fila", col: "Columna", cell: "Intersección" }[mode.value] || "Fila"));

// Valores a resaltar (fila y/o columna según el modo).
const matchVals = computed(() => {
  const v = [];
  if (props.item.rowVal != null && mode.value !== "col") v.push(Number(props.item.rowVal));
  if (props.item.colVal != null && mode.value !== "row") v.push(Number(props.item.colVal));
  return v;
});

// Texto del valor buscado: "+1.25", "4.00" o "+1.25 × 4.00".
const valueText = computed(() => {
  if (mode.value === "cell") return `${fmtDiop(props.item.rowVal)} × ${fmtDiop(props.item.colVal)}`;
  if (mode.value === "col") return fmtDiop(props.item.colVal);
  return fmtDiop(props.item.rowVal);
});

const chipMatches = (chip) => matchVals.value.some((v) => chipContains(chip, v));
</script>

<template>
  <span class="gs-item__icon gs-item__icon--diopter">
    <i class="fas fa-ruler-combined" />
  </span>
  <span class="gs-item__body">
    <span class="gs-item__title">{{ item.nombre }}</span>
    <span class="gs-item__sub">
      <span class="gs-item__badge gs-item__badge--page">{{ modeLabel }}</span>
      <span class="gs-item__badge gs-item__badge--diopter">{{ valueText }}</span>
      <span class="gs-item__badge gs-item__badge--tipo">{{ item.tipoLabel }}</span>
      <span class="gs-item__material">{{ isLC ? "Lentes de contacto" : "Bases y micas" }}</span>
    </span>
    <span v-if="chips.length" class="gs-item__chips">
      <span
        v-for="chip in chips"
        :key="chip"
        class="gs-chip"
        :class="{ 'gs-chip--match': chipMatches(chip) }"
      >{{ chip }}</span>
    </span>
  </span>
  <i class="fas fa-arrow-right gs-item__arrow" />
</template>
