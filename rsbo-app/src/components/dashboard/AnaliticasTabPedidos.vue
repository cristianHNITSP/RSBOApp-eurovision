<template>
  <div class="an-tab-two-col">
    <div class="an-col-main">
      <!-- Orders analytics -->
      <div class="gcard mb-5">
        <div class="gcard-bar" style="background:linear-gradient(90deg,#3b82f6,var(--c-primary))"></div>
        <div class="gc-head">
          <div class="gc-ico" style="background:rgba(59,130,246,.16);color:#3b82f6"><i class="fas fa-flask-vial"></i></div>
          <div><div class="gc-title">Analíticas de pedidos</div><div class="gc-sub">Métricas detalladas del flujo de pedidos del período</div></div>
        </div>
        <div class="gc-body">
          <div class="an-stat-grid">
            <div class="an-stat-cell"><div class="asc-ico" style="background:rgba(245,158,11,.12);color:#f59e0b"><i class="fas fa-clock"></i></div><div class="asc-val" style="color:#f59e0b" v-if="!isLoading">{{ s?.ordersPending ?? 0 }}</div><b-skeleton v-else :width="60" :height="28" animated /><div class="asc-lbl">Pendientes</div><div class="asc-cap">Abiertos / parciales</div></div>
            <div class="an-stat-cell"><div class="asc-ico" style="background:rgba(16,185,129,.12);color:#10b981"><i class="fas fa-circle-check"></i></div><div class="asc-val" style="color:#10b981" v-if="!isLoading">{{ s?.ordersClosed30d ?? 0 }}</div><b-skeleton v-else :width="60" :height="28" animated /><div class="asc-lbl">Cerrados (30d)</div><div class="asc-cap">Este mes</div></div>
            <div class="an-stat-cell"><div class="asc-ico" style="background:rgba(239,68,68,.12);color:#ef4444"><i class="fas fa-ban"></i></div><div class="asc-val" style="color:#ef4444" v-if="!isLoading">{{ s?.ordersCancelledAll ?? 0 }}</div><b-skeleton v-else :width="60" :height="28" animated /><div class="asc-lbl">Cancelados</div><div class="asc-cap">Histórico total</div></div>
            <div class="an-stat-cell"><div class="asc-ico" style="background:var(--c-primary-alpha);color:var(--c-primary)"><i class="fas fa-plus"></i></div><div class="asc-val" style="color:var(--c-primary)" v-if="!isLoading">{{ s?.ordersToday ?? 0 }}</div><b-skeleton v-else :width="60" :height="28" animated /><div class="asc-lbl">Creados hoy</div><div class="asc-cap">Nuevos pedidos</div></div>
            <div class="an-stat-cell"><div class="asc-ico" style="background:rgba(16,185,129,.12);color:#10b981"><i class="fas fa-flag-checkered"></i></div><div class="asc-val" style="color:#10b981" v-if="!isLoading">{{ s?.ordersClosedToday ?? 0 }}</div><b-skeleton v-else :width="60" :height="28" animated /><div class="asc-lbl">Cerrados hoy</div><div class="asc-cap">Del día actual</div></div>
            <div class="an-stat-cell"><div class="asc-ico" style="background:rgba(59,130,246,.12);color:#3b82f6"><i class="fas fa-layer-group"></i></div><div class="asc-val" style="color:#3b82f6" v-if="!isLoading">{{ fmtn(s?.ordersClosedAll) }}</div><b-skeleton v-else :width="60" :height="28" animated /><div class="asc-lbl">Total histórico</div><div class="asc-cap">Cerrados acumulados</div></div>
          </div>
          <template v-if="canSeeLab">
            <div class="an-divider my-3"><span>Métricas de laboratorio</span></div>
            <div class="an-stat-grid">
              <div class="an-stat-cell"><div class="asc-ico" style="background:rgba(6,182,212,.12);color:#06b6d4"><i class="fas fa-rotate"></i></div><div class="asc-val" :style="{ color: (s?.corrections30d ?? 0) > 10 ? '#f59e0b' : '#06b6d4' }" v-if="!isLoading">{{ s?.corrections30d ?? 0 }}</div><b-skeleton v-else :width="60" :height="28" animated /><div class="asc-lbl">Correcciones (30d)</div><div class="asc-cap">Solicitudes</div></div>
              <div class="an-stat-cell"><div class="asc-ico" style="background:rgba(6,182,212,.12);color:#06b6d4"><i class="fas fa-barcode"></i></div><div class="asc-val" style="color:#06b6d4" v-if="!isLoading">{{ s?.scansToday ?? 0 }}</div><b-skeleton v-else :width="60" :height="28" animated /><div class="asc-lbl">Escaneos hoy</div><div class="asc-cap">Salidas escáner</div></div>
              <div class="an-stat-cell"><div class="asc-ico" style="background:var(--c-primary-alpha);color:var(--c-primary)"><i class="fas fa-pencil"></i></div><div class="asc-val" style="color:var(--c-primary)" v-if="!isLoading">{{ s?.edits30d ?? 0 }}</div><b-skeleton v-else :width="60" :height="28" animated /><div class="asc-lbl">Ediciones (30d)</div><div class="asc-cap">Cambios a pedidos</div></div>
              <div class="an-stat-cell"><div class="asc-ico" style="background:rgba(16,185,129,.12);color:#10b981"><i class="fas fa-check"></i></div><div class="asc-val" style="color:#10b981" v-if="!isLoading">{{ s?.ordersClosedToday ?? 0 }}</div><b-skeleton v-else :width="60" :height="28" animated /><div class="asc-lbl">Cerrados hoy</div><div class="asc-cap">Del día actual</div></div>
            </div>
          </template>
        </div>
      </div>

      <!-- My activity — ventas -->
      <div v-if="isVentas" class="gcard mb-5">
        <div class="gcard-bar" style="background:linear-gradient(90deg,#10b981,#65a30d)"></div>
        <div class="gc-head">
          <div class="gc-ico" style="background:rgba(16,185,129,.16);color:#10b981"><i class="fas fa-chart-line"></i></div>
          <div><div class="gc-title">Mi actividad</div><div class="gc-sub">Resumen de tu operación en el período activo</div></div>
        </div>
        <div class="gc-body">
          <div class="an-stat-grid">
            <div class="an-stat-cell"><div class="asc-ico" style="background:var(--c-primary-alpha);color:var(--c-primary)"><i class="fas fa-plus-circle"></i></div><div class="asc-val" style="color:var(--c-primary)" v-if="!isLoading">{{ s?.ordersToday ?? 0 }}</div><b-skeleton v-else :width="60" :height="28" animated /><div class="asc-lbl">Pedidos hoy</div><div class="asc-cap">Nuevos pedidos</div></div>
            <div class="an-stat-cell"><div class="asc-ico" style="background:rgba(16,185,129,.12);color:#10b981"><i class="fas fa-check-circle"></i></div><div class="asc-val" style="color:#10b981" v-if="!isLoading">{{ s?.ordersClosedToday ?? 0 }}</div><b-skeleton v-else :width="60" :height="28" animated /><div class="asc-lbl">Cerrados hoy</div><div class="asc-cap">Completados</div></div>
            <div class="an-stat-cell"><div class="asc-ico" style="background:rgba(245,158,11,.12);color:#f59e0b"><i class="fas fa-clipboard-list"></i></div><div class="asc-val" style="color:#f59e0b" v-if="!isLoading">{{ s?.ordersPending ?? 0 }}</div><b-skeleton v-else :width="60" :height="28" animated /><div class="asc-lbl">En curso</div><div class="asc-cap">Pendientes activos</div></div>
            <div class="an-stat-cell"><div class="asc-ico" style="background:rgba(59,130,246,.12);color:#3b82f6"><i class="fas fa-layer-group"></i></div><div class="asc-val" style="color:#3b82f6" v-if="!isLoading">{{ fmtn(s?.ordersClosedAll) }}</div><b-skeleton v-else :width="60" :height="28" animated /><div class="asc-lbl">Total histórico</div><div class="asc-cap">Cerrados acumulados</div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sidebar pedidos -->
    <div class="an-col-side">
      <div v-if="canSeeReports" class="gcard mb-4">
        <div class="gcard-bar" style="background:linear-gradient(90deg,var(--c-primary),#2563eb)"></div>
        <div class="gc-head">
          <div class="gc-ico" style="background:var(--c-primary-alpha);color:var(--c-primary)"><i class="fas fa-gauge-high"></i></div>
          <div><div class="gc-title">Nivel de servicio</div><div class="gc-sub">Pedidos sin correcciones (30d)</div></div>
        </div>
        <div class="gc-body">
          <template v-if="!isLoading">
            <div class="sl-display">
              <div class="sl-ring" :class="serviceLevelClass"><span class="sl-pct">{{ s?.serviceLevel ?? 0 }}%</span><span class="sl-label-sm">{{ serviceLevelStatus }}</span></div>
              <div class="sl-details">
                <div class="sl-row"><span class="sl-k">Pedidos cerrados</span><b class="sl-v">{{ s?.ordersClosed30d ?? 0 }}</b></div>
                <div class="sl-row"><span class="sl-k">Con corrección</span><b class="sl-v">{{ s?.corrections30d ?? 0 }}</b></div>
                <div class="sl-row"><span class="sl-k">Tasa corrección</span><b class="sl-v">{{ correctionRate }}%</b></div>
                <div class="sl-row"><span class="sl-k">Período</span><b class="sl-v">{{ s?.periodLabel || '30d' }}</b></div>
              </div>
            </div>
            <b-progress :value="s?.serviceLevel ?? 0" size="is-small" :type="serviceLevelTagType" :show-value="false" class="mt-3" />
            <div class="sl-chip" :class="`sl-chip-${serviceLevelClass}`"><i class="fas fa-circle-info"></i> {{ serviceLevelStatus }} — {{ serviceLevelComment }}</div>
          </template>
          <template v-else><b-skeleton width="100%" :height="92" animated class="mb-2" /><b-skeleton width="100%" :height="8" animated /></template>
        </div>
      </div>

      <div v-if="isRoot" class="gcard mb-4">
        <div class="gcard-bar" style="background:linear-gradient(90deg,#dc2626,#ea580c)"></div>
        <div class="gc-head">
          <div class="gc-ico" style="background:rgba(220,38,38,.16);color:#dc2626"><i class="fas fa-server"></i></div>
          <div><div class="gc-title">Métricas del sistema</div><div class="gc-sub">Indicadores globales de operación</div></div>
        </div>
        <div class="gc-body">
          <div class="cov-row"><span class="cov-k">Hist. cerrados</span><b class="cov-v" v-if="!isLoading">{{ fmtn(s?.ordersClosedAll) }}</b><b-skeleton v-else :width="55" :height="16" animated /></div>
          <div class="cov-row"><span class="cov-k">Total cancelados</span><b class="cov-v" v-if="!isLoading">{{ s?.ordersCancelledAll ?? 0 }}</b><b-skeleton v-else :width="45" :height="16" animated /></div>
          <div class="cov-row"><span class="cov-k">Ediciones (30d)</span><b class="cov-v" v-if="!isLoading">{{ s?.edits30d ?? 0 }}</b><b-skeleton v-else :width="45" :height="16" animated /></div>
          <div class="cov-row"><span class="cov-k">Movimientos hoy</span><b class="cov-v" v-if="!isLoading">{{ s?.movementsToday ?? 0 }}</b><b-skeleton v-else :width="45" :height="16" animated /></div>
          <div class="cov-row"><span class="cov-k">Movimientos (30d)</span><b class="cov-v" v-if="!isLoading">{{ fmtn(s?.movementsTotal30d) }}</b><b-skeleton v-else :width="55" :height="16" animated /></div>
          <div class="cov-row"><span class="cov-k">Índice rotación</span><b class="cov-v" v-if="!isLoading">{{ rotationIndex }} v/año</b><b-skeleton v-else :width="55" :height="16" animated /></div>
        </div>
      </div>

      <div v-if="canExportReports" class="gcard mb-4">
        <div class="gcard-bar" style="background:linear-gradient(90deg,#6366f1,#0891b2)"></div>
        <div class="gc-head">
          <div class="gc-ico" style="background:rgba(99,102,241,.16);color:#6366f1"><i class="fas fa-file-export"></i></div>
          <div><div class="gc-title">Exportar reportes</div><div class="gc-sub">Acciones de exportación disponibles</div></div>
        </div>
        <div class="gc-body">
          <div class="an-export-tiles">
            <div class="an-export-tile" v-if="canSeeInventory"><i class="fas fa-boxes-stacked"></i><span>Inventario</span></div>
            <div class="an-export-tile"><i class="fas fa-flask-vial"></i><span>Pedidos</span></div>
            <div class="an-export-tile" v-if="canSeeDevolutions"><i class="fas fa-rotate-left"></i><span>Devoluciones</span></div>
            <div class="an-export-tile" v-if="canSeeLab"><i class="fas fa-microscope"></i><span>Laboratorio</span></div>
          </div>
          <p class="an-export-note"><i class="fas fa-circle-info mr-1"></i> Módulo de exportación en desarrollo.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isLoading:           Boolean,
  s:                   Object,
  canSeeLab:           Boolean,
  fmtn:                Function,
  isVentas:            Boolean,
  canSeeReports:       Boolean,
  serviceLevelClass:   String,
  serviceLevelStatus:  String,
  correctionRate:      [Number, String],
  serviceLevelTagType: String,
  serviceLevelComment: String,
  isRoot:              Boolean,
  rotationIndex:       [Number, String],
  canExportReports:    Boolean,
  canSeeInventory:     Boolean,
  canSeeDevolutions:   Boolean
})
</script>
