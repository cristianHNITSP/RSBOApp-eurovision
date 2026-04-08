<template>
  <div class="an-root">

    <!-- ══ HERO HEADER ══ -->
    <header class="an-hero">
      <div class="an-hero-accent" :style="{ background: roleGradient }"></div>
      <div class="an-hero-inner">
        <div class="an-hero-left">
          <span class="an-pill"><i class="fas fa-chart-bar"></i> Analíticas</span>
          <h2 class="an-hero-title">
            <span class="an-brand-grad">{{ headerTitle }}</span>
          </h2>
          <p class="an-hero-sub">{{ headerSubtitle }}</p>
        </div>
        <div class="an-hero-right">
          <div class="an-badge">
            <i class="fas fa-calendar-alt"></i>
            <span>{{ s?.periodLabel || 'Últimos 30 días' }}</span>
          </div>
          <div v-if="canSeeInventory" class="an-badge">
            <i class="fas fa-boxes-stacked"></i>
            <span>{{ fmtn(s?.totalCombinations) }} combinaciones</span>
          </div>
          <div v-if="canSeeDevolutions" class="an-badge an-badge-pink">
            <i class="fas fa-rotate-left"></i>
            <span>{{ s?.devolucionesTotal30d ?? 0 }} devoluciones (30d)</span>
          </div>
        </div>
      </div>
    </header>

    <!-- ══ KPI STRIP ══ -->
    <section class="an-kpis">
      <div class="an-kpi-grid">

        <template v-if="canSeeInventory">
          <div class="an-kpi-card">
            <div class="an-kpi-top" style="background:linear-gradient(90deg,var(--c-primary),#a855f7)"></div>
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
            <div class="an-kpi-top" style="background:linear-gradient(90deg,#10b981,#34d399)"></div>
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
            <div class="an-kpi-top" style="background:linear-gradient(90deg,#3b82f6,#60a5fa)"></div>
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
            <div class="an-kpi-top" style="background:linear-gradient(90deg,#f59e0b,#fbbf24)"></div>
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
            <div class="an-kpi-top" style="background:linear-gradient(90deg,#06b6d4,#0891b2)"></div>
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
            <div class="an-kpi-top" style="background:linear-gradient(90deg,#0d9488,#06b6d4)"></div>
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
            <div class="an-kpi-top" style="background:linear-gradient(90deg,#f59e0b,#fb923c)"></div>
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
            <div class="an-kpi-top" style="background:linear-gradient(90deg,#10b981,#34d399)"></div>
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
            <div class="an-kpi-top" style="background:linear-gradient(90deg,var(--c-primary),#2563eb)"></div>
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
            <div class="an-kpi-top" style="background:linear-gradient(90deg,#ec4899,#f43f5e)"></div>
            <div class="an-kpi-inner">
              <div class="an-kpi-ico" style="background:rgba(236,72,153,.16);color:#ec4899"><i class="fas fa-rotate-left"></i></div>
              <div>
                <div class="an-kpi-lbl">Devoluciones pend.</div>
                <div class="an-kpi-num" :style="{ color: (s?.devolucionesPendientes ?? 0) > 0 ? '#f59e0b' : '#10b981' }" v-if="!isLoading">{{ s?.devolucionesPendientes ?? 0 }}</div>
                <b-skeleton v-else :width="50" :height="26" animated />
                <div class="an-kpi-cap">En espera de revisión</div>
              </div>
            </div>
          </div>
          <div class="an-kpi-card">
            <div class="an-kpi-top" style="background:linear-gradient(90deg,#10b981,#06b6d4)"></div>
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
            <div class="an-kpi-top" style="background:linear-gradient(90deg,#06b6d4,#3b82f6)"></div>
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

    <!-- ══ MAIN GRID ══ -->
    <section class="an-main">
      <DynamicTabs v-model="anTab" :tabs="AN_TABS">

        <!-- ═══════════════ TAB: INVENTARIO ════════════════════════════ -->
        <template #inventario>
          <div class="an-tab-two-col">
            <div class="an-col-main">
              <!-- Inventory activity -->
              <div v-if="canSeeMovements" class="gcard mb-5">
                <div class="gcard-bar" style="background:linear-gradient(90deg,var(--c-primary),#2563eb)"></div>
                <div class="gc-head">
                  <div class="gc-ico" style="background:var(--c-primary-alpha);color:var(--c-primary)"><i class="fas fa-arrows-rotate"></i></div>
                  <div>
                    <div class="gc-title">Actividad de inventario óptico</div>
                    <div class="gc-sub">Movimientos registrados en bases y micas — últimos 30 días</div>
                  </div>
                </div>
                <div class="gc-body">
                  <div class="an-trio">
                    <div class="an-trio-item">
                      <div class="at-lbl">Movimientos</div>
                      <div class="at-val" style="color:var(--c-primary)" v-if="!isLoading">{{ fmtn(s?.movementsTotal30d) }}</div>
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
                      <div class="an-bar-track"><div class="an-bar-fill" :style="{ width: entriesPct + '%', background: 'linear-gradient(90deg,#10b981,#34d399)' }"></div></div>
                      <span class="an-bar-pct">{{ entriesPct }}%</span>
                    </div>
                    <div class="an-bar-row">
                      <span class="an-bar-lbl">Salidas</span>
                      <div class="an-bar-track"><div class="an-bar-fill" :style="{ width: exitsPct + '%', background: 'linear-gradient(90deg,#3b82f6,#60a5fa)' }"></div></div>
                      <span class="an-bar-pct">{{ exitsPct }}%</span>
                    </div>
                  </div>

                  <div class="an-chips mt-3">
                    <div class="an-chip"><div class="ach-lbl">Rotación estimada</div><div class="ach-val">{{ rotationIndex }}<span class="ach-unit"> v/año</span></div></div>
                    <div class="an-chip"><div class="ach-lbl">Con stock</div><div class="ach-val">{{ fmtn(s?.withStock) }}</div></div>
                    <div class="an-chip"><div class="ach-lbl">Sin stock</div><div class="ach-val" style="color:#f59e0b">{{ fmtn((s?.totalCombinations ?? 0) - (s?.withStock ?? 0)) }}</div></div>
                    <div class="an-chip"><div class="ach-lbl">Cobertura</div><div class="ach-val" style="color:#10b981">{{ s?.coveragePct ?? 0 }}%</div></div>
                    <div class="an-chip"><div class="ach-lbl">Promedio por celda</div><div class="ach-val">{{ s?.opticAvgPerCell ?? 0 }}<span class="ach-unit"> pzas</span></div></div>
                  </div>
                </div>
              </div>

              <!-- Inventory families -->
              <div class="gcard mb-5">
                <div class="gcard-bar" style="background:linear-gradient(90deg,#3b82f6,#06b6d4)"></div>
                <div class="gc-head">
                  <div class="gc-ico" style="background:rgba(59,130,246,.16);color:#3b82f6"><i class="fas fa-chart-pie"></i></div>
                  <div>
                    <div class="gc-title">Distribución por tipo de lente óptico</div>
                    <div class="gc-sub">Porcentaje de piezas activas por familia de producto (bases y micas)</div>
                  </div>
                </div>
                <div class="gc-body">
                  <div v-if="!isLoading">
                    <div v-if="s?.topFamilies?.length" class="an-families">
                      <div v-for="fam in s.topFamilies" :key="fam.name" class="an-family-row">
                        <div class="an-family-head"><span class="an-family-name">{{ fam.name }}</span><span class="an-family-pct">{{ fam.percentage }}%</span></div>
                        <div class="an-bar-track"><div class="an-bar-fill" :style="{ width: fam.percentage + '%', background: 'linear-gradient(90deg,#3b82f6,var(--c-primary))' }"></div></div>
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
                    <div class="an-trio-item"><div class="at-lbl">Hojas activas</div><div class="at-val" style="color:#06b6d4" v-if="!isLoading">{{ s?.clActiveSheets ?? 0 }}</div><b-skeleton v-else :width="50" :height="32" animated /><div class="at-cap">Plantillas de lentes de contacto</div></div>
                    <div class="an-trio-sep"></div>
                    <div class="an-trio-item"><div class="at-lbl">Existencias totales</div><div class="at-val" style="color:#0d9488" v-if="!isLoading">{{ fmtn(s?.clTotalStock) }}</div><b-skeleton v-else :width="70" :height="32" animated /><div class="at-cap">Piezas en almacén</div></div>
                    <div class="an-trio-sep"></div>
                    <div class="an-trio-item"><div class="at-lbl">Combinaciones</div><div class="at-val" style="color:#3b82f6" v-if="!isLoading">{{ fmtn(s?.clTotalCombinations) }}</div><b-skeleton v-else :width="70" :height="32" animated /><div class="at-cap">Esférica, Cilíndrica, Eje, Adición</div></div>
                    <div class="an-trio-sep"></div>
                    <div class="an-trio-item"><div class="at-lbl">Cobertura</div><div class="at-val" style="color:#10b981" v-if="!isLoading">{{ s?.clCoveragePct ?? 0 }}%</div><b-skeleton v-else :width="50" :height="32" animated /><div class="at-cap">{{ fmtn(s?.clWithStock) }} con stock</div></div>
                  </div>
                  <div class="an-chips mt-3">
                    <div class="an-chip"><div class="ach-lbl">Promedio por celda</div><div class="ach-val">{{ s?.clAvgPerCell ?? 0 }}<span class="ach-unit"> pzas</span></div></div>
                    <div class="an-chip"><div class="ach-lbl">Con stock</div><div class="ach-val">{{ fmtn(s?.clWithStock) }}</div></div>
                    <div class="an-chip"><div class="ach-lbl">Sin stock</div><div class="ach-val" style="color:#f59e0b">{{ fmtn((s?.clTotalCombinations ?? 0) - (s?.clWithStock ?? 0)) }}</div></div>
                  </div>
                  <div class="an-divider my-3"><span>Distribución por tipo de lente de contacto</span></div>
                  <div v-if="!isLoading">
                    <div v-if="s?.clDistribution?.length" class="an-families">
                      <div v-for="fam in s.clDistribution" :key="fam.name" class="an-family-row">
                        <div class="an-family-head"><span class="an-family-name">{{ fam.name }}</span><span class="an-family-pct">{{ fam.percentage }}%</span></div>
                        <div class="an-bar-track"><div class="an-bar-fill" :style="{ width: fam.percentage + '%', background: 'linear-gradient(90deg,#06b6d4,#0d9488)' }"></div></div>
                        <div class="an-family-detail"><span>{{ fmtn(fam.stock) }} existencias</span><span>{{ fmtn(fam.combinations) }} combinaciones</span><span>{{ fam.sheets }} plantilla{{ fam.sheets !== 1 ? 's' : '' }}</span></div>
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
                  <div class="gc-ico" style="background:rgba(245,158,11,.16);color:#f59e0b"><i class="fas fa-triangle-exclamation"></i></div>
                  <div><div class="gc-title">Menor cobertura — Lentes de Contacto</div><div class="gc-sub">Plantillas con menor porcentaje de celdas con stock</div></div>
                </div>
                <div class="gc-body">
                  <div class="an-low-stock-list">
                    <div v-for="sh in s.clTopLowStock" :key="sh.id" class="an-low-stock-row">
                      <div class="als-info"><div class="als-name">{{ sh.nombre }}</div><div class="als-tipo">{{ sh.tipo }}</div></div>
                      <div class="als-metrics"><span class="als-stock">{{ fmtn(sh.stock) }} piezas</span><span class="als-cov" :style="{ color: sh.coverage < 30 ? '#ef4444' : sh.coverage < 60 ? '#f59e0b' : '#10b981' }">{{ sh.coverage }}%</span></div>
                      <div class="an-bar-track als-bar"><div class="an-bar-fill" :style="{ width: sh.coverage + '%', background: sh.coverage < 30 ? '#ef4444' : sh.coverage < 60 ? '#f59e0b' : '#10b981' }"></div></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- High stock CL -->
              <div v-if="s?.clTopHighStock?.length" class="gcard mb-5">
                <div class="gcard-bar" style="background:linear-gradient(90deg,#10b981,#06b6d4)"></div>
                <div class="gc-head">
                  <div class="gc-ico" style="background:rgba(16,185,129,.16);color:#10b981"><i class="fas fa-ranking-star"></i></div>
                  <div><div class="gc-title">Mayor stock — Lentes de Contacto</div><div class="gc-sub">Plantillas con más existencias acumuladas</div></div>
                </div>
                <div class="gc-body">
                  <div class="an-low-stock-list">
                    <div v-for="sh in s.clTopHighStock" :key="sh.id" class="an-low-stock-row">
                      <div class="als-info"><div class="als-name">{{ sh.nombre }}</div><div class="als-tipo">{{ sh.tipo }}</div></div>
                      <div class="als-metrics"><span class="als-stock" style="color:#10b981">{{ fmtn(sh.stock) }} piezas</span><span class="als-cov">{{ sh.coverage }}%</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Low stock Optico -->
              <div v-if="s?.opticTopLowStock?.length" class="gcard mb-5">
                <div class="gcard-bar" style="background:linear-gradient(90deg,#f59e0b,#ec4899)"></div>
                <div class="gc-head">
                  <div class="gc-ico" style="background:rgba(245,158,11,.16);color:#f59e0b"><i class="fas fa-triangle-exclamation"></i></div>
                  <div><div class="gc-title">Menor cobertura — Inventario Optico</div><div class="gc-sub">Plantillas de bases y micas con menor stock</div></div>
                </div>
                <div class="gc-body">
                  <div class="an-low-stock-list">
                    <div v-for="sh in s.opticTopLowStock" :key="sh.id" class="an-low-stock-row">
                      <div class="als-info"><div class="als-name">{{ sh.nombre }}</div><div class="als-tipo">{{ sh.tipo }}</div></div>
                      <div class="als-metrics"><span class="als-stock">{{ fmtn(sh.stock) }} piezas</span><span class="als-cov" :style="{ color: sh.coverage < 30 ? '#ef4444' : sh.coverage < 60 ? '#f59e0b' : '#10b981' }">{{ sh.coverage }}%</span></div>
                      <div class="an-bar-track als-bar"><div class="an-bar-fill" :style="{ width: sh.coverage + '%', background: sh.coverage < 30 ? '#ef4444' : sh.coverage < 60 ? '#f59e0b' : '#10b981' }"></div></div>
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
                  <div class="gc-ico" style="background:rgba(16,185,129,.16);color:#10b981"><i class="fas fa-database"></i></div>
                  <div><div class="gc-title">Cobertura de inventario óptico</div><div class="gc-sub">Estado general del stock de bases y micas</div></div>
                </div>
                <div class="gc-body">
                  <template v-if="!isLoading">
                    <div class="cov-row"><span class="cov-k">Combinaciones totales</span><b class="cov-v">{{ fmtn(s?.totalCombinations) }}</b></div>
                    <div class="cov-row"><span class="cov-k">Con stock</span><b class="cov-v" style="color:#10b981">{{ fmtn(s?.withStock) }}</b></div>
                    <div class="cov-row"><span class="cov-k">Cobertura</span><b class="cov-v">{{ s?.coveragePct ?? 0 }}%</b></div>
                    <b-progress :value="s?.coveragePct ?? 0" size="is-small" type="is-primary" :show-value="false" class="my-2" />
                    <div class="cov-row"><span class="cov-k">Existencias totales</span><b class="cov-v">{{ fmtn(s?.totalStock) }}</b></div>
                    <div class="cov-row"><span class="cov-k">Alertas críticas</span><b-tag :type="(s?.criticalAlerts ?? 0) > 0 ? 'is-danger' : 'is-success'" size="is-small" class="is-rounded">{{ s?.criticalAlerts ?? 0 }}</b-tag></div>
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
                  <div><div class="gc-title">Cobertura lentes de contacto</div><div class="gc-sub">Estado del stock de lentes de contacto</div></div>
                </div>
                <div class="gc-body">
                  <template v-if="!isLoading">
                    <div class="cov-row"><span class="cov-k">Hojas activas</span><b class="cov-v">{{ s?.clActiveSheets ?? 0 }}</b></div>
                    <div class="cov-row"><span class="cov-k">Combinaciones totales</span><b class="cov-v">{{ fmtn(s?.clTotalCombinations) }}</b></div>
                    <div class="cov-row"><span class="cov-k">Con stock</span><b class="cov-v" style="color:#10b981">{{ fmtn(s?.clWithStock) }}</b></div>
                    <div class="cov-row"><span class="cov-k">Cobertura</span><b class="cov-v">{{ s?.clCoveragePct ?? 0 }}%</b></div>
                    <b-progress :value="s?.clCoveragePct ?? 0" size="is-small" type="is-info" :show-value="false" class="my-2" />
                    <div class="cov-row"><span class="cov-k">Existencias totales</span><b class="cov-v">{{ fmtn(s?.clTotalStock) }}</b></div>
                    <div class="cov-row"><span class="cov-k">Promedio por celda</span><b class="cov-v">{{ s?.clAvgPerCell ?? 0 }}</b></div>
                  </template>
                  <template v-else><b-skeleton width="100%" :height="120" animated /></template>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- ═══════════════ TAB: PEDIDOS ═══════════════════════════════ -->
        <template #pedidos>
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

        <!-- ═══════════════ TAB: DEVOLUCIONES ══════════════════════════ -->
        <template #devoluciones>
          <div class="an-tab-two-col">
            <div class="an-col-main">
              <div class="gcard mb-5">
                <div class="gcard-bar" style="background:linear-gradient(90deg,#ec4899,#f43f5e,#f59e0b)"></div>
                <div class="gc-head">
                  <div class="gc-ico" style="background:rgba(236,72,153,.16);color:#ec4899"><i class="fas fa-rotate-left"></i></div>
                  <div><div class="gc-title">Analíticas de devoluciones</div><div class="gc-sub">Estado, tendencias y tasa de aprobación del período</div></div>
                </div>
                <div class="gc-body">
                  <div class="an-devol-grid">
                    <div class="an-devol-cell"><div class="adc-ico" style="background:rgba(245,158,11,.15);color:#f59e0b"><i class="fas fa-hourglass-half"></i></div><div class="adc-val" style="color:#f59e0b" v-if="!isLoading">{{ s?.devolucionesPendientes ?? 0 }}</div><b-skeleton v-else :width="40" :height="24" animated /><div class="adc-lbl">Pendientes</div></div>
                    <div class="an-devol-cell"><div class="adc-ico" style="background:rgba(59,130,246,.15);color:#3b82f6"><i class="fas fa-magnifying-glass"></i></div><div class="adc-val" style="color:#3b82f6" v-if="!isLoading">{{ s?.devolucionesEnRevision ?? 0 }}</div><b-skeleton v-else :width="40" :height="24" animated /><div class="adc-lbl">En revisión</div></div>
                    <div class="an-devol-cell"><div class="adc-ico" style="background:rgba(16,185,129,.15);color:#10b981"><i class="fas fa-circle-check"></i></div><div class="adc-val" style="color:#10b981" v-if="!isLoading">{{ s?.devolucionesAprobadas ?? 0 }}</div><b-skeleton v-else :width="40" :height="24" animated /><div class="adc-lbl">Aprobadas</div></div>
                    <div class="an-devol-cell"><div class="adc-ico" style="background:rgba(239,68,68,.15);color:#ef4444"><i class="fas fa-circle-xmark"></i></div><div class="adc-val" style="color:#ef4444" v-if="!isLoading">{{ s?.devolucionesRechazadas ?? 0 }}</div><b-skeleton v-else :width="40" :height="24" animated /><div class="adc-lbl">Rechazadas</div></div>
                    <div class="an-devol-cell"><div class="adc-ico" style="background:var(--c-primary-alpha);color:var(--c-primary)"><i class="fas fa-box-archive"></i></div><div class="adc-val" style="color:var(--c-primary)" v-if="!isLoading">{{ s?.devolucionesProcesadas ?? 0 }}</div><b-skeleton v-else :width="40" :height="24" animated /><div class="adc-lbl">Procesadas</div></div>
                    <div class="an-devol-cell"><div class="adc-ico" style="background:rgba(236,72,153,.15);color:#ec4899"><i class="fas fa-calendar-day"></i></div><div class="adc-val" style="color:#ec4899" v-if="!isLoading">{{ s?.devolucionesHoy ?? 0 }}</div><b-skeleton v-else :width="40" :height="24" animated /><div class="adc-lbl">Hoy</div></div>
                  </div>

                  <div class="an-divider my-3"><span>Tendencia temporal</span></div>
                  <div class="an-bars" v-if="!isLoading">
                    <div class="an-bar-row"><span class="an-bar-lbl">7 días</span><div class="an-bar-track"><div class="an-bar-fill" :style="{ width: devol7dPct + '%', background: 'linear-gradient(90deg,#ec4899,#f43f5e)' }"></div></div><span class="an-bar-pct">{{ s?.devolucionesTotal7d ?? 0 }}</span></div>
                    <div class="an-bar-row"><span class="an-bar-lbl">30 días</span><div class="an-bar-track"><div class="an-bar-fill" :style="{ width: '100%', background: 'linear-gradient(90deg,var(--c-primary),#ec4899)' }"></div></div><span class="an-bar-pct">{{ s?.devolucionesTotal30d ?? 0 }}</span></div>
                  </div>

                  <div class="an-devol-rate mt-3" v-if="!isLoading">
                    <div class="adr-head"><span class="adr-label"><i class="fas fa-chart-line mr-1"></i> Tasa de aprobación</span><span class="adr-val" :style="{ color: devolApprovalRate >= 70 ? '#10b981' : devolApprovalRate >= 50 ? '#f59e0b' : '#ef4444' }">{{ devolApprovalRate }}%</span></div>
                    <b-progress :value="devolApprovalRate" size="is-small" :type="devolApprovalRate >= 70 ? 'is-success' : devolApprovalRate >= 50 ? 'is-warning' : 'is-danger'" :show-value="false" />
                    <p class="adr-desc">{{ devolApprovalRate >= 70 ? 'Alta aprobación — proceso fluido.' : devolApprovalRate >= 50 ? 'Tasa media — revisar criterios de rechazo.' : 'Baja aprobación — análisis de causas recomendado.' }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Sidebar devoluciones -->
            <div class="an-col-side">
              <div class="gcard mb-4">
                <div class="gcard-bar" style="background:linear-gradient(90deg,#ec4899,#f43f5e)"></div>
                <div class="gc-head">
                  <div class="gc-ico" style="background:rgba(236,72,153,.16);color:#ec4899"><i class="fas fa-rotate-left"></i></div>
                  <div><div class="gc-title">Devoluciones</div><div class="gc-sub">Resumen rápido del estado actual</div></div>
                </div>
                <div class="gc-body">
                  <template v-if="!isLoading">
                    <div class="cov-row"><span class="cov-k">Pendientes</span><b-tag :type="(s?.devolucionesPendientes ?? 0) > 0 ? 'is-warning' : 'is-light'" size="is-small" class="is-rounded">{{ s?.devolucionesPendientes ?? 0 }}</b-tag></div>
                    <div class="cov-row"><span class="cov-k">En revisión</span><b class="cov-v">{{ s?.devolucionesEnRevision ?? 0 }}</b></div>
                    <div class="cov-row"><span class="cov-k">Aprobadas</span><b class="cov-v" style="color:#10b981">{{ s?.devolucionesAprobadas ?? 0 }}</b></div>
                    <div class="cov-row"><span class="cov-k">Rechazadas</span><b class="cov-v" style="color:#ef4444">{{ s?.devolucionesRechazadas ?? 0 }}</b></div>
                    <div class="cov-row"><span class="cov-k">Procesadas</span><b class="cov-v">{{ s?.devolucionesProcesadas ?? 0 }}</b></div>
                    <div class="an-divider my-2"></div>
                    <div class="cov-row"><span class="cov-k">Total (30d)</span><b class="cov-v">{{ s?.devolucionesTotal30d ?? 0 }}</b></div>
                    <div class="cov-row"><span class="cov-k">Total (7d)</span><b class="cov-v">{{ s?.devolucionesTotal7d ?? 0 }}</b></div>
                    <div class="cov-row"><span class="cov-k">Hoy</span><b class="cov-v">{{ s?.devolucionesHoy ?? 0 }}</b></div>
                    <div class="cov-row"><span class="cov-k">Tasa aprobación</span><b class="cov-v" :style="{ color: devolApprovalRate >= 70 ? '#10b981' : devolApprovalRate >= 50 ? '#f59e0b' : '#ef4444' }">{{ devolApprovalRate }}%</b></div>
                  </template>
                  <template v-else><b-skeleton width="100%" :height="170" animated /></template>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- ═══════════════ TAB: LABORATORIO ═══════════════════════════ -->
        <template #laboratorio>
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

        <!-- ═══════════════ TAB: SUPERVISION ═══════════════════════════ -->
        <template #supervision>
          <div class="an-tab-single-col">
            <div class="gcard mb-5">
              <div class="gcard-bar" style="background:linear-gradient(90deg,#0891b2,#0d9488)"></div>
              <div class="gc-head">
                <div class="gc-ico" style="background:rgba(8,145,178,.16);color:#0891b2"><i class="fas fa-star-half-stroke"></i></div>
                <div><div class="gc-title">Calidad operativa</div><div class="gc-sub">Indicadores de rendimiento del equipo y la operación</div></div>
              </div>
              <div class="gc-body">
                <div class="an-stat-grid">
                  <div class="an-stat-cell"><div class="asc-ico" style="background:rgba(239,68,68,.12);color:#ef4444"><i class="fas fa-rotate"></i></div><div class="asc-val" :style="{ color: (s?.corrections30d ?? 0) > 10 ? '#ef4444' : '#10b981' }" v-if="!isLoading">{{ s?.corrections30d ?? 0 }}</div><b-skeleton v-else :width="50" :height="28" animated /><div class="asc-lbl">Correcciones (30d)</div><div class="asc-cap">Del equipo de lab</div></div>
                  <div class="an-stat-cell"><div class="asc-ico" style="background:rgba(59,130,246,.12);color:#3b82f6"><i class="fas fa-pencil"></i></div><div class="asc-val" style="color:#3b82f6" v-if="!isLoading">{{ s?.edits30d ?? 0 }}</div><b-skeleton v-else :width="50" :height="28" animated /><div class="asc-lbl">Ediciones (30d)</div><div class="asc-cap">Cambios a pedidos</div></div>
                  <div class="an-stat-cell"><div class="asc-ico" style="background:rgba(6,182,212,.12);color:#06b6d4"><i class="fas fa-barcode"></i></div><div class="asc-val" style="color:#06b6d4" v-if="!isLoading">{{ s?.scansToday ?? 0 }}</div><b-skeleton v-else :width="50" :height="28" animated /><div class="asc-lbl">Escaneos hoy</div><div class="asc-cap">Actividad del día</div></div>
                  <div class="an-stat-cell"><div class="asc-ico" style="background:rgba(239,68,68,.12);color:#ef4444"><i class="fas fa-ban"></i></div><div class="asc-val" style="color:#ef4444" v-if="!isLoading">{{ s?.ordersCancelledAll ?? 0 }}</div><b-skeleton v-else :width="50" :height="28" animated /><div class="asc-lbl">Cancelados total</div><div class="asc-cap">Histórico</div></div>
                </div>
              </div>
            </div>
          </div>
        </template>

      </DynamicTabs>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, toRef } from 'vue'
