<!-- rsbo-app/src/components/tabsmanager/PurchaseFields.vue -->
<template>
  <div class="columns is-multiline">
    <div class="column is-12-mobile is-6-tablet">
      <b-field label="Precio de venta (actual) *"
        :type="precioVenta !== '' && (!isFiniteNum(precioVenta) || Number(precioVenta) < 0) ? 'is-danger' : ''">
        <b-input
          v-model="vPrecioVenta"
          type="number"
          min="0"
          step="0.01"
          placeholder="Ej. 1200.00"
          :disabled="disabled"
        />
      </b-field>
    </div>

    <div class="column is-12-mobile is-6-tablet">
      <b-field label="Precio de compra (costo) *"
        :type="precioCompra !== '' && (!isFiniteNum(precioCompra) || Number(precioCompra) < 0) ? 'is-danger' : ''">
        <b-input
          v-model="vPrecioCompra"
          type="number"
          min="0"
          step="0.01"
          placeholder="Ej. 850.00"
          :disabled="disabled"
        />
      </b-field>
    </div>

    <div class="column is-12-mobile is-6-tablet">
      <b-field label="Número de nota / factura">
        <b-input
          v-model="vNumFactura"
          placeholder="Ej. FAC-10293"
          :disabled="disabled"
        />
      </b-field>
    </div>

    <div class="column is-12-mobile is-6-tablet">
      <b-field label="Lote del producto">
        <b-input
          v-model="vLoteProducto"
          placeholder="Ej. LOTE-2026-03"
          :disabled="disabled"
        />
      </b-field>
    </div>

    <div class="column is-12-mobile is-6-tablet">
      <b-field label="Fecha de compra">
        <b-input
          v-model="vFechaCompra"
          type="date"
          :disabled="disabled"
        />
      </b-field>
    </div>

    <div class="column is-12-mobile is-6-tablet">
      <b-field label="Fecha de caducidad">
        <b-input
          v-model="vFechaCaducidad"
          type="date"
          :disabled="disabled"
        />
      </b-field>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  precioVenta:    { type: [String, Number], default: "" },
  precioCompra:   { type: [String, Number], default: "" },
  numFactura:     { type: String, default: "" },
  loteProducto:   { type: String, default: "" },
  fechaCompra:    { type: String, default: "" },
  fechaCaducidad: { type: String, default: "" },
  disabled:       { type: Boolean, default: false }
});

const emit = defineEmits([
  "update:precioVenta",
  "update:precioCompra",
  "update:numFactura",
  "update:loteProducto",
  "update:fechaCompra",
  "update:fechaCaducidad"
]);

const vPrecioVenta = computed({
  get: () => props.precioVenta,
  set: (v) => emit("update:precioVenta", v)
});
const vPrecioCompra = computed({
  get: () => props.precioCompra,
  set: (v) => emit("update:precioCompra", v)
});
const vNumFactura = computed({
  get: () => props.numFactura,
  set: (v) => emit("update:numFactura", v)
});
const vLoteProducto = computed({
  get: () => props.loteProducto,
  set: (v) => emit("update:loteProducto", v)
});
const vFechaCompra = computed({
  get: () => props.fechaCompra,
  set: (v) => emit("update:fechaCompra", v)
});
const vFechaCaducidad = computed({
  get: () => props.fechaCaducidad,
  set: (v) => emit("update:fechaCaducidad", v)
});

const isFiniteNum = (v) => v !== "" && v !== null && v !== undefined && Number.isFinite(Number(v));
</script>
