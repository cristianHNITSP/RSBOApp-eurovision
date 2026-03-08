<template>
  <div class="panel">
    <!-- Header -->
    <div class="panel__head panel__head--compact">
      <div>
        <h3 class="panel__title mb-0">
          <i class="fas fa-clipboard-list mr-2"></i>
          Bandeja de pedidos
        </h3>
        <p class="panel__hint mt-1">
          Historial · entradas · salidas (DB).
        </p>
      </div>
      <div class="panel__headActions">
        <b-button
          size="is-small"
          type="is-light"
          icon-left="download"
          :loading="lab.loadingExportOrders.value"
          @click="lab.exportOrdersCsv"
        >
          CSV
        </b-button>
        <b-button
          v-if="!standalone"
          size="is-small"
          type="is-light"
          :icon-left="open ? 'chevron-up' : 'chevron-down'"
          @click="open = !open"
        >
          {{ open ? "Ocultar" : "Mostrar" }}
        </b-button>
      </div>
    </div>

    <!-- Collapsible body -->
    <b-collapse :open="standalone || open" animation="slide">
      <div class="panel__body">

        <!-- Status filter tabs -->
        <div class="status-filter-row mb-3">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            type="button"
            class="status-tab"
            :class="{ 'status-tab--active': lab.orderStatusFilter.value === tab.value }"
            @click="lab.orderStatusFilter.value = tab.value"
          >
            <span class="status-tab__dot" :class="tab.dotClass"></span>
            {{ tab.label }}
            <span class="status-tab__count">{{ countByStatus(tab.value) }}</span>
          </button>
        </div>

        <!-- Search -->
        <b-field class="mb-3">
          <b-input
            v-model="lab.orderQuery.value"
            icon="search"
            placeholder="Folio, cliente, nota…"
            size="is-small"
            expanded
          />
        </b-field>

        <!-- Loading skeleton -->
        <div v-if="lab.loadingOrders.value" class="orders-skeleton">
          <div v-for="i in 3" :key="i" class="order-skeleton-card">
            <div class="skel skel--title"></div>
            <div class="skel skel--line mt-2"></div>
            <div class="skel skel--bar mt-2"></div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="!lab.ordersDB.value.length" class="empty empty--mini">
          <i class="fas fa-inbox empty__icon"></i>
          <p class="empty__title">Sin pedidos</p>
          <p class="empty__text">Crea uno en "Pedidos" o cambia el filtro.</p>
        </div>

        <!-- Order cards grid -->
        <div v-else class="order-cards-grid">
          <button
            v-for="o in lab.ordersDB.value"
            :key="o.id"
            type="button"
            class="oci"
            :class="[
              `oci--${o.status}`,
              { 'oci--active': o.id === lab.selectedOrderId.value }
            ]"
            @click="lab.selectedOrderId.value = o.id"
          >
            <!-- Row 1: folio + status badge -->
            <div class="oci__row oci__row--top">
              <div class="oci__folio">
                <i class="fas fa-receipt oci__icon mr-1"></i>
                {{ o.folio || "Sin folio" }}
              </div>
              <span class="tag is-light oci__badge" :class="lab.statusTagClass(o.status)">
                <span class="oci__badge-dot"></span>
                {{ lab.statusHuman(o.status) }}
              </span>
            </div>

            <!-- Row 2: Client -->
            <div class="oci__client">
              <i class="fas fa-building mr-1 oci__meta-icon"></i>
              <b>{{ o.cliente || "Sin cliente" }}</b>
            </div>

            <!-- Row 3: Sheet -->
            <div class="oci__sheet">
              <i class="fas fa-layer-group mr-1 oci__meta-icon"></i>
              {{ lab.sheetNameById(o.sheetId) }}
            </div>

            <!-- Row 4: Progress -->
            <div class="oci__progress mt-2">
              <div class="oci__progress-track">
                <div
                  class="oci__progress-fill"
                  :class="{ 'oci__progress-fill--done': lab.isOrderComplete(o) }"
                  :style="{ width: lab.orderProgressPct(o) + '%' }"
                />
              </div>
              <div class="oci__progress-label">
                <span>{{ lab.orderPickedCount(o) }}/{{ lab.orderTotalCount(o) }} surtidas</span>
                <span class="oci__pct">{{ lab.orderProgressPct(o) }}%</span>
              </div>
            </div>

            <!-- Row 5: Date + lines count -->
            <div class="oci__footer mt-2">
              <span class="oci__date">
                <i class="fas fa-clock mr-1"></i>{{ o.createdAtShort }}
              </span>
              <span class="oci__lines-count">
                {{ o.lines?.length || 0 }} línea{{ (o.lines?.length || 0) !== 1 ? "s" : "" }}
              </span>
            </div>

            <!-- Selected indicator -->
            <div v-if="o.id === lab.selectedOrderId.value" class="oci__selected-mark">
              <i class="fas fa-check-circle"></i>
            </div>
          </button>
        </div>

        <hr class="soft-hr" />

        <!-- ===== Logs section ===== -->
        <div class="logs-section">
          <div class="logs-col">
            <div class="logs-head logs-head--in">
              <i class="fas fa-arrow-circle-down mr-2"></i>
              Entradas
              <span class="logs-badge">{{ lab.entryEvents.value.length }}</span>
            </div>

            <div v-if="lab.loadingEvents.value" class="logs-loading">
              <b-loading :is-full-page="false" :active="true" />
            </div>
            <div v-else-if="!lab.entryEvents.value.length" class="logs-empty">
              <i class="fas fa-inbox mr-1"></i>
              Sin entradas recientes.
            </div>
            <div v-else class="logs-feed">
              <div
                v-for="e in lab.entryEvents.value"
                :key="e.id"
                class="log-card log-card--in"
              >
                <div class="log-card__top">
                  <span class="log-card__folio mono">{{ e.folio }}</span>
                  <span class="log-card__date">{{ e.at }}</span>
                </div>
                <div class="log-card__client">
                  <i class="fas fa-building mr-1"></i>
                  {{ e.cliente }}
                </div>
                <div class="log-card__meta">
                  <span>{{ lab.sheetNameById(e.sheetId) }}</span>
                  <span class="log-card__pill">{{ e.linesTotal }} líneas</span>
                </div>
              </div>
            </div>
          </div>

          <div class="logs-col">
            <div class="logs-head logs-head--out">
              <i class="fas fa-arrow-circle-up mr-2"></i>
              Salidas
              <span class="logs-badge">{{ lab.exitEvents.value.length }}</span>
            </div>

            <div v-if="lab.loadingEvents.value" class="logs-loading">
              <b-loading :is-full-page="false" :active="true" />
            </div>
            <div v-else-if="!lab.exitEvents.value.length" class="logs-empty">
              <i class="fas fa-inbox mr-1"></i>
              Sin salidas recientes.
            </div>
            <div v-else class="logs-feed">
              <div
                v-for="e in lab.exitEvents.value"
                :key="e.id"
                class="log-card log-card--out"
              >
                <div class="log-card__top">
                  <span class="log-card__folio mono">{{ e.folio }}</span>
                  <span class="log-card__date">{{ e.at }}</span>
                </div>
                <div class="log-card__code mono">
                  <i class="fas fa-barcode mr-1"></i>
                  {{ e.codebar || "—" }}
                </div>
                <div class="log-card__meta">
                  <span>{{ e.title }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </b-collapse>
  </div>
</template>

<script setup>
import { inject, ref, computed } from "vue";

const lab = inject("lab");
if (!lab) throw new Error("PendingOrdersPanel necesita provide('lab', ...)");

const props = defineProps({
  standalone: { type: Boolean, default: false },
});

const open = ref(!props.standalone ? false : true);

const statusTabs = [
  { value: "open",      label: "Abiertos",   dotClass: "dot--warning" },
  { value: "pendiente", label: "Pendiente",  dotClass: "dot--warning" },
  { value: "parcial",   label: "Parcial",    dotClass: "dot--info" },
  { value: "cerrado",   label: "Cerrado",    dotClass: "dot--success" },
  { value: "all",       label: "Todos",      dotClass: "dot--muted" },
];

function countByStatus(tabValue) {
  const all = lab.ordersDB.value || [];
  if (tabValue === "all") return all.length;
  if (tabValue === "open") return all.filter((o) => o.status === "pendiente" || o.status === "parcial").length;
  return all.filter((o) => o.status === tabValue).length;
}
</script>

<style scoped>
/* ===== Status filter tabs ===== */
.status-filter-row {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.status-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(255, 255, 255, 0.65);
  font-size: 0.82rem;
  font-weight: 800;
  color: rgba(17, 24, 39, 0.75);
  cursor: pointer;
  transition: all 120ms ease;
}

.status-tab:hover {
  border-color: rgba(144, 111, 225, 0.4);
  background: rgba(144, 111, 225, 0.08);
}

.status-tab--active {
  background: linear-gradient(135deg, rgba(144, 111, 225, 0.18), rgba(236, 72, 153, 0.10));
  border-color: rgba(144, 111, 225, 0.45);
  color: rgba(17, 24, 39, 0.95);
}

.status-tab__dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  flex-shrink: 0;
}