import DynamicTabs from '@/components/DynamicTabs.vue'
import { useDashboardStats } from '@/composables/useDashboardStats'

const props = defineProps({
  loading: { type: Boolean, default: false },
  user:    { type: Object, default: null },
})

const userRef = toRef(props, 'user')
const {
  stats, loading: statsLoading, load: loadStats,
  role, canSeeInventory, canSeeOrders, canSeeReports,
  canSeeLab, canSeeMovements, canSeeDevolutions,
  canExportReports, isRoot, isVentas, isSupervisor,
} = useDashboardStats(userRef)

const s         = computed(() => stats.value)
const isLoading = computed(() => props.loading || statsLoading.value)

// ── Tabs ──
const anTab = ref('inventario')
const AN_TABS = computed(() => {
  const tabs = []
  if (canSeeInventory.value)   tabs.push({ key: 'inventario',   label: 'Inventario',    icon: 'cubes-stacked' })
  if (canSeeOrders.value)      tabs.push({ key: 'pedidos',      label: 'Pedidos',       icon: 'flask-vial' })
  if (canSeeDevolutions.value) tabs.push({ key: 'devoluciones', label: 'Devoluciones',  icon: 'rotate-left', badge: s.value?.devolucionesPendientes || 0, badgeType: 'warning' })
  if (canSeeLab.value)         tabs.push({ key: 'laboratorio',  label: 'Laboratorio',   icon: 'microscope' })
  if (isSupervisor.value || isRoot.value) tabs.push({ key: 'supervision', label: 'Supervision', icon: 'eye' })
  return tabs
})

