<template>
  <div>
    <!-- SKU -->
    <HelpCard id="sec_sku" icon="tags" title="SKU (Código de planilla)">
      <template #badge>
        <b-tag type="is-primary is-light" size="is-small" rounded>Inventario</b-tag>
      </template>
      <p class="help-text">
        El <strong>SKU</strong> es un código único que identifica cada planilla de inventario. Se genera
        automáticamente al crear una planilla y resume sus características principales.
      </p>
      <div class="nomenclatura-example">
        <div class="nomenclatura-example__code">{{ SKU_EXAMPLE }}</div>
        <div class="nomenclatura-example__label">Ejemplo de SKU</div>
      </div>
      <div class="nomenclatura-breakdown">
        <template v-for="(seg, i) in SKU_BREAKDOWN" :key="seg.part">
          <div class="nomenclatura-segment">
            <span class="nomenclatura-segment__part">{{ seg.part }}</span>
            <span class="nomenclatura-segment__desc">{{ seg.desc }}</span>
          </div>
          <span v-if="i < SKU_BREAKDOWN.length - 1" class="nomenclatura-sep">—</span>
        </template>
      </div>
      <HelpNoteBox>
        Las abreviaturas de proveedor y marca se generan tomando las primeras letras de cada
        palabra.
      </HelpNoteBox>
    </HelpCard>

    <!-- Folios -->
    <HelpCard id="sec_folios" icon="hashtag" title="Folios (Pedidos y Devoluciones)">
      <p class="help-text">
        Cada pedido de laboratorio y cada devolución recibe un <strong>folio</strong> único que sirve
        como referencia para rastrear el documento en todo el sistema.
      </p>
      <div class="nomenclatura-duo">
        <div class="nomenclatura-duo__block">
          <div class="nomenclatura-example">
            <div class="nomenclatura-example__code">{{ FOLIO_LAB.example }}</div>
            <div class="nomenclatura-example__label">{{ FOLIO_LAB.label }}</div>
          </div>
          <div class="nomenclatura-breakdown nomenclatura-breakdown--compact">
            <div v-for="seg in FOLIO_LAB.parts" :key="seg.part" class="nomenclatura-segment">
              <span class="nomenclatura-segment__part">{{ seg.part }}</span>
              <span class="nomenclatura-segment__desc">{{ seg.desc }}</span>
            </div>
          </div>
        </div>
        <div class="nomenclatura-duo__block">
          <div class="nomenclatura-example">
            <div class="nomenclatura-example__code">{{ FOLIO_DEV.example }}</div>
            <div class="nomenclatura-example__label">{{ FOLIO_DEV.label }}</div>
          </div>
          <div class="nomenclatura-breakdown nomenclatura-breakdown--compact">
            <div v-for="seg in FOLIO_DEV.parts" :key="seg.part" class="nomenclatura-segment">
              <span class="nomenclatura-segment__part">{{ seg.part }}</span>
              <span class="nomenclatura-segment__desc">{{ seg.desc }}</span>
            </div>
          </div>
        </div>
      </div>
    </HelpCard>

    <!-- EAN-13 -->
    <HelpCard id="sec_codebar" icon="barcode" title="Código de barras (EAN-13)">
      <template #badge>
        <b-tag type="is-info is-light" size="is-small" rounded>13 dígitos</b-tag>
      </template>
      <p class="help-text">
        Cada producto tiene un código de barras en formato <strong>EAN-13</strong> (estándar internacional de
        13 dígitos). Se genera automáticamente a partir de la planilla y las coordenadas ópticas del producto.
      </p>
      <div class="nomenclatura-example">
        <div class="nomenclatura-example__code">{{ EAN13.example }}</div>
        <div class="nomenclatura-example__label">{{ EAN13.label }}</div>
      </div>
      <div class="nomenclatura-breakdown nomenclatura-breakdown--compact">
        <div v-for="seg in EAN13.parts" :key="seg.part" class="nomenclatura-segment">
          <span class="nomenclatura-segment__part">{{ seg.part }}</span>
          <span class="nomenclatura-segment__desc">{{ seg.desc }}</span>
        </div>
      </div>
      <HelpNoteBox>
        El código de barras se usa para <strong>escanear productos</strong> en el laboratorio.
        Si un producto no tiene código asignado, no puede incluirse en un pedido.
      </HelpNoteBox>
    </HelpCard>

    <!-- Matrices -->
    <HelpCard id="sec_matrices" icon="glasses" title="Tipos de matriz (tipo de lente)">
      <p class="help-text">
        Cada planilla tiene un <strong>tipo de matriz</strong> que determina qué coordenadas ópticas
        maneja y cómo se organiza la grilla de inventario.
      </p>
      <div class="nomenclatura-table">
        <div class="nomenclatura-table__row nomenclatura-table__row--head">
          <span>Clave</span>
          <span>Tipo de lente</span>
          <span>Coordenadas</span>
        </div>
        <div v-for="m in MATRIX_TYPES" :key="m.code" class="nomenclatura-table__row">
          <span class="nomenclatura-segment__part">{{ m.code }}</span>
          <span>{{ m.tipo }}</span>
          <span class="mono">{{ m.coords }}</span>
        </div>
      </div>
      <HelpSoftBox icon="eye" title="Designación de ojo">
        En bifocales y progresivos, cada producto especifica el ojo:
        <strong>OD</strong> = Ojo Derecho, <strong>OI</strong> = Ojo Izquierdo.
        Las matrices tipo BASE y SPH_CYL no distinguen ojo.
      </HelpSoftBox>
    </HelpCard>

    <!-- Tratamientos -->
    <HelpCard id="sec_tratamientos" icon="fill-drip" title="Claves de tratamiento">
      <p class="help-text">
        Los tratamientos de lente se identifican con claves cortas que aparecen en el SKU y en los filtros del catálogo.
      </p>
      <div class="nomenclatura-table">
        <div class="nomenclatura-table__row nomenclatura-table__row--head">
          <span>Clave</span>
          <span>Tratamiento</span>
          <span>Notas</span>
        </div>
        <div v-for="t in TREATMENTS" :key="t.code" class="nomenclatura-table__row">
          <span class="nomenclatura-segment__part">{{ t.code }}</span>
          <span>{{ t.name }}</span>
          <span class="muted">{{ t.notes }}</span>
        </div>
      </div>
    </HelpCard>

    <!-- Estados -->
    <HelpCard id="sec_estados" icon="list-ul" title="Estados del sistema">
      <p class="help-text">
        Los pedidos y devoluciones pasan por diferentes estados. Aquí tienes lo que significa cada uno.
      </p>
      <div class="nomenclatura-duo">
        <div class="nomenclatura-duo__block">
          <p class="help-text"><strong>Pedidos de laboratorio</strong></p>
          <div class="nomenclatura-status-list">
            <div v-for="s in STATES_LAB" :key="s.state" class="nomenclatura-status">
              <span :class="`nomenclatura-status__dot nomenclatura-status__dot--${s.dot}`" />
              <span><strong>{{ s.state }}</strong> — {{ s.desc }}</span>
            </div>
          </div>
        </div>
        <div class="nomenclatura-duo__block">
          <p class="help-text"><strong>Devoluciones</strong></p>
          <div class="nomenclatura-status-list">
            <div v-for="s in STATES_DEV" :key="s.state" class="nomenclatura-status">
              <span :class="`nomenclatura-status__dot nomenclatura-status__dot--${s.dot}`" />
              <span><strong>{{ s.state }}</strong> — {{ s.desc }}</span>
            </div>
          </div>
        </div>
      </div>
      <HelpSoftBox icon="info-circle" title="Condición de artículo devuelto">
        Al registrar una devolución, cada artículo se clasifica como:
        <strong>bueno</strong> (reutilizable),
        <strong>dañado</strong> o
        <strong>defectuoso</strong>.
      </HelpSoftBox>
    </HelpCard>

    <!-- Coordenadas -->
    <HelpCard id="sec_coordenadas" icon="ruler-combined" title="Coordenadas ópticas y materiales">
      <p class="help-text">
        Los valores ópticos de cada producto se representan con abreviaturas estándar de optometría.
      </p>
      <div class="nomenclatura-table">
        <div class="nomenclatura-table__row nomenclatura-table__row--head">
          <span>Abreviatura</span>
          <span>Significado</span>
          <span>Rango típico</span>
        </div>
        <div v-for="c in COORDS" :key="c.abrev" class="nomenclatura-table__row">
          <span class="nomenclatura-segment__part">{{ c.abrev }}</span>
          <span>{{ c.meaning }}</span>
          <span class="mono">{{ c.range }}</span>
        </div>
      </div>
      <HelpSoftBox icon="glasses" title="Materiales disponibles">
        {{ MATERIALS_TEXT }}
      </HelpSoftBox>
    </HelpCard>
  </div>
</template>

<script setup>
import './HelpNomenclatura.css';
import HelpCard from './HelpCard.vue';
import HelpNoteBox from './HelpNoteBox.vue';
import HelpSoftBox from './HelpSoftBox.vue';
import {
  SKU_EXAMPLE,
  SKU_BREAKDOWN,
  FOLIO_LAB,
  FOLIO_DEV,
  EAN13,
  MATRIX_TYPES,
  TREATMENTS,
  STATES_LAB,
  STATES_DEV,
  COORDS,
  MATERIALS_TEXT,
} from './data/nomenclaturas.js';
</script>
