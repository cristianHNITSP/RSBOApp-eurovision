<template>
    <section class="section-analiticas" v-motion-fade-visible-once>
        <!-- Encabezado -->
        <header class="analytics-header">
            <div>
                <span class="analista-pill">
                    <b-icon icon="life-ring" size="is-small" class="mr-1" />
                    Analíticas de inventario
                </span>

                <p class="analytics-subtitle">
                    Resumen operativo del comportamiento del inventario en el periodo seleccionado.
                </p>
            </div>

            <div class="analytics-period">
                <b-tag type="is-light" class="is-capitalized">
                    {{ analytics.periodLabel }}
                </b-tag>
            </div>
        </header>

        <div class="columns is-multiline analytics-main">
            <!-- Columna izquierda: actividad + tipos -->
            <div class="column is-12-tablet is-7-desktop">
                <!-- Actividad de inventario -->
                <div class="analytics-card">
                    <div class="analytics-card-header">
                        <h3>Actividad de inventario</h3>
                        <small class="has-text-grey is-size-7">
                            Movimientos registrados en las hojas de Monofocal, Bifocal, Progresivo y Base.
                        </small>
                    </div>

                    <div class="analytics-kpi-row">
                        <!-- Total movimientos -->
                        <div class="analytics-kpi">
                            <span class="analytics-kpi-label">Movimientos totales</span>
                            <template v-if="!loading">
                                <strong class="analytics-kpi-value">
                                    {{ formatNumber(analytics.totalMovements) }}
                                </strong>
                                <p class="analytics-kpi-caption">
                                    Entradas, salidas y ajustes registrados en el periodo.
                                </p>
                            </template>
                            <template v-else>
                                <b-skeleton :width="90" :height="24" animated class="mb-2" />
                                <b-skeleton :width="130" :height="14" animated />
                            </template>
                        </div>

                        <!-- Entradas -->
                        <div class="analytics-kpi">
                            <span class="analytics-kpi-label">Entradas</span>
                            <template v-if="!loading">
                                <strong class="analytics-kpi-value">
                                    {{ formatNumber(analytics.inputs) }}
                                </strong>
                                <p class="analytics-kpi-caption">
                                    {{ movementsRatio.inputs }}% de los movimientos.
                                </p>
                            </template>
                            <template v-else>
                                <b-skeleton :width="70" :height="24" animated class="mb-2" />
                                <b-skeleton :width="110" :height="14" animated />
                            </template>
                        </div>

                        <!-- Salidas -->
                        <div class="analytics-kpi">
                            <span class="analytics-kpi-label">Salidas</span>
                            <template v-if="!loading">
                                <strong class="analytics-kpi-value">
                                    {{ formatNumber(analytics.outputs) }}
                                </strong>
                                <p class="analytics-kpi-caption">
                                    {{ movementsRatio.outputs }}% de los movimientos.
                                </p>
                            </template>
                            <template v-else>
                                <b-skeleton :width="70" :height="24" animated class="mb-2" />
                                <b-skeleton :width="110" :height="14" animated />
                            </template>
                        </div>
                    </div>

                    <!-- Lead time + rotación -->
                    <div class="analytics-metrics-row">
                        <div class="analytics-metric">
                            <span class="metric-label">Tiempo medio de reposición</span>
                            <template v-if="!loading">
                                <div class="metric-value">
                                    <b>
                                        {{ analytics.avgLeadTimeDays != null
                                            ? analytics.avgLeadTimeDays + ' días'
                                            : 'Sin datos' }}
                                    </b>
                                </div>
                                <p class="metric-caption">
                                    Días promedio entre el pedido al proveedor y la entrada al almacén.
                                </p>
                            </template>
                            <template v-else>
                                <b-skeleton :width="110" :height="18" animated class="mb-2" />
                                <b-skeleton :width="200" :height="14" animated />
                            </template>
                        </div>

                        <div class="analytics-metric">
                            <span class="metric-label">Índice de rotación (estimado)</span>
                            <template v-if="!loading">
                                <div class="metric-value">
                                    <b>{{ rotationIndex }}</b> vueltas/año
                                </div>
                                <p class="metric-caption">
                                    A mayor rotación, mejor aprovechamiento del stock y menor inmovilización.
                                </p>
                            </template>
                            <template v-else>
                                <b-skeleton :width="110" :height="18" animated class="mb-2" />
                                <b-skeleton :width="220" :height="14" animated />
                            </template>
                        </div>
                    </div>
                </div>

                <!-- Distribución por tipo de lente -->
                <div class="analytics-card">
                    <div class="analytics-card-header">
                        <h3>Distribución por tipo de lente</h3>
                        <small class="has-text-grey is-size-7">
                            Porcentaje de piezas activas por familia de producto.
                        </small>
                    </div>

                    <div v-if="!loading" class="analytics-family-list">
                        <div v-for="family in analytics.topFamilies" :key="family.name" class="analytics-family-row">
                            <div class="analytics-family-header">
                                <span class="family-name">{{ family.name }}</span>
                                <span class="family-percentage">{{ family.percentage }}%</span>
                            </div>
                            <b-progress :value="family.percentage" size="is-small" type="is-primary"
                                show-value="false" />
                        </div>
                    </div>

                    <div v-else>
                        <b-skeleton :width="'100%'" :height="60" animated class="mb-2" />
                        <b-skeleton :width="'100%'" :height="60" animated />
                    </div>
                </div>
            </div>

            <!-- Columna derecha: nivel de servicio + riesgo -->
            <div class="column is-12-tablet is-5-desktop">
                <!-- Nivel de servicio -->
                <div class="analytics-card">
                    <div class="analytics-card-header">
                        <h3>Nivel de servicio</h3>
                        <small class="has-text-grey is-size-7">
                            Capacidad de surtir pedidos completos sin faltantes.
                        </small>
                    </div>

                    <div class="service-level-block" v-if="!loading">
                        <div class="service-level-header">
                            <div>
                                <span class="metric-label">Pedidos surtidos sin faltantes</span>
                                <div class="service-level-value">
                                    <strong>{{ analytics.serviceLevel }}%</strong>
                                    <b-tag :type="serviceLevelTagType" size="is-small" class="ml-2">
                                        {{ serviceLevelStatus }}
                                    </b-tag>
                                </div>
                            </div>
                        </div>

                        <b-progress :value="analytics.serviceLevel" size="is-medium" :type="serviceLevelProgressType"
                            show-value="false" />

                        <div class="service-level-footer">
                            <span class="is-size-7 has-text-grey">
                                Corte del periodo:
                                <b>{{ analytics.periodLabel }}</b>
                            </span>
                            <span class="is-size-7 has-text-grey">
                                Rupturas de stock registradas:
                                <b>{{ analytics.stockouts }}</b>
                            </span>
                        </div>
                    </div>

                    <div v-else>
                        <b-skeleton :width="'100%'" :height="18" animated class="mb-2" />
                        <b-skeleton :width="'100%'" :height="18" animated class="mb-2" />
                        <b-skeleton :width="'100%'" :height="14" animated />
                    </div>
                </div>

                <!-- Combinaciones en riesgo -->
                <div class="analytics-card">
                    <div class="analytics-card-header">
                        <h3>Combinaciones en riesgo</h3>
                        <small class="has-text-grey is-size-7">
                            SPH / CYL / ADD con probabilidad de generar faltantes o retrasos.
                        </small>
                    </div>

                    <div v-if="!loading" class="risk-list">
                        <p v-if="!analytics.riskLenses.length" class="is-size-7 has-text-grey">
                            No hay combinaciones marcadas en riesgo para el periodo.
                        </p>

                        <article v-for="item in analytics.riskLenses" :key="item.label" class="risk-item">
                            <div class="risk-header">
                                <span class="risk-label">{{ item.label }}</span>
                                <b-tag :type="item.impact === 'Alta'
                                    ? 'is-danger'
                                    : item.impact === 'Media'
                                        ? 'is-warning'
                                        : 'is-info'" size="is-small" class="is-capitalized">
                                    {{ item.impact }} prioridad
                                </b-tag>
                            </div>
                            <p class="risk-reason">
                                {{ item.reason }}
                            </p>
                            <p class="risk-action">
                                <b>Sugerencia:</b> {{ item.suggestion }}
                            </p>
                        </article>
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
import { computed } from 'vue'

