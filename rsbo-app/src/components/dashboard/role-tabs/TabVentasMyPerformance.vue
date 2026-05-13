<template>
  <div class="an-tab-single-col">
    <div class="gcard mb-5">
      <div class="gc-head">
        <div class="gc-ico" style="background:rgba(59,130,246,.16);color:#3b82f6"><i class="fas fa-user-chart"></i></div>
        <div>
          <div class="gc-title">Mi Desempeño</div>
          <div class="gc-sub">Métricas individuales (Modo Estático)</div>
        </div>
      </div>
      <div class="gc-body">
        <div class="an-stat-grid">
          <!-- Órdenes -->
          <div class="an-stat-cell">
            <div class="asc-ico" style="background:rgba(16,185,129,.12);color:#10b981"><i class="fas fa-clipboard-check"></i></div>
            <div class="asc-val" style="color:#10b981">{{ staticData.myOrders.month }}</div>
            <div class="asc-lbl">Pedidos (Mes)</div>
            <div class="asc-cap">{{ staticData.myOrders.week }} esta semana, {{ staticData.myOrders.today }} hoy</div>
          </div>
          
          <!-- Monto -->
          <div class="an-stat-cell" v-if="canSeeRevenue">
            <div class="asc-ico" style="background:rgba(245,158,11,.12);color:#f59e0b"><i class="fas fa-dollar-sign"></i></div>
            <div class="asc-val" style="color:#f59e0b">${{ staticData.myRevenue.month.toLocaleString() }}</div>
            <div class="asc-lbl">Ventas (Mes)</div>
            <div class="asc-cap">${{ staticData.myRevenue.week.toLocaleString() }} esta semana</div>
          </div>

          <!-- Correcciones -->
          <div class="an-stat-cell">
            <div class="asc-ico" style="background:rgba(239,68,68,.12);color:#ef4444"><i class="fas fa-rotate-left"></i></div>
            <div class="asc-val" style="color: #10b981">{{ staticData.myCorrections.month }}</div>
            <div class="asc-lbl">Correcciones</div>
            <div class="asc-cap">Este mes</div>
          </div>

          <!-- Devoluciones -->
          <div class="an-stat-cell">
            <div class="asc-ico" style="background:rgba(239,68,68,.12);color:#ef4444"><i class="fas fa-arrow-right-arrow-left"></i></div>
            <div class="asc-val" style="color: #10b981">{{ staticData.myDevolutions.month }}</div>
            <div class="asc-lbl">Devoluciones</div>
            <div class="asc-cap">Este mes</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'

defineProps({
  isHighRole: { type: Boolean, default: false },
  canSeeRevenue: { type: Boolean, default: true }
})

const staticData = reactive({
  myOrders: { month: 124, week: 28, today: 5 },
  myRevenue: { month: 45000, week: 12000 },
  myCorrections: { month: 0 },
  myDevolutions: { month: 0 }
})
</script>
