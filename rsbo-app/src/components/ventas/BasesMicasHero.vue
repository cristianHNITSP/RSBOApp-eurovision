<template>
  <div class="view-hero">
    <header class="lab-hero">

      <div class="lab-hero__left">
        <span class="bm-ventas-pill">
          <i class="fas fa-flask mr-1"></i>
          Ventas
        </span>
        <h1 class="lab-title">
          <span class="lab-title__dot" aria-hidden="true"></span>
          Bases y Micas · Ventas
        </h1>

        <div class="lab-chips">
          <span class="chip">
            <i class="fas fa-layer-group mr-2"></i>{{ sheetsCount }} planillas
          </span>
          <span class="chip">
            <i class="fas fa-boxes mr-2"></i>{{ filteredCount }} productos
          </span>
          <span class="chip chip--soft">
            <i class="fas fa-shopping-cart mr-2"></i>{{ cartCount }} en carrito
          </span>
          <span v-if="loadingSheets || loadingItems" class="chip chip--loading">
            <span class="loading-dot"></span>
            Cargando…
          </span>
        </div>
      </div>

      <div class="lab-hero__right">
        <div class="lab-hero__actions">
          <b-button
            type="is-primary"
            icon-left="sync"
            :loading="loadingSheets || loadingItems"
            @click="$emit('refresh')"
          >
            Actualizar
          </b-button>
        </div>
      </div>
    </header>
  </div>
</template>

<script setup>
defineProps({
  sheetsCount: { type: Number, default: 0 },
  filteredCount: { type: Number, default: 0 },
  cartCount: { type: Number, default: 0 },
  loadingSheets: { type: Boolean, default: false },
  loadingItems: { type: Boolean, default: false }
});

defineEmits(["refresh"]);
</script>

<style src="./BasesMicasHero.css" scoped></style>
