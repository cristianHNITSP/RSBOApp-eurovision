<template>
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
            <div class="mcell"><div class="mcell-label">Stock total</div><div class="mcell-val accent">{{ stats.arm.total }}</div></div>
            <div class="mcell"><div class="mcell-label">Agotados</div><div class="mcell-val danger">{{ stats.arm.agotado }}</div></div>
            <div class="mcell"><div class="mcell-label">Stock bajo</div><div class="mcell-val warn">{{ stats.arm.bajo }}</div></div>
            <div class="mcell"><div class="mcell-label">Valor estimado</div><div class="mcell-val">{{ fmt(stats.arm.valor) }}</div></div>
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
            <div class="mcell"><div class="mcell-label">Stock total</div><div class="mcell-val accent">{{ stats.sol.total }}</div></div>
            <div class="mcell"><div class="mcell-label">Agotados</div><div class="mcell-val danger">{{ stats.sol.agotado }}</div></div>
            <div class="mcell"><div class="mcell-label">Stock bajo</div><div class="mcell-val warn">{{ stats.sol.bajo }}</div></div>
            <div class="mcell"><div class="mcell-label">Por vencer</div><div class="mcell-val" :class="stats.sol.porVencer > 0 ? 'warn' : ''">{{ stats.sol.porVencer }}</div></div>
            <div class="mcell"><div class="mcell-label">Valor estimado</div><div class="mcell-val">{{ fmt(stats.sol.valor) }}</div></div>
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
            <div class="mcell"><div class="mcell-label">Stock total</div><div class="mcell-val accent">{{ stats.acc.total }}</div></div>
            <div class="mcell"><div class="mcell-label">Agotados</div><div class="mcell-val danger">{{ stats.acc.agotado }}</div></div>
            <div class="mcell"><div class="mcell-label">Stock bajo</div><div class="mcell-val warn">{{ stats.acc.bajo }}</div></div>
            <div class="mcell"><div class="mcell-label">Categorías</div><div class="mcell-val">{{ stats.acc.categorias }}</div></div>
            <div class="mcell"><div class="mcell-label">Valor estimado</div><div class="mcell-val">{{ fmt(stats.acc.valor) }}</div></div>
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
            <div class="mcell"><div class="mcell-label">Stock total</div><div class="mcell-val accent">{{ stats.est.total }}</div></div>
            <div class="mcell"><div class="mcell-label">Agotados</div><div class="mcell-val danger">{{ stats.est.agotado }}</div></div>
            <div class="mcell"><div class="mcell-label">Stock bajo</div><div class="mcell-val warn">{{ stats.est.bajo }}</div></div>
            <div class="mcell"><div class="mcell-label">Tipos</div><div class="mcell-val">{{ stats.est.tipos }}</div></div>
            <div class="mcell"><div class="mcell-label">Valor estimado</div><div class="mcell-val">{{ fmt(stats.est.valor) }}</div></div>
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
            <div class="mcell"><div class="mcell-label">Operativos</div><div class="mcell-val ok">{{ stats.eqp.operativo }}</div></div>
            <div class="mcell"><div class="mcell-label">Mantenimiento</div><div class="mcell-val warn">{{ stats.eqp.mantto }}</div></div>
            <div class="mcell"><div class="mcell-label">Fuera de servicio</div><div class="mcell-val danger">{{ stats.eqp.fuera }}</div></div>
            <div class="mcell"><div class="mcell-label">Próx. mantenimiento</div><div class="mcell-val" :class="stats.eqp.proxMantto > 0 ? 'warn' : ''">{{ stats.eqp.proxMantto }}</div></div>
            <div class="mcell"><div class="mcell-label">Total equipos</div><div class="mcell-val">{{ stats.eqp.total }}</div></div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
defineProps({
  optica: { type: Object, required: true },
  stats:  { type: Object, required: true },
});

const fmt = n => Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });
</script>
