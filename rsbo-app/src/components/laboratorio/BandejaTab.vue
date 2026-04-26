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
              <i class="fas fa-bolt mr-2 icon--urgent"></i>
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
              <i class="fas fa-arrow-circle-down mr-2 icon--entry"></i>
              Movimientos del pedido
              <span class="logs-badge ml-2">
                {{ lab.orderEntries.value.length + lab.orderExits.value.length }}
              </span>
            </h3>
            <p class="panel__hint mt-1">Entradas y salidas del pedido seleccionado.</p>
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
            <div class="spacer-md"></div>
          </div>

          <div v-if="!lab.selectedOrder?.value" class="logs-empty logs-empty--hint">
            <i class="fas fa-hand-pointer mr-1"></i>
            Selecciona un pedido para ver sus entradas y salidas.
          </div>

          <div v-else-if="lab.loadingOrderEvents.value" class="events-loading">
            <b-loading :is-full-page="false" :active="true" />
            <span class="events-loading__text">Cargando movimientos del pedido…</span>
          </div>

          <div v-else-if="!lab.orderEntries.value.length" class="logs-empty">
            <i class="fas fa-inbox mr-1"></i>
            Este pedido no tiene entrada registrada.
          </div>

          <div v-else class="logs-feed">
            <div
              v-for="e in lab.orderEntries.value"
              :key="e.id"
              class="entry-block"
            >
              <div class="log-card log-card--in entry-card entry-card--open">
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

              <!-- Salidas de este pedido -->
              <div class="exits-panel">
                <div class="exits-panel__header">
                  <i class="fas fa-arrow-circle-up mr-1 icon--exit"></i>
                  Salidas de este pedido
                  <span class="exits-count">{{ lab.orderExits.value.length }}</span>
                </div>

                <div v-if="!lab.orderExits.value.length" class="exits-empty">
                  <i class="fas fa-clock mr-1"></i>
                  Aún no se han surtido micas de este pedido.
                </div>

                <div v-else class="exits-list">
                  <div v-for="s in lab.orderExits.value" :key="s.id" class="exit-item">
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
import { inject, computed } from "vue";
import PendingOrdersPanel from "./PendingOrdersPanel.vue";
import "./laboratorio-shared.css";
import "./BandejaTab.css";

const lab = inject("lab");
if (!lab) throw new Error("BandejaTab necesita provide('lab', ...)");

function goSurtir() {
  lab.activeMainTab.value = "pedidos";
  lab.mode.value = "surtir";
}

function goCorrecciones() {
  lab.activeMainTab.value = "correcciones";
}
</script>
