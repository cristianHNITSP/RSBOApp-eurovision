<template>
  <div class="mermas-view">
    <header class="mermas-header">
      <div>
        <h1 class="title is-4 mb-1">
          <i class="fas fa-trash-can mr-2"></i>Mermas
        </h1>
        <p class="subtitle is-7 has-text-grey">
          Registro unificado de pérdidas, roturas y defectos por origen.
        </p>
      </div>
      <div class="mermas-header__actions">
        <MermaButton
          :prefill="{}"
          label="Registrar merma"
          size="is-small"
          type="is-warning"
          icon-left="plus"
          @created="onCreated"
        />
        <b-button size="is-small" icon-left="rotate" @click="reload">Refrescar</b-button>
      </div>
    </header>

    <section class="mermas-stats" v-if="stats">
      <div class="stat-card">
        <span class="stat-card__label">Total</span>
        <span class="stat-card__val">{{ stats.totals?.count || 0 }}</span>
        <span class="stat-card__sub">{{ stats.totals?.qtyTotal || 0 }} unidades</span>
      </div>
      <div class="stat-card" v-for="o in stats.byOrigin" :key="o._id">
        <span class="stat-card__label">{{ originLabel(o._id) }}</span>
        <span class="stat-card__val">{{ o.count }}</span>
        <span class="stat-card__sub">{{ o.qtyTotal }} unidades</span>
      </div>
    </section>

    <section class="mermas-filters">
      <b-field label="Origen" label-position="on-border">
        <b-select v-model="filters.origin" @update:model-value="setFilter({ origin: $event })">
          <option :value="null">Todos</option>
          <option value="LAB">Laboratorio</option>
          <option value="VENTAS">Ventas</option>
          <option value="DEVOLUCION">Devolución</option>
          <option value="INVENTARIO">Inventario</option>
        </b-select>
      </b-field>
      <b-field label="Buscar" label-position="on-border" expanded>
        <b-input
          v-model="filters.search"
          placeholder="Folio o codebar"
          icon="search"
          @input="onSearchInput"
        />
      </b-field>
    </section>

    <section class="mermas-table">
      <div v-if="loading" class="loading-row">
        <b-loading :is-full-page="false" :model-value="true" />
      </div>
      <div v-else-if="!items.length" class="empty">
        <i class="fas fa-inbox empty__icon"></i>
        <p>No hay mermas registradas con estos filtros.</p>
      </div>
      <div v-else>
        <div class="merma-row" v-for="m in items" :key="m._id">
          <div class="merma-row__head">
            <span class="merma-row__folio">{{ m.folio }}</span>
            <span class="tag" :class="originClass(m.origin)">{{ originLabel(m.origin) }}</span>
            <span class="tag is-light">{{ m.reason }}</span>
            <span class="merma-row__qty">−{{ m.qty }} u.</span>
          </div>
          
          <div class="merma-row__sheet mb-1">
            <span class="is-size-7 has-text-weight-semibold">
              <i class="fas fa-layer-group mr-1"></i>{{ m.sheet?.nombre || 'Planilla desconocida' }}
            </span>
            <span v-if="m.laboratoryOrder" class="ml-3 is-size-7 has-text-info">
              <i class="fas fa-flask mr-1"></i>{{ m.laboratoryOrder.folio }} | {{ m.laboratoryOrder.cliente }}
            </span>
            <span v-else-if="m.ventaFolio" class="ml-3 is-size-7 has-text-success">
              <i class="fas fa-shopping-cart mr-1"></i>{{ m.ventaFolio }}
            </span>
          </div>

          <div class="merma-row__meta">
            <span v-if="m.codebar"><i class="fas fa-barcode mr-1"></i>{{ m.codebar }}</span>
            <span><i class="fas fa-key mr-1"></i>{{ formatKey(m.matrixKey, m.tipo_matriz) }}<span v-if="m.eye"> · {{ m.eye }}</span></span>
            <span><i class="fas fa-user mr-1"></i>{{ m.actor?.name || '—' }}</span>
            <span>{{ fmtDate(m.createdAt) }}</span>
          </div>
          <div class="merma-row__stock">
            stock: <strong>{{ m.stockBefore }}</strong> → <strong class="has-text-danger">{{ m.stockAfter }}</strong>
          </div>
          <div v-if="m.notes" class="merma-row__notes">{{ m.notes }}</div>
        </div>

        <div class="pagination-row" v-if="meta.pages > 1">
          <b-button size="is-small" :disabled="meta.page <= 1" @click="setFilter({ page: meta.page - 1 })" icon-left="chevron-left" />
          <span class="pg-info">Página {{ meta.page }} de {{ meta.pages }}</span>
          <b-button size="is-small" :disabled="meta.page >= meta.pages" @click="setFilter({ page: meta.page + 1 })" icon-right="chevron-right" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import MermaButton from "@/components/mermas/MermaButton.vue";
