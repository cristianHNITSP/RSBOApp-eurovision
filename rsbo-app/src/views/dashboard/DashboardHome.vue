<template>
  <div class="db-root">

    <!-- ══════════════════════════════════════════════════════════════
         HERO — Bienvenido a Eurovisión
    ══════════════════════════════════════════════════════════════ -->
    <section class="db-hero" v-motion-fade-visible-once>
      <div class="hero-role-line" :style="roleBannerStyle"></div>

      <div class="hero-body">

        <!-- Columna izquierda: avatar + datos -->
        <div class="hero-left">
          <!-- Avatar con ring de color de rol -->
          <div class="avatar-shell" :style="{ '--rc': roleRingColor }">
            <div class="avatar-inner">
              <b-skeleton v-if="!avatarLoaded" :width="96" :height="96" animated style="border-radius:50%" />
              <img v-else :src="avatarUrl" alt="avatar" class="avatar-img" />
            </div>
            <div class="avatar-status-dot"></div>
          </div>

          <!-- Info -->
          <div class="hero-info">
            <div class="badge-row">
              <span class="role-chip" :style="rolePillStyle">
                <i :class="roleIconClass"></i>
                {{ roleLabel }}
              </span>
              <span class="env-chip">{{ environmentLabel }}</span>
            </div>

            <h1 class="hero-welcome-line">
              Bienvenido a <span class="brand-gradient">Eurovisión</span>
            </h1>
            <h2 class="hero-name" v-if="!loading">
              {{ greeting }}, <strong>{{ firstName }}</strong>
            </h2>
            <b-skeleton v-else :width="220" :height="28" animated class="mt-1" />

            <p class="hero-bio" v-if="!loading">{{ userBio }}</p>
            <b-skeleton v-else :width="300" :height="16" animated class="mt-1 mb-1" />

            <div class="hero-meta" v-if="!loading">
              <span class="hm-item">
                <i class="fas fa-clock"></i>
                Último acceso: <b>{{ lastLoginLabel }}</b>
              </span>
              <span class="hm-item" v-if="user?.email">
                <i class="fas fa-envelope"></i> {{ user.email }}
              </span>
            </div>
          </div>
        </div>

        <!-- Columna derecha: solo Mi perfil -->
        <div class="hero-right" v-if="!loading">
          <button class="profile-cta" @click="$router.push('/layouts/mi.perfil.panel')">
            <img :src="avatarUrl" class="pcta-avatar" alt="" />
            <div class="pcta-info">
              <span class="pcta-name">{{ firstName }}</span>
              <span class="pcta-label">Administrar perfil</span>
            </div>
            <i class="fas fa-arrow-right pcta-arrow"></i>
          </button>

          <!-- Stats rápidas en el hero -->
          <div class="hero-quick-stats" v-if="!isLoading">
            <div class="hqs-item" v-if="canSeeInventory">
              <div class="hqs-val">{{ s?.activeSheets ?? '—' }}</div>
              <div class="hqs-label">Hojas</div>
            </div>
            <div class="hqs-sep" v-if="canSeeInventory"></div>
            <div class="hqs-item" v-if="canSeeOrders">
              <div class="hqs-val">{{ s?.ordersPending ?? '—' }}</div>
              <div class="hqs-label">Pendientes</div>
            </div>
            <div class="hqs-sep" v-if="canSeeOrders && canSeeDevolutions"></div>
            <div class="hqs-item" v-if="canSeeDevolutions">
              <div class="hqs-val">{{ s?.devolucionesPendientes ?? '—' }}</div>
              <div class="hqs-label">Devoluc.</div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════
         KPIs — Métricas clave por rol
    ══════════════════════════════════════════════════════════════ -->
    <section class="db-kpis" v-motion-fade-visible-once>
      <div class="kpi-grid">
        <div
          v-for="kpi in visibleKpis"
          :key="kpi.key"
          class="kpi-glass"
          :class="`kpi-${kpi.accent}`"
        >
          <div class="kpi-glow-dot"></div>
          <div class="kpi-top">
            <div class="kpi-icon" :class="`ki-${kpi.accent}`">
              <i :class="`fas fa-${kpi.icon}`"></i>
            </div>
            <div class="kpi-trend-badge" v-if="kpi.alert">
              <i class="fas fa-circle-exclamation"></i>
            </div>
          </div>
          <div class="kpi-val-wrap" v-if="!isLoading">
            <span class="kpi-number" :class="`kn-${kpi.accent}`">{{ kpi.formattedValue }}</span>
          </div>
          <b-skeleton v-else :width="70" :height="28" animated class="mt-2 mb-1" />
          <div class="kpi-label">{{ kpi.title }}</div>
          <div class="kpi-cap">{{ kpi.caption }}</div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════
         MAIN — Contenido adaptado por rol (con tabs)
    ══════════════════════════════════════════════════════════════ -->
    <section class="db-main" v-motion-fade-visible-once>
      <DynamicTabs v-model="dashTab" :tabs="DASH_TABS">

        <!-- ═══════════════ TAB: RESUMEN ═══════════════════════════════ -->
        <template #resumen>
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
                    <button class="rtile" @click="$router.push('/layouts/devoluciones')">
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

        <!-- ═══════════════ TAB: OPERACIONES ═══════════════════════════ -->
        <template #operaciones>
          <div class="tab-single-col">
            <!-- ─── PEDIDOS Y LAB ─── -->
            <div v-if="canSeeOrders" class="gcard mb-5">
              <div class="gc-head">
                <div class="gc-head-left">
                  <div class="gc-badge-icon accent-blue"><i class="fas fa-flask-vial"></i></div>
                  <div>
                    <div class="gc-title">Pedidos y laboratorio</div>
                    <div class="gc-sub">Actividad operativa del período activo</div>
                  </div>
                </div>
              </div>
              <div class="gc-body">
                <div class="cell-grid">
                  <div class="mcell">
                    <div class="mcell-label">Pendientes</div>
                    <div class="mcell-val warn" v-if="!isLoading">{{ s?.ordersPending ?? 0 }}</div>
                    <b-skeleton v-else :width="56" :height="30" animated />
                    <div class="mcell-desc">Abiertos o parciales</div>
                  </div>
                  <div class="mcell">
                    <div class="mcell-label">Creados hoy</div>
                    <div class="mcell-val" v-if="!isLoading">{{ s?.ordersToday ?? 0 }}</div>
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
                    <div class="mcell-label">Cerrados (30d)</div>
                    <div class="mcell-val" v-if="!isLoading">{{ s?.ordersClosed30d ?? 0 }}</div>
                    <b-skeleton v-else :width="56" :height="30" animated />
                    <div class="mcell-desc">Este período</div>
                  </div>
                  <template v-if="canSeeLab">
                    <div class="mcell">
                      <div class="mcell-label">Escaneos hoy</div>
                      <div class="mcell-val accent" v-if="!isLoading">{{ s?.scansToday ?? 0 }}</div>
                      <b-skeleton v-else :width="56" :height="30" animated />
                      <div class="mcell-desc">Salidas por escáner</div>
                    </div>
                    <div class="mcell">
                      <div class="mcell-label">Correcciones (7d)</div>
                      <div class="mcell-val" :class="(s?.corrections7d ?? 0) > 5 ? 'warn' : ''" v-if="!isLoading">{{ s?.corrections7d ?? 0 }}</div>
                      <b-skeleton v-else :width="56" :height="30" animated />
                      <div class="mcell-desc">Activas esta semana</div>
                    </div>
                  </template>
                </div>
              </div>
            </div>

            <!-- ─── COLA DE TRABAJO — laboratorio ─── -->
            <div v-if="isLab" class="gcard gcard-lab mb-5">
              <div class="gc-head">
                <div class="gc-head-left">
                  <div class="gc-badge-icon accent-cyan"><i class="fas fa-microscope"></i></div>
                  <div>
                    <div class="gc-title">Mi bandeja de trabajo</div>
                    <div class="gc-sub">Flujo de procesamiento del día</div>
                  </div>
                </div>
              </div>
              <div class="gc-body">
                <div class="pipeline">
                  <div class="pipe-step">
                    <div class="pipe-icon p-pending"><i class="fas fa-hourglass-half"></i></div>
                    <div class="pipe-label">Por procesar</div>
                    <div class="pipe-val" v-if="!isLoading">{{ s?.ordersPending ?? 0 }}</div>
                    <b-skeleton v-else :width="44" :height="26" animated />
                  </div>
                  <div class="pipe-arrow"><i class="fas fa-chevron-right"></i></div>
                  <div class="pipe-step">
                    <div class="pipe-icon p-scan"><i class="fas fa-barcode"></i></div>
                    <div class="pipe-label">Escaneados hoy</div>
                    <div class="pipe-val" v-if="!isLoading">{{ s?.scansToday ?? 0 }}</div>
                    <b-skeleton v-else :width="44" :height="26" animated />
                  </div>
                  <div class="pipe-arrow"><i class="fas fa-chevron-right"></i></div>
                  <div class="pipe-step">
                    <div class="pipe-icon p-done"><i class="fas fa-circle-check"></i></div>
                    <div class="pipe-label">Cerrados hoy</div>
                    <div class="pipe-val" v-if="!isLoading">{{ s?.ordersClosedToday ?? 0 }}</div>
                    <b-skeleton v-else :width="44" :height="26" animated />
                  </div>
                  <div class="pipe-arrow"><i class="fas fa-chevron-right"></i></div>
                  <div class="pipe-step">
                    <div class="pipe-icon p-ret"><i class="fas fa-rotate-left"></i></div>
                    <div class="pipe-label">Devoluciones</div>
                    <div class="pipe-val" v-if="!isLoading">{{ s?.devolucionesPendientes ?? 0 }}</div>
                    <b-skeleton v-else :width="44" :height="26" animated />
                  </div>
                </div>
                <div class="gc-footer mt-3">
                  <span class="gf-item"><i class="fas fa-wrench"></i> Correcciones (7d): <b>{{ s?.corrections7d ?? 0 }}</b></span>
                  <span class="gf-item"><i class="fas fa-pen-to-square"></i> Ediciones (30d): <b>{{ s?.edits30d ?? 0 }}</b></span>
                  <span class="gf-item"><i class="fas fa-ban"></i> Cancelados total: <b>{{ s?.ordersCancelledAll ?? 0 }}</b></span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- ═══════════════ TAB: DEVOLUCIONES ══════════════════════════ -->
        <template #devoluciones>
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
                  @click="$router.push('/layouts/devoluciones')"
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

        <!-- ═══════════════ TAB: OPTICA ════════════════════════════════ -->
        <template #optica>
          <div class="tab-single-col">
            <div v-if="optica.loading" class="optica-loading">
              <b-skeleton :width="'100%'" :height="120" animated class="mb-4" />
              <b-skeleton :width="'100%'" :height="120" animated class="mb-4" />
              <b-skeleton :width="'100%'" :height="120" animated />
            </div>
            <template v-else>
              <!-- Armazones -->
              <div class="gcard mb-5">
                <div class="gc-head">
                  <div class="gc-head-left">
                    <div class="gc-badge-icon accent-purple"><i class="fas fa-glasses"></i></div>
                    <div>
                      <div class="gc-title">Armazones</div>
                      <div class="gc-sub">{{ optica.armazones.length }} registros</div>
                    </div>
                  </div>
                </div>
                <div class="gc-body">
                  <div class="cell-grid">
                    <div class="mcell"><div class="mcell-label">Stock total</div><div class="mcell-val accent">{{ opticaStats.arm.total }}</div></div>
                    <div class="mcell"><div class="mcell-label">Agotados</div><div class="mcell-val danger">{{ opticaStats.arm.agotado }}</div></div>
                    <div class="mcell"><div class="mcell-label">Stock bajo</div><div class="mcell-val warn">{{ opticaStats.arm.bajo }}</div></div>
                    <div class="mcell"><div class="mcell-label">Valor estimado</div><div class="mcell-val">{{ fmtMXN(opticaStats.arm.valor) }}</div></div>
                  </div>
                </div>
              </div>

              <!-- Soluciones -->
              <div class="gcard mb-5">
                <div class="gc-head">
                  <div class="gc-head-left">
                    <div class="gc-badge-icon accent-blue"><i class="fas fa-droplet"></i></div>
                    <div>
                      <div class="gc-title">Soluciones</div>
                      <div class="gc-sub">{{ optica.soluciones.length }} registros</div>
                    </div>
                  </div>
                </div>
                <div class="gc-body">
                  <div class="cell-grid">
                    <div class="mcell"><div class="mcell-label">Stock total</div><div class="mcell-val accent">{{ opticaStats.sol.total }}</div></div>
                    <div class="mcell"><div class="mcell-label">Agotados</div><div class="mcell-val danger">{{ opticaStats.sol.agotado }}</div></div>
                    <div class="mcell"><div class="mcell-label">Stock bajo</div><div class="mcell-val warn">{{ opticaStats.sol.bajo }}</div></div>
                    <div class="mcell"><div class="mcell-label">Por vencer</div><div class="mcell-val" :class="opticaStats.sol.porVencer > 0 ? 'warn' : ''">{{ opticaStats.sol.porVencer }}</div></div>
                    <div class="mcell"><div class="mcell-label">Valor estimado</div><div class="mcell-val">{{ fmtMXN(opticaStats.sol.valor) }}</div></div>
                  </div>
                </div>
              </div>

              <!-- Accesorios -->
              <div class="gcard mb-5">
                <div class="gc-head">
                  <div class="gc-head-left">
                    <div class="gc-badge-icon accent-green"><i class="fas fa-screwdriver-wrench"></i></div>
                    <div>
                      <div class="gc-title">Accesorios</div>
                      <div class="gc-sub">{{ optica.accesorios.length }} registros</div>
                    </div>
                  </div>
                </div>
                <div class="gc-body">
                  <div class="cell-grid">
                    <div class="mcell"><div class="mcell-label">Stock total</div><div class="mcell-val accent">{{ opticaStats.acc.total }}</div></div>
                    <div class="mcell"><div class="mcell-label">Agotados</div><div class="mcell-val danger">{{ opticaStats.acc.agotado }}</div></div>
                    <div class="mcell"><div class="mcell-label">Stock bajo</div><div class="mcell-val warn">{{ opticaStats.acc.bajo }}</div></div>
                    <div class="mcell"><div class="mcell-label">Categorías</div><div class="mcell-val">{{ opticaStats.acc.categorias }}</div></div>
                    <div class="mcell"><div class="mcell-label">Valor estimado</div><div class="mcell-val">{{ fmtMXN(opticaStats.acc.valor) }}</div></div>
                  </div>
                </div>
              </div>

              <!-- Estuches -->
              <div class="gcard mb-5">
                <div class="gc-head">
                  <div class="gc-head-left">
                    <div class="gc-badge-icon accent-orange"><i class="fas fa-box"></i></div>
                    <div>
                      <div class="gc-title">Estuches</div>
                      <div class="gc-sub">{{ optica.estuches.length }} registros</div>
                    </div>
                  </div>
                </div>
                <div class="gc-body">
                  <div class="cell-grid">
                    <div class="mcell"><div class="mcell-label">Stock total</div><div class="mcell-val accent">{{ opticaStats.est.total }}</div></div>
                    <div class="mcell"><div class="mcell-label">Agotados</div><div class="mcell-val danger">{{ opticaStats.est.agotado }}</div></div>
                    <div class="mcell"><div class="mcell-label">Stock bajo</div><div class="mcell-val warn">{{ opticaStats.est.bajo }}</div></div>
                    <div class="mcell"><div class="mcell-label">Tipos</div><div class="mcell-val">{{ opticaStats.est.tipos }}</div></div>
                    <div class="mcell"><div class="mcell-label">Valor estimado</div><div class="mcell-val">{{ fmtMXN(opticaStats.est.valor) }}</div></div>
                  </div>
                </div>
              </div>

              <!-- Equipos -->
              <div class="gcard mb-5">
                <div class="gc-head">
                  <div class="gc-head-left">
                    <div class="gc-badge-icon accent-cyan"><i class="fas fa-desktop"></i></div>
                    <div>
                      <div class="gc-title">Equipos</div>
                      <div class="gc-sub">{{ optica.equipos.length }} registros</div>
                    </div>
                  </div>
                </div>
                <div class="gc-body">
                  <div class="cell-grid">
                    <div class="mcell"><div class="mcell-label">Operativos</div><div class="mcell-val ok">{{ opticaStats.eqp.operativo }}</div></div>
                    <div class="mcell"><div class="mcell-label">Mantenimiento</div><div class="mcell-val warn">{{ opticaStats.eqp.mantto }}</div></div>
                    <div class="mcell"><div class="mcell-label">Fuera de servicio</div><div class="mcell-val danger">{{ opticaStats.eqp.fuera }}</div></div>
                    <div class="mcell"><div class="mcell-label">Próx. mantenimiento</div><div class="mcell-val" :class="opticaStats.eqp.proxMantto > 0 ? 'warn' : ''">{{ opticaStats.eqp.proxMantto }}</div></div>
                    <div class="mcell"><div class="mcell-label">Total equipos</div><div class="mcell-val">{{ opticaStats.eqp.total }}</div></div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </template>

        <!-- ═══════════════ TAB: SUPERVISION ═══════════════════════════ -->
        <template #supervision>
          <div class="tab-two-col">
            <div class="col-main">
              <div class="gcard mb-5">
                <div class="gc-head">
                  <div class="gc-head-left">
                    <div class="gc-badge-icon accent-cyan"><i class="fas fa-eye"></i></div>
                    <div>
                      <div class="gc-title">Panel de supervisión</div>
                      <div class="gc-sub">Vista consolidada de operaciones</div>
                    </div>
                  </div>
                </div>
                <div class="gc-body">
                  <div class="cell-grid">
                    <div class="mcell">
                      <div class="mcell-label">Pedidos activos</div>
                      <div class="mcell-val warn" v-if="!isLoading">{{ s?.ordersPending ?? 0 }}</div>
                      <b-skeleton v-else :width="56" :height="30" animated />
                      <div class="mcell-desc">Abiertos o parciales</div>
                    </div>
                    <div class="mcell">
                      <div class="mcell-label">Cerrados (30d)</div>
                      <div class="mcell-val ok" v-if="!isLoading">{{ s?.ordersClosed30d ?? 0 }}</div>
                      <b-skeleton v-else :width="56" :height="30" animated />
                      <div class="mcell-desc">Este período</div>
                    </div>
                    <div class="mcell">
                      <div class="mcell-label">Nivel de servicio</div>
                      <div class="mcell-val accent" v-if="!isLoading">{{ s?.serviceLevel ?? 0 }}%</div>
                      <b-skeleton v-else :width="56" :height="30" animated />
                      <div class="mcell-desc">Sin correcciones (30d)</div>
                    </div>
                    <div class="mcell">
                      <div class="mcell-label">Correcciones (30d)</div>
                      <div class="mcell-val" :class="(s?.corrections30d ?? 0) > 10 ? 'warn' : ''" v-if="!isLoading">{{ s?.corrections30d ?? 0 }}</div>
                      <b-skeleton v-else :width="56" :height="30" animated />
                      <div class="mcell-desc">Solicitudes totales</div>
                    </div>
                    <div class="mcell">
                      <div class="mcell-label">Devol. pendientes</div>
                      <div class="mcell-val" :class="(s?.devolucionesPendientes ?? 0) > 0 ? 'warn' : 'ok'" v-if="!isLoading">{{ s?.devolucionesPendientes ?? 0 }}</div>
                      <b-skeleton v-else :width="56" :height="30" animated />
                      <div class="mcell-desc">Esperando revisión</div>
                    </div>
                    <div class="mcell">
                      <div class="mcell-label">Ediciones (30d)</div>
                      <div class="mcell-val" v-if="!isLoading">{{ s?.edits30d ?? 0 }}</div>
                      <b-skeleton v-else :width="56" :height="30" animated />
                      <div class="mcell-desc">Modificaciones a pedidos</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-side">
              <div class="gcard">
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
                    <button class="rtile" @click="$router.push('/layouts/devoluciones')">
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

      </DynamicTabs>
    </section>

  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, onActivated, computed, toRef } from 'vue'
