<template>
  <div class="db-root">
    <!-- ══ HERO HEADER ══ -->
    <DashboardHero 
      :user="user" 
      :role="role"
      :roleLabel="roleLabel"
      :roleIconClass="roleIconClass"
      :roleBannerStyle="roleBannerStyle"
      :rolePillStyle="rolePillStyle"
      :environmentLabel="environmentLabel"
      :isLoading="isLoading"
      :stats="s"
      :canSeeInventory="canSeeInventory"
      :canSeeOrders="canSeeOrders"
      :canSeeDevolutions="canSeeDevolutions"
    />

    <!-- ══ KPI STRIP ══ -->
    <DashboardKpiGrid 
      :visibleKpis="visibleKpis"
      :isLoading="isLoading"
    />

    <section class="db-main">
      <div class="db-tabs-wrapper">
        <DynamicTabs v-model="dashTab" :tabs="DASH_TABS">
          <template #resumen>
            <DashboardTabResumen
              :canSeeInventory="canSeeInventory"
              :criticalAlertsOptic="criticalAlertsOptic"
              :criticalAlertsCL="criticalAlertsCL"
              :isLoading="isLoading"
              :s="s"
              :safeStockPercent="safeStockPercent"
              :lastSyncLabel="lastSyncLabel"
              :formatNumber="formatNumber"
              :isVentas="isVentas"
              :canSeeReports="canSeeReports"
              :serviceLevelClass="serviceLevelClass"
              :serviceLevelStatus="serviceLevelStatus"
              :serviceLevelTagType="serviceLevelTagType"
              :isSupervisor="isSupervisor"
            />
          </template>
          <template #movimientos>
            <DashboardTabMovimientos />
          </template>
          <template #mi-desempeno>
            <TabVentasMyPerformance :isHighRole="isSupervisor || isRoot" :canSeeRevenue="isSupervisor || isRoot" />
          </template>
          <template #mi-actividad>
            <TabLabMyActivity />
          </template>
          <template #operaciones>
            <DashboardTabOperaciones
              :canSeeOrders="canSeeOrders"
              :isLoading="isLoading"
              :s="s"
              :canSeeLab="canSeeLab"
              :isLab="isLab"
            />
          </template>
          <template #devoluciones>
            <DashboardTabDevoluciones
              :canManageDevolutions="canManageDevolutions"
              :isLoading="isLoading"
              :s="s"
              :loadingDevols="loadingDevols"
              :pendingDevols="pendingDevols"
              :DEVOL_REASON_LABELS="DEVOL_REASON_LABELS"
              :fmtTimeAgo="fmtTimeAgo"
              :quickDevAction="quickDevAction"
              :loadingLogs="loadingLogs"
              :correctionLogs="correctionLogs"
            />
          </template>
          <template #optica>
            <DashboardTabOptica
              :optica="optica"
              :stats="opticaStats"
              :isLoading="optica.loading"
            />
          </template>
          <template #supervision>
            <DashboardTabSupervision
              :isLoading="isLoading"
              :s="s"
            />
          </template>
        </DynamicTabs>

        <!-- Overlay de carga inicial -->
        <transition name="fade" mode="out-in">
          <div v-if="isLoading && !s" key="loading" class="db-tab-loading-overlay">
            <div class="db-loader-spinner"></div>
            <p>Sincronizando tablero...</p>
          </div>

          <div v-else-if="!isLoading && !s" key="empty" class="db-empty-state">
            <div class="empty py-6">
              <div class="empty__icon"><i class="fas fa-database"></i></div>
              <div class="empty__title">Sin datos disponibles</div>
              <div class="empty__text">No se pudo recuperar la información del tablero. Intenta recargar la página.</div>
              <button class="button is-primary is-light mt-4" @click="loadStats(true)">
                <i class="fas fa-sync-alt mr-2"></i> Reintentar
              </button>
            </div>
          </div>
        </transition>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, toRef, reactive, onUnmounted, watch } from 'vue'
