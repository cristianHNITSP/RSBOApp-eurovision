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
            <div class="an-kpi-ico" style="background:var(--c-success-alpha);color:var(--c-success)"><i class="fas fa-boxes-stacked"></i></div>
            <div>
              <div class="an-kpi-lbl">Existencias</div>
              <div class="an-kpi-num" style="color:var(--c-success)" v-if="!isLoading">{{ fmtn(s?.totalStock) }}</div>
              <b-skeleton v-else :width="70" :height="26" animated />
              <div class="an-kpi-cap">Piezas en almacén</div>
            </div>
          </div>
        </div>
        <div class="an-kpi-card">
          <div class="an-kpi-inner">
            <div class="an-kpi-ico" style="background:var(--c-info-alpha);color:var(--c-info)"><i class="fas fa-percent"></i></div>
            <div>
              <div class="an-kpi-lbl">Cobertura</div>
              <div class="an-kpi-num" style="color:var(--c-info)" v-if="!isLoading">{{ s?.coveragePct ?? 0 }}%</div>
              <b-skeleton v-else :width="60" :height="26" animated />
              <div class="an-kpi-cap">De {{ fmtn(s?.totalPossibleCombinations || 0) }} graduaciones posibles</div>
            </div>
          </div>
        </div>
        <div class="an-kpi-card">
          <div class="an-kpi-inner">
            <div class="an-kpi-ico" style="background:var(--c-warning-alpha);color:var(--c-warning)"><i class="fas fa-triangle-exclamation"></i></div>
            <div>
              <div class="an-kpi-lbl">Alertas críticas</div>
              <div class="an-kpi-num" :style="{ color: (s?.criticalAlerts ?? 0) > 0 ? 'var(--c-danger)' : 'var(--c-success)' }" v-if="!isLoading">{{ s?.criticalAlerts ?? 0 }}</div>
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
            <div class="an-kpi-ico" style="background:var(--c-info-alpha);color:var(--c-info)"><i class="fas fa-eye"></i></div>
            <div>
              <div class="an-kpi-lbl">Lentes de Contacto</div>
              <div class="an-kpi-num" style="color:var(--c-info)" v-if="!isLoading">{{ fmtn(s?.clTotalStock) }}</div>
              <b-skeleton v-else :width="70" :height="26" animated />
              <div class="an-kpi-cap">Existencias totales</div>
            </div>
          </div>
        </div>
        <div class="an-kpi-card">
          <div class="an-kpi-inner">
            <div class="an-kpi-ico" style="background:rgba(13,148,136,.16);color:var(--c-success)"><i class="fas fa-table-cells"></i></div>
            <div>
              <div class="an-kpi-lbl">Combinaciones (Contacto)</div>
              <div class="an-kpi-num" style="color:var(--c-success)" v-if="!isLoading">{{ fmtn(s?.clTotalCombinations) }}</div>
              <b-skeleton v-else :width="70" :height="26" animated />
              <div class="an-kpi-cap">De {{ fmtn(s?.clTotalPossible || 0) }} graduaciones posibles</div>
            </div>
          </div>
        </div>
      </template>

      <template v-if="canSeeOrders">
        <div class="an-kpi-card">
          <div class="an-kpi-inner">
            <div class="an-kpi-ico" style="background:var(--c-warning-alpha);color:var(--c-warning)"><i class="fas fa-clipboard-list"></i></div>
            <div>
              <div class="an-kpi-lbl">Pedidos pendientes</div>
              <div class="an-kpi-num" style="color:var(--c-warning)" v-if="!isLoading">{{ s?.ordersPending ?? 0 }}</div>
              <b-skeleton v-else :width="60" :height="26" animated />
              <div class="an-kpi-cap">Abiertos o parciales</div>
            </div>
          </div>
        </div>
        <div class="an-kpi-card">
          <div class="an-kpi-inner">
            <div class="an-kpi-ico" style="background:var(--c-success-alpha);color:var(--c-success)"><i class="fas fa-circle-check"></i></div>
            <div>
              <div class="an-kpi-lbl">Cerrados (30d)</div>
              <div class="an-kpi-num" style="color:var(--c-success)" v-if="!isLoading">{{ s?.ordersClosed30d ?? 0 }}</div>
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
              <div class="an-kpi-cap">{{ serviceLevelStatus }} (basado en {{ fmtn(s?.ordersClosed30d || 0) }} pedidos)</div>
            </div>
          </div>
        </div>
      </template>

      <template v-if="canSeeDevolutions">
        <div class="an-kpi-card">
          <div class="an-kpi-inner">
            <div class="an-kpi-ico" style="background:var(--c-sidebar-pink-alpha);color:var(--c-sidebar-pink)"><i class="fas fa-rotate-left"></i></div>
            <div>
              <div class="an-kpi-lbl">Devoluciones pend.</div>
              <div class="an-kpi-num" :style="{ color: ((s?.devolucionesPendientes ?? 0) + (s?.devolucionesEnRevision ?? 0)) > 0 ? 'var(--c-warning)' : 'var(--c-success)' }" v-if="!isLoading">{{ (s?.devolucionesPendientes ?? 0) + (s?.devolucionesEnRevision ?? 0) }}</div>
              <b-skeleton v-else :width="50" :height="26" animated />
              <div class="an-kpi-cap">En espera de revisión</div>
            </div>
          </div>
        </div>
        <div class="an-kpi-card">
          <div class="an-kpi-inner">
            <div class="an-kpi-ico" style="background:var(--c-success-alpha);color:var(--c-success)"><i class="fas fa-check-double"></i></div>
            <div>
              <div class="an-kpi-lbl">Devol. aprobadas</div>
              <div class="an-kpi-num" style="color:var(--c-success)" v-if="!isLoading">{{ s?.devolucionesAprobadas ?? 0 }}</div>
              <b-skeleton v-else :width="50" :height="26" animated />
              <div class="an-kpi-cap">Aceptadas</div>
            </div>
          </div>
        </div>
      </template>

      <template v-if="canSeeLab">
        <div class="an-kpi-card">
          <div class="an-kpi-inner">
            <div class="an-kpi-ico" style="background:var(--c-info-alpha);color:var(--c-info)"><i class="fas fa-barcode"></i></div>
            <div>
              <div class="an-kpi-lbl">Escaneos hoy</div>
              <div class="an-kpi-num" style="color:var(--c-info)" v-if="!isLoading">{{ s?.scansToday ?? 0 }}</div>
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
