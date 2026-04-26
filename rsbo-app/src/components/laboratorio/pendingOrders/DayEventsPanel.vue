<template>
  <div class="logs-section">
    <div class="logs-col">
      <div class="logs-head logs-head--in">
        <i class="fas fa-arrow-circle-down mr-2"></i>
        Entradas
        <span class="logs-badge">{{ entryEvents.length }}</span>
      </div>

      <div v-if="loading" class="logs-loading">
        <b-loading :is-full-page="false" :active="true" />
      </div>
      <div v-else-if="!entryEvents.length" class="logs-empty">
        <i class="fas fa-inbox mr-1"></i>
        Sin entradas recientes.
      </div>
      <div v-else class="logs-feed">
        <div
          v-for="e in entryEvents"
          :key="e.id"
          class="log-card log-card--in"
        >
          <div class="log-card__top">
            <span class="log-card__folio mono">{{ e.folio }}</span>
            <span class="log-card__date">{{ e.at }}</span>
          </div>
          <div class="log-card__client">
            <i class="fas fa-building mr-1"></i>
            {{ e.cliente }}
          </div>
          <div class="log-card__meta">
            <span>{{ sheetNameById(e.sheetId) }}</span>
            <span class="log-card__pill">{{ e.linesTotal }} líneas</span>
          </div>
        </div>
      </div>
    </div>

    <div class="logs-col">
      <div class="logs-head logs-head--out">
        <i class="fas fa-arrow-circle-up mr-2"></i>
        Salidas
        <span class="logs-badge">{{ exitEvents.length }}</span>
      </div>

      <div v-if="loading" class="logs-loading">
        <b-loading :is-full-page="false" :active="true" />
      </div>
      <div v-else-if="!exitEvents.length" class="logs-empty">
        <i class="fas fa-inbox mr-1"></i>
        Sin salidas recientes.
      </div>
      <div v-else class="logs-feed">
        <div
          v-for="e in exitEvents"
          :key="e.id"
          class="log-card log-card--out"
        >
          <div class="log-card__top">
            <span class="log-card__folio mono">{{ e.folio }}</span>
            <span class="log-card__date">{{ e.at }}</span>
          </div>
          <div class="log-card__code mono">
            <i class="fas fa-barcode mr-1"></i>
            {{ e.codebar || "—" }}
          </div>
          <div class="log-card__meta">
            <span>{{ e.title }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject } from "vue";
const lab = inject("lab");

defineProps({
  entryEvents: Array,
  exitEvents: Array,
  loading: Boolean
});

const sheetNameById = lab.sheetNameById;
</script>

<style scoped>
.logs-section { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.logs-head { font-size: 0.85rem; font-weight: 800; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; }
.logs-badge { background: var(--border); padding: 0.1rem 0.5rem; border-radius: 999px; font-size: 0.7rem; }
.logs-feed { max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.6rem; }
/* Log cards styles usually come from global.css or shared.css */
</style>
