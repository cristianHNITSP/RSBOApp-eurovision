<template>
  <div class="an-root">

    <!-- ══ HERO HEADER ══ -->
    <header class="an-hero">
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
    <AnaliticasKpiGrid :canSeeInventory="canSeeInventory" :canSeeOrders="canSeeOrders" :canSeeReports="canSeeReports"
      :canSeeDevolutions="canSeeDevolutions" :canSeeLab="canSeeLab" :isLoading="isLoading" :s="s" :fmtn="fmtn"
      :slColor="slColor" :serviceLevelStatus="serviceLevelStatus" />

    <!-- ══ MAIN GRID ══ -->
    <section class="an-main">
      <div class="an-tabs-wrapper">
        <DynamicTabs v-model="anTab" :tabs="AN_TABS">

          <!-- ═══════════════ TAB: INVENTARIO ════════════════════════════ -->
          <template #inventario>
            <AnaliticasTabInventario :canSeeMovements="canSeeMovements" :isLoading="isLoading" :s="s" :fmtn="fmtn"
              :entriesPct="entriesPct" :exitsPct="exitsPct" :rotationIndex="rotationIndex" :safeStockPct="safeStockPct" />
          </template>

          <!-- ═══════════════ TAB: TIENDA (OPTICA) ══════════════════════════ -->
          <template #tienda>
            <AnaliticasTabTienda :isLoading="opticaLoading" :os="os" :fmtn="fmtn" />
          </template>

          <!-- ═══════════════ TAB: PEDIDOS ═══════════════════════════════ -->
          <template #pedidos>
            <AnaliticasTabPedidos :isLoading="isLoading" :s="s" :canSeeLab="canSeeLab" :fmtn="fmtn" :isVentas="isVentas"
              :canSeeReports="canSeeReports" :serviceLevelClass="serviceLevelClass"
              :serviceLevelStatus="serviceLevelStatus" :correctionRate="correctionRate"
              :serviceLevelTagType="serviceLevelTagType" :serviceLevelComment="serviceLevelComment" :isRoot="isRoot"
              :rotationIndex="rotationIndex" :canExportReports="canExportReports" :canSeeInventory="canSeeInventory"
              :canSeeDevolutions="canSeeDevolutions" />
          </template>

          <!-- ═══════════════ TAB: DEVOLUCIONES ══════════════════════════ -->
          <template #devoluciones>
            <AnaliticasTabDevoluciones :isLoading="isLoading" :s="s" :devol7dPct="devol7dPct"
              :devolApprovalRate="devolApprovalRate" />
          </template>

          <!-- ═══════════════ TAB: LABORATORIO ═══════════════════════════ -->
          <template #laboratorio>
            <AnaliticasTabLaboratorio :isLoading="isLoading" :s="s" :correctionRate="correctionRate" />
          </template>

          <!-- ═══════════════ TAB: SUPERVISION ═══════════════════════════ -->
          <template #supervision>
            <AnaliticasTabSupervision :isLoading="isLoading" :s="s" />
          </template>
          <template #ventas>
            <div class="an-tab-single-col">
              <div class="gcard mb-5">
                <div class="gc-head">
                  <div class="gc-ico" style="background:var(--c-warning-alpha);color:var(--c-warning)"><i class="fas fa-dollar-sign"></i></div>
                  <div>
                    <div class="gc-title">Ventas Totales</div>
                    <div class="gc-sub">Métricas de ingresos (órdenes cerradas)</div>
                  </div>
                </div>
                <div class="gc-body">
                  <div class="an-stat-grid">
                    <div class="an-stat-cell">
                      <div class="asc-ico" style="background:var(--c-warning-alpha);color:var(--c-warning)"><i class="fas fa-sack-dollar"></i></div>
                      <div class="asc-val" style="color:var(--c-warning)" v-if="!isLoading">${{ (s?.ventasMontoMes || 0).toLocaleString() }}</div>
                      <b-skeleton v-else :width="50" :height="28" animated />
                      <div class="asc-lbl">Ventas (Mes)</div>
                      <div class="asc-cap">${{ (s?.ventasMontoSemana || 0).toLocaleString() }} esta semana</div>
                    </div>
                    <div class="an-stat-cell">
                      <div class="asc-ico" style="background:var(--c-success-alpha);color:var(--c-success)"><i class="fas fa-money-bill-trend-up"></i></div>
                      <div class="asc-val" style="color:var(--c-success)" v-if="!isLoading">${{ (s?.ventasMontoHoy || 0).toLocaleString() }}</div>
                      <b-skeleton v-else :width="50" :height="28" animated />
                      <div class="asc-lbl">Ventas Hoy</div>
                      <div class="asc-cap">Ingresos del día</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

        </DynamicTabs>

        <!-- Overlay de carga inicial / Estado vacío -->
        <transition name="fade" mode="out-in">
          <div v-if="isLoading && !s" key="loading" class="an-tab-loading-overlay">
            <div class="an-loader-spinner"></div>
            <p>Analizando datos...</p>
          </div>

          <div v-else-if="!isLoading && !s" key="empty" class="an-empty-state">
            <div class="empty py-6">
              <div class="empty__icon"><i class="fas fa-chart-line"></i></div>
              <div class="empty__title">Sin métricas disponibles</div>
              <div class="empty__text">No se encontraron datos para procesar las analíticas en este período.</div>
              <button class="button is-primary is-light mt-4" @click="loadStats(true)">
                <i class="fas fa-sync-alt mr-2"></i> Actualizar
              </button>
            </div>
          </div>
        </transition>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, toRef, onUnmounted } from 'vue'
