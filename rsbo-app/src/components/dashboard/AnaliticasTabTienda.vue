<template>
  <div class="an-tab-single-col">
    <!-- Armazones -->
    <div class="gcard mb-5">
      <div class="gcard-bar" style="background:var(--c-primary)"></div>
      <div class="gc-head">
        <div class="gc-ico" style="background:var(--c-primary-alpha);color:var(--c-primary)"><i class="fas fa-glasses"></i></div>
        <div>
          <div class="gc-title">Armazones</div>
          <div class="gc-sub">
            Los marcos que el cliente utiliza. 
            <b v-if="os?.armazones?.stockBajo > 0" class="has-text-warning ml-1">
              {{ os.armazones.stockBajo }} modelos con ≤3 unidades
            </b>
          </div>
        </div>
      </div>
      <div class="gc-body">
        <div class="an-stat-grid" v-if="!isLoading && os?.armazones">
          <div class="an-stat-cell">
            <div class="asc-ico"><i class="fas fa-table-list"></i></div>
            <div class="asc-val">{{ fmtn(os.armazones.total) }}</div>
            <div class="asc-lbl">Modelos distintos</div>
          </div>
          <div class="an-stat-cell">
            <div class="asc-ico" style="color:var(--c-success)"><i class="fas fa-boxes-stacked"></i></div>
            <div class="asc-val" style="color:var(--c-success)">{{ fmtn(os.armazones.stock) }}</div>
            <div class="asc-lbl">Piezas en almacén</div>
          </div>
          <div class="an-stat-cell">
            <div class="asc-ico" style="color:var(--c-danger)"><i class="fas fa-box-open"></i></div>
            <div class="asc-val" style="color:var(--c-danger)">{{ fmtn(os.armazones.agotados) }}</div>
            <div class="asc-lbl">Modelos agotados</div>
          </div>
          <div class="an-stat-cell">
            <div class="asc-ico" style="color:var(--c-info)"><i class="fas fa-coins"></i></div>
            <div class="asc-val" style="color:var(--c-info)">${{ fmtn(os.armazones.valor) }}</div>
            <div class="asc-lbl">Valor estimado</div>
          </div>
        </div>
        <div v-else>
          <b-skeleton width="100%" height="80" animated />
        </div>
      </div>
    </div>

    <!-- Soluciones -->
    <div class="gcard mb-5">
      <div class="gcard-bar" style="background:var(--c-info)"></div>
      <div class="gc-head">
        <div class="gc-ico" style="background:var(--c-info-alpha);color:var(--c-info)"><i class="fas fa-droplet"></i></div>
        <div>
          <div class="gc-title">Soluciones y Gotas</div>
          <div class="gc-sub">
            Líquidos para limpieza. 
            <b v-if="os?.soluciones?.porVencer > 0" class="has-text-danger ml-1">
              {{ os.soluciones.porVencer }} lotes por vencer en < 6 meses
            </b>
          </div>
        </div>
      </div>
      <div class="gc-body">
        <div class="an-stat-grid" v-if="!isLoading && os?.soluciones">
          <div class="an-stat-cell">
            <div class="asc-ico"><i class="fas fa-flask"></i></div>
            <div class="asc-val">{{ fmtn(os.soluciones.total) }}</div>
            <div class="asc-lbl">Tipos distintos</div>
          </div>
          <div class="an-stat-cell">
            <div class="asc-ico" style="color:var(--c-success)"><i class="fas fa-boxes-stacked"></i></div>
            <div class="asc-val" style="color:var(--c-success)">{{ fmtn(os.soluciones.stock) }}</div>
            <div class="asc-lbl">Botellas en almacén</div>
          </div>
          <div class="an-stat-cell">
            <div class="asc-ico" style="color:var(--c-danger)"><i class="fas fa-box-open"></i></div>
            <div class="asc-val" style="color:var(--c-danger)">{{ fmtn(os.soluciones.agotados) }}</div>
            <div class="asc-lbl">Agotadas</div>
          </div>
          <div class="an-stat-cell">
            <div class="asc-ico" style="color:var(--c-warning)"><i class="fas fa-hourglass-half"></i></div>
            <div class="asc-val" style="color:var(--c-warning)">{{ fmtn(os.soluciones.porVencer) }}</div>
            <div class="asc-lbl">Lotes por vencer (6m)</div>
          </div>
        </div>
        <div v-else>
          <b-skeleton width="100%" height="80" animated />
        </div>
      </div>
    </div>

    <!-- Accesorios y Estuches en una fila (Grid) -->
    <div class="columns is-multiline">
      <div class="column is-6">
        <div class="gcard h-100">
          <div class="gcard-bar" style="background:var(--c-success)"></div>
          <div class="gc-head">
            <div class="gc-ico" style="background:var(--c-success-alpha);color:var(--c-success)"><i class="fas fa-screwdriver-wrench"></i></div>
            <div>
              <div class="gc-title">Accesorios</div>
              <div class="gc-sub">Paños, cadenas, tornillos</div>
            </div>
          </div>
          <div class="gc-body">
            <div class="an-stat-grid" style="grid-template-columns: 1fr 1fr;" v-if="!isLoading && os?.accesorios">
              <div class="an-stat-cell">
                <div class="asc-val">{{ fmtn(os.accesorios.total) }}</div>
                <div class="asc-lbl">Artículos</div>
              </div>
              <div class="an-stat-cell">
                <div class="asc-val" style="color:var(--c-success)">{{ fmtn(os.accesorios.stock) }}</div>
                <div class="asc-lbl">Piezas</div>
              </div>
            </div>
            <b-skeleton v-else width="100%" height="60" animated />
          </div>
        </div>
      </div>
      <div class="column is-6">
        <div class="gcard h-100">
          <div class="gcard-bar" style="background:var(--c-warning)"></div>
          <div class="gc-head">
            <div class="gc-ico" style="background:var(--c-warning-alpha);color:var(--c-warning)"><i class="fas fa-box"></i></div>
            <div>
              <div class="gc-title">Estuches</div>
              <div class="gc-sub">Cajas protectoras para lentes</div>
            </div>
          </div>
          <div class="gc-body">
            <div class="an-stat-grid" style="grid-template-columns: 1fr 1fr;" v-if="!isLoading && os?.estuches">
              <div class="an-stat-cell">
                <div class="asc-val">{{ fmtn(os.estuches.total) }}</div>
                <div class="asc-lbl">Modelos</div>
              </div>
              <div class="an-stat-cell">
                <div class="asc-val" style="color:var(--c-warning)">{{ fmtn(os.estuches.stock) }}</div>
                <div class="asc-lbl">Piezas</div>
              </div>
            </div>
            <b-skeleton v-else width="100%" height="60" animated />
          </div>
        </div>
      </div>
    </div>

    <!-- Equipos -->
    <div class="gcard mt-3">
      <div class="gcard-bar" style="background:var(--border-strong)"></div>
      <div class="gc-head">
        <div class="gc-ico" style="background:rgba(100,116,139,.16);color:#64748b"><i class="fas fa-desktop"></i></div>
        <div>
          <div class="gc-title">Equipos de Taller / Consultorio</div>
          <div class="gc-sub">Autorefractómetros, lensómetros, biseladoras</div>
        </div>
      </div>
      <div class="gc-body">
        <div class="an-stat-grid" v-if="!isLoading && os?.equipos">
          <div class="an-stat-cell">
            <div class="asc-ico"><i class="fas fa-microchip"></i></div>
            <div class="asc-val">{{ fmtn(os.equipos.total) }}</div>
            <div class="asc-lbl">Equipos Totales</div>
          </div>
          <div class="an-stat-cell">
            <div class="asc-ico" style="color:var(--c-success)"><i class="fas fa-check-circle"></i></div>
            <div class="asc-val" style="color:var(--c-success)">{{ fmtn(os.equipos.operativos) }}</div>
            <div class="asc-lbl">Operativos</div>
          </div>
          <div class="an-stat-cell">
            <div class="asc-ico" style="color:var(--c-warning)"><i class="fas fa-wrench"></i></div>
            <div class="asc-val" style="color:var(--c-warning)">{{ fmtn(os.equipos.mantenimiento) }}</div>
            <div class="asc-lbl">En mantenimiento</div>
          </div>
          <div class="an-stat-cell">
            <div class="asc-ico" style="color:var(--c-danger)"><i class="fas fa-ban"></i></div>
            <div class="asc-val" style="color:var(--c-danger)">{{ fmtn(os.equipos.fueraServicio) }}</div>
            <div class="asc-lbl">Fuera de servicio</div>
          </div>
        </div>
        <div v-else>
          <b-skeleton width="100%" height="80" animated />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isLoading: Boolean,
  os: Object,
  fmtn: Function
})
</script>
