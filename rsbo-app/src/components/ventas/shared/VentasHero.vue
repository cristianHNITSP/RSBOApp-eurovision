<template>
  <header class="ventas-hero premium-glass">

      <div class="ventas-hero__title-block">
        <span class="ventas-hero__pill">
          <i class="fas fa-shopping-cart mr-1"></i>
          Módulo de Ventas
        </span>
        <h1 class="ventas-hero__title">
          {{ title }}
        </h1>
        <p class="ventas-hero__desc">
          {{ description }}
        </p>

        <div class="ventas-hero__chips">
          <span v-if="counts.sheets !== undefined" class="ventas-chip">
            <i class="fas fa-layer-group mr-1"></i>{{ counts.sheets }} planillas
          </span>
          <span v-if="counts.items !== undefined" class="ventas-chip">
            <i class="fas fa-boxes mr-1"></i>{{ counts.items }} productos
          </span>
          <span v-if="counts.cart !== undefined" class="ventas-chip ventas-chip--cart glass-pill">
            <i class="fas fa-shopping-cart mr-1"></i>{{ counts.cart }} en carrito
          </span>
        </div>
      </div>

      <div class="ventas-hero__meta">
        <div class="ventas-hero__actions">
          <b-button
            type="is-primary"
            icon-left="sync"
            :loading="loading"
            class="premium-btn"
            @click="$emit('refresh')"
          >
            Actualizar datos
          </b-button>
        </div>
        <div class="ventas-hero__status-line mt-3">
          <span v-if="loading" class="ventas-hero__status ventas-hero__status--loading">
            <span class="loading-dot"></span>
            Sincronizando...
          </span>
          <span v-else class="ventas-hero__status">
            <i class="fas fa-check-circle mr-1"></i>
            Sistema listo
          </span>
        </div>
      </div>
    </header>
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
    'optica':          'Armazones y Óptica',
    'lentes-contacto': 'Lentes de Contacto',
    'historial':       'Historial de Ventas'
  };
  return titles[props.category] || 'Ventas';
});

const description = computed(() => {
  const descs = {
    'bases-micas':     'Gestión de inventario y pedidos de laboratorio para micas y bases graduadas.',
    'optica':          'Venta directa de armazones, estuches, soluciones y accesorios ópticos.',
    'lentes-contacto': 'Catálogo de lentes de contacto esféricos y tóricos con gestión de stock.',
    'historial':       'Consulta de pedidos anteriores, estados de laboratorio y comprobantes de venta.'
  };
  return descs[props.category] || 'Panel de control de ventas RSBO.';
});

defineEmits(["refresh"]);
</script>

<style src="./VentasHero.css" scoped></style>
