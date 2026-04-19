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
      <DynamicTabs v-model="anTab" :tabs="AN_TABS">

        <!-- ═══════════════ TAB: INVENTARIO ════════════════════════════ -->
        <template #inventario>
          <AnaliticasTabInventario :canSeeMovements="canSeeMovements" :isLoading="isLoading" :s="s" :fmtn="fmtn"
            :entriesPct="entriesPct" :exitsPct="exitsPct" :rotationIndex="rotationIndex" :safeStockPct="safeStockPct" />
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

      </DynamicTabs>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, toRef } from 'vue'
import DynamicTabs from '@/components/DynamicTabs.vue'

import AnaliticasKpiGrid from '@/components/dashboard/AnaliticasKpiGrid.vue'
import AnaliticasTabInventario from '@/components/dashboard/AnaliticasTabInventario.vue'
import AnaliticasTabPedidos from '@/components/dashboard/AnaliticasTabPedidos.vue'
import AnaliticasTabDevoluciones from '@/components/dashboard/AnaliticasTabDevoluciones.vue'
import AnaliticasTabLaboratorio from '@/components/dashboard/AnaliticasTabLaboratorio.vue'
import AnaliticasTabSupervision from '@/components/dashboard/AnaliticasTabSupervision.vue'

import { useDashboardStats } from '@/composables/api/useDashboardStats'

import './Analiticas.css'

const props = defineProps({
  loading: { type: Boolean, default: false },
  user: { type: Object, default: null },
})

const userRef = toRef(props, 'user')
const {
  stats, loading: statsLoading, load: loadStats,
  role, canSeeInventory, canSeeOrders, canSeeReports,
  canSeeLab, canSeeMovements, canSeeDevolutions,
  canExportReports, isRoot, isVentas, isSupervisor,
} = useDashboardStats(userRef)

const s = computed(() => stats.value)
const isLoading = computed(() => props.loading || statsLoading.value)

// ── Tabs ──
const anTab = ref('inventario')
const AN_TABS = computed(() => {
  const tabs = []
  if (canSeeInventory.value) tabs.push({ key: 'inventario', label: 'Inventario', icon: 'cubes-stacked' })
  if (canSeeOrders.value) tabs.push({ key: 'pedidos', label: 'Pedidos', icon: 'flask-vial' })
  if (canSeeDevolutions.value) tabs.push({ key: 'devoluciones', label: 'Devoluciones', icon: 'rotate-left', badge: s.value?.devolucionesPendientes || 0, badgeType: 'warning' })
  if (canSeeLab.value) tabs.push({ key: 'laboratorio', label: 'Laboratorio', icon: 'microscope' })
  if (isSupervisor.value || isRoot.value) tabs.push({ key: 'supervision', label: 'Supervision', icon: 'eye' })
  return tabs
})

onMounted(() => { loadStats() })
onActivated(() => { loadStats() })

// ── Role meta ──
const roleMeta = {
  root: { title: 'Analíticas del sistema', grad: 'linear-gradient(90deg,#dc2626,#ea580c)' },
  eurovision: { title: 'Analíticas del sistema', grad: 'linear-gradient(90deg,#906fe1,#2563eb)' },
  supervisor: { title: 'Analíticas de operaciones', grad: 'linear-gradient(90deg,#0891b2,#0d9488)' },
  ventas: { title: 'Analíticas de ventas', grad: 'linear-gradient(90deg,#16a34a,#65a30d)' },
  laboratorio: { title: 'Analíticas de laboratorio', grad: 'linear-gradient(90deg,#0284c7,#906fe1)' },
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
  const crit = s.value?.criticalAlerts || 0
  return total ? Math.round((total - crit) / total * 100) : 0
})

// ── Lab quality ──
const correctionRate = computed(() => {
  const closed = s.value?.ordersClosed30d || 0
  const corr = s.value?.corrections30d || 0
  return closed ? Math.min(Math.round(corr / closed * 100), 100) : 0
})

// ── Devolutions ──
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