onMounted(() => { loadStats() })
onActivated(() => { loadStats() })

// ── Role meta ──
const roleMeta = {
  root:        { title: 'Analíticas del sistema',     grad: 'linear-gradient(90deg,#dc2626,#ea580c)' },
  eurovision:  { title: 'Analíticas del sistema',     grad: 'linear-gradient(90deg,#906fe1,#2563eb)' },
  supervisor:  { title: 'Analíticas de operaciones',  grad: 'linear-gradient(90deg,#0891b2,#0d9488)' },
  ventas:      { title: 'Analíticas de ventas',       grad: 'linear-gradient(90deg,#16a34a,#65a30d)' },
  laboratorio: { title: 'Analíticas de laboratorio',  grad: 'linear-gradient(90deg,#0284c7,#906fe1)' },
}
const currentMeta   = computed(() => roleMeta[role.value] || roleMeta.eurovision)
const headerTitle   = computed(() => currentMeta.value.title)
const roleGradient  = computed(() => currentMeta.value.grad)
const headerSubtitle = computed(() => {
  if (canSeeMovements.value) return 'Resumen operativo completo: inventario, movimientos, pedidos, devoluciones y laboratorio.'
  if (canSeeReports.value)   return 'Resumen de ventas, pedidos, devoluciones y nivel de servicio del período.'
  if (canSeeLab.value)       return 'Actividad de laboratorio: escaneos, correcciones y pedidos procesados.'
  return 'Resumen de la actividad de pedidos del período activo.'
})

