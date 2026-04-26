<script setup>
import {
  fmt,
  fmtDate,
  estadoTag,
  caducidadClass,
  rowClass,
} from "@/composables/optica/useOpticaHelpers";
import { EQUIPOS_CONFIG } from "@/constants/optica.js";
import OpticaToolbar from "./OpticaToolbar.vue";
import "./EquiposSection.css";

const props = defineProps({
  section: { type: Object, required: true },
});

defineEmits([
  "select",
  "reload",
  "toggle-trash",
  "create",
  "edit",
  "soft-delete",
  "hard-delete",
  "restore",
]);

// ── BANNER TRANSITION HOOKS ──
function onBannerBeforeEnter(el) {
  el.style.maxHeight = '0';
  el.style.marginBottom = '0';
  el.style.overflow = 'hidden';
}
function onBannerEnter(el, done) {
  requestAnimationFrame(() => {
    el.style.transition = 'max-height 280ms cubic-bezier(0.34,1.56,0.64,1), margin-bottom 280ms ease, opacity 220ms ease';
    el.style.maxHeight = el.scrollHeight + 'px';
    el.style.marginBottom = '1rem';
    el.style.opacity = '1';
    setTimeout(done, 280);
  });
}
function onBannerAfterEnter(el) {
  el.style.maxHeight = '';
  el.style.marginBottom = '';
  el.style.overflow = '';
  el.style.transition = '';
}
function onBannerBeforeLeave(el) {
  el.style.maxHeight = el.scrollHeight + 'px';
  el.style.marginBottom = '1rem';
  el.style.overflow = 'hidden';
}
function onBannerLeave(el, done) {
  requestAnimationFrame(() => {
    el.style.transition = 'max-height 240ms cubic-bezier(0.4,0,0.2,1), margin-bottom 240ms ease, opacity 180ms ease, transform 200ms ease';
    el.style.maxHeight = '0';
    el.style.marginBottom = '0';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-6px) scale(0.98)';
    setTimeout(done, 240);
  });
}
</script>

<template>
  <div class="optica-tab-content">
    <transition
      name="banner-slide"
      @before-enter="onBannerBeforeEnter"
      @enter="onBannerEnter"
      @after-enter="onBannerAfterEnter"
      @before-leave="onBannerBeforeLeave"
      @leave="onBannerLeave"
    >
      <div
        v-if="section.selected"
        class="item-banner"
        :class="{ 'item-banner--pulse': section.bannerPulse }"
        :data-state="section.selected?.estado"
      >
        <div class="item-banner__main">
          <div class="item-banner__sku-badge">
            <i class="fas fa-tools"></i>
            <span>{{ section.selected.sku }}</span>
          </div>
          <div class="item-banner__info">
            <p class="item-banner__name">{{ section.selected.nombre }}</p>
            <p class="item-banner__sub">
              {{ section.selected.marca }} {{ section.selected.modelo }} ·
              Serie: {{ section.selected.serie || "—" }}
            </p>
          </div>
        </div>
        <div class="item-banner__chips">
          <span
            class="i-chip"
            :class="
              section.selected.estado === 'Operativo'
                ? 'i-chip--ok'
                : section.selected.estado === 'Mantenimiento'
                ? 'i-chip--warn'
                : 'i-chip--danger'
            "
          >
            {{ section.selected.estado }}
          </span>
          <span class="i-chip i-chip--info">{{
            section.selected.ubicacion || "—"
          }}</span>
          <span
            class="i-chip"
            :class="
              caducidadClass(section.selected.mantenimiento)
                ? 'i-chip--warn'
                : 'i-chip--info'
            "
            >Mantto: {{ fmtDate(section.selected.mantenimiento) }}</span
          >
        </div>
        <div class="item-banner__actions">
          <b-button
            size="is-small"
            type="is-light"
            icon-left="pen"
            @click="$emit('edit', section.selected)"
            >Editar</b-button
          >
          <b-button
            v-if="!section.showTrash"
            size="is-small"
            type="is-warning"
            icon-left="trash"
            @click="$emit('soft-delete', section.selected)"
            >Papelera</b-button
          >
          <b-button
            v-else
            size="is-small"
            type="is-success"
            icon-left="undo"
            @click="$emit('restore', section.selected)"
            >Restaurar</b-button
          >
          <b-button
            size="is-small"
            type="is-danger"
            icon-left="times"
            @click="$emit('hard-delete', section.selected)"
            >Eliminar</b-button
          >
        </div>
      </div>
    </transition>

    <OpticaToolbar
      :section="section"
      search-placeholder="Buscar SKU, nombre, serie…"
      filter-placeholder="Todos los estados"
      :filter-options="EQUIPOS_CONFIG.estados"
      @reload="$emit('reload')"
      @toggle-trash="$emit('toggle-trash')"
      @create="$emit('create')"
    />

    <div v-if="section.loading" class="skeleton-wrap">
      <div
        v-for="i in 6"
        :key="i"
        class="skeleton-row"
        :style="`animation-delay:${i * 60}ms`"
      />
    </div>
    <div v-else class="table-shell glass-card">
      <b-table
        :data="
          section.items.filter(
            (r) =>
              section.filterField === 'all' || r.estado === section.filterField
          )
        "
        :mobile-cards="false"
        sticky-header
        :height="360"
        hoverable
        focusable
        :row-class="rowClass"
        :selected="section.selected"
        @update:selected="(r) => $emit('select', r)"
        paginated
        :per-page="10"
        pagination-size="is-small"
      >
        <b-table-column field="sku" label="SKU" sortable v-slot="{ row }">
          <span class="mono-tag">{{ row.sku }}</span>
        </b-table-column>
        <b-table-column field="nombre" label="Equipo" sortable v-slot="{ row }">
          <strong>{{ row.nombre }}</strong>
        </b-table-column>
        <b-table-column field="tipo" label="Área" sortable v-slot="{ row }">
          <b-tag type="is-info" size="is-small">{{ row.tipo }}</b-tag>
        </b-table-column>
        <b-table-column field="marca" label="Marca" sortable v-slot="{ row }">
          {{ row.marca }}
        </b-table-column>
        <b-table-column field="modelo" label="Modelo" v-slot="{ row }">
          {{ row.modelo || "—" }}
        </b-table-column>
        <b-table-column field="serie" label="Serie" v-slot="{ row }">
          <span class="mono-tag">{{ row.serie || "—" }}</span>
        </b-table-column>
        <b-table-column field="ubicacion" label="Ubicación" sortable v-slot="{ row }">
          {{ row.ubicacion || "—" }}
        </b-table-column>
        <b-table-column field="estado" label="Estado" sortable v-slot="{ row }">
          <b-tag :type="estadoTag(row.estado)" size="is-small">{{
            row.estado
          }}</b-tag>
        </b-table-column>
        <b-table-column
          field="mantenimiento"
          label="Prox. Mantto."
          sortable
          v-slot="{ row }"
        >
          <span :class="caducidadClass(row.mantenimiento)" class="date-cell">{{
            fmtDate(row.mantenimiento)
          }}</span>
        </b-table-column>
        <template #empty>
          <div class="table-empty">
            <i class="fas fa-tools fa-2x mb-2"></i>
            <p>Sin equipos encontrados</p>
          </div>
        </template>
      </b-table>
    </div>
  </div>
</template>