import { useMermas } from "@/composables/api/useMermas.js";

const { items, meta, loading, stats, filters, load, loadStats, setFilter } = useMermas();

let searchTimer = null;
function onSearchInput(val) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => setFilter({ search: val || "" }), 350);
}

function reload() {
  load();
  loadStats();
}

function onCreated() {
  reload();
}

function originLabel(o) {
  return ({ LAB: "Laboratorio", VENTAS: "Ventas", DEVOLUCION: "Devolución", INVENTARIO: "Inventario" })[o] || o;
}
function originClass(o) {
  return ({
    LAB:        "is-info",
    VENTAS:     "is-success",
    DEVOLUCION: "is-warning",
    INVENTARIO: "is-light",
  })[o] || "is-light";
}

function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }); }
  catch { return d; }
}

function formatKey(key, tipo) {
  if (!key) return "—";
  
  const denorm = (s) => {
    if (!s || s === "x") return "—";
    let val = s;
    let sign = "";
    if (String(s).startsWith("m")) {
      val = String(s).slice(1);
      sign = "-";
    }
    return sign + String(val).replace("d", ".");
  };

  try {
    const parts = key.split("|").map(denorm);
    switch (tipo) {
      case "BASE":     return `Base: ${parts[0]}`;
      case "SPH_CYL":  return `SPH: ${parts[0]} | CYL: ${parts[1]}`;
      case "SPH_ADD":  return `SPH: ${parts[0]} | ADD: ${parts[1]}`;
      case "BASE_ADD": return `Base: ${parts[0]} | ADD: ${parts[1]}`;
      default:         return key;
    }
  } catch {
    return key;
  }
}

onMounted(() => {
  load();
  loadStats();
});
</script>

<style scoped>
.mermas-view { padding: 1rem 1.25rem; }
.mermas-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap; }
.mermas-header__actions { display: flex; gap: .5rem; }
.mermas-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: .75rem; margin-bottom: 1rem; }
.stat-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(120,120,120,0.18); border-radius: 10px; padding: .75rem; display: flex; flex-direction: column; }
.stat-card__label { font-size: .7rem; letter-spacing: .05em; text-transform: uppercase; color: var(--text-muted, #888); }
.stat-card__val { font-size: 1.6rem; font-weight: 700; line-height: 1.1; }
.stat-card__sub { font-size: .75rem; color: var(--text-muted, #888); }
.mermas-filters { display: flex; gap: .75rem; margin-bottom: 1rem; flex-wrap: wrap; }
.mermas-table { background: rgba(255,255,255,0.02); border-radius: 10px; padding: .5rem; min-height: 240px; position: relative; }
.merma-row { padding: .75rem; border-bottom: 1px solid rgba(120,120,120,0.12); }
.merma-row:last-child { border-bottom: none; }
.merma-row__head { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; margin-bottom: .25rem; }
.merma-row__folio { font-family: monospace; font-weight: 700; }
.merma-row__qty { margin-left: auto; color: var(--danger, #d33); font-weight: 700; }
.merma-row__meta { display: flex; gap: 1rem; flex-wrap: wrap; font-size: .8rem; color: var(--text-muted, #888); }
.merma-row__stock { font-size: .8rem; margin-top: .25rem; }
.merma-row__notes { font-size: .8rem; color: var(--text-muted, #888); margin-top: .25rem; font-style: italic; }
.pagination-row { display: flex; align-items: center; justify-content: center; gap: .75rem; padding: 1rem; }
.pg-info { font-size: .85rem; color: var(--text-muted, #888); }
.empty { text-align: center; padding: 2rem; color: var(--text-muted, #888); }
.empty__icon { font-size: 2rem; display: block; margin-bottom: .5rem; }
.loading-row { position: relative; min-height: 120px; }
</style>
