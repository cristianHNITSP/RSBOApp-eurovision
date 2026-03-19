<template>
    <section class="section-analiticas" v-motion-fade-visible-once>
        <!-- Encabezado -->
        <header class="analytics-header page-section-header">
            <div>
                <span class="analista-pill">
                    <b-icon icon="chart-bar" size="is-small" class="mr-1" />
                    Analíticas
                </span>

                <h2>{{ headerTitle }}</h2>
                <p class="analytics-subtitle psh-desc">
                    {{ headerSubtitle }}
                </p>

                <div class="psh-quick mt-3">
                    <div class="psh-quick__card">
                        <div class="psh-quick__icon"><i class="fas fa-calendar-alt"></i></div>
                        <div>
                            <p class="psh-quick__title">Periodo activo</p>
                            <p class="psh-quick__text">Visualizando resultados de: <strong>{{ s?.periodLabel || 'Últimos 30 días' }}</strong></p>
                        </div>
                    </div>
                    <div v-if="canSeeInventory" class="psh-quick__card">
                        <div class="psh-quick__icon"><i class="fas fa-boxes"></i></div>
                        <div>
                            <p class="psh-quick__title">Alcance</p>
                            <p class="psh-quick__text">Monofocal, Bifocal, Progresivo y Base</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="psh-meta analytics-period">
                <b-tag type="is-light" class="is-capitalized">
                    {{ s?.periodLabel || 'Últimos 30 días' }}
                </b-tag>
            </div>
        </header>

        <div class="columns is-multiline analytics-main">
            <!-- Columna izquierda -->
            <div class="column is-12-tablet is-7-desktop">

                <!-- Actividad de inventario — solo eurovision -->
                <div v-if="canSeeMovements" class="analytics-card">
                    <div class="analytics-card-header">
                        <h3>Actividad de inventario</h3>
                        <small class="has-text-grey is-size-7">
                            Movimientos registrados en las hojas de inventario.
                        </small>
                    </div>

                    <div class="analytics-kpi-row">
                        <div class="analytics-kpi">
                            <span class="analytics-kpi-label">Movimientos totales</span>
                            <template v-if="!isLoading">
                                <strong class="analytics-kpi-value">{{ formatNumber(s?.movementsTotal30d) }}</strong>
                                <p class="analytics-kpi-caption">Entradas, salidas y ajustes (30d).</p>
                            </template>
                            <template v-else>
                                <b-skeleton :width="90" :height="24" animated class="mb-2" />
                                <b-skeleton :width="130" :height="14" animated />
                            </template>
                        </div>

                        <div class="analytics-kpi">
                            <span class="analytics-kpi-label">Entradas</span>
                            <template v-if="!isLoading">
                                <strong class="analytics-kpi-value">{{ formatNumber(s?.entries30d) }}</strong>
                                <p class="analytics-kpi-caption">{{ entriesPct }}% de los movimientos.</p>
                            </template>
                            <template v-else>
                                <b-skeleton :width="70" :height="24" animated class="mb-2" />
                                <b-skeleton :width="110" :height="14" animated />
                            </template>
                        </div>

                        <div class="analytics-kpi">
                            <span class="analytics-kpi-label">Salidas</span>
                            <template v-if="!isLoading">
                                <strong class="analytics-kpi-value">{{ formatNumber(s?.exits30d) }}</strong>
                                <p class="analytics-kpi-caption">{{ exitsPct }}% de los movimientos.</p>
                            </template>
                            <template v-else>
                                <b-skeleton :width="70" :height="24" animated class="mb-2" />
                                <b-skeleton :width="110" :height="14" animated />
                            </template>
                        </div>
                    </div>

                    <div class="analytics-metrics-row">
                        <div class="analytics-metric">
                            <span class="metric-label">Movimientos hoy</span>
                            <template v-if="!isLoading">
                                <div class="metric-value"><b>{{ s?.movementsToday ?? 0 }}</b></div>
                                <p class="metric-caption">Actividad registrada en el día actual.</p>
                            </template>
                            <template v-else>
                                <b-skeleton :width="110" :height="18" animated class="mb-2" />
                                <b-skeleton :width="200" :height="14" animated />
                            </template>
                        </div>

                        <div class="analytics-metric">
                            <span class="metric-label">Índice de rotación (est.)</span>
                            <template v-if="!isLoading">
                                <div class="metric-value"><b>{{ rotationIndex }}</b> vueltas/año</div>
                                <p class="metric-caption">Mayor rotación = mejor aprovechamiento del stock.</p>
                            </template>
                            <template v-else>
                                <b-skeleton :width="110" :height="18" animated class="mb-2" />
                                <b-skeleton :width="220" :height="14" animated />
                            </template>
                        </div>
                    </div>
                </div>

                <!-- Distribución por familia — eurovision -->
                <div v-if="canSeeInventory" class="analytics-card">
                    <div class="analytics-card-header">
                        <h3>Distribución por tipo de lente</h3>
                        <small class="has-text-grey is-size-7">
                            Porcentaje de piezas activas por familia de producto.
                        </small>
                    </div>

                    <div v-if="!isLoading" class="analytics-family-list">
                        <div v-for="family in s?.topFamilies || []" :key="family.name" class="analytics-family-row">
                            <div class="analytics-family-header">
                                <span class="family-name">{{ family.name }}</span>
                                <span class="family-percentage">{{ family.percentage }}%</span>
                            </div>
                            <b-progress :value="family.percentage" size="is-small" type="is-primary" :show-value="false" />
                        </div>
                        <p v-if="!(s?.topFamilies?.length)" class="is-size-7 has-text-grey">
                            Sin datos de familias en este periodo.
                        </p>
                    </div>

                    <div v-else>
                        <b-skeleton :width="'100%'" :height="60" animated class="mb-2" />
                        <b-skeleton :width="'100%'" :height="60" animated />
                    </div>
                </div>

                <!-- Pedidos — supervisor, ventas, laboratorio -->
                <div v-if="canSeeOrders" class="analytics-card">
                    <div class="analytics-card-header">
                        <h3>Resumen de pedidos</h3>
                        <small class="has-text-grey is-size-7">
                            Actividad de pedidos en el periodo.
                        </small>
                    </div>

                    <div class="analytics-kpi-row">
                        <div class="analytics-kpi">
                            <span class="analytics-kpi-label">Pendientes</span>
                            <template v-if="!isLoading">
                                <strong class="analytics-kpi-value">{{ s?.ordersPending ?? 0 }}</strong>
                                <p class="analytics-kpi-caption">Pedidos abiertos o parciales.</p>
                            </template>
                            <template v-else><b-skeleton :width="60" :height="24" animated /></template>
                        </div>
                        <div class="analytics-kpi">
                            <span class="analytics-kpi-label">Cerrados (30d)</span>
                            <template v-if="!isLoading">
                                <strong class="analytics-kpi-value">{{ s?.ordersClosed30d ?? 0 }}</strong>
                                <p class="analytics-kpi-caption">Completados este mes.</p>
                            </template>
                            <template v-else><b-skeleton :width="60" :height="24" animated /></template>
                        </div>
                        <div class="analytics-kpi">
                            <span class="analytics-kpi-label">Cancelados</span>
                            <template v-if="!isLoading">
                                <strong class="analytics-kpi-value">{{ s?.ordersCancelledAll ?? 0 }}</strong>
                                <p class="analytics-kpi-caption">Total cancelados.</p>
                            </template>
                            <template v-else><b-skeleton :width="60" :height="24" animated /></template>
                        </div>
                    </div>

                    <!-- Lab extra stats -->
                    <div v-if="canSeeLab" class="analytics-kpi-row mt-3">
                        <div class="analytics-kpi">
                            <span class="analytics-kpi-label">Correcciones (30d)</span>
                            <template v-if="!isLoading">
                                <strong class="analytics-kpi-value">{{ s?.corrections30d ?? 0 }}</strong>
                                <p class="analytics-kpi-caption">Solicitudes de corrección.</p>
                            </template>
                            <template v-else><b-skeleton :width="60" :height="24" animated /></template>
                        </div>
                        <div class="analytics-kpi">
                            <span class="analytics-kpi-label">Escaneos hoy</span>
                            <template v-if="!isLoading">
                                <strong class="analytics-kpi-value">{{ s?.scansToday ?? 0 }}</strong>
                                <p class="analytics-kpi-caption">Salidas por escáner.</p>
                            </template>
                            <template v-else><b-skeleton :width="60" :height="24" animated /></template>
                        </div>
                        <div class="analytics-kpi">
                            <span class="analytics-kpi-label">Ediciones (30d)</span>
                            <template v-if="!isLoading">
                                <strong class="analytics-kpi-value">{{ s?.edits30d ?? 0 }}</strong>
                                <p class="analytics-kpi-caption">Modificaciones a pedidos.</p>
                            </template>
                            <template v-else><b-skeleton :width="60" :height="24" animated /></template>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Columna derecha -->
            <div class="column is-12-tablet is-5-desktop">
                <!-- Nivel de servicio — eurovision, supervisor -->
                <div v-if="canSeeReports" class="analytics-card">
                    <div class="analytics-card-header">
                        <h3>Nivel de servicio</h3>
                        <small class="has-text-grey is-size-7">
                            Pedidos cerrados sin correcciones en los últimos 30 días.
                        </small>
                    </div>

                    <div class="service-level-block" v-if="!isLoading">
                        <div class="service-level-header">
                            <div>
                                <span class="metric-label">Pedidos surtidos sin faltantes</span>
                                <div class="service-level-value">
                                    <strong>{{ s?.serviceLevel ?? 0 }}%</strong>
                                    <b-tag :type="serviceLevelTagType" size="is-small" class="ml-2">
                                        {{ serviceLevelStatus }}
                                    </b-tag>
                                </div>
                            </div>
                        </div>

                        <b-progress :value="s?.serviceLevel ?? 0" size="is-medium" :type="serviceLevelTagType" :show-value="false" />

                        <div class="service-level-footer">
                            <span class="is-size-7 has-text-grey">
                                Corte: <b>{{ s?.periodLabel || 'Últimos 30 días' }}</b>
                            </span>
                            <span class="is-size-7 has-text-grey">
                                Correcciones totales: <b>{{ s?.corrections30d ?? 0 }}</b>
                            </span>
                        </div>
                    </div>

                    <div v-else>
                        <b-skeleton :width="'100%'" :height="18" animated class="mb-2" />
                        <b-skeleton :width="'100%'" :height="18" animated class="mb-2" />
                        <b-skeleton :width="'100%'" :height="14" animated />
                    </div>
                </div>

                <!-- Cobertura de inventario — eurovision -->
                <div v-if="canSeeInventory" class="analytics-card">
                    <div class="analytics-card-header">
                        <h3>Cobertura de inventario</h3>
                        <small class="has-text-grey is-size-7">
                            Estado general del stock por combinación óptica.
                        </small>
                    </div>

                    <div v-if="!isLoading">
                        <div class="metric-row mb-2">
                            <span class="metric-label">Combinaciones totales</span>
                            <strong>{{ formatNumber(s?.totalCombinations) }}</strong>
                        </div>
                        <div class="metric-row mb-2">
                            <span class="metric-label">Con stock</span>
                            <strong>{{ formatNumber(s?.withStock) }}</strong>
                        </div>
                        <div class="metric-row mb-2">
                            <span class="metric-label">Cobertura</span>
                            <strong>{{ s?.coveragePct ?? 0 }}%</strong>
                        </div>
                        <b-progress :value="s?.coveragePct ?? 0" size="is-small" type="is-primary" :show-value="false" />

                        <div class="metric-row mt-3 mb-2">
                            <span class="metric-label">Existencias totales</span>
                            <strong>{{ formatNumber(s?.totalStock) }}</strong>
                        </div>
                        <div class="metric-row mb-2">
                            <span class="metric-label">Alertas críticas</span>
                            <b-tag :type="(s?.criticalAlerts ?? 0) > 0 ? 'is-danger' : 'is-success'" size="is-small">
                                {{ s?.criticalAlerts ?? 0 }}
                            </b-tag>
                        </div>
                    </div>

                    <div v-else>
                        <b-skeleton :width="'100%'" :height="48" animated class="mb-2" />
                        <b-skeleton :width="'100%'" :height="48" animated />
                    </div>
                </div>

                <!-- Resumen rápido de pedidos para ventas (sin reportes) -->
                <div v-if="canSeeOrders && !canSeeReports" class="analytics-card">
                    <div class="analytics-card-header">
                        <h3>Tu actividad</h3>
                        <small class="has-text-grey is-size-7">
                            Resumen rápido de la operación del día.
                        </small>
                    </div>
                    <div v-if="!isLoading">
                        <div class="metric-row mb-2">
                            <span class="metric-label">Pedidos creados hoy</span>
                            <strong>{{ s?.ordersToday ?? 0 }}</strong>
                        </div>
                        <div class="metric-row mb-2">
                            <span class="metric-label">Cerrados hoy</span>
                            <strong>{{ s?.ordersClosedToday ?? 0 }}</strong>
                        </div>
                        <div class="metric-row mb-2">
                            <span class="metric-label">Total cerrados histórico</span>
                            <strong>{{ formatNumber(s?.ordersClosedAll) }}</strong>
                        </div>
                    </div>
                    <div v-else>
                        <b-skeleton :width="'100%'" :height="48" animated class="mb-2" />
                        <b-skeleton :width="'100%'" :height="48" animated />
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup>
import { computed, onMounted, onActivated, toRef } from 'vue'
import { useDashboardStats } from '@/composables/useDashboardStats'

