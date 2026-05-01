<template>
  <div class="panel">
    <div class="panel__head">
      <div>
        <h2 class="panel__title">Historial de Ventas</h2>
        <p class="panel__hint">Ventas y pedidos registrados (últimos 200).</p>
      </div>
      <div class="panel__headActions">
        <b-button
          type="is-light"
          icon-left="sync"
          size="is-small"
          :loading="loading"
          @click="$emit('refresh')"
        >
          Recargar
        </b-button>
      </div>
    </div>

    <div class="panel__body">
      <!-- Filtro de Categoría -->
      <div class="history-filters">
        <b-field>
          <b-radio-button 
            v-model="localCategory"
            native-value="all"
            type="is-primary is-light"
            size="is-small"
          >
            Todas
          </b-radio-button>
          <b-radio-button 
            v-model="localCategory"
            native-value="bases-micas"
            type="is-primary is-light"
            size="is-small"
          >
            Bases y Micas
          </b-radio-button>
          <b-radio-button 
            v-model="localCategory"
            native-value="optica"
            type="is-primary is-light"
            size="is-small"
          >
            Óptica
          </b-radio-button>
          <b-radio-button 
            v-model="localCategory"
            native-value="lentes-contacto"
            type="is-primary is-light"
            size="is-small"
          >
            Lentes Contacto
          </b-radio-button>
        </b-field>
      </div>

      <b-loading :is-full-page="false" :active="loading" />

      <div v-if="!rows.length && !loading" class="empty">
        <i class="fas fa-history empty__icon"></i>
        <p class="empty__title">Sin historial</p>
        <p class="empty__text">Las ventas de esta categoría aparecerán aquí.</p>
      </div>

      <div v-else class="order-lines">
        <div
          v-for="sale in rows"
          :key="sale.id"
          class="order-line order-line--history"
          @click="$emit('select-order', sale)"
        >
          <div class="order-line__top">
            <div>
              <div class="order-line__title">{{ sale.clienteDisplay || sale.cliente }}</div>
              <span class="order-line__sub">
                {{ fmtDate(sale.fecha) }} · {{ sale.totalPiezas }} pzas
              </span>
              <span v-if="sale.ventaFolio" class="order-line__sub mono muted">
                <i class="fas fa-receipt mr-1"></i>{{ sale.ventaFolio }}
              </span>
              <span v-if="sale.labFolio" class="order-line__sub mono muted">
                <i class="fas fa-flask mr-1"></i>{{ sale.labFolio }}
              </span>
            </div>
            <div class="is-flex is-flex-direction-column is-align-items-flex-end" style="gap:0.4rem">
              <b-tag
                v-if="sale.labStatus"
                :type="`${labStatusClass(sale.labStatus)} is-light`"
                class="lab-hist-badge"
              >
                <i class="fas fa-circle mr-1" style="font-size:0.55rem"></i>
                {{ labStatusHuman(sale.labStatus) }}
              </b-tag>
              <b-tag v-else type="is-success is-light" class="lab-hist-badge">
                <i class="fas fa-check-circle mr-1" style="font-size:0.55rem"></i>
                Venta Directa
              </b-tag>
              <b-tag type="is-light" style="font-size:0.75rem">
                {{ sale.lineas?.length || 0 }} ítem(s)
              </b-tag>
              <i class="fas fa-chevron-right muted" style="font-size:0.8rem"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { fmtDate } from '@/utils/formatters';
import { labStatusHuman, labStatusClass } from '@/utils/statusHelpers';

const props = defineProps({
  category: { type: String, default: 'all' },
  rows:     { type: Array,  default: () => [] },
  loading:  { type: Boolean, default: false }
});

const emit = defineEmits(['update:category', 'refresh', 'select-order']);

const localCategory = computed({
  get: () => props.category,
  set: (v) => emit('update:category', v)
});
</script>

<style src="./VentasHistory.css" scoped></style>
