<template>
  <div class="tab-single-col">
    <div class="gcard gcard-devol mb-5">
      <div class="gc-head">
        <div class="gc-head-left">
          <div class="gc-badge-icon accent-orange"><i class="fas fa-rotate-left"></i></div>
          <div>
            <div class="gc-title">Devoluciones</div>
            <div class="gc-sub">Gestión y seguimiento de retornos del laboratorio</div>
          </div>
        </div>
        <button
          v-if="canManageDevolutions"
          class="gc-action-btn"
          @click="$router.push('/l/devoluciones')"
        >
          <i class="fas fa-arrow-right"></i> Gestionar
        </button>
      </div>
      <div class="gc-body">
        <div class="cell-grid">
          <div class="mcell mcell-orange">
            <div class="mcell-label">Pendientes</div>
            <div class="mcell-val warn" v-if="!isLoading">{{ s?.devolucionesPendientes ?? 0 }}</div>
            <b-skeleton v-else :width="56" :height="30" animated />
            <div class="mcell-desc">Esperando revisión</div>
          </div>
          <div class="mcell">
            <div class="mcell-label">En revisión</div>
            <div class="mcell-val accent" v-if="!isLoading">{{ s?.devolucionesEnRevision ?? 0 }}</div>
            <b-skeleton v-else :width="56" :height="30" animated />
            <div class="mcell-desc">Bajo análisis</div>
          </div>
          <div class="mcell">
            <div class="mcell-label">Aprobadas</div>
            <div class="mcell-val ok" v-if="!isLoading">{{ s?.devolucionesAprobadas ?? 0 }}</div>
            <b-skeleton v-else :width="56" :height="30" animated />
            <div class="mcell-desc">Lista para procesar</div>
          </div>
          <div class="mcell">
            <div class="mcell-label">Procesadas</div>
            <div class="mcell-val" v-if="!isLoading">{{ s?.devolucionesProcesadas ?? 0 }}</div>
            <b-skeleton v-else :width="56" :height="30" animated />
            <div class="mcell-desc">Completadas</div>
          </div>
          <div class="mcell">
            <div class="mcell-label">Rechazadas</div>
            <div class="mcell-val danger" v-if="!isLoading">{{ s?.devolucionesRechazadas ?? 0 }}</div>
            <b-skeleton v-else :width="56" :height="30" animated />
            <div class="mcell-desc">No aplicaban</div>
          </div>
          <div class="mcell">
            <div class="mcell-label">Total (30d)</div>
            <div class="mcell-val" v-if="!isLoading">{{ s?.devolucionesTotal30d ?? 0 }}</div>
            <b-skeleton v-else :width="56" :height="30" animated />
            <div class="mcell-desc">Este período</div>
          </div>
        </div>

        <template v-if="canManageDevolutions">
          <div class="devol-quick-header">
            <span><i class="fas fa-clock"></i> Pendientes de revisión</span>
            <span v-if="loadingDevols" class="devol-loading-dot"></span>
          </div>
          <div v-if="!loadingDevols && pendingDevols.length === 0" class="devol-empty">
            <i class="fas fa-circle-check"></i> Sin devoluciones pendientes
          </div>
          <div class="devol-row" v-for="dev in pendingDevols" :key="dev._id">
            <div class="devol-row-info">
              <span class="devol-folio">{{ dev.folio }}</span>
              <span class="devol-cliente">{{ dev.cliente }}</span>
              <span class="devol-reason">{{ DEVOL_REASON_LABELS[dev.reason] || dev.reason }}</span>
              <span class="devol-time">{{ fmtTimeAgo(dev.createdAt) }}</span>
            </div>
            <div class="devol-row-actions">
              <button class="dqa-btn dqa-review" @click="quickDevAction(dev, 'en_revision')" title="Poner en revisión">
                <i class="fas fa-magnifying-glass"></i>
              </button>
              <button class="dqa-btn dqa-approve" @click="quickDevAction(dev, 'aprobada')" title="Aprobar">
                <i class="fas fa-check"></i>
              </button>
              <button class="dqa-btn dqa-reject" @click="quickDevAction(dev, 'rechazada')" title="Rechazar">
                <i class="fas fa-xmark"></i>
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- ─── LOGS DE CORRECCIONES ─── -->
    <div v-if="canManageDevolutions" class="gcard gcard-corrections mb-5">
      <div class="gc-head">
        <div class="gc-head-left">
          <div class="gc-badge-icon accent-red"><i class="fas fa-wrench"></i></div>
          <div>
            <div class="gc-title">Correcciones y ediciones</div>
            <div class="gc-sub">Últimas solicitudes del área de ventas</div>
          </div>
        </div>
        <span class="gc-badge-count" v-if="correctionLogs.length">{{ correctionLogs.length }}</span>
      </div>
      <div class="gc-body">
        <div v-if="loadingLogs" class="corr-log-skeleton">
          <div class="corr-skel-row" v-for="n in 3" :key="n">
            <b-skeleton :width="120" :height="12" animated />
            <b-skeleton :width="220" :height="12" animated class="ml-2"/>
          </div>
        </div>
        <div v-else-if="correctionLogs.length === 0" class="devol-empty">
          <i class="fas fa-circle-check"></i> Sin correcciones recientes
        </div>
        <div class="corr-log-list" v-else>
          <div class="corr-row" v-for="ev in correctionLogs" :key="ev._id">
            <div class="corr-type-dot" :class="ev.type === 'CORRECTION_REQUEST' ? 'dot-red' : 'dot-orange'">
              <i :class="ev.type === 'CORRECTION_REQUEST' ? 'fas fa-wrench' : 'fas fa-pen-to-square'"></i>
            </div>
            <div class="corr-body">
              <div class="corr-top-row">
                <span class="corr-type-label">{{ ev.type === 'CORRECTION_REQUEST' ? 'Corrección' : 'Edición' }}</span>
                <span class="corr-folio">{{ ev.details?.folio || '—' }}</span>
                <span class="corr-actor" v-if="ev.actor?.name">por <strong>{{ ev.actor.name }}</strong></span>
                <span class="corr-time">{{ fmtTimeAgo(ev.createdAt) }}</span>
              </div>
              <div class="corr-msg" v-if="ev.details?.message || ev.details?.motivo">
                {{ ev.details.message || ev.details.motivo }}
              </div>
              <div class="corr-msg corr-codebar" v-if="ev.details?.codebar">
                <i class="fas fa-barcode"></i> {{ ev.details.codebar }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  canManageDevolutions: Boolean,
  isLoading:            Boolean,
  s:                    Object,
  loadingDevols:        Boolean,
  pendingDevols:        Array,
  DEVOL_REASON_LABELS:  Object,
  fmtTimeAgo:           Function,
  quickDevAction:       Function,
  loadingLogs:          Boolean,
  correctionLogs:       Array
})
</script>
