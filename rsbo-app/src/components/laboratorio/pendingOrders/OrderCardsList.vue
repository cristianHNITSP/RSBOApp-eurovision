<template>
  <div class="orders-list-wrap">
    <!-- Loading skeleton -->
    <div v-if="loading" class="orders-skeleton">
      <div v-for="i in 3" :key="i" class="order-skeleton-card">
        <div class="skel skel--title"></div>
        <div class="skel skel--line mt-2"></div>
        <div class="skel skel--bar mt-2"></div>
      </div>
    </div>

    <!-- Empty states -->
    <div v-else-if="!orders.length && !total" class="empty empty--mini">
      <i class="fas fa-inbox empty__icon"></i>
      <p class="empty__title">Sin pedidos</p>
      <p class="empty__text">Crea uno en "Pedidos" para empezar.</p>
    </div>

    <div v-else-if="!orders.length" class="empty empty--mini empty--filter">
      <i class="fas fa-filter empty__icon"></i>
      <p class="empty__title">Sin coincidencias</p>
      <p class="empty__text">No hay pedidos en "{{ filterLabel }}".</p>
    </div>

    <!-- Grid -->
    <transition-group v-else name="order-list" tag="div" class="order-cards-grid">
      <button
        v-for="o in orders"
        :key="o.id"
        type="button"
        class="oci"
        :class="[
          `oci--${o.status}`,
          { 'oci--active': o.id === selectedId }
        ]"
        @click="$emit('select', o.id)"
      >
        <div class="oci__row oci__row--top">
          <div class="oci__folio">
            <i class="fas fa-receipt oci__icon mr-1"></i>
            {{ o.folio || "Sin folio" }}
          </div>
          <span class="tag is-light oci__badge" :class="statusTagClass(o.status)">
            <span class="oci__badge-dot"></span>
            {{ statusHuman(o.status) }}
          </span>
        </div>
        <div class="oci__client">
          <i class="fas fa-building mr-1 oci__meta-icon"></i>
          <b>{{ o.cliente || "Sin cliente" }}</b>
        </div>
        <div class="oci__sheet">
          <i class="fas fa-layer-group mr-1 oci__meta-icon"></i>
          {{ sheetNameById(o.sheetId) }}
        </div>
        <div class="oci__progress mt-2">
          <div class="oci__progress-track">
            <div
              class="oci__progress-fill"
              :class="{ 'oci__progress-fill--done': isOrderComplete(o) }"
              :style="{ width: orderProgressPct(o) + '%' }"
            />
          </div>
          <div class="oci__progress-label">
            <span>{{ orderPickedCount(o) }}/{{ orderTotalCount(o) }} surtidas</span>
            <span class="oci__pct">{{ orderProgressPct(o) }}%</span>
          </div>
        </div>
        <div class="oci__footer mt-2">
          <span class="oci__date">
            <i class="fas fa-clock mr-1"></i>{{ o.createdAtShort }}
          </span>
          <span class="oci__lines-count">
            {{ o.lines?.length || 0 }} línea{{ (o.lines?.length || 0) !== 1 ? "s" : "" }}
          </span>
        </div>
        <div v-if="o.id === selectedId" class="oci__selected-mark">
          <i class="fas fa-check-circle"></i>
        </div>
      </button>
    </transition-group>
  </div>
</template>

<script setup>
import { inject } from "vue";
const lab = inject("lab");

const props = defineProps({
  orders: Array,
  loading: Boolean,
  selectedId: String,
  total: Number,
  filterLabel: String
});

const emit = defineEmits(["select"]);

// Proxying lab helpers
const statusTagClass = lab.statusTagClass;
const statusHuman = lab.statusHuman;
const sheetNameById = lab.sheetNameById;
const isOrderComplete = lab.isOrderComplete;
const orderProgressPct = lab.orderProgressPct;
const orderPickedCount = lab.orderPickedCount;
const orderTotalCount = lab.orderTotalCount;
</script>

<style scoped>
.orders-skeleton { display: grid; gap: 0.6rem; }
.order-skeleton-card { border: 1px solid var(--border); border-radius: 16px; padding: 0.85rem; background: var(--surface-overlay); }
.order-cards-grid { display: grid; gap: 0.6rem; }
.oci { position: relative; text-align: left; width: 100%; border: 1.5px solid var(--border); border-radius: 16px; padding: 0.85rem; background: var(--surface); cursor: pointer; transition: all 220ms ease; overflow: hidden; }
.oci:hover { border-color: var(--c-primary); background: linear-gradient(135deg, var(--surface-raised), var(--c-primary-alpha)); backdrop-filter: blur(14px); }
.oci--active { border-color: rgba(144, 111, 225, 0.6); background: linear-gradient(135deg, rgba(144, 111, 225, 0.07), rgba(236, 72, 153, 0.04)); box-shadow: 0 0 0 3px rgba(144, 111, 225, 0.12); }
.oci__row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.oci__row--top { margin-bottom: 0.45rem; }
.oci__folio { font-size: 0.95rem; font-weight: 1000; color: var(--text-primary); }
.oci__badge { font-size: 0.72rem; font-weight: 900; border-radius: 999px; display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.15rem 0.55rem; }
.oci__badge-dot { width: 6px; height: 6px; border-radius: 999px; background: currentColor; }
.oci__client { font-size: 0.88rem; font-weight: 900; color: var(--text-primary); margin-bottom: 0.2rem; }
.oci__sheet { font-size: 0.8rem; font-weight: 800; color: var(--text-muted); }
.oci__meta-icon { font-size: 0.75rem; color: var(--c-primary); }
.oci__progress-track { height: 6px; border-radius: 999px; background: var(--border); overflow: hidden; margin-bottom: 0.25rem; }
.oci__progress-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, rgba(144, 111, 225, 0.85), rgba(236, 72, 153, 0.7)); transition: width 300ms ease; }
.oci__progress-fill--done { background: linear-gradient(90deg, var(--c-success), #16a34a); }
.oci__progress-label { display: flex; justify-content: space-between; font-size: 0.76rem; font-weight: 800; color: var(--text-muted); }
.oci__pct { font-weight: 1000; color: var(--c-primary); }
.oci__footer { display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; font-weight: 800; color: var(--text-muted); }
.oci__lines-count { background: var(--border); padding: 0.1rem 0.45rem; border-radius: 999px; border: 1px solid var(--border); font-size: 0.72rem; }
.oci__selected-mark { position: absolute; top: 0.6rem; right: 0.6rem; font-size: 0.9rem; color: var(--c-primary); }

.order-list-move, .order-list-enter-active, .order-list-leave-active { transition: all 220ms ease; }
.order-list-enter-from, .order-list-leave-to { opacity: 0; transform: translateY(8px); }
.order-list-leave-active { position: absolute; }
</style>
