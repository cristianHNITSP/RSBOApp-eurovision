<template>
  <div class="an-tab-single-col">
    <div class="gcard mb-5">
      <div class="gc-head">
        <div class="gc-ico" style="background:rgba(6,182,212,.16);color:#06b6d4"><i class="fas fa-microscope"></i></div>
        <div>
          <div class="gc-title">Mi Actividad (Laboratorio)</div>
          <div class="gc-sub">Métricas individuales (Modo Estático)</div>
        </div>
      </div>
      <div class="gc-body">
        <div class="an-stat-grid">
          <!-- Escaneos (Salidas) -->
          <div class="an-stat-cell">
            <div class="asc-ico" style="background:rgba(6,182,212,.12);color:#06b6d4"><i class="fas fa-barcode"></i></div>
            <div class="asc-val" style="color:#06b6d4">{{ staticData.myScans.week }}</div>
            <div class="asc-lbl">Escaneos (Semana)</div>
            <div class="asc-cap">{{ staticData.myScans.today }} escaneos hoy</div>
          </div>

          <!-- Correcciones -->
          <div class="an-stat-cell">
            <div class="asc-ico" style="background:rgba(239,68,68,.12);color:#ef4444"><i class="fas fa-rotate"></i></div>
            <div class="asc-val" style="color: #10b981">{{ staticData.myCorrections.month }}</div>
            <div class="asc-lbl">Correcciones</div>
            <div class="asc-cap">Asignadas este mes</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'

const staticData = reactive({
  myScans: { week: 145, today: 22 },
  myCorrections: { month: 0 }
})
</script>
