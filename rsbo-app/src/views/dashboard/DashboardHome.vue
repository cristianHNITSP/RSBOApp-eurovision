<template>
  <!-- HEADER: Usuario -->
  <section class="hero section-user" v-motion-fade-visible-once>
    <div class="hero-body p-0">
      <div class="columns is-vcentered is-multiline">

        <!-- Avatar -->
        <div class="column is-narrow has-text-centered-touch">
          <figure
            class="image is-128x128 is-inline-block user-avatar-wrapper"
          >
            <b-skeleton
              v-if="!avatarLoaded"
              :width="128"
              :height="128"
              :animated="true"
              style="border-radius: 50%;"
            />
            <img
              v-else
              :src="avatarUrl"
              alt="User avatar"
              class="user-avatar-img"
            />
          </figure>
        </div>

        <!-- Información del usuario -->
        <div class="column is-flex is-flex-direction-column is-justify-content-center has-text-centered-touch">
          <!-- Nombre -->
          <h1 class="title is-size-3 has-text-weight-bold mb-4">
            <template v-if="!loading">
              Bienvenido a Eurovisión, <b>{{ user?.name || 'Usuario' }}</b>
            </template>
            <template v-else>
              <b-skeleton :width="180" :height="32" animated />
            </template>
          </h1>

          <!-- Última conexión -->
          <h3 class="subtitle is-size-6 mb-2">
            <template v-if="!loading">
              Último acceso:
              <b>
                {{
                  user?.lastLogin
                    ? new Intl.DateTimeFormat('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).format(new Date(user.lastLogin))
                    : 'N/D'
                }}
              </b>
            </template>
            <template v-else>
              <b-skeleton :width="220" :height="24" animated />
            </template>
          </h3>

          <!-- Rol y descripción -->
          <p class="is-size-7 has-text-primary mb-1">
            <template v-if="!loading">
              Sesión con rol
              <b>{{ user?.role?.name || 'Usuario' }}</b>
              <span class="mx-1">·</span>
              <span class="tag is-light is-info is-rounded">
                {{ environmentLabel }}
              </span>
            </template>
            <template v-else>
              <b-skeleton :width="260" :height="20" animated />
            </template>
          </p>

          <p class="is-size-7 has-text-grey">
            <template v-if="!loading">
              {{ user?.bio || 'Define una breve descripción profesional para tu perfil y facilita la identificación de tu rol dentro del laboratorio.' }}
            </template>
            <template v-else>
              <b-skeleton :width="320" :height="18" animated />
            </template>
          </p>
        </div>

        <!-- Botón de perfil -->
        <div class="column is-narrow has-text-centered-touch">
          <template v-if="!loading">
            <b-button
              type="is-light"
              class="mt-4 mt-0-tablet"
              title="Perfil"
              icon-left="user"
              @click="$router.push('/layouts/mi.perfil.panel')"
            >
              Administrar perfil
            </b-button>
          </template>

          <template v-else>
            <b-skeleton
              :width="140"
              :height="36"
              animated
              style="border-radius: 4px"
            />
          </template>
        </div>

      </div>
    </div>
  </section>

  <!-- DASHBOARD: KPIs + Estado sistema -->
  <section class="section dashboard-section" v-motion-fade-visible-once>
    <!-- KPIs principales -->
    <div class="columns is-multiline">

      <div
        v-for="card in kpiCards"
        :key="card.key"
        class="column is-6-tablet is-3-desktop"
      >
        <div class="dashboard-card kpi-card">
          <header class="kpi-header">
            <div class="kpi-icon-wrapper">
              <b-icon :icon="card.icon" size="is-small" />
            </div>
            <div class="kpi-header-text">
              <span class="kpi-title">{{ card.title }}</span>
              <span class="kpi-caption">{{ card.caption }}</span>
            </div>
          </header>

          <div class="kpi-body">
            <template v-if="!loading">
              <div class="kpi-value">
                {{ card.formattedValue }}
              </div>
              <p class="kpi-description">
                {{ card.description }}
              </p>
            </template>
            <template v-else>
              <b-skeleton :width="90" :height="28" animated class="mb-2" />
              <b-skeleton :width="140" :height="16" animated />
            </template>
          </div>
        </div>
      </div>

    </div>

    <div class="columns mt-2">

      <!-- Estado del inventario y explicación -->
      <div class="column is-8-desktop">
        <div class="dashboard-card mb-4">
          <header class="card-header-like">
            <div>
              <h2 class="card-title">
                Estado del inventario
              </h2>
              <p class="card-subtitle">
                Visión general de la cobertura, el nivel de existencias y las alertas de stock.
              </p>
            </div>
            <b-tag type="is-success" v-if="!loading">
              Operación estable
            </b-tag>
            <b-skeleton
              v-else
              :width="110"
              :height="20"
              animated
              style="border-radius: 999px"
            />
          </header>

          <div class="card-body">

            <!-- Cobertura de combinaciones -->
            <div class="metric-row">
              <div class="metric-label">
                Cobertura de combinaciones ópticas (SPH / CYL / ADD)
              </div>
              <div class="metric-value">
                <template v-if="!loading">
                  <strong>{{ coveragePercent }}%</strong> del catálogo objetivo
                </template>
                <template v-else>
                  <b-skeleton :width="140" :height="16" animated />
                </template>
              </div>
            </div>
            <b-progress
              v-if="!loading"
              :value="coveragePercent"
              size="is-small"
              type="is-primary"
              :show-value="false"
            />
            <b-skeleton v-else :width="'100%'" :height="8" animated class="mb-3" />

            <!-- Existencias en rango seguro -->
            <div class="metric-row mt-3">
              <div class="metric-label">
                Combinaciones dentro de rango seguro de existencias
              </div>
              <div class="metric-value">
                <template v-if="!loading">
                  {{ safeStockPercent }}% con stock por encima del mínimo definido
                </template>
                <template v-else>
                  <b-skeleton :width="200" :height="16" animated />
                </template>
              </div>
            </div>
            <b-progress
              v-if="!loading"
              :value="safeStockPercent"
              size="is-small"
              type="is-info"
              :show-value="false"
            />
            <b-skeleton v-else :width="'100%'" :height="8" animated class="mb-3" />

            <!-- Alertas críticas -->
            <div class="metric-row mt-3">
              <div class="metric-label">
                Alertas críticas de stock
              </div>
              <div class="metric-value">
                <template v-if="!loading">
                  <span
                    :class="[
                      'tag',
                      'is-rounded',
                      criticalAlerts > 0 ? 'is-danger' : 'is-success'
                    ]"
                  >
                    {{ criticalAlerts }} combinaciones en nivel crítico
                  </span>
                </template>
                <template v-else>
                  <b-skeleton :width="180" :height="24" animated />
                </template>
              </div>
            </div>

            <!-- Última sincronización -->
            <p class="is-size-7 has-text-grey mt-4">
              <b-icon icon="clock" size="is-small" class="mr-1" />
              <span>
                Última sincronización de inventario:
                <b>{{ lastSyncLabel }}</b>
              </span>
            </p>
          </div>
        </div>

        <!-- Tarjeta explicativa para usuarios no técnicos -->
        <div class="dashboard-card">
          <header class="card-header-like">
            <div>
              <h2 class="card-title">
                ¿Qué gestiona este panel?
              </h2>
              <p class="card-subtitle">
                Explicación rápida para personal de almacén y recepción.
              </p>
            </div>
          </header>
          <div class="card-body">
            <ul class="explanatory-list">
              <li>
                <b>Matrices por tipo de lente:</b>
                el inventario se organiza en hojas para Monofocal, Bifocal, Progresivo y Base,
                cada una con su propia tabla de combinaciones.
              </li>
              <li>
                <b>Combinaciones ópticas:</b>
                cada fila/columna representa valores específicos de SPH, CYL y ADD, junto con
                el <i>material</i> y los <i>tratamientos</i> definidos para esa hoja.
              </li>
              <li>
                <b>Existencias en tiempo casi real:</b>
                las salidas y ajustes modifican las existencias que ves aquí,
                permitiendo saber rápidamente si hay lentes disponibles para un pedido.
              </li>
              <li>
                <b>Historial y trazabilidad:</b>
                los cambios que se realizan en las hojas pueden asociarse a un usuario,
                lo que facilita auditorías internas y revisiones de movimientos.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Accesos rápidos + contexto de sistema -->
      <div class="column is-4-desktop">
        <!-- Accesos rápidos -->
        <div class="dashboard-card mb-4">
          <header class="card-header-like">
            <h2 class="card-title">Accesos rápidos</h2>
          </header>
          <div class="card-body quick-actions">
            <b-button
              type="is-primary"
              icon-left="database"
              expanded
              class="mb-2"
              @click="$router.push('/apps/inventario')"
            >
              Ir al panel de inventario
            </b-button>

            <b-button
              type="is-light"
              icon-left="table"
              expanded
              class="mb-2"
              @click="$router.push('/apps/inventario/plantillas')"
            >
              Gestionar plantillas (SPH / CYL / ADD)
            </b-button>

            <b-button
              type="is-light"
              icon-left="clipboard-check"
              expanded
              class="mb-2"
              @click="$router.push('/apps/inventario/auditorias')"
            >
              Revisiones y auditorías internas
            </b-button>

            <b-button
              type="is-light"
              icon-left="file-export"
              expanded
              @click="$router.push('/apps/inventario/reportes')"
            >
              Reportes descargables
            </b-button>
          </div>
        </div>

        <!-- Contexto del sistema -->
        <div class="dashboard-card">
          <header class="card-header-like">
            <h2 class="card-title">Contexto del sistema</h2>
          </header>
          <div class="card-body">
            <ul class="system-meta">
              <li>
                <span>Rol actual:</span>
                <b>{{ user?.role?.name || 'Usuario' }}</b>
              </li>
              <li>
                <span>Entorno:</span>
                <b>{{ environmentLabel }}</b>
              </li>
              <li>
                <span>Versión del panel:</span>
                <b>{{ appVersion }}</b>
              </li>
              <li>
                <span>Última actualización funcional:</span>
                <b>{{ lastFeatureUpdate }}</b>
              </li>
              <li>
                <span>Modelo de control:</span>
                <span class="tag is-light is-link is-rounded">
                  Inventario por matriz óptica
                </span>
              </li>
            </ul>

            <p class="is-size-7 has-text-grey mt-3">
              El objetivo de este sistema es que el personal tenga una vista clara del stock por
              combinación óptica, minimice errores de surtido y pueda responder rápido ante
              pedidos urgentes o faltantes de material.
            </p>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<script setup>
