<!-- src/components/laboratorio/BandejaTab.vue -->
<template>
  <div class="columns is-multiline is-variable is-4">
    <!-- Left: Inbox + logs (standalone) -->
    <div class="column is-8">
      <PendingOrdersPanel :standalone="true" />
    </div>

    <!-- Right: Recientes + accesos rápidos -->
    <div class="column is-4">
      <div class="panel panel--sticky">
        <div class="panel__head">
          <div>
            <h2 class="panel__title">
              <i class="fas fa-bolt mr-2"></i>
              Accesos rápidos
            </h2>
            <p class="panel__hint">Ir directo a crear o a surtir sin mezclar vistas.</p>
          </div>
        </div>

        <div class="panel__body">
          <div class="columns is-mobile is-variable is-2">
            <div class="column">
              <b-button type="is-light" expanded icon-left="cart-plus" @click="goCrear">
                Ir a crear
              </b-button>
            </div>
            <div class="column">
              <b-button type="is-primary" expanded icon-left="barcode" @click="goSurtir">
                Ir a surtir
              </b-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Recientes -->
      <div class="panel mt-4">
        <div class="panel__head panel__head--compact">
          <h3 class="panel__title mb-0"><i class="fas fa-history mr-2"></i>Últimos registros</h3>
        </div>

        <div class="panel__body">
          <div class="recent">
            <a
              v-for="s in lab.recentSheets.value"
              :key="s.id"
              class="recent__item"
              href="#"
              @click.prevent="pickSheet(s.id)"
            >
              <div class="recent__id">{{ (s.nombre || "SHEET").slice(0, 12) }}</div>

              <div class="recent__meta">
                <div class="recent__line">{{ s.updatedAtShort }} · Por: {{ s.updatedBy || "—" }}</div>
                <div class="recent__line recent__line--muted">
                  {{ s.material }} · {{ lab.prettyTrat(s.tratamientos) }}
                  <span v-if="s.sku" class="mono"> · {{ s.sku }}</span>
                </div>
              </div>

              <i class="fas fa-chevron-right recent__chev"></i>
            </a>
          </div>

          <div v-if="!lab.recentSheets.value.length" class="empty empty--mini">
            <i class="fas fa-history empty__icon"></i>
            <p class="empty__title">Sin registros</p>
            <p class="empty__text">Aún no hay planillas recientes.</p>
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
  lab.activeMainTab.value = "pedidos"; // opcional: te llevo a donde se usa el inventario
  lab.mode.value = "crear";
}
</script>
