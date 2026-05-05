<template>
  <section class="an-kpis">
    <div class="an-kpi-grid">
      <template v-if="canSeeInventory">
        <div class="an-kpi-card">
          <div class="an-kpi-inner">
            <div class="an-kpi-ico" style="background:var(--c-primary-alpha);color:var(--c-primary)"><i class="fas fa-layer-group"></i></div>
            <div>
              <div class="an-kpi-lbl">Combinaciones</div>
              <div class="an-kpi-num" style="color:var(--c-primary)" v-if="!isLoading">{{ fmtn(s?.totalCombinations) }}</div>
              <b-skeleton v-else :width="70" :height="26" animated />
              <div class="an-kpi-cap">Esférica, Cilíndrica, Adición</div>
            </div>
          </div>
        </div>
        <div class="an-kpi-card">
          <div class="an-kpi-inner">
            <div class="an-kpi-ico" style="background:rgba(16,185,129,.16);color:#10b981"><i class="fas fa-boxes-stacked"></i></div>
            <div>
              <div class="an-kpi-lbl">Existencias</div>
              <div class="an-kpi-num" style="color:#10b981" v-if="!isLoading">{{ fmtn(s?.totalStock) }}</div>
              <b-skeleton v-else :width="70" :height="26" animated />
              <div class="an-kpi-cap">Piezas en almacén</div>
            </div>
          </div>
        </div>
        <div class="an-kpi-card">
          <div class="an-kpi-inner">
            <div class="an-kpi-ico" style="background:rgba(59,130,246,.16);color:#3b82f6"><i class="fas fa-percent"></i></div>
            <div>
              <div class="an-kpi-lbl">Cobertura</div>
              <div class="an-kpi-num" style="color:#3b82f6" v-if="!isLoading">{{ s?.coveragePct ?? 0 }}%</div>
              <b-skeleton v-else :width="60" :height="26" animated />
              <div class="an-kpi-cap">Del catálogo objetivo</div>
            </div>
          </div>
        </div>
        <div class="an-kpi-card">
          <div class="an-kpi-inner">
            <div class="an-kpi-ico" style="background:rgba(245,158,11,.16);color:#f59e0b"><i class="fas fa-triangle-exclamation"></i></div>
            <div>
              <div class="an-kpi-lbl">Alertas críticas</div>
              <div class="an-kpi-num" :style="{ color: (s?.criticalAlerts ?? 0) > 0 ? '#ef4444' : '#10b981' }" v-if="!isLoading">{{ s?.criticalAlerts ?? 0 }}</div>
              <b-skeleton v-else :width="50" :height="26" animated />
              <div class="an-kpi-cap">Stock nivel crítico</div>
            </div>
          </div>
        </div>
      </template>

      <!-- KPIs Lentes de Contacto -->
      <template v-if="canSeeInventory">
        <div class="an-kpi-card">
          <div class="an-kpi-inner">
            <div class="an-kpi-ico" style="background:rgba(6,182,212,.16);color:#06b6d4"><i class="fas fa-eye"></i></div>
            <div>
              <div class="an-kpi-lbl">Lentes de Contacto</div>
              <div class="an-kpi-num" style="color:#06b6d4" v-if="!isLoading">{{ fmtn(s?.clTotalStock) }}</div>
              <b-skeleton v-else :width="70" :height="26" animated />
              <div class="an-kpi-cap">Existencias totales</div>
            </div>
          </div>
        </div>
        <div class="an-kpi-card">
          <div class="an-kpi-inner">
            <div class="an-kpi-ico" style="background:rgba(13,148,136,.16);color:#0d9488"><i class="fas fa-table-cells"></i></div>
            <div>
              <div class="an-kpi-lbl">Combinaciones (Contacto)</div>
              <div class="an-kpi-num" style="color:#0d9488" v-if="!isLoading">{{ fmtn(s?.clTotalCombinations) }}</div>
              <b-skeleton v-else :width="70" :height="26" animated />
              <div class="an-kpi-cap">Cobertura {{ s?.clCoveragePct ?? 0 }}%</div>
            </div>
          </div>
        </div>
      </template>

      <template v-if="canSeeOrders">
        <div class="an-kpi-card">
          <div class="an-kpi-inner">
            <div class="an-kpi-ico" style="background:rgba(245,158,11,.16);color:#f59e0b"><i class="fas fa-clipboard-list"></i></div>
            <div>
              <div class="an-kpi-lbl">Pedidos pendientes</div>
              <div class="an-kpi-num" style="color:#f59e0b" v-if="!isLoading">{{ s?.ordersPending ?? 0 }}</div>
              <b-skeleton v-else :width="60" :height="26" animated />
              <div class="an-kpi-cap">Abiertos o parciales</div>
            </div>
          </div>
        </div>
        <div class="an-kpi-card">
          <div class="an-kpi-inner">
            <div class="an-kpi-ico" style="background:rgba(16,185,129,.16);color:#10b981"><i class="fas fa-circle-check"></i></div>
            <div>
              <div class="an-kpi-lbl">Cerrados (30d)</div>
              <div class="an-kpi-num" style="color:#10b981" v-if="!isLoading">{{ s?.ordersClosed30d ?? 0 }}</div>
              <b-skeleton v-else :width="60" :height="26" animated />
              <div class="an-kpi-cap">Este período</div>
            </div>
          </div>
        </div>
      </template>

      <template v-if="canSeeReports">
        <div class="an-kpi-card">
          <div class="an-kpi-inner">
            <div class="an-kpi-ico" style="background:var(--c-primary-alpha);color:var(--c-primary)"><i class="fas fa-gauge-high"></i></div>
            <div>
              <div class="an-kpi-lbl">Nivel de servicio</div>
              <div class="an-kpi-num" :style="{ color: slColor }" v-if="!isLoading">{{ s?.serviceLevel ?? 0 }}%</div>
              <b-skeleton v-else :width="60" :height="26" animated />
              <div class="an-kpi-cap">{{ serviceLevelStatus }}</div>
            </div>
          </div>
        </div>
      </template>

      <template v-if="canSeeDevolutions">
        <div class="an-kpi-card">
          <div class="an-kpi-inner">
            <div class="an-kpi-ico" style="background:rgba(236,72,153,.16);color:#ec4899"><i class="fas fa-rotate-left"></i></div>
            <div>
              <div class="an-kpi-lbl">Devoluciones pend.</div>
              <div class="an-kpi-num" :style="{ color: ((s?.devolucionesPendientes ?? 0) + (s?.devolucionesEnRevision ?? 0)) > 0 ? '#f59e0b' : '#10b981' }" v-if="!isLoading">{{ (s?.devolucionesPendientes ?? 0) + (s?.devolucionesEnRevision ?? 0) }}</div>
              <b-skeleton v-else :width="50" :height="26" animated />
              <div class="an-kpi-cap">En espera de revisión</div>
            </div>
          </div>
        </div>
        <div class="an-kpi-card">
          <div class="an-kpi-inner">
            <div class="an-kpi-ico" style="background:rgba(16,185,129,.16);color:#10b981"><i class="fas fa-check-double"></i></div>
            <div>
              <div class="an-kpi-lbl">Devol. aprobadas</div>
              <div class="an-kpi-num" style="color:#10b981" v-if="!isLoading">{{ s?.devolucionesAprobadas ?? 0 }}</div>
              <b-skeleton v-else :width="50" :height="26" animated />
              <div class="an-kpi-cap">Aceptadas</div>
            </div>
          </div>
        </div>
      </template>

      <template v-if="canSeeLab">
        <div class="an-kpi-card">
          <div class="an-kpi-inner">
            <div class="an-kpi-ico" style="background:rgba(6,182,212,.16);color:#06b6d4"><i class="fas fa-barcode"></i></div>
            <div>
              <div class="an-kpi-lbl">Escaneos hoy</div>
              <div class="an-kpi-num" style="color:#06b6d4" v-if="!isLoading">{{ s?.scansToday ?? 0 }}</div>
              <b-skeleton v-else :width="50" :height="26" animated />
              <div class="an-kpi-cap">Salidas por escáner</div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
defineProps({
  canSeeInventory:   Boolean,
  canSeeOrders:      Boolean,
  canSeeReports:     Boolean,
  canSeeDevolutions: Boolean,
  canSeeLab:         Boolean,
  isLoading:         Boolean,
  s:                 Object,
  fmtn:              Function,
  slColor:           String,
  serviceLevelStatus: String
})
</script>