import DynamicTabs from '@/components/DynamicTabs.vue'
import { useDashboardStats } from '@/composables/useDashboardStats'
import { fetchDevolutions, updateDevolutionStatus } from '@/services/devolutions.js'
import { listEvents } from '@/services/laboratorio.js'
import { labToast } from '@/composables/useLabToast.js'
import {
  armazonesService, solucionesService,
  accesoriosService, estuchesService, equiposService,
} from '@/services/optica.js'

const props = defineProps({ user: Object, loading: Boolean })

const userRef = toRef(props, 'user')
const {
  stats, loading: statsLoading, load: loadStats,
  role, canSeeInventory, canSeeOrders, canSeeReports,
  canSeeLab, canSeeMovements, canManageUsers,
  canSeeDevolutions, canManageDevolutions,
  isRoot, isLab, isVentas, isSupervisor,
} = useDashboardStats(userRef)

const s         = computed(() => stats.value)
const isLoading = computed(() => props.loading || statsLoading.value)

// ── Tabs ──────────────────────────────────────────────────────────────────────
const dashTab = ref('resumen')
const DASH_TABS = computed(() => {
  const tabs = [
    { key: 'resumen',      label: 'Resumen',       icon: 'chart-pie' },
    { key: 'operaciones',  label: 'Operaciones',   icon: 'flask-vial' },
  ]
  if (canSeeDevolutions.value) tabs.push({ key: 'devoluciones', label: 'Devoluciones', icon: 'rotate-left', badge: s.value?.devolucionesPendientes || 0, badgeType: 'warning' })
  if (canSeeInventory.value)   tabs.push({ key: 'optica',       label: 'Optica',        icon: 'glasses' })
  if (isSupervisor.value || isRoot.value) tabs.push({ key: 'supervision', label: 'Supervision', icon: 'eye' })
  return tabs
})