import { ref, watch, onMounted, onActivated, computed } from 'vue'

// Props desde el padre
const props = defineProps({
  user: Object,
  loading: Boolean
})

// === Avatar ===
const avatarLoaded = ref(false)
const avatarUrl = ref('https://github.com/octocat.png')

function loadAvatar (url) {
  avatarLoaded.value = false
  avatarUrl.value = url
  const img = new Image()
  img.src = url
  img.onload = () => { avatarLoaded.value = true }
  img.onerror = () => {
    avatarUrl.value = 'https://github.com/octocat.png'
    avatarLoaded.value = true
  }
}

watch(
  () => props.user?.avatar,
  (newAvatar) => {
    const url =
      newAvatar && newAvatar.trim() !== ''
        ? newAvatar
        : 'https://github.com/octocat.png'
    loadAvatar(url)
  },
  { immediate: true }
)

onActivated(() => {
  const url =
    props.user?.avatar && props.user.avatar.trim() !== ''
      ? props.user.avatar
      : 'https://github.com/octocat.png'
  loadAvatar(url)
})

// === Ambiente / sistema ===
const environmentLabel = computed(() => {
  const env = import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'local'
  if (/prod/i.test(env)) return 'Producción'
  if (/staging|pre/i.test(env)) return 'Pre-producción'
  if (/dev/i.test(env)) return 'Desarrollo'
  return 'Entorno local'
})

