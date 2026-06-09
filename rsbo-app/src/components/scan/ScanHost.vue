<template>
  <!-- Monta una sola vez los modales del flujo de escaneo (ligados al composable singleton). -->
  <div class="scan-host">
    <ScanModal />
    <StockAdjustModal />
  </div>
</template>

<script setup>
import ScanModal from "./ScanModal.vue";
import StockAdjustModal from "./StockAdjustModal.vue";
</script>