// ── Optica stats ──────────────────────────────────────────────────────────────
const optica = reactive({ loading: false, armazones: [], soluciones: [], accesorios: [], estuches: [], equipos: [] })
const fmtMXN = n => Number(n||0).toLocaleString('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:0})

const opticaStats = computed(() => {
  const calc = (items) => ({
    total:   items.reduce((s,a)=>s+(a.stock||0),0),
    agotado: items.filter(a=>(a.stock||0)===0).length,
    bajo:    items.filter(a=>(a.stock||0)>0&&(a.stock||0)<=3).length,
    valor:   items.reduce((s,a)=>s+(a.precio||0)*(a.stock||0),0),
  })
  const arm = calc(optica.armazones)
  const sol = { ...calc(optica.soluciones), porVencer: optica.soluciones.filter(l=>{ if(!l.caducidad)return false; const df=(new Date(l.caducidad)-new Date())/86400000; return df>0&&df<=180; }).length }
  const acc = { ...calc(optica.accesorios), categorias: new Set(optica.accesorios.map(a=>a.categoria)).size }
  const est = { ...calc(optica.estuches), tipos: new Set(optica.estuches.map(e=>e.tipo)).size }
  const eqp = {
    operativo: optica.equipos.filter(e=>e.estado==='Operativo').length,
    mantto:    optica.equipos.filter(e=>e.estado==='Mantenimiento').length,
    fuera:     optica.equipos.filter(e=>e.estado==='Fuera de servicio').length,
    proxMantto:optica.equipos.filter(e=>{ if(!e.mantenimiento)return false; const df=(new Date(e.mantenimiento)-new Date())/86400000; return df>0&&df<=90; }).length,
    total:     optica.equipos.length,
  }
  return { arm, sol, acc, est, eqp }
})

async function loadOptica() {
  optica.loading = true
  try {
    const [a, sol, acc, est, eqp] = await Promise.all([
      armazonesService.list(), solucionesService.list(),
      accesoriosService.list(), estuchesService.list(), equiposService.list(),
    ])
    optica.armazones  = a?.data?.data   || []
    optica.soluciones = sol?.data?.data  || []
    optica.accesorios = acc?.data?.data  || []
    optica.estuches   = est?.data?.data  || []
    optica.equipos    = eqp?.data?.data  || []
  } catch { /* silently fail */ } finally { optica.loading = false }
}

onMounted(() => { loadStats(); loadPendingDevols(); loadCorrectionLogs(); if (canSeeInventory.value) loadOptica() })
onActivated(() => { loadStats(); loadPendingDevols(); loadCorrectionLogs(); if (canSeeInventory.value) loadOptica() })

// ── Avatar ────────────────────────────────────────────────────────────────────
const avatarLoaded = ref(false)
const avatarUrl    = ref('https://github.com/octocat.png')

function loadAvatar(url) {
  avatarLoaded.value = false
  avatarUrl.value = url
  const img = new Image()
  img.src = url
  img.onload  = () => { avatarLoaded.value = true }
  img.onerror = () => { avatarUrl.value = 'https://github.com/octocat.png'; avatarLoaded.value = true }
}

watch(() => props.user?.avatar, v => loadAvatar(v?.trim() ? v : 'https://github.com/octocat.png'), { immediate: true })
onActivated(() => loadAvatar(props.user?.avatar?.trim() ? props.user.avatar : 'https://github.com/octocat.png'))

// ── Entorno ───────────────────────────────────────────────────────────────────
const environmentLabel = computed(() => {
  const env = import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'local'
  if (/prod/i.test(env)) return 'Producción'
  if (/staging|pre/i.test(env)) return 'Pre-producción'
  if (/dev/i.test(env)) return 'Desarrollo'
  return 'Entorno local'
})
const appVersion = import.meta.env.VITE_APP_VERSION || 'v1.0.0'

// ── Saludo ────────────────────────────────────────────────────────────────────
const greeting   = computed(() => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches' })
const firstName  = computed(() => (props.user?.name || 'Usuario').split(' ')[0])
const userBio    = computed(() => props.user?.bio || roleDefaultBio.value)

const lastLoginLabel = computed(() => {
  if (!props.user?.lastLogin) return 'Primera sesión'
  return new Intl.DateTimeFormat('es-ES', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(props.user.lastLogin))
})

// ── Rol meta ──────────────────────────────────────────────────────────────────
const ROLE_META = {
  root:        { label:'Administrador del sistema',   icon:'fas fa-crown',         ring:'#dc2626', banner:'linear-gradient(90deg,#dc2626,#ea580c)', pill:{ background:'rgba(220,38,38,.15)',color:'#dc2626',border:'1px solid rgba(220,38,38,.3)' } },
  eurovision:  { label:'Encargado Eurovisión',        icon:'fas fa-star',           ring:'#906fe1', banner:'linear-gradient(90deg,#906fe1,#2563eb)', pill:{ background:'rgba(144,111,225,.15)',color:'#906fe1',border:'1px solid rgba(144,111,225,.3)' } },
  supervisor:  { label:'Supervisor de operaciones',   icon:'fas fa-eye',            ring:'#0891b2', banner:'linear-gradient(90deg,#0891b2,#0d9488)', pill:{ background:'rgba(8,145,178,.15)', color:'#0891b2',border:'1px solid rgba(8,145,178,.3)' } },
  ventas:      { label:'Personal de ventas',          icon:'fas fa-cart-shopping',  ring:'#16a34a', banner:'linear-gradient(90deg,#16a34a,#65a30d)', pill:{ background:'rgba(22,163,74,.15)', color:'#16a34a',border:'1px solid rgba(22,163,74,.3)' } },
  laboratorio: { label:'Técnico de laboratorio',      icon:'fas fa-microscope',     ring:'#0284c7', banner:'linear-gradient(90deg,#0284c7,#906fe1)', pill:{ background:'rgba(2,132,199,.15)', color:'#0284c7',border:'1px solid rgba(2,132,199,.3)' } },
}
const meta           = computed(() => ROLE_META[role.value] || ROLE_META.eurovision)
const roleLabel      = computed(() => meta.value.label)
const roleIconClass  = computed(() => meta.value.icon)
const roleRingColor  = computed(() => meta.value.ring)
const roleBannerStyle = computed(() => ({ background: meta.value.banner }))
const rolePillStyle  = computed(() => meta.value.pill)

const roleDefaultBio = computed(() => ({
  root:        'Control total del sistema Eurovisión. Gestiona usuarios, inventario, ventas y configuración global.',
  eurovision:  'Encargado general de la óptica. Supervisa inventario, pedidos, reportes y equipo de trabajo.',
  supervisor:  'Supervisa operaciones diarias. Monitorea pedidos, revisa devoluciones y analiza desempeño del equipo.',
  ventas:      'Atención al cliente y gestión de pedidos. Crea órdenes y da seguimiento a pedidos del laboratorio.',
  laboratorio: 'Técnico de laboratorio. Procesa pedidos, registra escaneos y gestiona correcciones.',
})[role.value] || 'Usuario del sistema Eurovisión.')

// ── Nivel de servicio ─────────────────────────────────────────────────────────
const serviceLevelStatus = computed(() => { const sl = s.value?.serviceLevel || 0; return sl >= 97 ? 'Excelente' : sl >= 90 ? 'Bueno' : sl >= 80 ? 'Aceptable' : 'A mejorar' })
const serviceLevelTagType = computed(() => { const sl = s.value?.serviceLevel || 0; return sl >= 97 ? 'is-success' : sl >= 90 ? 'is-info' : sl >= 80 ? 'is-warning' : 'is-danger' })
const serviceLevelClass  = computed(() => { const sl = s.value?.serviceLevel || 0; return sl >= 97 ? 'excellent' : sl >= 90 ? 'good' : sl >= 80 ? 'ok' : 'poor' })

// ── Computeds inventario ──────────────────────────────────────────────────────
const criticalAlerts   = computed(() => s.value?.criticalAlerts ?? 0)
const safeStockPercent = computed(() => {
  const total = s.value?.totalCombinations || 0, crit = s.value?.criticalAlerts || 0
  return !total ? 0 : Math.round(((total - crit) / total) * 100)
})
const lastSyncLabel = computed(() => {
  if (!s.value?.generatedAt) return 'Cargando...'
  const mins = Math.floor((Date.now() - new Date(s.value.generatedAt).getTime()) / 60000)
  return mins < 1 ? 'Hace un momento' : mins < 60 ? `Hace ${mins} min` : `Hace ${Math.floor(mins/60)}h`
})

function formatNumber(v) { return Number(v||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',') }

// ── Devoluciones pendientes + acciones inline ─────────────────────────────────
const pendingDevols  = ref([])
const loadingDevols  = ref(false)

async function loadPendingDevols() {
  if (!canManageDevolutions.value) return
  loadingDevols.value = true
  try {
    const { data } = await fetchDevolutions({ limit: 4, page: 1, status: 'pendiente' })
    if (data?.ok) pendingDevols.value = data.data
  } catch {} finally { loadingDevols.value = false }
}

async function quickDevAction(dev, newStatus) {
  try {
    await updateDevolutionStatus(dev._id, newStatus, '')
    pendingDevols.value = pendingDevols.value.filter(d => d._id !== dev._id)
    loadStats()
    labToast.success(`Devolución ${dev.folio} → ${newStatus === 'aprobada' ? 'Aprobada' : newStatus === 'rechazada' ? 'Rechazada' : 'En revisión'}`)
  } catch (e) {
    labToast.danger(e?.response?.data?.error || 'Error al actualizar devolución')
  }
}

const DEVOL_REASON_LABELS = {
  defecto_fabricacion:    'Defecto de fabricación',
  error_prescripcion:     'Error de prescripción',
  insatisfaccion_cliente: 'Insatisfacción',
  dano_transporte:        'Daño en transporte',
  lente_roto:             'Lente roto',
  pedido_incorrecto:      'Pedido incorrecto',
  garantia:               'Garantía',
  otro:                   'Otro',
}

// ── Logs de correcciones (supervisor / eurovision) ────────────────────────────
const correctionLogs  = ref([])
const loadingLogs     = ref(false)

async function loadCorrectionLogs() {
  if (!canManageDevolutions.value) return
  loadingLogs.value = true
  try {
    const { data } = await listEvents({ type: 'CORRECTION_REQUEST,ORDER_EDIT', limit: 8 })
    if (data?.ok) correctionLogs.value = data.data || []
  } catch {} finally { loadingLogs.value = false }
}

function fmtTimeAgo(d) {
  if (!d) return '—'
  const diff = Math.floor((Date.now() - new Date(d)) / 60000)
  if (diff < 1) return 'Ahora'
  if (diff < 60) return `Hace ${diff} min`
  if (diff < 1440) return `Hace ${Math.floor(diff/60)}h`
  return `Hace ${Math.floor(diff/1440)}d`
}

// ── KPIs ──────────────────────────────────────────────────────────────────────
const allKpis = computed(() => [
  // Inventario optico
  { key:'sheets',         icon:'table-cells-large',   accent:'purple', title:'Hojas activas',            caption:'Plantillas ópticas',                       formattedValue: s.value?.activeSheets ?? '—',             requiresInventory:true },
  { key:'combinaciones',  icon:'layer-group',          accent:'blue',   title:'Combinaciones ópticas',    caption:'Esférica, Cilíndrica, Adición',            formattedValue: formatNumber(s.value?.totalCombinations),  requiresInventory:true },
  { key:'stock',          icon:'boxes-stacked',        accent:'green',  title:'Existencias ópticas',      caption:'Piezas en almacén',                        formattedValue: formatNumber(s.value?.totalStock),         requiresInventory:true },
  { key:'alertas',        icon:'triangle-exclamation', accent:'orange', title:'Alertas críticas',         caption:'Stock nivel crítico',                       formattedValue: criticalAlerts.value, alert: criticalAlerts.value > 0, requiresInventory:true },
  // Lentes de contacto
  { key:'clSheets',       icon:'eye',                  accent:'cyan',   title:'Lentes de contacto',       caption:'Hojas activas',                            formattedValue: s.value?.clActiveSheets ?? '—',           requiresInventory:true },
  { key:'clStock',        icon:'boxes-stacked',        accent:'teal',   title:'Existencias contacto',     caption:'Piezas lentes de contacto',                formattedValue: formatNumber(s.value?.clTotalStock),       requiresInventory:true },
  { key:'clCoverage',     icon:'percent',              accent:'blue',   title:'Cobertura contacto',       caption:'Del catálogo de contacto',                 formattedValue: (s.value?.clCoveragePct ?? 0) + '%',       requiresInventory:true },
  // Pedidos y operaciones
  { key:'pendientes',     icon:'clipboard-list',       accent:'orange', title:'Pendientes',               caption:'Abiertos o parciales',                     formattedValue: s.value?.ordersPending ?? '—',            requiresOrders:true },
  { key:'cerrados30d',    icon:'circle-check',         accent:'green',  title:'Cerrados (30d)',            caption:'Últimos 30 días',                          formattedValue: s.value?.ordersClosed30d ?? '—',           requiresOrders:true },
  { key:'scansToday',     icon:'barcode',              accent:'cyan',   title:'Escaneos hoy',             caption:'Salidas por escáner',                      formattedValue: s.value?.scansToday ?? '—',               requiresLab:true },
  { key:'serviceLevel',   icon:'gauge-high',           accent:'purple', title:'Nivel de servicio',        caption:'Sin correcciones (30d)',                    formattedValue: (s.value?.serviceLevel ?? 0) + '%',        requiresReports:true },
  { key:'devPendientes',  icon:'rotate-left',          accent:'orange', title:'Devoluciones pendientes',  caption:'Esperando revisión',                       formattedValue: s.value?.devolucionesPendientes ?? '—',    requiresDevolutions:true, alert: (s.value?.devolucionesPendientes ?? 0) > 0 },
  { key:'devTotal30d',    icon:'arrow-rotate-left',    accent:'purple', title:'Devoluciones (30d)',        caption:'Este período',                             formattedValue: s.value?.devolucionesTotal30d ?? '—',      requiresDevolutions:true },
  { key:'corrections7d',  icon:'wrench',               accent:'red',    title:'Correcciones (7d)',         caption:'Solicitudes activas',                      formattedValue: s.value?.corrections7d ?? '—',            requiresLab:true },
  { key:'cerradoHoy',     icon:'check',                accent:'green',  title:'Cerrados hoy',             caption:'Completados hoy',                          formattedValue: s.value?.ordersClosedToday ?? '—',        requiresOrders:true },
])

const visibleKpis = computed(() => {
  const filtered = allKpis.value.filter(k => {
    if (k.requiresInventory   && !canSeeInventory.value)   return false
    if (k.requiresOrders      && !canSeeOrders.value)      return false
    if (k.requiresLab         && !canSeeLab.value)         return false
    if (k.requiresReports     && !canSeeReports.value)     return false
    if (k.requiresDevolutions && !canSeeDevolutions.value) return false
    return true
  })
  const max = canSeeInventory.value ? 8 : canSeeDevolutions.value ? 6 : 4
  return filtered.slice(0, max)
})
</script>

<!-- ── Glass design tokens (non-scoped) ── -->
<style>
:root {
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

<!-- ── Scoped styles ── -->
<style scoped>
/* ── Base ── */
.db-root {
  position: relative;
  min-height: 100%;
  background: var(--bg-base);
}

/* ── Hero ── */
.db-hero {
  position: relative;
  z-index: 1;
  margin: 1.25rem 1.25rem 0;
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

.hero-role-line { height: 4px; }

.hero-body {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  padding: 1.5rem 1.75rem;
  flex-wrap: wrap;
}

/* Avatar */
.avatar-shell {
  position: relative;
  width: 100px;
  height: 100px;
  flex-shrink: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--rc, var(--c-primary)), rgba(255,255,255,0.2));
  padding: 3px;
  box-shadow: 0 0 22px color-mix(in srgb, var(--rc, var(--c-primary)) 45%, transparent);
}
.avatar-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--g-border);
}
.avatar-img { width:100%; height:100%; object-fit:cover; border-radius:50%; display:block; }
.avatar-status-dot {
  position: absolute;
  bottom: 4px; right: 4px;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #10b981;
  border: 2.5px solid var(--g-hero);
  box-shadow: 0 0 8px rgba(16,185,129,.6);
}

