<!-- rsbo-app/src/components/tabsmanager/VendorPicker.vue -->
<template>
  <div class="columns is-multiline is-variable is-5">
    <div class="column is-12-mobile is-6-tablet">
      <b-field :label="labelProveedor">
        <b-autocomplete
          v-model="internalProveedor"
          :data="filteredProveedores"
          :placeholder="placeholderProveedor"
          open-on-focus
          keep-first
          :clear-on-select="false"
          :max-height="220"
          :check-infinite-scroll="false"
          :disabled="disabled"
          @select="onSelectProveedor"
        >
          <template #empty>
            <span class="has-text-grey">Sin coincidencias (puedes crear uno nuevo escribiéndolo).</span>
          </template>
        </b-autocomplete>
      </b-field>
    </div>

    <div class="column is-12-mobile is-6-tablet">
      <b-field :label="labelMarca">
        <b-autocomplete
          v-model="internalMarca"
          :data="filteredMarcas"
          :placeholder="placeholderMarca"
          open-on-focus
          keep-first
          :clear-on-select="false"
          :max-height="220"
          :check-infinite-scroll="false"
          :disabled="disabled"
          @select="onSelectMarca"
        >
          <template #empty>
            <span class="has-text-grey">Sin coincidencias (puedes crear una nueva escribiéndola).</span>
          </template>
        </b-autocomplete>
      </b-field>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  proveedor:           { type: String,  default: "" },
  marca:               { type: String,  default: "" },
  filteredProveedores: { type: Array,   default: () => [] },
  filteredMarcas:      { type: Array,   default: () => [] },
  disabled:            { type: Boolean, default: false },
  labelProveedor:      { type: String,  default: "Proveedor (opcional)" },
  labelMarca:          { type: String,  default: "Marca (opcional)" },
  placeholderProveedor: { type: String,  default: "Ej. Eurovisión / Luxottica / …" },
  placeholderMarca:    { type: String,  default: "Ej. Essilor / Zeiss / …" }
});

const emit = defineEmits(["update:proveedor", "update:marca"]);

const internalProveedor = computed({
  get: () => props.proveedor,
  set: (v) => emit("update:proveedor", v)
});

const internalMarca = computed({
  get: () => props.marca,
  set: (v) => emit("update:marca", v)
});

const onSelectProveedor = (val) => {
  if (typeof val === "string") emit("update:proveedor", val);
};
const onSelectMarca = (val) => {
  if (typeof val === "string") emit("update:marca", val);
};
</script>
