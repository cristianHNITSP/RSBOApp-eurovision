<template>
  <div class="an-tab-single-col">
    <div class="gcard mb-5">
      <div class="gc-head">
        <div class="gc-ico" style="background:rgba(59,130,246,.16);color:#3b82f6"><i class="fas fa-user-chart"></i></div>
        <div>
          <div class="gc-title">Mi Desempeño</div>
          <div class="gc-sub">Métricas individuales de trabajo</div>
        </div>
      </div>
      <div class="gc-body">
        <b-skeleton v-if="loading" width="100%" height="150px" animated />
        <div v-else-if="error" class="has-text-danger">{{ error }}</div>
        <div v-else class="an-stat-grid">
          <!-- Órdenes -->
          <div class="an-stat-cell">
            <div class="asc-ico" style="background:rgba(16,185,129,.12);color:#10b981"><i class="fas fa-clipboard-check"></i></div>
            <div class="asc-val" style="color:#10b981">{{ data?.myOrders?.month || 0 }}</div>
            <div class="asc-lbl">Pedidos (Mes)</div>
            <div class="asc-cap">{{ data?.myOrders?.week || 0 }} esta semana, {{ data?.myOrders?.today || 0 }} hoy</div>
          </div>
          
          <!-- Monto (visible a roles altos o al propio usuario si así se desea, aquí lo mostramos) -->
          <div class="an-stat-cell" v-if="canSeeRevenue">
            <div class="asc-ico" style="background:rgba(245,158,11,.12);color:#f59e0b"><i class="fas fa-dollar-sign"></i></div>
            <div class="asc-val" style="color:#f59e0b">${{ (data?.myRevenue?.month || 0).toLocaleString() }}</div>
            <div class="asc-lbl">Ventas (Mes)</div>
            <div class="asc-cap">${{ (data?.myRevenue?.week || 0).toLocaleString() }} esta semana</div>
          </div>

          <!-- Correcciones -->
          <div class="an-stat-cell">
            <div class="asc-ico" style="background:rgba(239,68,68,.12);color:#ef4444"><i class="fas fa-rotate-left"></i></div>
            <div class="asc-val" :style="{ color: (data?.myCorrections?.month || 0) > 0 ? '#ef4444' : '#10b981' }">{{ data?.myCorrections?.month || 0 }}</div>
            <div class="asc-lbl">Correcciones</div>
            <div class="asc-cap">Este mes</div>
          </div>

          <!-- Devoluciones -->
          <div class="an-stat-cell">
            <div class="asc-ico" style="background:rgba(239,68,68,.12);color:#ef4444"><i class="fas fa-arrow-right-arrow-left"></i></div>
            <div class="asc-val" :style="{ color: (data?.myDevolutions?.month || 0) > 0 ? '#ef4444' : '#10b981' }">{{ data?.myDevolutions?.month || 0 }}</div>
            <div class="asc-lbl">Devoluciones</div>
            <div class="asc-cap">Este mes</div>
          </div>

          <!-- Ranking (solo si isHighRole) -->
          <div class="an-stat-cell" v-if="isHighRole && data?.ranking">
            <div class="asc-ico" style="background:rgba(139,92,246,.12);color:#8b5cf6"><i class="fas fa-trophy"></i></div>
            <div class="asc-val" style="color:#8b5cf6">#{{ data?.ranking?.position }}</div>
            <div class="asc-lbl">Ranking Ventas</div>
            <div class="asc-cap">De {{ data?.ranking?.totalUsers }} usuarios</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useMyPerformance } from '@/composables/api/useMyPerformance'

defineProps({
  isHighRole: { type: Boolean, default: false },
  canSeeRevenue: { type: Boolean, default: true }
})

const { loading, data, error, load } = useMyPerformance()

onMounted(() => {
  load()
})
</script>