/* Info */
.hero-left  { display:flex; align-items:flex-start; gap:1.1rem; flex:1; min-width:0; }
.hero-info  { flex:1; min-width:0; }

.badge-row { display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.4rem; }

.role-chip {
  display:inline-flex; align-items:center; gap:0.35rem;
  font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.07em;
  padding:0.22rem 0.6rem; border-radius:999px;
}
.env-chip {
  font-size:0.67rem; color:var(--text-muted);
  background:var(--bg-subtle); border:1px solid var(--glass-border);
  padding:0.15rem 0.5rem; border-radius:999px;
}

.hero-welcome-line {
  font-size:1rem;
  font-weight:600;
  color: var(--text-muted);
  margin: 0 0 0.15rem;
  letter-spacing: 0.01em;
}
.brand-gradient {
  background: linear-gradient(90deg, #7c3aed, #2563eb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 800;
}

.hero-name { font-size:1.5rem; font-weight:700; color:var(--text-primary); margin:0 0 0.3rem; line-height:1.2; }
.hero-bio  { font-size:0.78rem; color:var(--text-muted); margin:0 0 0.4rem; max-width:460px; line-height:1.55; }
.hero-meta { display:flex; flex-wrap:wrap; gap:0.65rem; }
.hm-item   { font-size:0.73rem; color:var(--text-muted); }
.hm-item i { margin-right:0.25rem; color:var(--c-primary); }
.hm-item b { color:var(--text-primary); }

/* Hero right */
.hero-right { display:flex; flex-direction:column; gap:0.85rem; flex-shrink:0; }

.profile-cta {
  display:flex; align-items:center; gap:0.7rem;
  padding:0.65rem 0.9rem;
  border-radius:0.9rem;
  background: var(--g-action);
  border:1px solid var(--g-border);
  cursor:pointer;
  color:var(--text-primary);
  transition: background 0.16s, transform 0.12s, box-shadow 0.16s;
  white-space: nowrap;
}
.profile-cta:hover { background:var(--g-hover); transform:translateY(-2px); box-shadow:0 4px 16px rgba(0,0,0,0.15); }
.pcta-avatar { width:38px; height:38px; border-radius:50%; object-fit:cover; border:1.5px solid var(--g-border); }
.pcta-name   { font-size:0.85rem; font-weight:600; color:var(--text-primary); }
.pcta-label  { font-size:0.67rem; color:var(--text-muted); }
.pcta-arrow  { color:var(--c-primary); font-size:0.75rem; margin-left:0.4rem; }

/* Hero quick stats */
.hero-quick-stats {
  display:flex; align-items:center; gap:0.6rem;
  background:var(--g-action); border:1px solid var(--g-border);
  border-radius:0.75rem; padding:0.55rem 0.9rem;
}
.hqs-item  { display:flex; flex-direction:column; align-items:center; }
.hqs-val   { font-size:1.15rem; font-weight:700; color:var(--text-primary); line-height:1; }
.hqs-label { font-size:0.62rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; margin-top:2px; }
.hqs-sep   { width:1px; height:30px; background:var(--g-border); }

/* ── KPI Grid ── */
.db-kpis {
  position: relative;
  z-index: 1;
  padding: 1rem 1.25rem 0;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px,1fr));
  gap: 0.85rem;
}

