<template>
  <div class="tab-single-col">
    <div class="gcard mb-5">
      <div class="gc-head">
        <div class="gc-head-left">
          <div class="gc-badge-icon accent-blue"><i class="fas fa-arrow-trend-up"></i></div>
          <div>
            <div class="gc-title">Movimientos de Producto (Top Movers)</div>
            <div class="gc-sub">Productos con más desplazamiento (Modo Estático)</div>
          </div>
        </div>
      </div>
      <div class="gc-body">
        <b-table
          :data="staticMovers"
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
        </b-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'

const staticMovers = reactive([
  { sheetName: 'Ophthala 1.56', label: 'Esf: -1.00, Cil: -0.50', totalMovements: 45, entries: 20, exits: 25, trend: 'high_demand' },
  { sheetName: 'Polycarbonate 1.59', label: 'Esf: -2.00, Cil: -0.25', totalMovements: 32, entries: 15, exits: 17, trend: 'stable' },
  { sheetName: 'Hi-Index 1.67', label: 'Esf: -4.00, Cil: -1.00', totalMovements: 12, entries: 2, exits: 10, trend: 'low_demand' }
])
</script>

<style scoped>
.top-movers-table {
  font-size: 0.9rem;
}
</style>