.dot--warning { background: #f59e0b; }
.dot--info    { background: #3b82f6; }
.dot--success { background: #22c55e; }
.dot--muted   { background: rgba(148, 163, 184, 0.6); }

.status-tab__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.2);
  font-size: 0.72rem;
  font-weight: 900;
}

.status-tab--active .status-tab__count {
  background: rgba(144, 111, 225, 0.22);
}

/* ===== Skeleton loading ===== */
.orders-skeleton {
  display: grid;
  gap: 0.6rem;
}

.order-skeleton-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  padding: 0.85rem;
  background: rgba(255, 255, 255, 0.6);
}

.skel {
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(148, 163, 184, 0.15) 25%, rgba(148, 163, 184, 0.3) 50%, rgba(148, 163, 184, 0.15) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skel--title { height: 16px; width: 55%; }
.skel--line  { height: 12px; width: 80%; }
.skel--bar   { height: 8px; width: 100%; border-radius: 999px; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ===== Order card items ===== */
.order-cards-grid {
  display: grid;
  gap: 0.6rem;
}

.oci {
  position: relative;
  text-align: left;
  width: 100%;
  border: 1.5px solid rgba(148, 163, 184, 0.22);
  border-radius: 16px;
  padding: 0.85rem;
  background: rgba(255, 255, 255, 0.78);
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
  overflow: hidden;
}

.oci:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.10);
}