import DynamicTabs from '@/components/DynamicTabs.vue'
import DashboardHero from '@/components/dashboard/DashboardHero.vue'
import DashboardTabOptica from '@/components/dashboard/DashboardTabOptica.vue'
import DashboardKpiGrid from '@/components/dashboard/DashboardKpiGrid.vue'
import DashboardTabResumen from '@/components/dashboard/DashboardTabResumen.vue'
import DashboardTabMovimientos from '@/components/dashboard/DashboardTabMovimientos.vue'
import DashboardTabOperaciones from '@/components/dashboard/DashboardTabOperaciones.vue'
import DashboardTabDevoluciones from '@/components/dashboard/DashboardTabDevoluciones.vue'
import DashboardTabSupervision from '@/components/dashboard/DashboardTabSupervision.vue'
import TabVentasMyPerformance from '@/components/dashboard/role-tabs/TabVentasMyPerformance.vue'
import TabLabMyActivity from '@/components/dashboard/role-tabs/TabLabMyActivity.vue'

import { useDashboardStats } from '@/composables/api/useDashboardStats'
import { armazonesService, solucionesService, accesoriosService, estuchesService, equiposService } from '@/services/optica'
import { fetchDevolutions, updateDevolutionStatus } from '@/services/devolutions'
import { listEvents } from '@/services/laboratorio'
import { useLabToast } from '@/composables/shared/useLabToast'
import { useOpticaStats } from '@/composables/api/useOpticaStats'

import { DASHBOARD_CONFIG, ROLE_META, DEVOL_REASON_LABELS, KPI_TEMPLATES } from '@/data/dashboard.data'
import './DashboardHome.css'

const labToast = useLabToast()
const props = defineProps({ user: Object, loading: Boolean })
const userRef = toRef(props, 'user')

const {
  stats, loading: statsLoading, load: loadStats,
  role, canSeeInventory, canSeeOrders, canSeeReports,
  canSeeLab, canSeeMovements,
  canSeeDevolutions, canManageDevolutions,
  isRoot, isLab, isVentas, isSupervisor,
} = useDashboardStats(userRef)

const {
  opticaSummary, loading: opticaStatsLoading, load: loadOpticaStats
} = useOpticaStats()

const isEurovision = computed(() => role.value === 'eurovision')
const isLaboratorio = computed(() => role.value === 'laboratorio')

const s         = computed(() => stats.value)
const os        = computed(() => opticaSummary.value)
const isLoading = computed(() => props.loading || statsLoading.value || opticaStatsLoading.value)

// ── Tabs ──────────────────────────────────────────────────────────────────────
const dashTab = ref('resumen')
const DASH_TABS = computed(() => {
  const tabs = [{ key: 'resumen', label: 'Resumen', icon: 'chart-pie' }]
  if (canSeeMovements.value) tabs.push({ key: 'movimientos', label: 'Movimientos', icon: 'arrow-trend-up' })
  if (isVentas.value || isEurovision.value) tabs.push({ key: 'mi-desempeno', label: 'Mi Desempeño', icon: 'user-chart' })
  if (isLaboratorio.value) tabs.push({ key: 'mi-actividad', label: 'Mi Actividad', icon: 'microscope' })
  tabs.push({ key: 'operaciones', label: 'Operaciones', icon: 'flask-vial' })
  if (canSeeDevolutions.value) {
    const badge = (s.value?.devolucionesPendientes || 0) + (s.value?.devolucionesEnRevision || 0)
    tabs.push({ key: 'devoluciones', label: 'Devoluciones', icon: 'rotate-left', badge, badgeType: 'warning' })
  }
  if (canSeeInventory.value) tabs.push({ key: 'optica', label: 'Optica', icon: 'glasses' })
  if (isSupervisor.value || isRoot.value) tabs.push({ key: 'supervision', label: 'Supervision', icon: 'eye' })
  return tabs
})

