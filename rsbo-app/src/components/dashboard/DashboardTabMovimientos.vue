<template>
  <div class="tab-single-col">
    <div class="gcard mb-5">
      <div class="gc-head">
        <div class="gc-head-left">
          <div class="gc-badge-icon accent-blue"><i class="fas fa-arrow-trend-up"></i></div>
          <div>
            <div class="gc-title">Movimientos de Producto (Top Movers)</div>
            <div class="gc-sub">Productos con más desplazamiento en el período seleccionado</div>
          </div>
        </div>
        <div class="gc-head-right">
          <PeriodSelector v-model="period" />
        </div>
      </div>
      <div class="gc-body">
        <b-skeleton v-if="loading" width="100%" height="400px" animated />
        <div v-else-if="error" class="has-text-danger">{{ error }}</div>
        <div v-else>
          <b-table
            :data="filteredMovers"
            striped
            hoverable
            class="top-movers-table"
          >
            <b-table-column field="sheetName" label="Plantilla" v-slot="props">
              <b>{{ props.row.sheetName }}</b>
            </b-table-column>
            
            <b-table-column field="label" label="Combinación" v-slot="props">
              {{ props.row.label }}
            </b-table-column>

            <b-table-column field="totalMovements" label="Movimientos" numeric centered v-slot="props">
              <span class="has-text-weight-bold">{{ props.row.totalMovements }}</span>
            </b-table-column>
            
            <b-table-column field="entries" label="Entradas" numeric centered v-slot="props">
              <span class="has-text-success">{{ props.row.entries }}</span>
            </b-table-column>

            <b-table-column field="exits" label="Salidas" numeric centered v-slot="props">
              <span class="has-text-info">{{ props.row.exits }}</span>
            </b-table-column>

            <b-table-column field="trend" label="Tendencia" centered v-slot="props">
              <b-tag v-if="props.row.trend === 'high_demand'" type="is-success" class="is-rounded"><i class="fas fa-arrow-trend-up mr-1"></i> Alta</b-tag>
              <b-tag v-else-if="props.row.trend === 'low_demand'" type="is-danger" class="is-rounded"><i class="fas fa-arrow-trend-down mr-1"></i> Baja</b-tag>
              <b-tag v-else type="is-light" class="is-rounded"><i class="fas fa-minus mr-1"></i> Estable</b-tag>
            </b-table-column>
            <template #empty>
              <div class="empty py-6">
                <div class="empty__icon"><i class="fas fa-box-open"></i></div>
                <div class="empty__title">Sin movimientos</div>
                <div class="empty__text">No se registraron movimientos en el período seleccionado.</div>
              </div>
            </template>
          </b-table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useProductMovements } from '@/composables/api/useProductMovements'
import PeriodSelector from './shared/PeriodSelector.vue'

const { loading, data, error, load } = useProductMovements()
const period = ref('30d')

onMounted(() => {
  load(period.value)
})

watch(period, (newVal) => {
  load(newVal)
})

const filteredMovers = computed(() => {
  return data.value?.topMovers || []
})
</script>

<style scoped>
.top-movers-table {
  font-size: 0.9rem;
}
</style>
