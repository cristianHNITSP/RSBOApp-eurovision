<template>
  <div class="tab-two-col">
    <div class="col-main">
      <!-- ─── INVENTARIO — root / eurovision ─── -->
      <div v-if="canSeeInventory" class="gcard mb-5">
        <div class="gc-head">
          <div class="gc-head-left">
            <div class="gc-badge-icon accent-purple"><i class="fas fa-cubes-stacked"></i></div>
            <div>
              <div class="gc-title">Estado del inventario</div>
              <div class="gc-sub">Cobertura, stock y alertas en tiempo real</div>
            </div>
          </div>
          <div class="gc-status-pill" :class="criticalAlerts > 0 ? 'sp-warn' : 'sp-ok'" v-if="!isLoading">
            <i :class="criticalAlerts > 0 ? 'fas fa-triangle-exclamation' : 'fas fa-shield-check'"></i>
            {{ criticalAlerts > 0 ? `${criticalAlerts} alertas críticas` : 'Sin alertas críticas' }}
          </div>
        </div>
        <div class="gc-body">
          <div class="triband">
            <div class="triband-item">
              <div class="tb-label">Cobertura del catálogo</div>
              <div class="tb-val" v-if="!isLoading">
                <span class="tb-number gradient-purple">{{ s?.coveragePct ?? 0 }}</span>
                <span class="tb-unit">%</span>
              </div>
              <b-skeleton v-else :width="80" :height="32" animated class="mb-1" />
              <b-progress v-if="!isLoading" :value="s?.coveragePct ?? 0" size="is-small" type="is-primary" :show-value="false" class="tb-prog" />
            </div>
            <div class="triband-sep"></div>
            <div class="triband-item">
              <div class="tb-label">Stock en rango seguro</div>
              <div class="tb-val" v-if="!isLoading">
                <span class="tb-number gradient-blue">{{ safeStockPercent }}</span>
                <span class="tb-unit">%</span>
              </div>
              <b-skeleton v-else :width="80" :height="32" animated class="mb-1" />
              <b-progress v-if="!isLoading" :value="safeStockPercent" size="is-small" type="is-info" :show-value="false" class="tb-prog" />
            </div>
            <div class="triband-sep"></div>
            <div class="triband-item">
              <div class="tb-label">Alertas críticas</div>
              <div class="tb-val" v-if="!isLoading">
                <span class="tb-number gradient-red">{{ criticalAlerts }}</span>
              </div>
              <b-skeleton v-else :width="60" :height="32" animated class="mb-1" />
              <b-progress v-if="!isLoading" :value="Math.min(criticalAlerts * 4, 100)" size="is-small" type="is-danger" :show-value="false" class="tb-prog" />
            </div>
          </div>
          <div class="gc-footer">
            <span class="gf-item"><i class="fas fa-rotate"></i> Sync: <b>{{ lastSyncLabel }}</b></span>
            <span class="gf-item"><i class="fas fa-table"></i> <b>{{ s?.activeSheets ?? '—' }}</b> hojas</span>
            <span class="gf-item"><i class="fas fa-layer-group"></i> <b>{{ formatNumber(s?.totalCombinations) }}</b> combinaciones</span>
            <span class="gf-item"><i class="fas fa-boxes-stacked"></i> <b>{{ formatNumber(s?.totalStock) }}</b> piezas</span>
          </div>
        </div>
      </div>

      <!-- ─── MI DESEMPEÑO — ventas ─── -->
      <div v-if="isVentas" class="gcard mb-5">
        <div class="gc-head">
          <div class="gc-head-left">
            <div class="gc-badge-icon accent-green"><i class="fas fa-chart-line"></i></div>
            <div>
              <div class="gc-title">Mi desempeño en ventas</div>
              <div class="gc-sub">Actividad del período activo</div>
            </div>
          </div>
        </div>
        <div class="gc-body">
          <div class="cell-grid">
            <div class="mcell">
              <div class="mcell-label">Creados hoy</div>
              <div class="mcell-val accent" v-if="!isLoading">{{ s?.ordersToday ?? 0 }}</div>
              <b-skeleton v-else :width="56" :height="30" animated />
              <div class="mcell-desc">Nuevos pedidos</div>
            </div>
            <div class="mcell">
              <div class="mcell-label">Cerrados hoy</div>
              <div class="mcell-val ok" v-if="!isLoading">{{ s?.ordersClosedToday ?? 0 }}</div>
              <b-skeleton v-else :width="56" :height="30" animated />
              <div class="mcell-desc">Completados</div>
            </div>
            <div class="mcell">
              <div class="mcell-label">Pendientes</div>
              <div class="mcell-val warn" v-if="!isLoading">{{ s?.ordersPending ?? 0 }}</div>
              <b-skeleton v-else :width="56" :height="30" animated />
              <div class="mcell-desc">En espera</div>
            </div>
            <div class="mcell">
              <div class="mcell-label">Cerrados (30d)</div>
              <div class="mcell-val" v-if="!isLoading">{{ s?.ordersClosed30d ?? 0 }}</div>
              <b-skeleton v-else :width="56" :height="30" animated />
              <div class="mcell-desc">Este período</div>
            </div>
            <div class="mcell">
              <div class="mcell-label">Cancelados</div>
              <div class="mcell-val danger" v-if="!isLoading">{{ s?.ordersCancelledAll ?? 0 }}</div>
              <b-skeleton v-else :width="56" :height="30" animated />
              <div class="mcell-desc">Total histórico</div>
            </div>
            <div class="mcell">
              <div class="mcell-label">Histórico total</div>
              <div class="mcell-val" v-if="!isLoading">{{ formatNumber(s?.ordersClosedAll) }}</div>
              <b-skeleton v-else :width="56" :height="30" animated />
              <div class="mcell-desc">Cerrados acumulados</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ Columna lateral (resumen) ══ -->
    <div class="col-side">
      <div v-if="canSeeReports" class="gcard mb-4">
        <div class="gc-head">
          <div class="gc-head-left">
            <div class="gc-badge-icon accent-purple"><i class="fas fa-gauge-high"></i></div>
            <div>
              <div class="gc-title">Nivel de servicio</div>
              <div class="gc-sub">Últimos 30 días</div>
            </div>
          </div>
        </div>
        <div class="gc-body">
          <template v-if="!isLoading">
            <div class="sl-wrap">
              <div class="sl-ring" :class="`sl-${serviceLevelClass}`">
                <span class="sl-pct">{{ s?.serviceLevel ?? 0 }}%</span>
                <span class="sl-tag">{{ serviceLevelStatus }}</span>
              </div>
              <div class="sl-rows">
                <div class="sl-row"><span>Cerrados</span><b>{{ s?.ordersClosed30d ?? 0 }}</b></div>
                <div class="sl-row"><span>Con corrección</span><b>{{ s?.corrections30d ?? 0 }}</b></div>
                <div class="sl-row"><span>Devol. aprobadas</span><b>{{ s?.devolucionesAprobadas ?? 0 }}</b></div>
                <div class="sl-row"><span>Ediciones (30d)</span><b>{{ s?.edits30d ?? 0 }}</b></div>
              </div>
            </div>
            <b-progress :value="s?.serviceLevel ?? 0" size="is-small" :type="serviceLevelTagType" :show-value="false" class="mt-3" />
          </template>
          <b-skeleton v-else :width="'100%'" :height="100" animated class="mb-2" />
        </div>
      </div>

      <div v-if="isSupervisor" class="gcard">
        <div class="gc-head">
          <div class="gc-head-left">
            <div class="gc-badge-icon accent-orange"><i class="fas fa-file-chart-column"></i></div>
            <div>
              <div class="gc-title">Reportes disponibles</div>
              <div class="gc-sub">Exportación de datos operativos</div>
            </div>
          </div>
        </div>
        <div class="gc-body">
          <div class="report-tiles">
            <button class="rtile" @click="$router.push('/apps/inventario/reportes')">
              <i class="fas fa-boxes-stacked"></i>
              <div><div class="rtile-title">Inventario</div><div class="rtile-desc">Stock y cobertura por hoja</div></div>
              <i class="fas fa-download rtile-arrow"></i>
            </button>
            <button class="rtile" @click="$router.push('/apps/laboratorio')">
              <i class="fas fa-flask-vial"></i>
              <div><div class="rtile-title">Pedidos</div><div class="rtile-desc">Historial de lab (30d)</div></div>
              <i class="fas fa-arrow-right rtile-arrow"></i>
            </button>
            <button class="rtile" @click="$router.push('/l/devoluciones')">
              <i class="fas fa-rotate-left"></i>
              <div><div class="rtile-title">Devoluciones</div><div class="rtile-desc">Gestión y aprobación</div></div>
              <i class="fas fa-arrow-right rtile-arrow"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  canSeeInventory: Boolean,
  criticalAlerts: Number,
  isLoading: Boolean,
  s: Object,
  safeStockPercent: Number,
  lastSyncLabel: String,
  formatNumber: Function,
  isVentas: Boolean,
  canSeeReports: Boolean,
  serviceLevelClass: String,
  serviceLevelStatus: String,
  serviceLevelTagType: String,
  isSupervisor: Boolean
})
</script>
