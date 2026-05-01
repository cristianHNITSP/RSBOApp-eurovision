<template>
  <div class="view-hero">
    <header class="lab-hero">

      <div class="lab-hero__left">
        <span class="ventas-pill">
          <i class="fas fa-shopping-cart mr-1"></i>
          Ventas
        </span>
        <h1 class="lab-title">
          <span class="lab-title__dot" aria-hidden="true"></span>
          {{ title }}
        </h1>

        <div class="lab-chips">
          <span v-if="counts.sheets !== undefined" class="chip">
            <i class="fas fa-layer-group mr-2"></i>{{ counts.sheets }} planillas
          </span>
          <span v-if="counts.items !== undefined" class="chip">
            <i class="fas fa-boxes mr-2"></i>{{ counts.items }} productos
          </span>
          <span v-if="counts.cart !== undefined" class="chip chip--soft">
            <i class="fas fa-shopping-cart mr-2"></i>{{ counts.cart }} en carrito
          </span>
          <span v-if="loading" class="chip chip--loading">
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
            :loading="loading"
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
import { computed } from 'vue';

const props = defineProps({
  category: { type: String, default: 'bases-micas' },
  counts:   { type: Object,  default: () => ({}) },
  loading:  { type: Boolean, default: false }
});

const title = computed(() => {
  const titles = {
    'bases-micas':     'Bases y Micas',
    'optica':          'Óptica',
    'lentes-contacto': 'Lentes de Contacto',
    'historial':       'Historial de Ventas'
  };
  return titles[props.category] || 'Ventas';
});

defineEmits(["refresh"]);
</script>

<style src="./VentasHero.css" scoped></style>
