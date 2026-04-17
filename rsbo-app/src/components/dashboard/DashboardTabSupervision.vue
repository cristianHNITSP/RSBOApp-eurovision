<template>
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
            <button class="rtile" @click="$router.push('/l/devoluciones')">
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

<script setup>
defineProps({
  isLoading: Boolean,
  s:         Object
})
</script>
