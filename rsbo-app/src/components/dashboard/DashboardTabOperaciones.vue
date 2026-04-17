<template>
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

<script setup>
defineProps({
  canSeeOrders: Boolean,
  isLoading:    Boolean,
  s:            Object,
  canSeeLab:    Boolean,
  isLab:        Boolean
})
</script>
