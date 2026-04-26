<template>
  <header class="lab-hero">
    <div class="lab-hero__left">
      <span class="lab-pill">
        <i class="fas fa-flask mr-1"></i>
        Laboratorio
      </span>
      <h1 class="lab-title">
        <span class="lab-title__dot" aria-hidden="true"></span>
        Laboratorio
      </h1>

      <div class="lab-chips">
        <span class="chip">
          <i class="fas fa-layer-group mr-2"></i>{{ lab.sheetsDB.value.length }} planillas
        </span>
        <span class="chip">
          <i class="fas fa-barcode mr-2"></i>{{ lab.totalCodes.value }} códigos
        </span>
        <span class="chip">
          <i class="fas fa-clipboard-list mr-2"></i>{{ lab.ordersDB.value.length }} pedidos
        </span>
        <span class="chip chip--soft">
          <i class="fas fa-clock mr-2"></i>Act. hace {{ lab.lastUpdatedHuman.value }}
        </span>

        <!-- Live loading indicator -->
        <span v-if="isLoading" class="chip chip--loading">
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
          :loading="lab.loadingRefreshAll.value"
          @click="lab.refreshAll"
        >
          Recargar
        </b-button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { inject, computed } from "vue";
import "./LabHero.css";

const lab = inject("lab");
if (!lab) throw new Error("LabHero necesita provide('lab', ...)");

const isLoading = computed(() =>
  lab.loadingSheets.value ||
  lab.loadingItems.value ||
  lab.loadingOrders.value ||
  lab.loadingEvents.value
);
</script>