const props = defineProps({
    loading: { type: Boolean, default: false },
    user: { type: Object, default: null },
})

const userRef = toRef(props, 'user')
const {
    stats,
    loading: statsLoading,
    load: loadStats,
    canSeeInventory,
    canSeeOrders,
    canSeeReports,
    canSeeLab,
    canSeeMovements,
} = useDashboardStats(userRef)

const s = computed(() => stats.value)
const isLoading = computed(() => props.loading || statsLoading.value)

onMounted(() => { loadStats() })
onActivated(() => { loadStats() })

// Header por rol
const headerTitle = computed(() => {
    if (canSeeInventory.value) return 'Analíticas del sistema'
    if (canSeeReports.value) return 'Analíticas de ventas'
    if (canSeeLab.value) return 'Analíticas de laboratorio'
    return 'Analíticas de pedidos'
})

const headerSubtitle = computed(() => {
    if (canSeeInventory.value) return 'Resumen operativo completo del inventario, laboratorio y pedidos.'
    if (canSeeReports.value) return 'Resumen de ventas, pedidos y nivel de servicio.'
    if (canSeeLab.value) return 'Actividad de laboratorio: escaneos, correcciones y pedidos.'
    return 'Resumen de la actividad de pedidos.'
})

// Ratios de movimientos
const entriesPct = computed(() => {
    const total = s.value?.movementsTotal30d || 0
    if (!total) return 0
    return Math.round(((s.value?.entries30d || 0) / total) * 100)
})

