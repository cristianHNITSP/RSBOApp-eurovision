<template>
  <div class="columns is-multiline is-variable is-4">
    <!-- Columna principal: bandeja de pedidos -->
    <div class="column is-8">
      <PendingOrdersPanel :standalone="true" />
    </div>

    <!-- Columna lateral -->
    <div class="column is-4">
      <!-- Accesos rápidos -->
      <div class="panel panel--sticky">
        <div class="panel__head">
          <div>
            <h2 class="panel__title">
              <i class="fas fa-bolt mr-2" style="color: rgba(251, 191, 36, 0.9)"></i>
              Accesos rápidos
            </h2>
            <p class="panel__hint">Navega directo a crear o surtir un pedido.</p>
          </div>
        </div>
        <div class="panel__body">
          <div class="quick-actions">
            <!--
            <button class="quick-action-btn quick-action-btn--crear" @click="goCrear">
              <i class="fas fa-cart-plus quick-action-btn__icon"></i>
              <div>
                <div class="quick-action-btn__label">Crear pedido</div>
                <div class="quick-action-btn__hint">Mezcla micas de distintas planillas</div>
              </div>
              <i class="fas fa-chevron-right quick-action-btn__chev"></i>
            </button>
            -->

            <button class="quick-action-btn quick-action-btn--surtir" @click="goSurtir">
              <i class="fas fa-barcode quick-action-btn__icon"></i>
              <div>
                <div class="quick-action-btn__label">Ir a surtir</div>
                <div class="quick-action-btn__hint">Escaneo → salida</div>
              </div>
              <i class="fas fa-chevron-right quick-action-btn__chev"></i>
            </button>

            <button class="quick-action-btn quick-action-btn--corr" @click="goCorrecciones">
              <i class="fas fa-tools quick-action-btn__icon"></i>
              <div>
                <div class="quick-action-btn__label">Correcciones</div>
                <div class="quick-action-btn__hint">Gestionar y eliminar entradas</div>
              </div>
              <i class="fas fa-chevron-right quick-action-btn__chev"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Entradas del día -->
      <div class="panel mt-4">
        <div class="panel__head panel__head--compact">
          <div>
            <h3 class="panel__title mb-0">
              <i class="fas fa-arrow-circle-down mr-2" style="color: rgba(34, 197, 94, 0.85)"></i>
              Entradas del día
              <span class="logs-badge ml-2">{{ lab.todayEntries.value.length }}</span>
            </h3>
            <p class="panel__hint mt-1">Pedidos creados hoy.</p>
          </div>
        </div>

        <div class="panel__body">
          <!-- Exportar entradas por período -->
          <div class="export-period-row mb-3">
            <span class="export-period-label">
              <i class="fas fa-download mr-1"></i> Exportar entradas:
            </span>
            <div class="export-period-btns">
              <button class="period-btn" @click="lab.exportEntriesCsv('day')">Hoy</button>
              <button class="period-btn" @click="lab.exportEntriesCsv('week')">Semana</button>
              <button class="period-btn" @click="lab.exportEntriesCsv('month')">Mes</button>
              <button class="period-btn" @click="lab.exportEntriesCsv('year')">Año</button>
            </div>
          </div>

          <div v-if="lab.loadingEvents.value" class="logs-loading">
            <b-loading :is-full-page="false" :active="true" />
            <div style="height: 48px"></div>
          </div>

          <div v-else-if="!lab.todayEntries.value.length" class="logs-empty">
            <i class="fas fa-inbox mr-1"></i>
            Sin entradas hoy.
          </div>

          <div v-else class="logs-feed">
            <div
              v-for="e in lab.todayEntries.value"
              :key="e.id"
              class="log-card log-card--in"
            >
              <div class="log-card__top">
                <span class="log-card__folio mono">{{ e.folio }}</span>
                <span class="log-card__date">{{ e.at }}</span>
              </div>
              <div class="log-card__client">
                <i class="fas fa-building mr-1"></i>{{ e.cliente }}
              </div>
              <div class="log-card__meta">
                <span>{{ lab.sheetNameById(e.sheetId) }}</span>
                <span class="log-card__pill">{{ e.linesTotal }} micas</span>
              </div>
              <div v-if="e.micaSummary" class="log-card__mica-summary">
                <span v-for="(qty, type) in e.micaSummary" :key="type" class="mica-chip">
                  {{ type }}: {{ qty }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject } from "vue";
import PendingOrdersPanel from "./PendingOrdersPanel.vue";

const lab = inject("lab");
if (!lab) throw new Error("BandejaTab necesita provide('lab', ...)");