// ── Inventory ratios ──
const entriesPct = computed(() => {
  const t = s.value?.movementsTotal30d || 0
  return t ? Math.round((s.value?.entries30d || 0) / t * 100) : 0
})
const exitsPct = computed(() => {
  const t = s.value?.movementsTotal30d || 0
  return t ? Math.round((s.value?.exits30d || 0) / t * 100) : 0
})
const rotationIndex = computed(() => {
  const m = s.value?.movementsTotal30d || 0
  if (!m) return '—'
  const est = (m / 30) * 365 / Math.max(s.value?.totalStock || 1, 1)
  return est < 0.1 ? '< 0.1' : est.toFixed(1)
})

// ── Service level ──
const serviceLevelStatus = computed(() => {
  const sl = s.value?.serviceLevel || 0
  if (sl >= 97) return 'Excelente'
  if (sl >= 90) return 'Bueno'
  if (sl >= 80) return 'Aceptable'
  return 'A mejorar'
})
const serviceLevelComment = computed(() => {
  const sl = s.value?.serviceLevel || 0
  if (sl >= 97) return 'Operación óptima, sin incidencias relevantes.'
  if (sl >= 90) return 'Buen rendimiento general del equipo.'
  if (sl >= 80) return 'Revisar procesos para reducir correcciones.'
  return 'Alta tasa de correcciones — intervención recomendada.'
})
const serviceLevelTagType = computed(() => {
  const sl = s.value?.serviceLevel || 0
  if (sl >= 97) return 'is-success'
  if (sl >= 90) return 'is-info'
  if (sl >= 80) return 'is-warning'
  return 'is-danger'
})
const serviceLevelClass = computed(() => {
  const sl = s.value?.serviceLevel || 0
  if (sl >= 97) return 'sl-excellent'
  if (sl >= 90) return 'sl-good'
  if (sl >= 80) return 'sl-ok'
  return 'sl-poor'
})
const slColor = computed(() => {
  const sl = s.value?.serviceLevel || 0
  if (sl >= 97) return '#10b981'
  if (sl >= 90) return '#06b6d4'
  if (sl >= 80) return '#f59e0b'
  return '#ef4444'
})