.kpi-glass {
  position: relative;
  overflow: hidden;
  padding: 1.1rem 1.15rem;
  border-radius: var(--radius-xl);
  background: var(--g-kpi);
  border: 1px solid var(--g-kpi-border);
  box-shadow: var(--g-shadow);
  transition: transform 0.15s, box-shadow 0.16s;
}
.kpi-glass:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

/* Subtle colored top line per accent */
.kpi-purple::before { content:''; position:absolute; top:0; left:0; right:0; height:2.5px; background:linear-gradient(90deg,var(--c-primary),#2563eb); }
.kpi-blue::before   { content:''; position:absolute; top:0; left:0; right:0; height:2.5px; background:linear-gradient(90deg,#3b82f6,#06b6d4); }
.kpi-green::before  { content:''; position:absolute; top:0; left:0; right:0; height:2.5px; background:linear-gradient(90deg,#10b981,#65a30d); }
.kpi-orange::before { content:''; position:absolute; top:0; left:0; right:0; height:2.5px; background:linear-gradient(90deg,#f59e0b,#ef4444); }
.kpi-cyan::before   { content:''; position:absolute; top:0; left:0; right:0; height:2.5px; background:linear-gradient(90deg,#06b6d4,#3b82f6); }
.kpi-teal::before   { content:''; position:absolute; top:0; left:0; right:0; height:2.5px; background:linear-gradient(90deg,#14b8a6,#06b6d4); }
.kpi-red::before    { content:''; position:absolute; top:0; left:0; right:0; height:2.5px; background:linear-gradient(90deg,#ef4444,#dc2626); }

.kpi-glow-dot {
  position:absolute; top:-20px; right:-20px;
  width:80px; height:80px; border-radius:50%;
  background:radial-gradient(circle, rgba(144,111,225,0.12), transparent 70%);
  pointer-events:none;
}
.kpi-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:0.6rem; }
.kpi-icon {
  width:36px; height:36px; border-radius:0.6rem;
  display:flex; align-items:center; justify-content:center; font-size:0.9rem;
}
.ki-purple { background:var(--c-primary-alpha); color:var(--c-primary); }
.ki-blue   { background:rgba(59,130,246,.15);  color:#3b82f6; }
.ki-green  { background:rgba(16,185,129,.15);  color:#10b981; }
.ki-orange { background:rgba(245,158,11,.15);  color:#f59e0b; }
.ki-cyan   { background:rgba(6,182,212,.15);   color:#06b6d4; }
.ki-teal   { background:rgba(20,184,166,.15);  color:#14b8a6; }
.ki-red    { background:rgba(239,68,68,.15);   color:#ef4444; }

.kpi-trend-badge { font-size:0.65rem; color:#f59e0b; }
.kpi-number {
  font-size:1.65rem; font-weight:800; line-height:1;
  background-clip:text; -webkit-background-clip:text; -webkit-text-fill-color:transparent;
}
.kn-purple { background-image:linear-gradient(135deg,var(--c-primary),#60a5fa); }
.kn-blue   { background-image:linear-gradient(135deg,#3b82f6,#06b6d4); }
.kn-green  { background-image:linear-gradient(135deg,#10b981,#65a30d); }
.kn-orange { background-image:linear-gradient(135deg,#f59e0b,#ef4444); }
.kn-cyan   { background-image:linear-gradient(135deg,#06b6d4,#3b82f6); }
.kn-teal   { background-image:linear-gradient(135deg,#14b8a6,#06b6d4); }
.kn-red    { background-image:linear-gradient(135deg,#ef4444,#dc2626); }

.kpi-label { font-size:0.7rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.07em; margin-top:0.1rem; }
.kpi-cap   { font-size:0.65rem; color:var(--text-muted); margin-top:0.05rem; }

/* ── Main grid ── */
.db-main {
  position: relative;
  z-index: 1;
  padding: 1.25rem;
}
.tab-two-col {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 1.25rem;
}
.tab-single-col {
  max-width: 960px;
}
.col-main, .col-side { display:flex; flex-direction:column; }
.optica-loading { max-width:960px; }

/* ── Glass card ── */
.gcard {
  background: var(--g-bg);
  border: 1px solid var(--g-border);
  border-radius: 18px;
  box-shadow: var(--g-shadow);
  overflow: hidden;
}
.gcard-devol        { border-color: rgba(245,158,11,0.2); }
.gcard-lab          { border-color: rgba(6,182,212,0.2); }
.gcard-corrections  { border-color: rgba(239,68,68,0.2); }

/* Card header */
.gc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem 0;
  gap: 0.75rem;
}
.gc-head-left { display:flex; align-items:center; gap:0.7rem; flex:1; min-width:0; }
.gc-badge-icon {
  width:38px; height:38px; border-radius:0.7rem;
  display:flex; align-items:center; justify-content:center; font-size:1rem; flex-shrink:0;
}
.accent-purple { background:var(--c-primary-alpha); color:var(--c-primary); }
.accent-blue   { background:rgba(59,130,246,.15);  color:#3b82f6; }
.accent-green  { background:rgba(16,185,129,.15);  color:#10b981; }
.accent-cyan   { background:rgba(6,182,212,.15);   color:#06b6d4; }
.accent-teal   { background:rgba(20,184,166,.15);  color:#14b8a6; }
.accent-orange { background:rgba(245,158,11,.15);  color:#f59e0b; }
.accent-red    { background:rgba(239,68,68,.15);   color:#ef4444; }

/* ── Devoluciones pendientes inline ── */
.devol-quick-header {
  display:flex; align-items:center; gap:0.5rem; justify-content:space-between;
  font-size:0.75rem; font-weight:600; color:var(--text-muted);
  text-transform:uppercase; letter-spacing:.04em;
  margin-top:0.75rem; padding-top:0.75rem; border-top:1px solid var(--border);
}
.devol-loading-dot {
  width:8px; height:8px; border-radius:50%;
  background:#f59e0b; animation:pulse-dot .9s ease-in-out infinite;
}
@keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.3} }

.devol-empty {
  font-size:0.78rem; color:var(--text-muted);
  padding:0.6rem 0; display:flex; align-items:center; gap:0.4rem;
}
.devol-row {
  display:flex; align-items:center; justify-content:space-between; gap:0.75rem;
  padding:0.45rem 0.5rem; border-radius:8px; margin-top:0.35rem;
  background:var(--bg-subtle); border:1px solid var(--border);
  transition:background .12s;
}
.devol-row:hover { background:var(--bg-muted); }
.devol-row-info  { display:flex; align-items:center; gap:0.6rem; flex:1; flex-wrap:wrap; min-width:0; }
.devol-folio  { font-size:0.78rem; font-weight:700; color:var(--text-primary); white-space:nowrap; }
.devol-cliente{ font-size:0.76rem; color:var(--text-secondary); }
.devol-reason { font-size:0.72rem; color:var(--text-muted); background:var(--bg-muted); border-radius:5px; padding:0 6px; }
.devol-time   { font-size:0.7rem; color:var(--text-muted); margin-left:auto; white-space:nowrap; }
.devol-row-actions { display:flex; gap:0.3rem; flex-shrink:0; }
.dqa-btn {
  width:28px; height:28px; border-radius:7px; border:1px solid transparent;
  cursor:pointer; font-size:.78rem; display:flex; align-items:center; justify-content:center;
  transition:opacity .12s, background .12s;
}
.dqa-btn:hover { opacity:.8; }
.dqa-review  { background:rgba(59,130,246,.12);  color:#3b82f6; border-color:rgba(59,130,246,.2); }
.dqa-approve { background:rgba(16,185,129,.12);  color:#10b981; border-color:rgba(16,185,129,.2); }
.dqa-reject  { background:rgba(239,68,68,.10);   color:#ef4444; border-color:rgba(239,68,68,.18); }

/* ── Badge count en cabecera ── */
.gc-badge-count {
  background:rgba(239,68,68,.12); color:#ef4444;
  border-radius:9px; padding:0.15rem 0.55rem;
  font-size:0.72rem; font-weight:700;
}

/* ── Correction log ── */
.corr-log-skeleton { display:flex; flex-direction:column; gap:0.5rem; padding:0.25rem 0; }
.corr-skel-row     { display:flex; align-items:center; gap:0.5rem; }
.corr-log-list     { display:flex; flex-direction:column; gap:0.4rem; }

.corr-row {
  display:flex; align-items:flex-start; gap:0.65rem;
  padding:0.5rem 0.6rem; border-radius:9px;
  background:var(--bg-subtle); border:1px solid var(--border);
  transition:background .12s;
}
.corr-row:hover { background:var(--bg-muted); }
.corr-type-dot {
  width:28px; height:28px; border-radius:7px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center; font-size:.75rem;
}
.dot-red    { background:rgba(239,68,68,.12);  color:#ef4444; }
.dot-orange { background:rgba(249,115,22,.12); color:#f97316; }

.corr-body       { flex:1; min-width:0; display:flex; flex-direction:column; gap:0.2rem; }
.corr-top-row    { display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; }
.corr-type-label { font-size:0.73rem; font-weight:700; color:var(--text-primary); }
.corr-folio      { font-size:0.73rem; color:var(--text-muted); background:var(--bg-muted); border-radius:5px; padding:0 5px; }
.corr-actor      { font-size:0.72rem; color:var(--text-muted); }
.corr-time       { font-size:0.7rem; color:var(--text-muted); margin-left:auto; white-space:nowrap; }
.corr-msg        { font-size:0.76rem; color:var(--text-secondary); line-height:1.4; }
.corr-codebar    { display:flex; align-items:center; gap:0.3rem; font-size:0.72rem; color:var(--text-muted); }

.gc-title { font-size:0.92rem; font-weight:600; color:var(--text-primary); }
.gc-sub   { font-size:0.72rem; color:var(--text-muted); }

.gc-status-pill {
  display:inline-flex; align-items:center; gap:0.3rem;
  font-size:0.7rem; font-weight:600;
  padding:0.22rem 0.65rem; border-radius:999px; white-space:nowrap; flex-shrink:0;
}
.sp-ok   { background:rgba(16,185,129,.12); color:#10b981; border:1px solid rgba(16,185,129,.25); }
.sp-warn { background:rgba(245,158,11,.12); color:#d97706; border:1px solid rgba(245,158,11,.25); }

.gc-action-btn {
  display:flex; align-items:center; gap:0.35rem;
  font-size:0.75rem; font-weight:600; color:var(--c-primary);
  background:var(--c-primary-alpha); border:1px solid rgba(144,111,225,.25);
  padding:0.3rem 0.7rem; border-radius:999px; cursor:pointer;
  transition:background 0.14s;
}
.gc-action-btn:hover { background:rgba(144,111,225,.22); }

.gc-body { padding:0.9rem 1.25rem 1.1rem; }

.gc-footer {
  display:flex; flex-wrap:wrap; gap:0.65rem;
  font-size:0.71rem; color:var(--text-muted);
  padding-top:0.7rem; margin-top:0.75rem;
  border-top:1px solid var(--g-border);
}
.gf-item i { margin-right:0.2rem; }
.gf-item b { color:var(--text-primary); }

/* ── Triband (inventario) ── */
.triband {
  display:grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  align-items:start; gap:0.5rem;
}
.triband-sep { width:1px; background:var(--g-border); align-self:stretch; margin-top:0.25rem; }
.tb-label { font-size:0.68rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; font-weight:600; margin-bottom:0.25rem; }
.tb-val   { display:flex; align-items:baseline; gap:0.15rem; margin-bottom:0.25rem; }
.tb-number { font-size:1.75rem; font-weight:800; background-clip:text; -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
.gradient-purple { background-image:linear-gradient(135deg,var(--c-primary),#60a5fa); }
.gradient-blue   { background-image:linear-gradient(135deg,#3b82f6,#06b6d4); }
.gradient-red    { background-image:linear-gradient(135deg,#ef4444,#f59e0b); }
.tb-unit { font-size:0.9rem; color:var(--text-muted); }
.tb-prog { margin-top:0 !important; }

/* ── Cell grid ── */
.cell-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 0.65rem;
}
.mcell {
  background: var(--g-action);
  border:1px solid var(--g-border);
  border-radius:0.75rem; padding:0.65rem 0.75rem;
  transition: background 0.14s;
}
.mcell:hover { background:var(--g-hover); }
.mcell-orange { border-color: rgba(245,158,11,0.25); }
.mcell-label { font-size:0.65rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); font-weight:600; }
.mcell-val   { font-size:1.35rem; font-weight:700; color:var(--text-primary); margin:0.1rem 0; }
.mcell-val.warn   { color:#f59e0b; }
.mcell-val.ok     { color:#10b981; }
.mcell-val.accent { color:var(--c-primary); }
.mcell-val.danger { color:#ef4444; }
.mcell-desc { font-size:0.65rem; color:var(--text-muted); }

/* ── Pipeline (lab) ── */
.pipeline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.5rem 0;
}
.pipe-step { display:flex; flex-direction:column; align-items:center; gap:0.3rem; flex:1; min-width:80px; }
.pipe-icon {
  width:52px; height:52px; border-radius:50%;
  display:flex; align-items:center; justify-content:center; font-size:1.15rem;
}
.p-pending { background:rgba(245,158,11,.15); color:#f59e0b; border:1.5px solid rgba(245,158,11,.3); box-shadow:0 0 12px rgba(245,158,11,.2); }
.p-scan    { background:rgba(6,182,212,.15);  color:#06b6d4; border:1.5px solid rgba(6,182,212,.3);  box-shadow:0 0 12px rgba(6,182,212,.2); }
.p-done    { background:rgba(16,185,129,.15); color:#10b981; border:1.5px solid rgba(16,185,129,.3); box-shadow:0 0 12px rgba(16,185,129,.2); }
.p-ret     { background:var(--c-primary-alpha); color:var(--c-primary); border:1.5px solid rgba(144,111,225,.3); box-shadow:0 0 12px rgba(144,111,225,.2); }
.pipe-label { font-size:0.68rem; color:var(--text-muted); text-align:center; }
.pipe-val   { font-size:1.55rem; font-weight:700; color:var(--text-primary); }
.pipe-arrow { color:var(--text-muted); font-size:0.75rem; }

/* ── Service level ── */
.sl-wrap  { display:flex; align-items:center; gap:1rem; }
.sl-ring  {
  width:88px; height:88px; border-radius:50%;
  border:3px solid; display:flex; flex-direction:column;
  align-items:center; justify-content:center; flex-shrink:0;
}
.sl-excellent { border-color:#10b981; box-shadow:0 0 18px rgba(16,185,129,.35); }
.sl-good      { border-color:#06b6d4; box-shadow:0 0 18px rgba(6,182,212,.35); }
.sl-ok        { border-color:#f59e0b; box-shadow:0 0 18px rgba(245,158,11,.35); }
.sl-poor      { border-color:#ef4444; box-shadow:0 0 18px rgba(239,68,68,.35); }
.sl-pct  { font-size:1.25rem; font-weight:700; color:var(--text-primary); line-height:1; }
.sl-tag  { font-size:0.58rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); }
.sl-rows { flex:1; }
.sl-row  { display:flex; justify-content:space-between; font-size:0.75rem; padding:0.22rem 0; border-bottom:1px solid var(--g-border); }
.sl-row:last-child { border:none; }
.sl-row span { color:var(--text-muted); }
.sl-row b    { color:var(--text-primary); }

/* ── Action tiles ── */
.action-tiles { display:grid; grid-template-columns:repeat(3,1fr); gap:0.55rem; }
.atile {
  display:flex; flex-direction:column; align-items:center; gap:0.35rem;
  padding:0.75rem 0.4rem; border-radius:0.8rem;
  background:var(--g-action); border:1px solid var(--g-border);
  color:var(--text-primary); font-size:0.68rem; font-weight:500; cursor:pointer;
  transition:background 0.14s, transform 0.12s, box-shadow 0.14s;
}
.atile:hover { background:var(--g-hover); transform:translateY(-2px); box-shadow:0 4px 16px rgba(0,0,0,0.12); }
.atile i { font-size:1.05rem; color:var(--c-primary); }

/* ── System rows ── */
.sysrows { display:flex; flex-direction:column; }
.sysrow  { display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; padding:0.3rem 0; border-bottom:1px solid var(--g-border); }
.sysrow:last-child { border:none; }
.sysrow span { color:var(--text-muted); }
.sysrow b    { color:var(--text-primary); font-weight:600; }
.sysrow .text-warn { color:#f59e0b; }
.sys-tag { font-size:0.65rem; background:var(--c-primary-alpha); color:var(--c-primary); padding:0.15rem 0.45rem; border-radius:999px; font-weight:600; }
.online-dot { display:inline-block; width:7px; height:7px; border-radius:50%; background:#10b981; box-shadow:0 0 7px rgba(16,185,129,.6); }

/* ── Report tiles ── */
.report-tiles { display:flex; flex-direction:column; gap:0.5rem; }
.rtile {
  display:flex; align-items:center; gap:0.65rem;
  padding:0.65rem 0.8rem; border-radius:0.7rem;
  background:var(--g-action); border:1px solid var(--g-border);
  cursor:pointer; color:var(--text-primary); text-align:left;
  transition:background 0.14s, transform 0.12s;
}
.rtile:hover { background:var(--g-hover); transform:translateX(2px); }
.rtile > i:first-child { font-size:1rem; color:var(--c-primary); flex-shrink:0; }
.rtile-title { font-size:0.8rem; font-weight:600; color:var(--text-primary); }
.rtile-desc  { font-size:0.68rem; color:var(--text-muted); }
.rtile-arrow { color:var(--text-muted); font-size:0.75rem; margin-left:auto; }

/* ── Responsive ── */
@media (max-width:1100px) {
  .tab-two-col { grid-template-columns:1fr; }
  .col-side { flex-direction:row; flex-wrap:wrap; gap:1rem; }
  .col-side > * { flex:1 1 calc(50% - 0.5rem); min-width:240px; }
}
@media (max-width:768px) {
  .db-hero { margin:0.75rem 0.75rem 0; }
  .hero-body { padding:1rem 1.1rem; gap:1rem; }
  .db-kpis { padding:0.75rem 0.75rem 0; }
  .kpi-grid { grid-template-columns:repeat(2,1fr); }
  .db-main { padding:0.75rem; gap:0.75rem; }
  .hero-right { width:100%; }
  .hero-quick-stats { justify-content:space-around; }
  .triband { grid-template-columns:1fr; }
  .triband-sep { display:none; }
  .col-side { flex-direction:column; }
  .col-side > * { flex:none; min-width:0; }
}
</style>