//function goCrear() {
//  lab.activeMainTab.value = "pedidos";
//  lab.mode.value = "crear";
//}

function goSurtir() {
  lab.activeMainTab.value = "pedidos";
  lab.mode.value = "surtir";
}

function goCorrecciones() {
  lab.activeMainTab.value = "correcciones";
}
</script>

<style scoped>
.quick-actions {
  display: grid;
  gap: 0.6rem;
}

.quick-action-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.85rem 1rem;
  border-radius: 16px;
  border: 1.5px solid var(--border);
  background: var(--surface-overlay);
  cursor: pointer;
  text-align: left;
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
}

.quick-action-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.quick-action-btn--crear {
  border-color: rgba(144, 111, 225, 0.3);
  background: linear-gradient(135deg, var(--c-primary-alpha), var(--surface-raised));
}

.quick-action-btn--crear:hover {
  border-color: rgba(144, 111, 225, 0.55);
}

.quick-action-btn--surtir {
  border-color: rgba(34, 197, 94, 0.3);
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.07), var(--surface-raised));
}

.quick-action-btn--surtir:hover {
  border-color: rgba(34, 197, 94, 0.55);
}

.quick-action-btn--corr {
  border-color: rgba(245, 158, 11, 0.3);
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.07), var(--surface-raised));
}

.quick-action-btn--corr:hover {
  border-color: rgba(245, 158, 11, 0.55);
}

.quick-action-btn__icon {
  font-size: 1.3rem;
  width: 2.2rem;
  text-align: center;
  flex-shrink: 0;
}

.quick-action-btn--crear .quick-action-btn__icon {
  color: var(--c-primary);
}

.quick-action-btn--surtir .quick-action-btn__icon {
  color: var(--c-success);
}

.quick-action-btn--corr .quick-action-btn__icon {
  color: var(--c-warning);
}

.quick-action-btn__label {
  font-weight: 1000;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.quick-action-btn__hint {
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--text-muted);
  margin-top: 0.1rem;
}

.quick-action-btn__chev {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--text-subtle);
}

.export-period-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.55rem 0.7rem;
  background: rgba(34, 197, 94, 0.05);
  border: 1px solid rgba(34, 197, 94, 0.15);
  border-radius: 12px;
}

.export-period-label {
  font-size: 0.78rem;
  font-weight: 900;
  color: var(--c-success);
}

.export-period-btns {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.period-btn {
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(34, 197, 94, 0.3);
  background: var(--surface);
  font-size: 0.76rem;
  font-weight: 900;
  color: var(--c-success);
  cursor: pointer;
  transition: all 100ms ease;
}

.period-btn:hover {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.5);
}

.logs-badge {
  background: var(--surface-overlay);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.05rem 0.45rem;
  font-size: 0.72rem;
  font-weight: 900;
  color: var(--text-muted);
}

.logs-empty {
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--text-muted);
  padding: 0.6rem 0;
}

.logs-loading {
  position: relative;
  height: 48px;
}

.logs-feed {
  display: grid;
  gap: 0.4rem;
  max-height: 380px;
  overflow-y: auto;
  padding-right: 2px;
}

.logs-feed::-webkit-scrollbar {
  width: 4px;
}

.logs-feed::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 2px;
}

.log-card {
  border-radius: 12px;
  padding: 0.6rem 0.65rem;
  font-size: 0.8rem;
  font-weight: 800;
  transition: transform 100ms ease;
}

.log-card:hover {
  transform: translateX(2px);
}

.log-card--in {
  border: 1px solid rgba(34, 197, 94, 0.18);
  background: rgba(34, 197, 94, 0.05);
  border-left: 3px solid rgba(34, 197, 94, 0.5);
}

.log-card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.2rem;
}

.log-card__folio {
  font-weight: 1000;
  font-size: 0.82rem;
  color: var(--text-primary);
}

.log-card__date {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--text-muted);
}

.log-card__client {
  font-weight: 900;
  color: var(--text-primary);
  margin-bottom: 0.15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-card__meta {
  display: flex;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: 0.76rem;
}

.log-card__pill {
  background: var(--border);
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  border: 1px solid var(--border);
}

.log-card__mica-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.3rem;
}

.mica-chip {
  font-size: 0.7rem;
  font-weight: 900;
  background: var(--c-primary-alpha);
  border: 1px solid rgba(144, 111, 225, 0.2);
  border-radius: 999px;
  padding: 0.05rem 0.35rem;
  color: var(--c-primary);
}
</style>