// ── Coverage ──
const safeStockPct = computed(() => {
  const total = s.value?.totalCombinations || 0
  const crit  = s.value?.criticalAlerts || 0
  return total ? Math.round((total - crit) / total * 100) : 0
})

// ── Lab quality ──
const correctionRate = computed(() => {
  const closed = s.value?.ordersClosed30d || 0
  const corr   = s.value?.corrections30d || 0
  return closed ? Math.min(Math.round(corr / closed * 100), 100) : 0
})

// ── Devolutions ──
const devolApprovalRate = computed(() => {
  const total    = s.value?.devolucionesTotal30d ?? 0
  const approved = s.value?.devolucionesAprobadas ?? 0
  return total ? Math.min(Math.round(approved / total * 100), 100) : 0
})
const devol7dPct = computed(() => {
  const t30 = s.value?.devolucionesTotal30d || 0
  const t7  = s.value?.devolucionesTotal7d  || 0
  return t30 ? Math.min(Math.round(t7 / t30 * 100), 100) : 0
})

function fmtn(value) {
  return Number(value || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
</script>

<!-- Non-scoped: glass token vars on .an-root -->
<style>
.an-root {
  --g-bg:         var(--card);
  --g-border:     var(--border);
  --g-shadow:     var(--shadow);
  --g-kpi:        var(--card);
  --g-kpi-border: var(--border);
  --g-hero:       var(--surface-solid);
  --g-action:     var(--surface-overlay);
  --g-hover:      var(--bg-muted);
}
</style>

<style scoped>
/* ── Root ── */
.an-root {
  position: relative;
  min-height: 100%;
  background: var(--bg-base);
}

/* ── Hero header ── */
.an-hero {
  position: relative;
  z-index: 1;
  margin: 1.25rem;
  border-radius: var(--radius-xl);
  overflow: hidden;
  background:
    radial-gradient(circle at 0 0,   rgba(79,70,229,0.12),  transparent 55%),
    radial-gradient(circle at 100% 0, rgba(236,72,153,0.10), transparent 55%),
    radial-gradient(circle at 60% 100%, rgba(249,115,22,0.10), transparent 55%),
    var(--surface-solid);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}
.an-hero-accent {
  height: 3.5px;
  width: 100%;
}
.an-hero-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.15rem 1.6rem;
  flex-wrap: wrap;
}
.an-hero-left  { flex: 1; min-width: 0; }
.an-hero-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem; flex-shrink: 0; }

