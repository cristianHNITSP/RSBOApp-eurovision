<script setup>
defineProps({ query: { type: String, default: "" } });
</script>

<template>
  <div class="gs-empty">
    <span class="gs-empty__icon"><i class="fas fa-search-minus" /></span>
    <p class="gs-empty__title">Sin resultados para <strong>"{{ query }}"</strong></p>
    <p class="gs-empty__sub">Prueba con otra palabra, un SKU, un número de dioptría o un proveedor.</p>
  </div>
</template>