const props = defineProps({
    loading: {
        type: Boolean,
        default: false
    },
    // Objeto que puedes llenar desde tu backend con datos reales
    analytics: {
        type: Object,
        default: () => ({
            periodLabel: 'Últimos 30 días',
            totalMovements: 0,
            inputs: 0,
            outputs: 0,
            avgLeadTimeDays: null,
            stockouts: 0,
            serviceLevel: 0, // 0–100
            topFamilies: [
                { name: 'Monofocal', percentage: 45 },
                { name: 'Progresivo', percentage: 30 },
                { name: 'Bifocal', percentage: 15 },
                { name: 'Otros / especiales', percentage: 10 }
            ],
            riskLenses: [
                {
                    label: 'SPH -2.00 / CYL -1.00 / ADD +2.00',
                    reason: 'Consumo alto en la última semana con stock cercano al mínimo.',
                    impact: 'Alta',
                    suggestion: 'Revisar próximos pedidos y aumentar la cantidad en la siguiente reposición.'
                },
                {
                    label: 'SPH +1.50 / CYL 0.00 (Monofocal)',
                    reason: 'Rotación constante, pero sin pedidos programados.',
                    impact: 'Media',
                    suggestion: 'Verificar proyección de ventas y programar reposición preventiva.'
                }
            ]
        })
    }
})