.an-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.67rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: var(--c-primary);
  background: var(--c-primary-alpha);
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  margin-bottom: 0.4rem;
}
.an-hero-title {
  font-size: 1.35rem;
  font-weight: 800;
  margin: 0 0 0.2rem;
  line-height: 1.2;
}
.an-brand-grad {
  background: linear-gradient(90deg, var(--c-primary), #2563eb, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.an-hero-sub { font-size: 0.78rem; color: var(--text-muted); margin: 0; max-width: 520px; }

.an-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.73rem;
  color: var(--text-muted);
  background: var(--g-action);
  border: 1px solid var(--g-border);
  backdrop-filter: blur(var(--fx-blur));
  -webkit-backdrop-filter: blur(var(--fx-blur));
  padding: 0.28rem 0.7rem;
  border-radius: 999px;
}
.an-badge i { color: var(--c-primary); font-size: 0.72rem; }
.an-badge-pink i { color: #ec4899; }

/* ── KPI Strip ── */
.an-kpis {
  position: relative;
  z-index: 1;
  padding: 0 1.25rem;
}
.an-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
  gap: 0.75rem;
}
.an-kpi-card {
  border-radius: var(--radius-xl);
  background: var(--g-kpi);
  border: 1px solid var(--g-kpi-border);
  box-shadow: var(--g-shadow);
  overflow: hidden;
  transition: transform 0.15s, box-shadow 0.15s;
}
.an-kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.an-kpi-top  { height: 2.5px; width: 100%; }
.an-kpi-inner { display: flex; align-items: flex-start; gap: 0.8rem; padding: 0.85rem 1rem; }
.an-kpi-ico  { width: 34px; height: 34px; border-radius: 0.55rem; display: flex; align-items: center; justify-content: center; font-size: 0.88rem; flex-shrink: 0; }
.an-kpi-lbl  { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); font-weight: 600; }
.an-kpi-num  {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.1;
  margin: 0.1rem 0;
  color: var(--text-primary);
}
.an-kpi-cap  { font-size: 0.65rem; color: var(--text-muted); }

