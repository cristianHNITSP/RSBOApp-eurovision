<template>
  <div class="an-tab-single-col">
    <div class="gcard mb-5">
      <div class="gc-head">
        <div class="gc-ico" style="background:rgba(6,182,212,.16);color:#06b6d4"><i class="fas fa-microscope"></i></div>
        <div>
          <div class="gc-title">Mi Actividad (Laboratorio)</div>
          <div class="gc-sub">Métricas individuales de escaneo y procesamiento</div>
        </div>
      </div>
      <div class="gc-body">
        <b-skeleton v-if="loading" width="100%" height="150px" animated />
        <div v-else-if="error" class="has-text-danger">{{ error }}</div>
        <div v-else class="an-stat-grid">
          <!-- Escaneos (Salidas) -->
          <div class="an-stat-cell">
            <div class="asc-ico" style="background:rgba(6,182,212,.12);color:#06b6d4"><i class="fas fa-barcode"></i></div>
            <div class="asc-val" style="color:#06b6d4">{{ data?.myScans?.week || 0 }}</div>
            <div class="asc-lbl">Escaneos (Semana)</div>
            <div class="asc-cap">{{ data?.myScans?.today || 0 }} escaneos hoy</div>
          </div>

          <!-- Correcciones -->
          <div class="an-stat-cell">
            <div class="asc-ico" style="background:rgba(239,68,68,.12);color:#ef4444"><i class="fas fa-rotate"></i></div>
            <div class="asc-val" :style="{ color: (data?.myCorrections?.month || 0) > 0 ? '#ef4444' : '#10b981' }">{{ data?.myCorrections?.month || 0 }}</div>
            <div class="asc-lbl">Correcciones</div>
            <div class="asc-cap">Asignadas este mes</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useMyPerformance } from '@/composables/api/useMyPerformance'

const { loading, data, error, load } = useMyPerformance()

onMounted(() => {
  load()
})
</script>