const analytics = computed(() => props.analytics)

// Ratios de movimientos
const movementsRatio = computed(() => {
    const total = analytics.value.totalMovements || 0
    if (!total) return { inputs: 0, outputs: 0 }

    const inputsPct = Math.round(
        ((analytics.value.inputs || 0) / total) * 100
    )
    const outputsPct = Math.round(
        ((analytics.value.outputs || 0) / total) * 100
    )

    return {
        inputs: isFinite(inputsPct) ? inputsPct : 0,
        outputs: isFinite(outputsPct) ? outputsPct : 0
    }
})

// Índice de rotación (estimado) → muy general, solo para mostrar indicador
const rotationIndex = computed(() => {
    if (!analytics.value.totalMovements) return '—'
    // número ficticio solo para tener una referencia visual; puedes cambiarlo
    const estimate = analytics.value.totalMovements / 365
    return estimate < 0.1 ? '< 0.1' : estimate.toFixed(1)
})

// Nivel de servicio: etiqueta y colores
const serviceLevelStatus = computed(() => {
    const s = analytics.value.serviceLevel || 0
    if (s >= 97) return 'Excelente'
    if (s >= 90) return 'Bueno'
    if (s >= 80) return 'Aceptable'
    return 'A mejorar'
})

const serviceLevelTagType = computed(() => {
    const s = analytics.value.serviceLevel || 0
    if (s >= 97) return 'is-success'
    if (s >= 90) return 'is-info'
    if (s >= 80) return 'is-warning'
    return 'is-danger'
})

const serviceLevelProgressType = serviceLevelTagType

// Utilidades
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
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
}

.analytics-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-primary);
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

/* Riesgo */
.risk-list {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin-top: 0.6rem;
}

.risk-item {
    border-radius: 0.6rem;
    padding: 0.55rem 0.6rem;
    background: var(--bg-subtle);
}

.risk-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.15rem;
}

.risk-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-primary);
}

.risk-reason,
.risk-action {
    font-size: 0.74rem;
    color: var(--text-secondary);
    margin-bottom: 0.1rem;
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