// ── Optica stats ──────────────────────────────────────────────────────────────
const optica = reactive({ loading: false, armazones: [], soluciones: [], accesorios: [], estuches: [], equipos: [] })

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
  } catch { /* fail */ } finally { optica.loading = false }
}

// ── Real-time Refresh ────────────────────────────────────────────────────────
let _wsRefreshTimer = null
function debouncedRefresh() {
  clearTimeout(_wsRefreshTimer)
  _wsRefreshTimer = setTimeout(() => loadStats(true), DASHBOARD_CONFIG.REFRESH_INTERVAL_MS)
}

function onLabWs(e) {
  const type = e?.detail?.type
  const relevantTypes = ['LAB_ORDER_CREATE', 'LAB_ORDER_CANCEL', 'LAB_ORDER_SCAN', 'LAB_ORDER_RESET', 'LAB_ORDER_CLOSE', 'STOCK_ALERT', 'INVENTORY_CHUNK_SAVED']
  if (relevantTypes.includes(type)) debouncedRefresh()
  if (type === 'INV_CHANGE') loadOpticaStats(true)
}

// ── Carga de datos ───────────────────────────────────────────────────────────
watch(canSeeInventory, (can) => {
  if (can) {
    loadOpticaStats()
    loadOptica()
  }
}, { immediate: true })

onMounted(() => { 
  loadStats(); 
  loadPendingDevols(); 
  loadCorrectionLogs(); 
  window.addEventListener('lab:ws', onLabWs);
})

onActivated(() => { 
  loadStats(); 
  loadPendingDevols(); 
  loadCorrectionLogs(); 
  if (canSeeInventory.value) {
    loadOpticaStats();
    loadOptica();
  }
})

onUnmounted(() => {
  window.removeEventListener('lab:ws', onLabWs)
  clearTimeout(_wsRefreshTimer)
})

// ── Entorno ───────────────────────────────────────────────────────────────────
const environmentLabel = computed(() => {
  const env = import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'local'
  if (/prod/i.test(env)) return 'Producción'
  if (/staging|pre/i.test(env)) return 'Pre-producción'
  if (/dev/i.test(env)) return 'Desarrollo'
  return 'Entorno local'
})

// ── Consolidated Stats ──
const consolidatedSales = computed(() => ({
  mes:    (s.value?.ventasMontoMes || 0)    + (os.value?.ventasMontoMes || 0),
  semana: (s.value?.ventasMontoSemana || 0) + (os.value?.ventasMontoSemana || 0),
  hoy:    (s.value?.ventasMontoHoy || 0)    + (os.value?.ventasMontoHoy || 0),
}))

// ── Rol meta ──────────────────────────────────────────────────────────────────
const meta           = computed(() => ROLE_META[role.value] || ROLE_META.eurovision)
const roleLabel      = computed(() => meta.value.label)
const roleIconClass  = computed(() => meta.value.icon)
const roleBannerStyle = computed(() => ({ background: meta.value.banner }))
const rolePillStyle  = computed(() => meta.value.pill)

// ── Nivel de servicio ─────────────────────────────────────────────────────────
const serviceLevelStatus = computed(() => { 
  const sl = s.value?.serviceLevel || 0; 
  return sl >= 97 ? 'Excelente' : sl >= 90 ? 'Bueno' : sl >= 80 ? 'Aceptable' : 'A mejorar' 
})
const serviceLevelTagType = computed(() => { 
  const sl = s.value?.serviceLevel || 0; 
  return sl >= 97 ? 'is-success' : sl >= 90 ? 'is-info' : sl >= 80 ? 'is-warning' : 'is-danger' 
})
const serviceLevelClass  = computed(() => { 
  const sl = s.value?.serviceLevel || 0; 
  return sl >= 97 ? 'excellent' : sl >= 90 ? 'good' : sl >= 80 ? 'ok' : 'poor' 
})