/* ── Main grid ── */
.an-main {
  position: relative;
  z-index: 1;
  padding: 1.25rem;
}
.an-tab-two-col {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 1.25rem;
}
.an-tab-single-col {
  max-width: 960px;
}
.an-col-main, .an-col-side { display: flex; flex-direction: column; }

/* ── Glass card ── */
.gcard {
  background: var(--g-bg);
  border: 1px solid var(--g-border);
  border-radius: 18px;
  box-shadow: var(--g-shadow);
  overflow: hidden;
}
.gcard-bar { height: 2.5px; width: 100%; }

.gc-head {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 1rem 1.25rem 0;
}
.gc-ico {
  width: 36px; height: 36px;
  border-radius: 0.6rem;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.9rem; flex-shrink: 0;
}
.gc-title { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); }
.gc-sub   { font-size: 0.71rem; color: var(--text-muted); }
.gc-body  { padding: 0.85rem 1.25rem 1.15rem; }

/* ── Trio (4-col) ── */
.an-trio {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
  align-items: start;
  gap: 0.5rem;
}
.an-trio-sep { width: 1px; background: var(--g-border); align-self: stretch; margin-top: 0.2rem; }
.at-lbl { font-size: 0.66rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; }
.at-val {
  font-size: 1.7rem; font-weight: 800; line-height: 1;
  color: var(--text-primary);
  margin: 0.1rem 0;
}
.at-cap { font-size: 0.66rem; color: var(--text-muted); }

/* ── Chips row ── */
.an-chips {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.6rem;
}
.an-chip {
  background: var(--bg-subtle);
  border: 1px solid var(--g-border);
  border-radius: 0.7rem;
  padding: 0.5rem 0.7rem;
}
.ach-lbl  { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
.ach-val  { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-top: 0.1rem; }
.ach-unit { font-size: 0.68rem; color: var(--text-muted); font-weight: 400; }

/* ── Bars ── */
.an-bars { display: flex; flex-direction: column; gap: 0.55rem; }
.an-bar-row { display: flex; align-items: center; gap: 0.6rem; }
.an-bar-lbl { font-size: 0.7rem; color: var(--text-muted); width: 50px; flex-shrink: 0; }
.an-bar-track { flex: 1; height: 8px; background: var(--bg-subtle); border-radius: 999px; overflow: hidden; }
.an-bar-fill  { height: 100%; border-radius: 999px; transition: width 0.5s ease; }
.an-bar-pct { font-size: 0.7rem; color: var(--text-muted); width: 34px; text-align: right; flex-shrink: 0; }

/* ── Families ── */
.an-families { display: flex; flex-direction: column; gap: 0.7rem; }
.an-family-row { font-size: 0.78rem; }
.an-family-head { display: flex; justify-content: space-between; margin-bottom: 0.22rem; }
.an-family-name { color: var(--text-secondary); font-weight: 500; }
.an-family-pct  { color: var(--text-muted); font-weight: 700; }
.an-empty { font-size: 0.78rem; color: var(--text-muted); text-align: center; padding: 1.2rem; }

/* ── Devolution grid 6-cell ── */
.an-devol-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.7rem;
}
.an-devol-cell {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.35rem; text-align: center;
  background: var(--bg-subtle);
  border: 1px solid var(--g-border);
  border-radius: 0.85rem;
  padding: 0.75rem 0.5rem;
}
.adc-ico { width: 32px; height: 32px; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; }
.adc-val {
  font-size: 1.4rem; font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
}
.adc-lbl { font-size: 0.62rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }

/* ── Devolution rate ── */
.adr-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem; }
.adr-label { font-size: 0.75rem; color: var(--text-muted); }
.adr-val   { font-size: 1rem; font-weight: 700; }
.adr-desc  { font-size: 0.7rem; color: var(--text-muted); margin-top: 0.28rem; }

/* ── Stats grid ── */
.an-stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.7rem;
}
.an-stat-cell {
  background: var(--bg-subtle);
  border: 1px solid var(--g-border);
  border-radius: 0.8rem;
  padding: 0.7rem 0.75rem;
}
.asc-ico { width: 28px; height: 28px; border-radius: 0.45rem; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; margin-bottom: 0.35rem; }
.asc-val {
  font-size: 1.4rem; font-weight: 800;
  color: var(--text-primary);
  line-height: 1.1; margin-bottom: 0.15rem;
}
.asc-lbl { font-size: 0.65rem; color: var(--text-primary); font-weight: 600; }
.asc-cap { font-size: 0.63rem; color: var(--text-muted); }

