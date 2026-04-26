<template>
  <article
    class="order-line"
    :class="{ 
      'order-line--done': line.picked >= line.qty,
      'line--just-picked': justPicked 
    }"
  >
    <div class="order-line__top">
      <div class="order-line__title">
        {{ lab.lineHuman(line, lab.sheetById(line.lineSheetId || orderSheetId)) }}
        <div class="mica-meta-row mt-1">
          <span class="mica-type-tag">{{ line.micaType || lab.getMicaTypeName(line.tipoMatriz) }}</span>
          <span class="order-line__sub">{{ line.picked }}/{{ line.qty }} surtidas</span>
        </div>
      </div>
      <span class="tag is-light qty-tag" :class="line.picked >= line.qty ? 'is-success' : ''">
        {{ line.picked >= line.qty ? "✓ OK" : "Pendiente" }}
      </span>
    </div>
  </article>
</template>

<script setup>
import { inject, ref, watch } from "vue";
import "./OrderLineItem.css";

const props = defineProps({
  line: { type: Object, required: true },
  orderSheetId: { type: String, required: true }
});

const lab = inject("lab");
const justPicked = ref(false);

// T30: Visual feedback when line is picked (e.g. via WS)
watch(() => props.line.picked, () => {
  justPicked.value = true;
  setTimeout(() => { justPicked.value = false; }, 600);
});
</script>