const appVersion = import.meta.env.VITE_APP_VERSION || 'v1.0.0'
const lastFeatureUpdate = 'Oct 2025' // puedes ligarlo a tu changelog real

// === Counters animados (KPIs) ===
const finalValues = ref({
  sheets: 24,           // Hojas / plantillas activas
  combinaciones: 13840, // Combinaciones SPH/CYL/ADD gestionadas
  stock: 5219,          // Piezas totales en inventario
  alertas: 7            // Alertas activas (bajo stock, etc.)
})

const animatedValues = ref({
  sheets: 0,
  combinaciones: 0,
  stock: 0,
  alertas: 0
})

const animationDuration = 1000

function formatNumber (value) {
  const num = Number(value || 0)
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function animateCounters () {
  const startTime = performance.now()
  function animate (now) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / animationDuration, 1)

    animatedValues.value.sheets = Math.floor(
      progress * finalValues.value.sheets
    )
    animatedValues.value.combinaciones = Math.floor(
      progress * finalValues.value.combinaciones
    )
    animatedValues.value.stock = Math.floor(
      progress * finalValues.value.stock
    )
    animatedValues.value.alertas = Math.floor(
      progress * finalValues.value.alertas
    )

    if (progress < 1) requestAnimationFrame(animate)
  }
  requestAnimationFrame(animate)
}