/* ── Divider ── */
.an-divider {
  display: flex; align-items: center; gap: 0.65rem;
  font-size: 0.68rem; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.07em;
}
.an-divider::before,
.an-divider::after { content: ''; flex: 1; height: 1px; background: var(--g-border); }

/* ── Quality bar ── */
.aqb-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.28rem; }
.aqb-lbl  { font-size: 0.73rem; color: var(--text-muted); }
.aqb-val  { font-size: 0.95rem; font-weight: 700; }
.aqb-desc { font-size: 0.7rem; color: var(--text-muted); margin-top: 0.25rem; }

/* ── Service level ring ── */
.sl-display { display: flex; align-items: center; gap: 1rem; }
.sl-ring {
  width: 82px; height: 82px; border-radius: 50%;
  border: 3px solid; flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.sl-ring.sl-excellent { border-color: #10b981; box-shadow: 0 0 18px rgba(16,185,129,0.35); }
.sl-ring.sl-good      { border-color: #06b6d4; box-shadow: 0 0 18px rgba(6,182,212,0.35); }
.sl-ring.sl-ok        { border-color: #f59e0b; box-shadow: 0 0 18px rgba(245,158,11,0.35); }
.sl-ring.sl-poor      { border-color: #ef4444; box-shadow: 0 0 18px rgba(239,68,68,0.35); }
.sl-pct      { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
.sl-label-sm { font-size: 0.57rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
.sl-details  { flex: 1; }
.sl-row { display: flex; justify-content: space-between; font-size: 0.73rem; padding: 0.18rem 0; border-bottom: 1px solid var(--g-border); }
.sl-row:last-child { border-bottom: none; }
.sl-k { color: var(--text-muted); }
.sl-v { color: var(--text-primary); font-weight: 600; }
.sl-chip {
  display: flex; align-items: flex-start; gap: 0.4rem;
  margin-top: 0.75rem;
  font-size: 0.72rem; color: var(--text-muted);
  background: var(--bg-subtle);
  border: 1px solid var(--g-border);
  border-radius: 0.6rem;
  padding: 0.5rem 0.65rem;
  line-height: 1.4;
}
.sl-chip i { color: var(--c-primary); margin-top: 1px; flex-shrink: 0; }
.sl-chip-sl-excellent i { color: #10b981; }
.sl-chip-sl-good      i { color: #06b6d4; }
.sl-chip-sl-ok        i { color: #f59e0b; }
.sl-chip-sl-poor      i { color: #ef4444; }

/* ── Coverage rows ── */
.cov-row {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 0.78rem; padding: 0.28rem 0;
  border-bottom: 1px solid var(--g-border);
}
.cov-row:last-child { border-bottom: none; }
.cov-k { color: var(--text-muted); }
.cov-v { color: var(--text-primary); font-weight: 600; }

/* ── Export tiles ── */
.an-export-tiles {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}
.an-export-tile {
  display: flex; flex-direction: column; align-items: center; gap: 0.35rem;
  background: var(--g-action); border: 1px solid var(--g-border);
  border-radius: 0.75rem; padding: 0.75rem 0.5rem;
  font-size: 0.7rem; color: var(--text-muted); font-weight: 600;
  cursor: pointer; transition: background 0.15s, transform 0.15s;
  text-align: center;
}
.an-export-tile i { font-size: 1.1rem; color: var(--c-primary); }
.an-export-tile:hover { background: var(--g-hover); transform: translateY(-1px); }
.an-export-note { font-size: 0.68rem; color: var(--text-muted); text-align: center; }
.an-export-note i { color: var(--c-primary); }

/* ── Responsive ── */
@media (max-width: 1100px) {
  .an-tab-two-col { grid-template-columns: 1fr; }
  .an-col-side { flex-direction: row; flex-wrap: wrap; gap: 1rem; }
  .an-col-side > * { flex: 1 1 calc(50% - 0.5rem); min-width: 240px; }
}
@media (max-width: 900px) {
  .an-chips { grid-template-columns: repeat(2, 1fr); }
  .an-trio { grid-template-columns: 1fr auto 1fr; }
  .an-trio > .an-trio-sep:nth-child(4),
  .an-trio > .an-trio-item:nth-child(5) { display: none; }
}
@media (max-width: 768px) {
  .an-hero, .an-kpis, .an-main { margin: 0.75rem; }
  .an-kpis { padding: 0 0.75rem; }
  .an-main { padding: 0 0.75rem 0.75rem; gap: 0.75rem; }
  .an-hero-inner { flex-direction: column; align-items: flex-start; padding: 0.9rem 1.1rem; }
  .an-hero-right { flex-direction: row; flex-wrap: wrap; }
  .an-trio { grid-template-columns: 1fr; }
  .an-trio-sep { display: none; }
  .an-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .an-devol-grid { grid-template-columns: repeat(2, 1fr); }
  .sl-display { flex-direction: column; align-items: flex-start; }
  .an-col-side { flex-direction: column; }
  .an-col-side > * { flex: none; min-width: 0; }
  .an-chips { grid-template-columns: repeat(2, 1fr); }
}

/* ── Low-stock / high-stock sheets list ── */
.an-low-stock-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.an-low-stock-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--g-border);
}
.an-low-stock-row:last-child { border-bottom: none; }
.als-info { flex: 1 1 200px; min-width: 0; }
.als-name {
  font-weight: 600;
  font-size: 0.82rem;
  color: var(--text-primary, #1e293b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.als-tipo {
  font-size: 0.7rem;
  color: var(--text-muted, #94a3b8);
}
.als-metrics {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-shrink: 0;
}
.als-stock {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary, #475569);
}
.als-cov {
  font-size: 0.82rem;
  font-weight: 700;
  min-width: 3rem;
  text-align: right;
}
.als-bar {
  flex: 0 0 100%;
  height: 4px;
  border-radius: 2px;
}

/* ── Family detail row ── */
.an-family-detail {
  display: flex;
  gap: 1rem;
  font-size: 0.68rem;
  color: var(--text-muted);
  margin-top: 0.15rem;
}
</style>
