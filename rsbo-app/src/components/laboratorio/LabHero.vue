<template>
  <header class="lab-hero">
    <div class="lab-hero__left">
      <h1 class="lab-title">
        <span class="lab-title__dot" aria-hidden="true"></span>
        Laboratorio
      </h1>

      <div class="lab-chips">
        <span class="chip">
          <i class="fas fa-layer-group mr-2"></i>{{ lab.filteredSheets.value.length }} planillas
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
      <b-field class="mb-0" label="Buscar planilla">
        <b-input
          v-model="lab.sheetQuery.value"
          placeholder="Nombre, material, tratamientos…"
          icon="search"
        />
      </b-field>

      <div class="lab-hero__actions">
        <b-button
          type="is-primary"
          icon-left="sync"
          :loading="lab.loadingRefreshAll.value"
          @click="lab.refreshAll"
        >
          Recargar
        </b-button>

        <b-button
          :type="lab.includeDeleted.value ? 'is-danger' : 'is-light'"
          icon-left="trash"
          @click="lab.includeDeleted.value = !lab.includeDeleted.value"
        >
          {{ lab.includeDeleted.value ? "Mostrando papelera" : "Ocultar papelera" }}
        </b-button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { inject, computed } from "vue";

const lab = inject("lab");
if (!lab) throw new Error("LabHero necesita provide('lab', ...)");

const isLoading = computed(() =>
  lab.loadingSheets.value ||
  lab.loadingItems.value ||
  lab.loadingOrders.value ||
  lab.loadingEvents.value
);
</script>

<style scoped>
.chip--loading {
  background: var(--c-primary-alpha);
  border-color: rgba(144, 111, 225, 0.3);
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  animation: pulse-chip 1.5s ease-in-out infinite;
}

.loading-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--c-primary);
  animation: blink 1s ease-in-out infinite;
}

@keyframes pulse-chip {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.65; }
}

@keyframes blink {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%       { transform: scale(0.6); opacity: 0.5; }
}
</style>