const exitsPct = computed(() => {
    const total = s.value?.movementsTotal30d || 0
    if (!total) return 0
    return Math.round(((s.value?.exits30d || 0) / total) * 100)
})

const rotationIndex = computed(() => {
    const m = s.value?.movementsTotal30d || 0
    if (!m) return '—'
    const estimate = (m / 30) * 365 / Math.max(s.value?.totalStock || 1, 1)
    return estimate < 0.1 ? '< 0.1' : estimate.toFixed(1)
})

// Nivel de servicio
const serviceLevelStatus = computed(() => {
    const sl = s.value?.serviceLevel || 0
    if (sl >= 97) return 'Excelente'
    if (sl >= 90) return 'Bueno'
    if (sl >= 80) return 'Aceptable'
    return 'A mejorar'
})

const serviceLevelTagType = computed(() => {
    const sl = s.value?.serviceLevel || 0
    if (sl >= 97) return 'is-success'
    if (sl >= 90) return 'is-info'
    if (sl >= 80) return 'is-warning'
    return 'is-danger'
})

function formatNumber(value) {
    const num = Number(value || 0)
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
</script>

<style scoped>
.section-analiticas {
    border-radius: 12px;
    padding: 1.5rem;
    background-color: var(--surface-solid);
    border: 1px solid var(--border-solid);
    box-shadow: var(--shadow-md);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    animation: panel-fade-in 220ms ease-out;
}

.analista-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-primary);
    background: var(--c-primary-alpha);
    padding: 0.2rem 0.45rem;
    border-radius: 999px;
    margin-bottom: 0.35rem;
}

