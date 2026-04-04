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
            <p class="panel__hint mt-1">Toca una entrada para ver sus salidas.</p>
          </div>
        </div>

        <div class="panel__body">
          <!-- Exportar entradas por período -->
          <div class="export-period-row mb-3">
            <span class="export-period-label">
              <i class="fas fa-file-excel mr-1"></i> Descargar entradas:
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
              class="entry-block"
            >
              <!-- Cabecera de la entrada (clickeable) -->
              <div
                class="log-card log-card--in entry-card"
                :class="{ 'entry-card--open': expandedFolios.has(e.folio) }"
                @click="toggleEntry(e.folio)"
              >
                <div class="log-card__top">
                  <span class="log-card__folio mono">{{ e.folio }}</span>
                  <div class="entry-card__right">
                    <span class="log-card__date">{{ e.at }}</span>
                    <i
                      class="fas fa-chevron-down entry-card__chev"
                      :class="{ 'entry-card__chev--open': expandedFolios.has(e.folio) }"
                    ></i>
                  </div>
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

              <!-- Panel de salidas (expandible) -->
              <div v-if="expandedFolios.has(e.folio)" class="exits-panel">
                <div class="exits-panel__header">
                  <i class="fas fa-arrow-circle-up mr-1" style="color: rgba(239, 68, 68, 0.75)"></i>
                  Salidas de este pedido
                  <span class="exits-count">{{ exitsByFolio[e.folio]?.length ?? 0 }}</span>
                </div>

                <div v-if="!exitsByFolio[e.folio]?.length" class="exits-empty">
                  <i class="fas fa-clock mr-1"></i>
                  Aún no se han surtido micas de este pedido.
                </div>

                <div v-else class="exits-list">
                  <div
                    v-for="s in exitsByFolio[e.folio]"
                    :key="s.id"
                    class="exit-item"
                  >
                    <div class="exit-item__row">
                      <span class="exit-item__title">{{ s.title }}</span>
                      <span class="exit-item__time">{{ s.at }}</span>
                    </div>
                    <div class="exit-item__meta">
                      <span class="exit-chip exit-chip--type">{{ s.micaType }}</span>
                      <span v-if="s.codebar" class="exit-chip exit-chip--code mono">{{ s.codebar }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject, computed, reactive } from "vue";
import PendingOrdersPanel from "./PendingOrdersPanel.vue";

const lab = inject("lab");
if (!lab) throw new Error("BandejaTab necesita provide('lab', ...)");

// Folios actualmente expandidos
const expandedFolios = reactive(new Set());

function toggleEntry(folio) {
  if (expandedFolios.has(folio)) {
    expandedFolios.delete(folio);
  } else {
    expandedFolios.add(folio);
  }
}

// Índice: folio → salidas
const exitsByFolio = computed(() => {
  const map = {};
  for (const s of lab.exitEvents.value) {
    if (!s.folio || s.folio === "—") continue;
    if (!map[s.folio]) map[s.folio] = [];
    map[s.folio].push(s);
  }
  return map;
});

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

/* .logs-badge, .logs-empty, .logs-loading, .logs-feed, .log-card* → global.css */
/* BandejaTab usa max-height mayor por su layout de columna completa */
.logs-feed { --logs-feed-max-h: 520px; }

/* ── Entry block (entrada + salidas agrupadas) ───────────────────────── */
.entry-block {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Entrada card (específico de BandejaTab) ── */
.entry-card {
  cursor: pointer;
  transition: transform 100ms ease, border-color 120ms ease, background 120ms ease;
  user-select: none;
}
.entry-card:hover { transform: translateX(2px); }

.entry-card--open.log-card--in {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom-color: transparent;
  background: rgba(34, 197, 94, 0.09);
}

.entry-card__right {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.entry-card__chev {
  font-size: 0.65rem;
  color: var(--text-subtle);
  transition: transform var(--transition-base);
}
.entry-card__chev--open { transform: rotate(180deg); }

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
  border-radius: var(--radius-pill);
  padding: 0.05rem 0.35rem;
  color: var(--c-primary);
}

/* ── Exits panel ─────────────────────────────────────────────────────── */
.exits-panel {
  border: 1px solid rgba(239, 68, 68, 0.18);
  border-top: none;
  border-left: 3px solid rgba(239, 68, 68, 0.4);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  background: rgba(239, 68, 68, 0.03);
  padding: 0.5rem 0.65rem 0.6rem;
}

.exits-panel__header {
  font-size: 0.72rem;
  font-weight: 900;
  color: rgba(239, 68, 68, 0.75);
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-bottom: 0.45rem;
}

.exits-count {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 999px;
  padding: 0.02rem 0.35rem;
  font-size: 0.68rem;
  font-weight: 900;
  color: rgba(239, 68, 68, 0.8);
}

.exits-empty {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--text-subtle);
  padding: 0.2rem 0;
}

.exits-list {
  display: grid;
  gap: 0.3rem;
}

.exit-item {
  border-radius: 8px;
  padding: 0.4rem 0.5rem;
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.12);
}

.exit-item__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.4rem;
  margin-bottom: 0.2rem;
}

.exit-item__title {
  font-size: 0.78rem;
  font-weight: 900;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.exit-item__time {
  font-size: 0.68rem;
  font-weight: 800;
  color: var(--text-subtle);
  flex-shrink: 0;
}

.exit-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.exit-chip {
  font-size: 0.68rem;
  font-weight: 900;
  border-radius: 999px;
  padding: 0.02rem 0.35rem;
}

.exit-chip--type {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.18);
  color: rgba(239, 68, 68, 0.85);
}

.exit-chip--code {
  background: var(--surface-overlay);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.65rem;
}
</style>
