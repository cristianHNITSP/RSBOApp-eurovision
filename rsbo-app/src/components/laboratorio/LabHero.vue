<template>
  <header class="lab-hero">
    <div class="lab-hero__left">
      <h1 class="lab-title">
        <span class="lab-title__dot" aria-hidden="true"></span>
        Laboratorio
      </h1>

      <p class="lab-subtitle">
        Pedidos reales: crear desde inventario → surtir por escaneo (salida) → catálogo/impresión.
      </p>

      <div class="lab-chips">
        <span class="chip"><i class="fas fa-layer-group mr-2"></i>{{ lab.filteredSheets.value.length }} planillas</span>
        <span class="chip"><i class="fas fa-barcode mr-2"></i>{{ lab.totalCodes.value }} códigos</span>
        <span class="chip"><i class="fas fa-clipboard-list mr-2"></i>{{ lab.ordersDB.value.length }} pedidos</span>
        <span class="chip chip--soft"><i class="fas fa-clock mr-2"></i>Act. hace {{ lab.lastUpdatedHuman.value }}</span>
      </div>
    </div>

    <div class="lab-hero__right">
      <b-field class="mb-0" label="Buscar planilla">
        <b-input v-model="lab.sheetQuery.value" placeholder="Nombre, material, tratamientos…" icon="search" />
      </b-field>

      <div class="lab-hero__actions">
        <b-button type="is-primary" icon-left="sync" @click="lab.refreshAll">Recargar</b-button>
        <b-button :type="lab.includeDeleted.value ? 'is-danger' : 'is-light'" icon-left="trash" @click="lab.includeDeleted.value = !lab.includeDeleted.value">
          {{ lab.includeDeleted.value ? "Mostrando papelera" : "Ocultar papelera" }}
        </b-button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { inject } from "vue";
const lab = inject("lab");
if (!lab) throw new Error("LabHero necesita provide('lab', ...)");
</script>