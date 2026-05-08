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

        <!-- Overlay de carga inicial / Estado vacío -->
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
  const tabs = [
    { key: 'resumen',      label: 'Resumen',       icon: 'chart-pie' },
  ]
  if (canSeeMovements.value) tabs.push({ key: 'movimientos', label: 'Movimientos', icon: 'arrow-trend-up' })
  if (isVentas.value || isEurovision.value) tabs.push({ key: 'mi-desempeno', label: 'Mi Desempeño', icon: 'user-chart' })
  if (isLaboratorio.value) tabs.push({ key: 'mi-actividad', label: 'Mi Actividad', icon: 'microscope' })
  tabs.push({ key: 'operaciones',  label: 'Operaciones',   icon: 'flask-vial' })
  if (canSeeDevolutions.value) tabs.push({ key: 'devoluciones', label: 'Devoluciones', icon: 'rotate-left', badge: (s.value?.devolucionesPendientes || 0) + (s.value?.devolucionesEnRevision || 0), badgeType: 'warning' })
  if (canSeeInventory.value)   tabs.push({ key: 'optica',       label: 'Optica',        icon: 'glasses' })
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
  } catch { /* silently fail */ } finally { optica.loading = false }
}

// ── Real-time Refresh (WS) ───────────────────────────────────────────────────
let _wsRefreshTimer = null
function debouncedRefresh() {
  clearTimeout(_wsRefreshTimer)
  _wsRefreshTimer = setTimeout(() => loadStats(true), 2000)
}

