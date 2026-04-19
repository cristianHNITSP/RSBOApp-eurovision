<template>
  <div class="an-tab-two-col">
    <div class="an-col-main">
      <!-- Inventory activity -->
      <div v-if="canSeeMovements" class="gcard mb-5">
        <div class="gc-head">
          <div class="gc-ico" style="background:var(--c-primary-alpha);color:var(--c-primary)"><i
              class="fas fa-arrows-rotate"></i></div>
          <div>
            <div class="gc-title">Actividad de inventario óptico</div>
            <div class="gc-sub">Movimientos registrados en bases y micas — últimos 30 días</div>
          </div>
        </div>
        <div class="gc-body">
          <div class="an-trio">
            <div class="an-trio-item">
              <div class="at-lbl">Movimientos</div>
              <div class="at-val" style="color:var(--c-primary)" v-if="!isLoading">{{ fmtn(s?.movementsTotal30d) }}
              </div>
              <b-skeleton v-else :width="90" :height="32" animated />
              <div class="at-cap">Total del período</div>
            </div>
            <div class="an-trio-sep"></div>
            <div class="an-trio-item">
              <div class="at-lbl">Entradas</div>
              <div class="at-val" style="color:#10b981" v-if="!isLoading">{{ fmtn(s?.entries30d) }}</div>
              <b-skeleton v-else :width="70" :height="32" animated />
              <div class="at-cap">{{ entriesPct }}% del total</div>
            </div>
            <div class="an-trio-sep"></div>
            <div class="an-trio-item">
              <div class="at-lbl">Salidas</div>
              <div class="at-val" style="color:#3b82f6" v-if="!isLoading">{{ fmtn(s?.exits30d) }}</div>
              <b-skeleton v-else :width="70" :height="32" animated />
              <div class="at-cap">{{ exitsPct }}% del total</div>
            </div>
            <div class="an-trio-sep"></div>
            <div class="an-trio-item">
              <div class="at-lbl">Hoy</div>
              <div class="at-val" style="color:#f59e0b" v-if="!isLoading">{{ s?.movementsToday ?? 0 }}</div>
              <b-skeleton v-else :width="60" :height="32" animated />
              <div class="at-cap">Actividad del día</div>
            </div>
          </div>

          <div class="an-bars mt-4" v-if="!isLoading">
            <div class="an-bar-row">
              <span class="an-bar-lbl">Entradas</span>
              <div class="an-bar-track">
                <div class="an-bar-fill"
                  :style="{ width: entriesPct + '%', background: 'linear-gradient(90deg,#10b981,#34d399)' }"></div>
              </div>
              <span class="an-bar-pct">{{ entriesPct }}%</span>
            </div>
            <div class="an-bar-row">
              <span class="an-bar-lbl">Salidas</span>
              <div class="an-bar-track">
                <div class="an-bar-fill"
                  :style="{ width: exitsPct + '%', background: 'linear-gradient(90deg,#3b82f6,#60a5fa)' }"></div>
              </div>
              <span class="an-bar-pct">{{ exitsPct }}%</span>
            </div>
          </div>

          <div class="an-chips mt-3">
            <div class="an-chip">
              <div class="ach-lbl">Rotación estimada</div>
              <div class="ach-val">{{ rotationIndex }}<span class="ach-unit"> v/año</span></div>
            </div>
            <div class="an-chip">
              <div class="ach-lbl">Con stock</div>
              <div class="ach-val">{{ fmtn(s?.withStock) }}</div>
            </div>
            <div class="an-chip">
              <div class="ach-lbl">Sin stock</div>
              <div class="ach-val" style="color:#f59e0b">{{ fmtn((s?.totalCombinations ?? 0) - (s?.withStock ?? 0)) }}
              </div>
            </div>
            <div class="an-chip">
              <div class="ach-lbl">Cobertura</div>
              <div class="ach-val" style="color:#10b981">{{ s?.coveragePct ?? 0 }}%</div>
            </div>
            <div class="an-chip">
              <div class="ach-lbl">Promedio por celda</div>
              <div class="ach-val">{{ s?.opticAvgPerCell ?? 0 }}<span class="ach-unit"> pzas</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Inventory families -->
      <div class="gcard mb-5">
        <div class="gcard-bar" style="background:linear-gradient(90deg,#3b82f6,#06b6d4)"></div>
        <div class="gc-head">
          <div class="gc-ico" style="background:rgba(59,130,246,.16);color:#3b82f6"><i class="fas fa-chart-pie"></i>
          </div>
          <div>
            <div class="gc-title">Distribución por tipo de lente óptico</div>
            <div class="gc-sub">Porcentaje de piezas activas por familia de producto (bases y micas)</div>
          </div>
        </div>
        <div class="gc-body">
          <div v-if="!isLoading">
            <div v-if="s?.topFamilies?.length" class="an-families">
              <div v-for="fam in s.topFamilies" :key="fam.name" class="an-family-row">
                <div class="an-family-head"><span class="an-family-name">{{ fam.name }}</span><span
                    class="an-family-pct">{{ fam.percentage }}%</span></div>
                <div class="an-bar-track">
                  <div class="an-bar-fill"
                    :style="{ width: fam.percentage + '%', background: 'linear-gradient(90deg,#3b82f6,var(--c-primary))' }">
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="an-empty">Sin datos de familias en este período.</p>
          </div>
          <div v-else>
            <b-skeleton width="100%" :height="46" animated class="mb-2" />
            <b-skeleton width="100%" :height="46" animated class="mb-2" />
            <b-skeleton width="80%" :height="46" animated />
          </div>
        </div>
      </div>

      <!-- Lentes de Contacto -->
      <div class="gcard mb-5">
        <div class="gcard-bar" style="background:linear-gradient(90deg,#06b6d4,#0d9488)"></div>
        <div class="gc-head">
          <div class="gc-ico" style="background:rgba(6,182,212,.16);color:#06b6d4"><i class="fas fa-eye"></i></div>
          <div>
            <div class="gc-title">Inventario de Lentes de Contacto</div>
            <div class="gc-sub">Existencias, cobertura y distribución por tipo de lente de contacto</div>
          </div>
        </div>
        <div class="gc-body">
          <div class="an-trio">
            <div class="an-trio-item">
              <div class="at-lbl">Hojas activas</div>
              <div class="at-val" style="color:#06b6d4" v-if="!isLoading">{{ s?.clActiveSheets ?? 0 }}</div><b-skeleton
                v-else :width="50" :height="32" animated />
              <div class="at-cap">Plantillas de lentes de contacto</div>
            </div>
            <div class="an-trio-sep"></div>
            <div class="an-trio-item">
              <div class="at-lbl">Existencias totales</div>
              <div class="at-val" style="color:#0d9488" v-if="!isLoading">{{ fmtn(s?.clTotalStock) }}</div><b-skeleton
                v-else :width="70" :height="32" animated />
              <div class="at-cap">Piezas en almacén</div>
            </div>
            <div class="an-trio-sep"></div>
            <div class="an-trio-item">
              <div class="at-lbl">Combinaciones</div>
              <div class="at-val" style="color:#3b82f6" v-if="!isLoading">{{ fmtn(s?.clTotalCombinations) }}</div>
              <b-skeleton v-else :width="70" :height="32" animated />
              <div class="at-cap">Esférica, Cilíndrica, Eje, Adición</div>
            </div>
            <div class="an-trio-sep"></div>
            <div class="an-trio-item">
              <div class="at-lbl">Cobertura</div>
              <div class="at-val" style="color:#10b981" v-if="!isLoading">{{ s?.clCoveragePct ?? 0 }}%</div><b-skeleton
                v-else :width="50" :height="32" animated />
              <div class="at-cap">{{ fmtn(s?.clWithStock) }} con stock</div>
            </div>
          </div>
          <div class="an-chips mt-3">
            <div class="an-chip">
              <div class="ach-lbl">Promedio por celda</div>
              <div class="ach-val">{{ s?.clAvgPerCell ?? 0 }}<span class="ach-unit"> pzas</span></div>
            </div>
            <div class="an-chip">
              <div class="ach-lbl">Con stock</div>
              <div class="ach-val">{{ fmtn(s?.clWithStock) }}</div>
            </div>
            <div class="an-chip">
              <div class="ach-lbl">Sin stock</div>
              <div class="ach-val" style="color:#f59e0b">{{ fmtn((s?.clTotalCombinations ?? 0) - (s?.clWithStock ?? 0))
                }}</div>
            </div>
          </div>
          <div class="an-divider my-3"><span>Distribución por tipo de lente de contacto</span></div>
          <div v-if="!isLoading">
            <div v-if="s?.clDistribution?.length" class="an-families">
              <div v-for="fam in s.clDistribution" :key="fam.name" class="an-family-row">
                <div class="an-family-head"><span class="an-family-name">{{ fam.name }}</span><span
                    class="an-family-pct">{{ fam.percentage }}%</span></div>
                <div class="an-bar-track">
                  <div class="an-bar-fill"
                    :style="{ width: fam.percentage + '%', background: 'linear-gradient(90deg,#06b6d4,#0d9488)' }">
                  </div>
                </div>
                <div class="an-family-detail"><span>{{ fmtn(fam.stock) }} existencias</span><span>{{
                  fmtn(fam.combinations) }} combinaciones</span><span>{{ fam.sheets }} plantilla{{ fam.sheets !== 1 ?
                    's' : '' }}</span></div>
              </div>
            </div>
            <p v-else class="an-empty">Sin datos de lentes de contacto en este período.</p>
          </div>
          <div v-else>
            <b-skeleton width="100%" :height="46" animated class="mb-2" />
            <b-skeleton width="100%" :height="46" animated class="mb-2" />
            <b-skeleton width="80%" :height="46" animated />
          </div>
        </div>
      </div>

      <!-- Low stock CL -->
      <div v-if="s?.clTopLowStock?.length" class="gcard mb-5">
        <div class="gcard-bar" style="background:linear-gradient(90deg,#f59e0b,#ef4444)"></div>
        <div class="gc-head">
          <div class="gc-ico" style="background:rgba(245,158,11,.16);color:#f59e0b"><i
              class="fas fa-triangle-exclamation"></i></div>
          <div>
            <div class="gc-title">Menor cobertura — Lentes de Contacto</div>
            <div class="gc-sub">Plantillas con menor porcentaje de celdas con stock</div>
          </div>
        </div>
        <div class="gc-body">
          <div class="an-low-stock-list">
            <div v-for="sh in s.clTopLowStock" :key="sh.id" class="an-low-stock-row">
              <div class="als-info">
                <div class="als-name">{{ sh.nombre }}</div>
                <div class="als-tipo">{{ sh.tipo }}</div>
              </div>
              <div class="als-metrics"><span class="als-stock">{{ fmtn(sh.stock) }} piezas</span><span class="als-cov"
                  :style="{ color: sh.coverage < 30 ? '#ef4444' : sh.coverage < 60 ? '#f59e0b' : '#10b981' }">{{
                  sh.coverage }}%</span></div>
              <div class="an-bar-track als-bar">
                <div class="an-bar-fill"
                  :style="{ width: sh.coverage + '%', background: sh.coverage < 30 ? '#ef4444' : sh.coverage < 60 ? '#f59e0b' : '#10b981' }">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- High stock CL -->
      <div v-if="s?.clTopHighStock?.length" class="gcard mb-5">
        <div class="gcard-bar" style="background:linear-gradient(90deg,#10b981,#06b6d4)"></div>
        <div class="gc-head">
          <div class="gc-ico" style="background:rgba(16,185,129,.16);color:#10b981"><i class="fas fa-ranking-star"></i>
          </div>
          <div>
            <div class="gc-title">Mayor stock — Lentes de Contacto</div>
            <div class="gc-sub">Plantillas con más existencias acumuladas</div>
          </div>
        </div>
        <div class="gc-body">
          <div class="an-low-stock-list">
            <div v-for="sh in s.clTopHighStock" :key="sh.id" class="an-low-stock-row">
              <div class="als-info">
                <div class="als-name">{{ sh.nombre }}</div>
                <div class="als-tipo">{{ sh.tipo }}</div>
              </div>
              <div class="als-metrics"><span class="als-stock" style="color:#10b981">{{ fmtn(sh.stock) }}
                  piezas</span><span class="als-cov">{{ sh.coverage }}%</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Low stock Optico -->
      <div v-if="s?.opticTopLowStock?.length" class="gcard mb-5">
        <div class="gcard-bar" style="background:linear-gradient(90deg,#f59e0b,#ec4899)"></div>
        <div class="gc-head">
          <div class="gc-ico" style="background:rgba(245,158,11,.16);color:#f59e0b"><i
              class="fas fa-triangle-exclamation"></i></div>
          <div>
            <div class="gc-title">Menor cobertura — Inventario Optico</div>
            <div class="gc-sub">Plantillas de bases y micas con menor stock</div>
          </div>
        </div>
        <div class="gc-body">
          <div class="an-low-stock-list">
            <div v-for="sh in s.opticTopLowStock" :key="sh.id" class="an-low-stock-row">
              <div class="als-info">
                <div class="als-name">{{ sh.nombre }}</div>
                <div class="als-tipo">{{ sh.tipo }}</div>
              </div>
              <div class="als-metrics"><span class="als-stock">{{ fmtn(sh.stock) }} piezas</span><span class="als-cov"
                  :style="{ color: sh.coverage < 30 ? '#ef4444' : sh.coverage < 60 ? '#f59e0b' : '#10b981' }">{{
                  sh.coverage }}%</span></div>
              <div class="an-bar-track als-bar">
                <div class="an-bar-fill"
                  :style="{ width: sh.coverage + '%', background: sh.coverage < 30 ? '#ef4444' : sh.coverage < 60 ? '#f59e0b' : '#10b981' }">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sidebar inventario -->
    <div class="an-col-side">
      <div class="gcard mb-4">
        <div class="gcard-bar" style="background:linear-gradient(90deg,#10b981,#3b82f6)"></div>
        <div class="gc-head">
          <div class="gc-ico" style="background:rgba(16,185,129,.16);color:#10b981"><i class="fas fa-database"></i>
          </div>
          <div>
            <div class="gc-title">Cobertura de inventario óptico</div>
            <div class="gc-sub">Estado general del stock de bases y micas</div>
          </div>
        </div>
        <div class="gc-body">
          <template v-if="!isLoading">
            <div class="cov-row"><span class="cov-k">Combinaciones totales</span><b class="cov-v">{{
              fmtn(s?.totalCombinations) }}</b></div>
            <div class="cov-row"><span class="cov-k">Con stock</span><b class="cov-v" style="color:#10b981">{{
              fmtn(s?.withStock) }}</b></div>
            <div class="cov-row"><span class="cov-k">Cobertura</span><b class="cov-v">{{ s?.coveragePct ?? 0 }}%</b>
            </div>
            <b-progress :value="s?.coveragePct ?? 0" size="is-small" type="is-primary" :show-value="false"
              class="my-2" />
            <div class="cov-row"><span class="cov-k">Existencias totales</span><b class="cov-v">{{ fmtn(s?.totalStock)
                }}</b></div>
            <div class="cov-row"><span class="cov-k">Alertas críticas</span><b-tag
                :type="(s?.criticalAlerts ?? 0) > 0 ? 'is-danger' : 'is-success'" size="is-small" class="is-rounded">{{
                  s?.criticalAlerts ?? 0 }}</b-tag></div>
            <div class="cov-row"><span class="cov-k">Stock seguro</span><b class="cov-v">{{ safeStockPct }}%</b></div>
            <b-progress :value="safeStockPct" size="is-small" type="is-info" :show-value="false" class="mt-1" />
          </template>
          <template v-else><b-skeleton width="100%" :height="140" animated /></template>
        </div>
      </div>
      <div class="gcard mb-4">
        <div class="gcard-bar" style="background:linear-gradient(90deg,#06b6d4,#0d9488)"></div>
        <div class="gc-head">
          <div class="gc-ico" style="background:rgba(6,182,212,.16);color:#06b6d4"><i class="fas fa-eye"></i></div>
          <div>
            <div class="gc-title">Cobertura lentes de contacto</div>
            <div class="gc-sub">Estado del stock de lentes de contacto</div>
          </div>
        </div>
        <div class="gc-body">
          <template v-if="!isLoading">
            <div class="cov-row"><span class="cov-k">Hojas activas</span><b class="cov-v">{{ s?.clActiveSheets ?? 0
                }}</b></div>
            <div class="cov-row"><span class="cov-k">Combinaciones totales</span><b class="cov-v">{{
              fmtn(s?.clTotalCombinations) }}</b></div>
            <div class="cov-row"><span class="cov-k">Con stock</span><b class="cov-v" style="color:#10b981">{{
              fmtn(s?.clWithStock) }}</b></div>
            <div class="cov-row"><span class="cov-k">Cobertura</span><b class="cov-v">{{ s?.clCoveragePct ?? 0 }}%</b>
            </div>
            <b-progress :value="s?.clCoveragePct ?? 0" size="is-small" type="is-info" :show-value="false"
              class="my-2" />
            <div class="cov-row"><span class="cov-k">Existencias totales</span><b class="cov-v">{{ fmtn(s?.clTotalStock)
                }}</b></div>
            <div class="cov-row"><span class="cov-k">Promedio por celda</span><b class="cov-v">{{ s?.clAvgPerCell ?? 0
                }}</b></div>
          </template>
          <template v-else><b-skeleton width="100%" :height="120" animated /></template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  canSeeMovements: Boolean,
  isLoading: Boolean,
  s: Object,
  fmtn: Function,
  entriesPct: Number,
  exitsPct: Number,
  rotationIndex: [Number, String],
  safeStockPct: Number
})
</script>
