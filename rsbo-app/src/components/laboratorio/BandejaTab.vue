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
            <button class="quick-action-btn quick-action-btn--crear" @click="goCrear">
              <i class="fas fa-cart-plus quick-action-btn__icon"></i>
              <div>
                <div class="quick-action-btn__label">Crear pedido</div>
                <div class="quick-action-btn__hint">Desde inventario</div>
              </div>
              <i class="fas fa-chevron-right quick-action-btn__chev"></i>
            </button>

            <button class="quick-action-btn quick-action-btn--surtir" @click="goSurtir">
              <i class="fas fa-barcode quick-action-btn__icon"></i>
              <div>
                <div class="quick-action-btn__label">Ir a surtir</div>
                <div class="quick-action-btn__hint">Escaneo → salida</div>
              </div>
              <i class="fas fa-chevron-right quick-action-btn__chev"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Planillas recientes -->
      <div class="panel mt-4">
        <div class="panel__head panel__head--compact">
          <h3 class="panel__title mb-0">
            <i class="fas fa-history mr-2" style="color: rgba(144, 111, 225, 0.85)"></i>
            Planillas recientes
          </h3>
        </div>
        <div class="panel__body">
          <div v-if="!lab.recentSheets.value.length" class="empty empty--mini">
            <i class="fas fa-history empty__icon"></i>
            <p class="empty__title">Sin registros</p>
            <p class="empty__text">Aún no hay planillas recientes.</p>
          </div>

          <div v-else class="recent">
            <a
              v-for="s in lab.recentSheets.value"
              :key="s.id"
              class="recent__item"
              href="#"
              @click.prevent="pickSheet(s.id)"
            >
              <!-- Sheet type badge -->
              <div class="recent__badge">
                <span class="tag is-primary is-light recent__type">{{ s.tipo_matriz || "—" }}</span>
              </div>

              <!-- Info -->
              <div class="recent__info">
                <div class="recent__name">{{ s.nombre || "Planilla" }}</div>
                <div class="recent__meta">
                  <span>{{ s.updatedAtShort }}</span>
                  <span class="recent__sep">·</span>
                  <span>{{ s.material || "—" }}</span>
                </div>
                <div v-if="s.tratamientos?.length" class="recent__trat">
                  {{ lab.prettyTrat(s.tratamientos) }}
                </div>
              </div>

              <i class="fas fa-chevron-right recent__chev"></i>
            </a>
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

function goCrear() {
  lab.activeMainTab.value = "pedidos";
  lab.mode.value = "crear";
}

function goSurtir() {
  lab.activeMainTab.value = "pedidos";
  lab.mode.value = "surtir";
}

function pickSheet(id) {
  lab.selectedSheetId.value = id;
  lab.activeMainTab.value = "pedidos";
  lab.mode.value = "crear";
}
</script>

<style scoped>
/* Quick action buttons */
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
  border: 1.5px solid rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  text-align: left;
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
}

.quick-action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.10);
}

.quick-action-btn--crear {
  border-color: rgba(144, 111, 225, 0.3);
  background: linear-gradient(135deg, rgba(144, 111, 225, 0.08), rgba(255, 255, 255, 0.85));
}

.quick-action-btn--crear:hover {
  border-color: rgba(144, 111, 225, 0.55);
}

.quick-action-btn--surtir {
  border-color: rgba(34, 197, 94, 0.3);
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.07), rgba(255, 255, 255, 0.85));
}

.quick-action-btn--surtir:hover {
  border-color: rgba(34, 197, 94, 0.55);
}

.quick-action-btn__icon {
  font-size: 1.3rem;
  width: 2.2rem;
  text-align: center;
  flex-shrink: 0;
}

.quick-action-btn--crear .quick-action-btn__icon { color: rgba(144, 111, 225, 0.85); }
.quick-action-btn--surtir .quick-action-btn__icon { color: rgba(34, 197, 94, 0.85); }

.quick-action-btn__label {
  font-weight: 1000;
  font-size: 0.9rem;
  color: rgba(17, 24, 39, 0.9);
}

.quick-action-btn__hint {
  font-size: 0.78rem;
  font-weight: 800;
  color: rgba(107, 114, 128, 0.9);
  margin-top: 0.1rem;
}

.quick-action-btn__chev {
  margin-left: auto;
  font-size: 0.75rem;
  color: rgba(148, 163, 184, 0.75);
}

/* Recent sheets */
.recent {
  display: grid;
  gap: 0.45rem;
}

.recent__item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.7rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.72);
  text-decoration: none;
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.recent__item:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  border-color: rgba(144, 111, 225, 0.3);
}

.recent__badge {
  flex-shrink: 0;
}

.recent__type {
  font-size: 0.7rem;
  font-weight: 900;
  border-radius: 8px;
  white-space: nowrap;
}

.recent__info {
  flex: 1;
  min-width: 0;
}

.recent__name {
  font-weight: 950;
  font-size: 0.86rem;
  color: rgba(17, 24, 39, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent__meta {
  font-size: 0.76rem;
  font-weight: 800;
  color: rgba(107, 114, 128, 0.9);
  margin-top: 0.1rem;
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.recent__sep {
  opacity: 0.5;
}

.recent__trat {
  font-size: 0.72rem;
  font-weight: 800;
  color: rgba(107, 114, 128, 0.8);
  margin-top: 0.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent__chev {
  font-size: 0.7rem;
  color: rgba(148, 163, 184, 0.7);
  flex-shrink: 0;
}
</style>