/* Encabezado */
.analytics-header {
    gap: 1.25rem;
}

.analytics-subtitle {
    font-size: 0.8rem;
    color: var(--text-muted);
}

.analytics-period {
    display: flex;
    align-items: center;
}

/* Tarjetas */
.analytics-card {
    background-color: var(--surface-solid);
    border-radius: 0.9rem;
    padding: 1rem 1.1rem;
    box-shadow: var(--shadow-sm);
    margin-bottom: 0.7rem;
}

.analytics-card-header h3 {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.1rem;
}

/* KPIs actividad */
.analytics-kpi-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
    margin-top: 0.75rem;
    margin-bottom: 0.75rem;
}

.analytics-kpi {
    padding: 0.4rem 0.5rem;
    border-radius: 0.6rem;
    background: var(--bg-subtle);
}

.analytics-kpi-label {
    font-size: 0.7rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.analytics-kpi-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
}

.analytics-kpi-caption {
    font-size: 0.7rem;
    color: var(--text-muted);
}

/* Métricas secundarias */
.analytics-metrics-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    margin-top: 0.5rem;
}

.analytics-metric {
    padding-top: 0.2rem;
}

.metric-label {
    font-size: 0.75rem;
    color: var(--text-muted);
}

.metric-value {
    font-size: 0.85rem;
    color: var(--text-primary);
    margin-top: 0.1rem;
}

.metric-caption {
    font-size: 0.72rem;
    color: var(--text-muted);
}

.metric-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--text-secondary);
}

/* Familias */
.analytics-family-list {
    margin-top: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.analytics-family-row {
    font-size: 0.78rem;
}

.analytics-family-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.15rem;
}

.family-name {
    color: var(--text-secondary);
}

.family-percentage {
    color: var(--text-muted);
}

/* Nivel de servicio */
.service-level-block {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.service-level-header {
    display: flex;
    justify-content: space-between;
}

.service-level-value {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 1rem;
}

.service-level-footer {
    display: flex;
    justify-content: space-between;
    font-size: 0.72rem;
}

/* Animación */
@keyframes panel-fade-in {
    from {
        opacity: 0;
        transform: translateY(8px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Responsive */
@media (max-width: 1024px) {
    .analytics-kpi-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 768px) {
    .section-analiticas {
        padding: 1rem;
    }

    .analytics-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .analytics-metrics-row {
        grid-template-columns: 1fr;
    }
}
</style>