.oci--active {
  border-color: rgba(144, 111, 225, 0.6);
  background: linear-gradient(135deg, rgba(144, 111, 225, 0.07), rgba(236, 72, 153, 0.04));
  box-shadow: 0 0 0 3px rgba(144, 111, 225, 0.12);
}

.oci--cerrado {
  opacity: 0.75;
}

.oci--cerrado.oci--active {
  opacity: 1;
  border-color: rgba(34, 197, 94, 0.55);
  background: rgba(34, 197, 94, 0.05);
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
}

.oci__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.oci__row--top {
  margin-bottom: 0.45rem;
}

.oci__folio {
  font-size: 0.95rem;
  font-weight: 1000;
  color: rgba(17, 24, 39, 0.92);
  letter-spacing: 0.01em;
}

.oci__icon {
  color: rgba(144, 111, 225, 0.85);
}

.oci__badge {
  font-size: 0.72rem;
  font-weight: 900;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.55rem;
  white-space: nowrap;
}

.oci__badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.7;
}

.oci__client {
  font-size: 0.88rem;
  font-weight: 900;
  color: rgba(17, 24, 39, 0.88);
  margin-bottom: 0.2rem;
}

.oci__sheet {
  font-size: 0.8rem;
  font-weight: 800;
  color: rgba(107, 114, 128, 0.95);
}

