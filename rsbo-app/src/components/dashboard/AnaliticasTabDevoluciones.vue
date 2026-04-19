<template>
  <div class="an-tab-two-col">
    <div class="an-col-main">
      <div class="gcard mb-5">
        <div class="gc-head">
          <div class="gc-ico" style="background:rgba(236,72,153,.16);color:#ec4899"><i class="fas fa-rotate-left"></i>
          </div>
          <div>
            <div class="gc-title">Analíticas de devoluciones</div>
            <div class="gc-sub">Estado, tendencias y tasa de aprobación del período</div>
          </div>
        </div>
        <div class="gc-body">
          <div class="an-devol-grid">
            <div class="an-devol-cell">
              <div class="adc-ico" style="background:rgba(245,158,11,.15);color:#f59e0b"><i
                  class="fas fa-hourglass-half"></i></div>
              <div class="adc-val" style="color:#f59e0b" v-if="!isLoading">{{ s?.devolucionesPendientes ?? 0 }}</div>
              <b-skeleton v-else :width="40" :height="24" animated />
              <div class="adc-lbl">Pendientes</div>
            </div>
            <div class="an-devol-cell">
              <div class="adc-ico" style="background:rgba(59,130,246,.15);color:#3b82f6"><i
                  class="fas fa-magnifying-glass"></i></div>
              <div class="adc-val" style="color:#3b82f6" v-if="!isLoading">{{ s?.devolucionesEnRevision ?? 0 }}</div>
              <b-skeleton v-else :width="40" :height="24" animated />
              <div class="adc-lbl">En revisión</div>
            </div>
            <div class="an-devol-cell">
              <div class="adc-ico" style="background:rgba(16,185,129,.15);color:#10b981"><i
                  class="fas fa-circle-check"></i></div>
              <div class="adc-val" style="color:#10b981" v-if="!isLoading">{{ s?.devolucionesAprobadas ?? 0 }}</div>
              <b-skeleton v-else :width="40" :height="24" animated />
              <div class="adc-lbl">Aprobadas</div>
            </div>
            <div class="an-devol-cell">
              <div class="adc-ico" style="background:rgba(239,68,68,.15);color:#ef4444"><i
                  class="fas fa-circle-xmark"></i></div>
              <div class="adc-val" style="color:#ef4444" v-if="!isLoading">{{ s?.devolucionesRechazadas ?? 0 }}</div>
              <b-skeleton v-else :width="40" :height="24" animated />
              <div class="adc-lbl">Rechazadas</div>
            </div>
            <div class="an-devol-cell">
              <div class="adc-ico" style="background:var(--c-primary-alpha);color:var(--c-primary)"><i
                  class="fas fa-box-archive"></i></div>
              <div class="adc-val" style="color:var(--c-primary)" v-if="!isLoading">{{ s?.devolucionesProcesadas ?? 0 }}
              </div><b-skeleton v-else :width="40" :height="24" animated />
              <div class="adc-lbl">Procesadas</div>
            </div>
            <div class="an-devol-cell">
              <div class="adc-ico" style="background:rgba(236,72,153,.15);color:#ec4899"><i
                  class="fas fa-calendar-day"></i></div>
              <div class="adc-val" style="color:#ec4899" v-if="!isLoading">{{ s?.devolucionesHoy ?? 0 }}</div>
              <b-skeleton v-else :width="40" :height="24" animated />
              <div class="adc-lbl">Hoy</div>
            </div>
          </div>

          <div class="an-divider my-3"><span>Tendencia temporal</span></div>
          <div class="an-bars" v-if="!isLoading">
            <div class="an-bar-row"><span class="an-bar-lbl">7 días</span>
              <div class="an-bar-track">
                <div class="an-bar-fill"
                  :style="{ width: devol7dPct + '%', background: 'linear-gradient(90deg,#ec4899,#f43f5e)' }"></div>
              </div><span class="an-bar-pct">{{ s?.devolucionesTotal7d ?? 0 }}</span>
            </div>
            <div class="an-bar-row"><span class="an-bar-lbl">30 días</span>
              <div class="an-bar-track">
                <div class="an-bar-fill"
                  :style="{ width: '100%', background: 'linear-gradient(90deg,var(--c-primary),#ec4899)' }"></div>
              </div><span class="an-bar-pct">{{ s?.devolucionesTotal30d ?? 0 }}</span>
            </div>
          </div>

          <div class="an-devol-rate mt-3" v-if="!isLoading">
            <div class="adr-head"><span class="adr-label"><i class="fas fa-chart-line mr-1"></i> Tasa de
                aprobación</span><span class="adr-val"
                :style="{ color: devolApprovalRate >= 70 ? '#10b981' : devolApprovalRate >= 50 ? '#f59e0b' : '#ef4444' }">{{
                  devolApprovalRate }}%</span></div>
            <b-progress :value="devolApprovalRate" size="is-small"
              :type="devolApprovalRate >= 70 ? 'is-success' : devolApprovalRate >= 50 ? 'is-warning' : 'is-danger'"
              :show-value="false" />
            <p class="adr-desc">{{ devolApprovalRate >= 70 ? 'Alta aprobación — proceso fluido.' : devolApprovalRate >=
              50 ? 'Tasa media — revisar criterios de rechazo.' : 'Baja aprobación — análisis de causas recomendado.' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Sidebar devoluciones -->
    <div class="an-col-side">
      <div class="gcard mb-4">
        <div class="gcard-bar" style="background:linear-gradient(90deg,#ec4899,#f43f5e)"></div>
        <div class="gc-head">
          <div class="gc-ico" style="background:rgba(236,72,153,.16);color:#ec4899"><i class="fas fa-rotate-left"></i>
          </div>
          <div>
            <div class="gc-title">Devoluciones</div>
            <div class="gc-sub">Resumen rápido del estado actual</div>
          </div>
        </div>
        <div class="gc-body">
          <template v-if="!isLoading">
            <div class="cov-row"><span class="cov-k">Pendientes</span><b-tag
                :type="(s?.devolucionesPendientes ?? 0) > 0 ? 'is-warning' : 'is-light'" size="is-small"
                class="is-rounded">{{ s?.devolucionesPendientes ?? 0 }}</b-tag></div>
            <div class="cov-row"><span class="cov-k">En revisión</span><b class="cov-v">{{ s?.devolucionesEnRevision ??
              0 }}</b></div>
            <div class="cov-row"><span class="cov-k">Aprobadas</span><b class="cov-v" style="color:#10b981">{{
              s?.devolucionesAprobadas ?? 0 }}</b></div>
            <div class="cov-row"><span class="cov-k">Rechazadas</span><b class="cov-v" style="color:#ef4444">{{
              s?.devolucionesRechazadas ?? 0 }}</b></div>
            <div class="cov-row"><span class="cov-k">Procesadas</span><b class="cov-v">{{ s?.devolucionesProcesadas ?? 0
            }}</b></div>
            <div class="an-divider my-2"></div>
            <div class="cov-row"><span class="cov-k">Total (30d)</span><b class="cov-v">{{ s?.devolucionesTotal30d ?? 0
            }}</b></div>
            <div class="cov-row"><span class="cov-k">Total (7d)</span><b class="cov-v">{{ s?.devolucionesTotal7d ?? 0
            }}</b></div>
            <div class="cov-row"><span class="cov-k">Hoy</span><b class="cov-v">{{ s?.devolucionesHoy ?? 0 }}</b></div>
            <div class="cov-row"><span class="cov-k">Tasa aprobación</span><b class="cov-v"
                :style="{ color: devolApprovalRate >= 70 ? '#10b981' : devolApprovalRate >= 50 ? '#f59e0b' : '#ef4444' }">{{
                  devolApprovalRate }}%</b></div>
          </template>
          <template v-else><b-skeleton width="100%" :height="170" animated /></template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isLoading: Boolean,
  s: Object,
  devol7dPct: Number,
  devolApprovalRate: Number
})
</script>
