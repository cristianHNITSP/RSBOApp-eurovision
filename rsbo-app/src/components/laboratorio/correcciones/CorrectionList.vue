<template>
  <div class="mgmt-list">
    <div
      v-for="o in orders"
      :key="o.id"
      class="mgmt-card"
      :class="{
        'mgmt-card--selected': o.id === selectedOrderId,
        'mgmt-card--done': o.status === 'cerrado',
        'mgmt-card--cancelled': o.status === 'cancelado'
      }"
      @click="$emit('select', o.id)"
    >
      <div class="mgmt-card__head">
        <span class="mgmt-card__folio mono">{{ o.folio }}</span>
        <span class="tag is-light" :class="lab.statusTagClass(o.status)">
          {{ lab.statusHuman(o.status) }}
        </span>
      </div>
      <div class="mgmt-card__cliente">{{ o.cliente }}</div>
      <div class="mgmt-card__meta">
        <span><i class="fas fa-glasses mr-1"></i>{{ o.lines?.length || 0 }} micas · {{ lab.orderTotalCount(o) }} pzas</span>
        <span>{{ o.createdAtShort }}</span>
      </div>
      <div class="progress-mini mt-1">
        <div class="progress-mini__fill" :style="{ width: lab.orderProgressPct(o) + '%' }" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject } from "vue";
import "./CorrectionList.css";

const props = defineProps({
  orders: { type: Array, required: true },
  selectedOrderId: { type: String, default: "" }
});

defineEmits(["select"]);

const lab = inject("lab");
if (!lab) throw new Error("CorrectionList necesita provide('lab', ...)");
</script>