.oci__meta-icon {
  font-size: 0.75rem;
  color: rgba(144, 111, 225, 0.7);
}

.oci__progress-track {
  height: 6px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.2);
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.oci__progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(144, 111, 225, 0.85), rgba(236, 72, 153, 0.7));
  transition: width 300ms ease;
}

.oci__progress-fill--done {
  background: linear-gradient(90deg, #22c55e, #16a34a);
}

.oci__progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.76rem;
  font-weight: 800;
  color: rgba(107, 114, 128, 0.95);
}

.oci__pct {
  font-weight: 1000;
  color: rgba(144, 111, 225, 0.9);
}

.oci__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgba(107, 114, 128, 0.85);
}

.oci__lines-count {
  background: rgba(148, 163, 184, 0.15);
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  font-size: 0.72rem;
}

.oci__selected-mark {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  font-size: 0.9rem;
  color: rgba(144, 111, 225, 0.9);
  opacity: 0.85;
}

/* ===== Logs section ===== */
.logs-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 700px) {
  .logs-section {
    grid-template-columns: 1fr;
  }
}


.logs-head {
  display: flex;
  align-items: center;
  font-size: 0.82rem;
  font-weight: 1000;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.35rem 0.55rem;
  border-radius: 10px;
  margin-bottom: 0.6rem;
}

.logs-head--in {
  background: rgba(34, 197, 94, 0.1);
  color: rgba(21, 128, 61, 0.9);
  border: 1px solid rgba(34, 197, 94, 0.22);
}

.logs-head--out {
  background: rgba(59, 130, 246, 0.1);
  color: rgba(29, 78, 216, 0.9);
  border: 1px solid rgba(59, 130, 246, 0.22);
}

.logs-badge {
  margin-left: auto;
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 999px;
  padding: 0.05rem 0.45rem;
  font-size: 0.72rem;
  font-weight: 900;
  color: rgba(17, 24, 39, 0.75);
}

.logs-empty {
  font-size: 0.82rem;
  font-weight: 800;
  color: rgba(107, 114, 128, 0.8);
  padding: 0.6rem 0;
}

.logs-loading {
  position: relative;
  height: 48px;
}

.logs-feed {
  display: grid;
  gap: 0.4rem;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 2px;
}

.logs-feed::-webkit-scrollbar {
  width: 4px;
}
.logs-feed::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 2px;
}

.log-card {
  border-radius: 12px;
  padding: 0.6rem 0.65rem;
  font-size: 0.8rem;
  font-weight: 800;
  transition: transform 100ms ease;
}

.log-card:hover {
  transform: translateX(2px);
}

.log-card--in {
  border: 1px solid rgba(34, 197, 94, 0.18);
  background: rgba(34, 197, 94, 0.05);
  border-left: 3px solid rgba(34, 197, 94, 0.5);
}

.log-card--out {
  border: 1px solid rgba(59, 130, 246, 0.18);
  background: rgba(59, 130, 246, 0.05);
  border-left: 3px solid rgba(59, 130, 246, 0.5);
}

.log-card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.2rem;
}

.log-card__folio {
  font-weight: 1000;
  font-size: 0.82rem;
  color: rgba(17, 24, 39, 0.9);
}

.log-card__date {
  font-size: 0.72rem;
  font-weight: 800;
  color: rgba(107, 114, 128, 0.85);
}

.log-card__client {
  font-weight: 900;
  color: rgba(17, 24, 39, 0.85);
  margin-bottom: 0.15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-card__code {
  font-size: 0.78rem;
  font-weight: 900;
  color: rgba(17, 24, 39, 0.88);
  margin-bottom: 0.15rem;
}

.log-card__meta {
  display: flex;
  justify-content: space-between;
  color: rgba(107, 114, 128, 0.9);
  font-size: 0.76rem;
}

.log-card__pill {
  background: rgba(148, 163, 184, 0.18);
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.2);
}
</style>