function onLabWs(e) {
  const type = e?.detail?.type
  const relevantTypes = [
    'LAB_ORDER_CREATE', 'LAB_ORDER_CANCEL', 'LAB_ORDER_SCAN', 
    'LAB_ORDER_RESET', 'LAB_ORDER_CLOSE', 'STOCK_ALERT', 
    'INVENTORY_CHUNK_SAVED'
  ]
  if (relevantTypes.includes(type)) {
    debouncedRefresh()
  }
  if (type === 'INV_CHANGE') {
    loadOpticaStats(true)
  }
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
// ── Rol meta ──────────────────────────────────────────────────────────────────
const ROLE_META = {
  root:        { label:'Administrador del sistema',   icon:'fas fa-crown',         ring:'#dc2626', banner:'linear-gradient(90deg, #dc2626, #ea580c)', pill:{ background:'rgba(220,38,38,.15)',color:'#dc2626',border:'1px solid rgba(220,38,38,.3)' } },
  eurovision:  { label:'Encargado Eurovisión',        icon:'fas fa-star',           ring:'#906fe1', banner:'linear-gradient(90deg, #906fe1, #2563eb)', pill:{ background:'rgba(144,111,225,.15)',color:'#906fe1',border:'1px solid rgba(144,111,225,.3)' } },
  supervisor:  { label:'Supervisor de operaciones',   icon:'fas fa-eye',            ring:'#0891b2', banner:'linear-gradient(90deg, #0891b2, #0d9488)', pill:{ background:'rgba(8,145,178,.15)', color:'#0891b2',border:'1px solid rgba(8,145,178,.3)' } },
  ventas:      { label:'Personal de ventas',          icon:'fas fa-cart-shopping',  ring:'#16a34a', banner:'linear-gradient(90deg, #16a34a, #65a30d)', pill:{ background:'rgba(22,163,74,.15)', color:'#16a34a',border:'1px solid rgba(22,163,74,.3)' } },
  laboratorio: { label:'Técnico de laboratorio',      icon:'fas fa-microscope',     ring:'#0284c7', banner:'linear-gradient(90deg, #0284c7, #906fe1)', pill:{ background:'rgba(2,132,199,.15)', color:'#0284c7',border:'1px solid rgba(2,132,199,.3)' } },
}
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

// ── Devoluciones pendientes + acciones inline ─────────────────────────────────
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
  { key:'sheets',         icon:'table-cells-large',   accent:'purple', title:'Catálogos de lentes',      caption:'Plantillas activas (bases y micas)',        formattedValue: s.value?.activeSheets ?? '—',             requiresInventory:true },
  { key:'combinaciones',  icon:'layer-group',          accent:'blue',   title:'Graduaciones disponibles', caption:'Esférica, Cilíndrica, Adición',            formattedValue: formatNumber(s.value?.totalCombinations),  requiresInventory:true },
  { key:'stock',          icon:'boxes-stacked',        accent:'green',  title:'Lentes en almacén',        caption:'Bases y micas (stock total)',              formattedValue: formatNumber(s.value?.totalStock),         requiresInventory:true },
  { key:'alertas',        icon:'triangle-exclamation', accent:'orange', title:'⚠ Stock bajo en lentes',   caption:'Graduaciones con 0-2 unidades',            formattedValue: criticalAlertsOptic.value, alert: criticalAlertsOptic.value > 0, requiresInventory:true },
  // Tienda (Optica)
  { key:'optProd',        icon:'store',                accent:'cyan',   title:'Productos en tienda',      caption:'Armazones, soluciones, accesorios, etc.',  formattedValue: os.value?.totalProductos ?? '—',           requiresInventory:true },
  { key:'optStock',       icon:'boxes-packing',        accent:'teal',   title:'Piezas totales tienda',    caption:'Stock acumulado de todos los productos',   formattedValue: formatNumber(os.value?.totalPiezas),       requiresInventory:true },
  { key:'optAgotados',    icon:'box-open',             accent:'red',    title:'Agotados en tienda',       caption:'Productos con 0 unidades',                 formattedValue: os.value?.totalAgotados ?? '—',            alert: (os.value?.totalAgotados ?? 0) > 0, requiresInventory:true },
  { key:'optValor',       icon:'coins',                accent:'green',  title:'Valor inventario tienda',  caption:'Valor estimado total en MXN',              formattedValue: os.value ? `$${formatNumber(os.value.valorTotalTienda)}` : '—', requiresInventory:true },
  // Lentes de contacto
  { key:'clSheets',       icon:'eye',                  accent:'cyan',   title:'Catálogos de contacto',    caption:'Plantillas activas lentes de contacto',    formattedValue: s.value?.clActiveSheets ?? '—',           requiresInventory:true },
  { key:'clStock',        icon:'boxes-stacked',        accent:'teal',   title:'Existencias contacto',     caption:'Piezas lentes de contacto',                formattedValue: formatNumber(s.value?.clTotalStock),       requiresInventory:true },
  { key:'clAlertas',      icon:'triangle-exclamation', accent:'orange', title:'⚠ Stock bajo en contacto', caption:'Graduaciones con 0-2 unidades',            formattedValue: criticalAlertsCL.value, alert: criticalAlertsCL.value > 0, requiresInventory:true },
  { key:'clCoverage',     icon:'percent',              accent:'blue',   title:'Cobertura contacto',       caption: `De ${formatNumber(s.value?.clTotalPossible || 0)} graduaciones del catálogo`, formattedValue: (s.value?.clCoveragePct ?? 0) + '%',       requiresInventory:true },
  // Pedidos y operaciones
  { key:'pendientes',     icon:'clipboard-list',       accent:'orange', title:'Pendientes',               caption:'Abiertos o parciales',                     formattedValue: s.value?.ordersPending ?? '—',            requiresOrders:true },
  { key:'cerrados30d',    icon:'circle-check',         accent:'green',  title:'Cerrados (30d)',            caption:'Últimos 30 días',                          formattedValue: s.value?.ordersClosed30d ?? '—',           requiresOrders:true },
  { key:'scansToday',     icon:'barcode',              accent:'cyan',   title:'Escaneos hoy',             caption:'Salidas por escáner',                      formattedValue: s.value?.scansToday ?? '—',               requiresLab:true },
  { key:'serviceLevel',   icon:'gauge-high',           accent:'purple', title:'Nivel de servicio',        caption: `Basado en ${formatNumber(s.value?.ordersClosed30d || 0)} pedidos sin errores`,                    formattedValue: (s.value?.serviceLevel ?? 0) + '%',        requiresReports:true },
  { key:'devPendientes',  icon:'rotate-left',          accent:'orange', title:'Devoluciones pendientes',  caption:'Esperando revisión',                       formattedValue: (s.value?.devolucionesPendientes ?? 0) + (s.value?.devolucionesEnRevision ?? 0),    requiresDevolutions:true, alert: ((s.value?.devolucionesPendientes ?? 0) + (s.value?.devolucionesEnRevision ?? 0)) > 0 },
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

<style scoped>
/* Estilos específicos si son necesarios */
</style>