onMounted(() => {
  animateCounters()
})

// === KPIs cards ===
const kpiCards = computed(() => [
  {
    key: 'sheets',
    icon: 'table',
    title: 'Hojas de inventario',
    caption: 'Plantillas activas',
    value: animatedValues.value.sheets,
    formattedValue: animatedValues.value.sheets,
    description: 'Matrices por tipo de lente (Monofocal, Bifocal, Progresivo, Base).'
  },
  {
    key: 'combinaciones',
    icon: 'project-diagram',
    title: 'Combinaciones ópticas',
    caption: 'SPH · CYL · ADD',
    value: animatedValues.value.combinaciones,
    formattedValue: formatNumber(animatedValues.value.combinaciones),
    description:
      'Total de combinaciones ópticas que el laboratorio puede cubrir desde el inventario.'
  },
  {
    key: 'stock',
    icon: 'boxes',
    title: 'Existencias totales',
    caption: 'Piezas en almacén',
    value: animatedValues.value.stock,
    formattedValue: formatNumber(animatedValues.value.stock),
    description:
      'Cantidad total de piezas físicas registradas en todas las hojas de inventario.'
  },
  {
    key: 'alertas',
    icon: 'exclamation-triangle',
    title: 'Alertas activas',
    caption: 'Stock crítico / inconsistencias',
    value: animatedValues.value.alertas,
    formattedValue: animatedValues.value.alertas,
    description:
      'Combinaciones con stock por debajo del mínimo o con movimientos pendientes de revisar.'
  }
])

// === Métricas de estado (dummy, puedes ligarlas a la API) ===
const coveragePercent = computed(() => 92) // Cobertura de catálogo objetivo
const safeStockPercent = computed(() => 84) // % combinaciones en rango seguro
const criticalAlerts = computed(() => finalValues.value.alertas)

// Etiqueta de última sincronización (por ahora fija, con formato humano)
const lastSyncLabel = computed(() => {
  // Podrías ligar esto a props.user?.lastInventorySync
  return 'Hace menos de 5 minutos'
})
</script>

<style scoped>
* {
  transition: all 0.25s ease-in-out !important;
}

.section-user {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-solid);
  background: radial-gradient(circle at top left, var(--c-primary-alpha) 0, var(--surface-solid) 55%);
}

/* Avatar */
.user-avatar-wrapper {
  border-radius: 50%;
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.user-avatar-img {
  width: 128px;
  height: 128px;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

/* Dashboard layout */
.dashboard-section {
  padding: 1.5rem;
  margin-top: 1rem;
}

.dashboard-card {
  background-color: var(--surface-solid);
  border-radius: 0.9rem;
  padding: 1rem 1.2rem;
  box-shadow: var(--shadow-sm);
}

/* KPIs */
.kpi-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.kpi-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
}

.kpi-icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-primary-alpha);
  margin-right: 0.6rem;
}

.kpi-header-text {
  display: flex;
  flex-direction: column;
}

.kpi-title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--c-primary);
}

.kpi-caption {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.kpi-body {
  flex: 1;
}

.kpi-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.1rem;
}

.kpi-description {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Card header-like */
.card-header-like {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.card-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.card-subtitle {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Metric rows */
.metric-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
}

.metric-label {
  color: var(--text-secondary);
}

.metric-value {
  font-weight: 500;
  color: var(--text-primary);
}

/* Quick actions */
.quick-actions .button {
  font-size: 0.8rem;
}

/* System meta */
.system-meta {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.8rem;
}

.system-meta li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.35rem;
  color: var(--text-secondary);
}

.system-meta li span:first-child {
  color: var(--text-muted);
}

/* Lista explicativa */
.explanatory-list {
  list-style: none;
  padding-left: 0;
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.explanatory-list li {
  margin-bottom: 0.5rem;
}

/* Responsive tweaks */
@media (max-width: 768px) {
  .section-user {
    padding: 1rem;
  }

  .dashboard-section {
    padding: 1rem;
  }
}
</style>
