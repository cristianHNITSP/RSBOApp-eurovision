<template>
  <span class="merma-btn-wrap">
    <b-button
      :size="size"
      :type="type"
      :icon-left="iconLeft"
      :disabled="disabled"
      @click="open = true"
    >
      <slot>{{ label }}</slot>
    </b-button>
    <MermaCreateModal
      v-model="open"
      :prefill="prefill"
      :max-qty="maxQty"
      @created="onCreated"
    />
  </span>
</template>

<script setup>
import { ref } from "vue";
import MermaCreateModal from "./MermaCreateModal.vue";

const props = defineProps({
  prefill:  { type: Object, default: () => ({}) },
  label:    { type: String, default: "Merma" },
  size:     { type: String, default: "is-small" },
  type:     { type: String, default: "is-warning is-light" },
  iconLeft: { type: String, default: "trash-can" },
  maxQty:   { type: Number, default: 0 },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(["created"]);

const open = ref(false);

function onCreated(merma) {
  emit("created", merma);
}
</script>

<style scoped>
.merma-btn-wrap { display: inline-flex; }
</style>
