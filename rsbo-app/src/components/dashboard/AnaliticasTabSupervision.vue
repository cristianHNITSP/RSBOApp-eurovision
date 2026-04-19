<template>
  <div class="an-tab-single-col">
    <div class="gcard mb-5">
      <div class="gc-head">
        <div class="gc-ico" style="background:rgba(8,145,178,.16);color:#0891b2"><i class="fas fa-star-half-stroke"></i>
        </div>
        <div>
          <div class="gc-title">Calidad operativa</div>
          <div class="gc-sub">Indicadores de rendimiento del equipo y la operación</div>
        </div>
      </div>
      <div class="gc-body">
        <div class="an-stat-grid">
          <div class="an-stat-cell">
            <div class="asc-ico" style="background:rgba(239,68,68,.12);color:#ef4444"><i class="fas fa-rotate"></i>
            </div>
            <div class="asc-val" :style="{ color: (s?.corrections30d ?? 0) > 10 ? '#ef4444' : '#10b981' }"
              v-if="!isLoading">{{ s?.corrections30d ?? 0 }}</div><b-skeleton v-else :width="50" :height="28"
              animated />
            <div class="asc-lbl">Correcciones (30d)</div>
            <div class="asc-cap">Del equipo de lab</div>
          </div>
          <div class="an-stat-cell">
            <div class="asc-ico" style="background:rgba(59,130,246,.12);color:#3b82f6"><i class="fas fa-pencil"></i>
            </div>
            <div class="asc-val" style="color:#3b82f6" v-if="!isLoading">{{ s?.edits30d ?? 0 }}</div><b-skeleton v-else
              :width="50" :height="28" animated />
            <div class="asc-lbl">Ediciones (30d)</div>
            <div class="asc-cap">Cambios a pedidos</div>
          </div>
          <div class="an-stat-cell">
            <div class="asc-ico" style="background:rgba(6,182,212,.12);color:#06b6d4"><i class="fas fa-barcode"></i>
            </div>
            <div class="asc-val" style="color:#06b6d4" v-if="!isLoading">{{ s?.scansToday ?? 0 }}</div><b-skeleton
              v-else :width="50" :height="28" animated />
            <div class="asc-lbl">Escaneos hoy</div>
            <div class="asc-cap">Actividad del día</div>
          </div>
          <div class="an-stat-cell">
            <div class="asc-ico" style="background:rgba(239,68,68,.12);color:#ef4444"><i class="fas fa-ban"></i></div>
            <div class="asc-val" style="color:#ef4444" v-if="!isLoading">{{ s?.ordersCancelledAll ?? 0 }}</div>
            <b-skeleton v-else :width="50" :height="28" animated />
            <div class="asc-lbl">Cancelados total</div>
            <div class="asc-cap">Histórico</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isLoading: Boolean,
  s: Object
})
</script>
