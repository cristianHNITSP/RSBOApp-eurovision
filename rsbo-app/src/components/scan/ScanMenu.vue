<template>
  <b-dropdown position="is-bottom-left" aria-role="menu" append-to-body :mobile-modal="false" class="scan-menu">
    <template #trigger="{ active }">
      <b-tooltip label="Escanear QR" position="is-bottom" append-to-body :triggers="['hover']">
        <b-button
          class="toolbar-btn"
          type="is-light"
          icon-pack="fas"
          :icon-left="active ? 'qrcode' : 'qrcode'"
          aria-label="Escanear código QR"
        />
      </b-tooltip>
    </template>

    <b-dropdown-item aria-role="menu-item" @click="scan.openScan('stock')">
      <b-icon icon="box" pack="fas" size="is-small" />&nbsp; Agregar stock
    </b-dropdown-item>

    <b-dropdown-item aria-role="menu-item" @click="scan.openScan('locate')">
      <b-icon icon="crosshairs" pack="fas" size="is-small" />&nbsp; Ubicar producto
    </b-dropdown-item>
  </b-dropdown>
</template>

<script setup>
import { useQrScan } from "@/composables/scan/useQrScan";

const scan = useQrScan();
</script>