// ── Computeds inventario ──────────────────────────────────────────────────────
const criticalAlertsOptic   = computed(() => s.value?.criticalAlertsOptic ?? 0)
const criticalAlertsCL      = computed(() => s.value?.criticalAlertsCL ?? 0)
const safeStockPercent = computed(() => {
  const total = s.value?.totalCombinations || 0, crit = s.value?.criticalAlertsOptic || 0
  return !total ? 0 : Math.round(((total - crit) / total) * 100)
})
const lastSyncLabel = computed(() => {
  if (!s.value?.generatedAt) return 'Cargando...'
  const mins = Math.floor((Date.now() - new Date(s.value.generatedAt).getTime()) / 60000)
  return mins < 1 ? 'Hace un momento' : mins < 60 ? `Hace ${mins} min` : `Hace ${Math.floor(mins/60)}h`
})

function formatNumber(v) { return Number(v||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',') }

// ── Devoluciones ─────────────────────────────────────────────────────────────
const pendingDevols  = ref([])
const loadingDevols  = ref(false)

async function loadPendingDevols() {
  if (!canManageDevolutions.value) return
  loadingDevols.value = true
  try {
    const { data } = await fetchDevolutions({ limit: 4, page: 1, status: 'pendiente,en_revision' })
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

// ── Logs ─────────────────────────────────────────────────────────────────────
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
const visibleKpis = computed(() => {
  const filtered = KPI_TEMPLATES.filter(k => {
    if (k.requiresInventory   && !canSeeInventory.value)   return false
    if (k.requiresOrders      && !canSeeOrders.value)      return false
    if (k.requiresLab         && !canSeeLab.value)         return false
    if (k.requiresReports     && !canSeeReports.value)     return false
    if (k.requiresDevolutions && !canSeeDevolutions.value) return false
    return true
  }).map(k => {
    let val = '—'
    let alert = false
    switch(k.key) {
      case 'sheets': val = s.value?.activeSheets; break
      case 'combinaciones': val = formatNumber(s.value?.totalCombinations); break
      case 'stock': val = formatNumber(s.value?.totalStock); break
      case 'alertas': val = criticalAlertsOptic.value; alert = criticalAlertsOptic.value > 0; break
      case 'optProd': val = os.value?.totalProductos; break
      case 'optStock': val = formatNumber(os.value?.totalPiezas); break
      case 'optAgotados': val = os.value?.totalAgotados; alert = (os.value?.totalAgotados ?? 0) > 0; break
      case 'optValor': val = os.value ? `$${formatNumber(os.value.valorTotalTienda)}` : '—'; break
      case 'clSheets': val = s.value?.clActiveSheets; break
      case 'clStock': val = formatNumber(s.value?.clTotalStock); break
      case 'clAlertas': val = criticalAlertsCL.value; alert = criticalAlertsCL.value > 0; break
      case 'clCoverage': val = (s.value?.clCoveragePct ?? 0) + '%'; break
      case 'pendientes': val = s.value?.ordersPending; break
      case 'cerrados30d': val = s.value?.ordersClosed30d; break
      case 'scansToday': val = s.value?.scansToday; break
      case 'serviceLevel': val = (s.value?.serviceLevel ?? 0) + '%'; break
      case 'devPendientes': val = (s.value?.devolucionesPendientes ?? 0) + (s.value?.devolucionesEnRevision ?? 0); alert = val > 0; break
      case 'devTotal30d': val = s.value?.devolucionesTotal30d; break
      case 'corrections7d': val = s.value?.corrections7d; break
      case 'cerradoHoy': val = s.value?.ordersClosedToday; break
      case 'ventasMes': val = `$${formatNumber(consolidatedSales.value.mes)}`; break
      case 'ventasHoy': val = `$${formatNumber(consolidatedSales.value.hoy)}`; break
    }
    return { ...k, formattedValue: val ?? '—', alert }
  })
  
  const max = DASHBOARD_CONFIG.MAX_VISIBLE_KPIS(canSeeInventory.value, canSeeDevolutions.value)
  return filtered.slice(0, max)
})
</script>
