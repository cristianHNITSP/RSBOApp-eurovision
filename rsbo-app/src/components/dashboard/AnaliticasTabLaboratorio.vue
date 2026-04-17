<template>
  <div class="an-tab-single-col">
    <div class="gcard mb-5">
      <div class="gcard-bar" style="background:linear-gradient(90deg,#06b6d4,#3b82f6,var(--c-primary))"></div>
      <div class="gc-head">
        <div class="gc-ico" style="background:rgba(6,182,212,.16);color:#06b6d4"><i class="fas fa-microscope"></i></div>
        <div><div class="gc-title">Calidad del laboratorio</div><div class="gc-sub">Eficiencia de procesamiento y tasa de correcciones del período</div></div>
      </div>
      <div class="gc-body">
        <div class="an-stat-grid">
          <div class="an-stat-cell"><div class="asc-ico" style="background:rgba(6,182,212,.12);color:#06b6d4"><i class="fas fa-rotate"></i></div><div class="asc-val" :style="{ color: (s?.corrections7d ?? 0) > 5 ? '#f59e0b' : '#10b981' }" v-if="!isLoading">{{ s?.corrections7d ?? 0 }}</div><b-skeleton v-else :width="60" :height="28" animated /><div class="asc-lbl">Correcciones (7d)</div><div class="asc-cap">Última semana</div></div>
          <div class="an-stat-cell"><div class="asc-ico" style="background:var(--c-primary-alpha);color:var(--c-primary)"><i class="fas fa-list-check"></i></div><div class="asc-val" style="color:var(--c-primary)" v-if="!isLoading">{{ s?.corrections30d ?? 0 }}</div><b-skeleton v-else :width="60" :height="28" animated /><div class="asc-lbl">Correcciones (30d)</div><div class="asc-cap">Total período</div></div>
          <div class="an-stat-cell"><div class="asc-ico" style="background:rgba(6,182,212,.12);color:#06b6d4"><i class="fas fa-barcode"></i></div><div class="asc-val" style="color:#06b6d4" v-if="!isLoading">{{ s?.scansToday ?? 0 }}</div><b-skeleton v-else :width="60" :height="28" animated /><div class="asc-lbl">Escaneos hoy</div><div class="asc-cap">Salidas escáner</div></div>
          <div class="an-stat-cell"><div class="asc-ico" style="background:rgba(59,130,246,.12);color:#3b82f6"><i class="fas fa-pen-to-square"></i></div><div class="asc-val" style="color:#3b82f6" v-if="!isLoading">{{ s?.edits30d ?? 0 }}</div><b-skeleton v-else :width="60" :height="28" animated /><div class="asc-lbl">Ediciones (30d)</div><div class="asc-cap">Modificaciones</div></div>
        </div>
        <div class="an-quality-bar mt-4" v-if="!isLoading">
          <div class="aqb-head"><span class="aqb-lbl"><i class="fas fa-chart-line mr-1"></i> Tasa de corrección</span><span class="aqb-val" :style="{ color: correctionRate > 10 ? '#ef4444' : correctionRate > 5 ? '#f59e0b' : '#10b981' }">{{ correctionRate }}%</span></div>
          <b-progress :value="correctionRate" size="is-small" :type="correctionRate > 10 ? 'is-danger' : correctionRate > 5 ? 'is-warning' : 'is-success'" :show-value="false" />
          <div class="aqb-desc">{{ correctionRate <= 5 ? 'Calidad excelente — mantener procesos.' : correctionRate <= 10 ? 'Calidad aceptable — revisar técnicas.' : 'Alta tasa — intervención recomendada.' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isLoading:      Boolean,
  s:              Object,
  correctionRate: [Number, String]
})
</script>
