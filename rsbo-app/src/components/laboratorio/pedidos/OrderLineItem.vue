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
      <MermaButton
        v-if="canMerma"
        :prefill="mermaPrefill"
        @created="$emit('merma:created', $event)"
      />
    </div>
  </article>
</template>

<script setup>
import { inject, ref, computed, watch } from "vue";
import MermaButton from "@/components/mermas/MermaButton.vue";
import "./OrderLineItem.css";

const props = defineProps({
  line: { type: Object, required: true },
  orderSheetId: { type: String, required: true },
  orderId: { type: String, default: null }
});
defineEmits(["merma:created"]);

const lab = inject("lab");
const justPicked = ref(false);

const canMerma = computed(() => {
  // Solo permitir registrar merma si tenemos los locators mínimos
  return Boolean((props.line?.lineSheetId || props.orderSheetId) && props.line?.matrixKey);
});

const mermaPrefill = computed(() => ({
  origin: "LAB",
  laboratoryOrder:  props.orderId,
  laboratoryLineId: props.line?.lineId || null,
  sheet:            props.line?.lineSheetId || props.orderSheetId,
  matrixKey:        props.line?.matrixKey,
  eye:              props.line?.eye || null,
  codebar:          props.line?.codebar || null,
  params:           props.line?.params  || {},
}));

// T30: Visual feedback when line is picked (e.g. via WS)
watch(() => props.line.picked, () => {
  justPicked.value = true;
  setTimeout(() => { justPicked.value = false; }, 600);
});
</script>