import DynamicTabs from '@/components/DynamicTabs.vue'

import AnaliticasKpiGrid from '@/components/dashboard/AnaliticasKpiGrid.vue'
import AnaliticasTabInventario from '@/components/dashboard/AnaliticasTabInventario.vue'
import AnaliticasTabPedidos from '@/components/dashboard/AnaliticasTabPedidos.vue'
import AnaliticasTabDevoluciones from '@/components/dashboard/AnaliticasTabDevoluciones.vue'
import AnaliticasTabLaboratorio from '@/components/dashboard/AnaliticasTabLaboratorio.vue'
import AnaliticasTabSupervision from '@/components/dashboard/AnaliticasTabSupervision.vue'
import AnaliticasTabTienda from '@/components/dashboard/AnaliticasTabTienda.vue'

import { useDashboardStats } from '@/composables/api/useDashboardStats'
import { useOpticaStats } from '@/composables/api/useOpticaStats'

import './Analiticas.css'

const props = defineProps({
  loading: { type: Boolean, default: false },
  user: { type: Object, default: null },
})

const userRef = toRef(props, 'user')

// MOCK DATA PARA "DATA ESTÁTICA"
const stats = ref({
  periodLabel: 'Período Estático (Demo)',
  totalCombinations: 1250,
  totalStock: 8500,
  activeSheets: 24, // "Plantillas"
  ordersPending: 12,
  ordersClosed30d: 450,
  ordersClosedToday: 15,
  scansToday: 85,
  serviceLevel: 98.5,
  movementsTotal30d: 1200,
  entries30d: 800,
  exits30d: 400,
  devolucionesTotal30d: 5,
  devolucionesPendientes: 1,
  devolucionesAprobadas: 4,
  devolucionesTotal7d: 2,
  corrections30d: 8,
  corrections7d: 2,
  ventasMontoMes: 125000,
  ventasMontoSemana: 32000,
  ventasMontoHoy: 4500,
  criticalAlertsOptic: 3,
  clActiveSheets: 12,
  clTotalStock: 500,
  clCoveragePct: 92
})
const opticaSummary = ref({
  armazones: { total: 450, stock: 1200, agotados: 12, valor: 85000, stockBajo: 5 },
  soluciones: { total: 24, stock: 150, agotados: 2, porVencer: 1 },
  accesorios: { total: 85, stock: 400 },
  estuches: { total: 32, stock: 120 },
  equipos: { total: 8, operativos: 7, mantenimiento: 1, fueraServicio: 0 }
})

const role = ref('eurovision')
const canSeeInventory = ref(true)
const canSeeOrders = ref(true)
const canSeeReports = ref(true)
const canSeeLab = ref(true)
const canSeeMovements = ref(true)
const canSeeDevolutions = ref(true)
const canExportReports = ref(true)
const isRoot = ref(false)
const isVentas = ref(false)
const isSupervisor = ref(false)

const s = computed(() => stats.value)
const os = computed(() => opticaSummary.value)
const isLoading = ref(false)
const opticaLoading = ref(false)

// Dummy functions to prevent runtime errors
function loadStats() { console.log("Static mode: loadStats skipped"); }
function loadOpticaStats() { console.log("Static mode: loadOpticaStats skipped"); }

// ── Tabs ──
const anTab = ref('inventario')
const AN_TABS = computed(() => {
  const tabs = []
  if (canSeeInventory.value) tabs.push({ key: 'inventario', label: 'Lentes y Bases', icon: 'cubes-stacked' })
  if (canSeeInventory.value) tabs.push({ key: 'tienda', label: 'Tienda / Óptica', icon: 'store' })
  if (canSeeOrders.value)      tabs.push({ key: 'pedidos',       label: 'Pedidos',        icon: 'clipboard-list' })
  if (canSeeOrders.value)      tabs.push({ key: 'ventas',        label: 'Ventas',         icon: 'dollar-sign' })
  if (canSeeDevolutions.value) tabs.push({ key: 'devoluciones',  label: 'Devoluciones',   icon: 'rotate-left', badge: s.value?.devolucionesPendientes || 0, badgeType: 'warning' })
  if (canSeeLab.value) tabs.push({ key: 'laboratorio', label: 'Laboratorio', icon: 'microscope' })
  if (isSupervisor.value || isRoot.value) tabs.push({ key: 'supervision', label: 'Supervision', icon: 'eye' })
  return tabs
})

// ── Real-time Refresh (WS) ───────────────────────────────────────────────────
let _wsRefreshTimer = null
function debouncedRefresh() {
  clearTimeout(_wsRefreshTimer)
  _wsRefreshTimer = setTimeout(() => loadStats(true), 2000)
}

function onLabWs(e) {
  // Real-time refreshes disabled in static mode
  /*
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
  */
}

onMounted(() => { 
  // loadStats();
  // if (canSeeInventory.value) loadOpticaStats();
  // window.addEventListener('lab:ws', onLabWs);
})
onActivated(() => { 
  // loadStats()
  // if (canSeeInventory.value) loadOpticaStats()
})

onUnmounted(() => {
  window.removeEventListener('lab:ws', onLabWs)
  clearTimeout(_wsRefreshTimer)
})

// ── Role meta (acento sólido mate, paleta del logo) ──
const roleMeta = {
  root: { title: 'Analíticas del sistema', grad: '#db3b4b' },
  eurovision: { title: 'Analíticas del sistema', grad: '#a332bd' },
  supervisor: { title: 'Analíticas de operaciones', grad: '#0f97a8' },
  ventas: { title: 'Analíticas de ventas', grad: '#148a4e' },
  laboratorio: { title: 'Analíticas de laboratorio', grad: '#176fdb' },
}
const currentMeta = computed(() => roleMeta[role.value] || roleMeta.eurovision)
const headerTitle = computed(() => currentMeta.value.title)
const roleGradient = computed(() => currentMeta.value.grad)
const headerSubtitle = computed(() => {
  if (canSeeMovements.value) return 'Resumen operativo completo: inventario, movimientos, pedidos, devoluciones y laboratorio.'
  if (canSeeReports.value) return 'Resumen de ventas, pedidos, devoluciones y nivel de servicio del período.'
  if (canSeeLab.value) return 'Actividad de laboratorio: escaneos, correcciones y pedidos procesados.'
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
  const stock = Math.max(s.value?.totalStock || 1, 1)
  const est = (m / 30) * 365 / stock
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
  if (sl >= 97) return 'var(--c-success)'
  if (sl >= 90) return 'var(--c-info)'
  if (sl >= 80) return 'var(--c-warning)'
  return 'var(--c-danger)'
})

// ── Coverage ──
const safeStockPct = computed(() => {
  const total = s.value?.totalCombinations || 0
  const crit = s.value?.criticalAlertsOptic || 0
  return total ? Math.round((total - crit) / total * 100) : 0
})

// ── Lab quality ──
const correctionRate = computed(() => {
  const closed = s.value?.ordersClosed30d || 0
  const corr = s.value?.corrections30d || 0
  return closed ? Math.min(Math.round(corr / closed * 100), 100) : 0
})

// ── Devoluciones ──
const devolApprovalRate = computed(() => {
  const total = s.value?.devolucionesTotal30d ?? 0
  const approved = s.value?.devolucionesAprobadas ?? 0
  return total ? Math.min(Math.round(approved / total * 100), 100) : 0
})
const devol7dPct = computed(() => {
  const t30 = s.value?.devolucionesTotal30d || 0
  const t7 = s.value?.devolucionesTotal7d || 0
  return t30 ? Math.min(Math.round(t7 / t30 * 100), 100) : 0
})

function fmtn(value) {
  return Number(value || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
</script>

<style scoped>
.an-tabs-wrapper {
  position: relative;
}
</style>
