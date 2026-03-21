<template>
  <div class="dv-root">

    <!-- ░░ Orbs glassmorphism ░░ -->
    <div class="glass-bg" aria-hidden="true">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>

    <!-- ══ HERO ══ -->
    <section class="dv-hero">
      <div class="hero-left">
        <div class="hero-icon-wrap">
          <i class="fas fa-rotate-left hero-icon"></i>
        </div>
        <div>
          <h1 class="hero-title">Devoluciones</h1>
          <p class="hero-sub">Gestión de devoluciones · {{ canManageDevolutions ? 'Vista completa' : 'Vista de lectura' }}</p>
        </div>
      </div>
      <div class="hero-right">
        <button v-if="canCreateDevolution" class="btn-create" @click="openCreate">
          <i class="fas fa-plus"></i> Nueva devolución
        </button>
        <button class="btn-refresh" @click="load" :class="{ spinning: loading }">
          <i class="fas fa-arrows-rotate"></i>
        </button>
      </div>
    </section>

    <!-- ══ KPI STRIP ══ -->
    <section class="kpi-strip" v-if="stats">
      <div class="kpi-card">
        <div class="kpi-icon kpi-orange"><i class="fas fa-clock"></i></div>
        <div>
          <div class="kpi-val">{{ stats.pendientes ?? 0 }}</div>
          <div class="kpi-label">Pendientes</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon kpi-blue"><i class="fas fa-magnifying-glass"></i></div>
        <div>
          <div class="kpi-val">{{ stats.enRevision ?? 0 }}</div>
          <div class="kpi-label">En revisión</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon kpi-green"><i class="fas fa-circle-check"></i></div>
        <div>
          <div class="kpi-val">{{ stats.aprobadas ?? 0 }}</div>
          <div class="kpi-label">Aprobadas</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon kpi-red"><i class="fas fa-circle-xmark"></i></div>
        <div>
          <div class="kpi-val">{{ stats.rechazadas ?? 0 }}</div>
          <div class="kpi-label">Rechazadas</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon kpi-purple"><i class="fas fa-box-archive"></i></div>
        <div>
          <div class="kpi-val">{{ stats.procesadas ?? 0 }}</div>
          <div class="kpi-label">Procesadas</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon kpi-cyan"><i class="fas fa-calendar-days"></i></div>
        <div>
          <div class="kpi-val">{{ stats.total7d ?? 0 }}</div>
          <div class="kpi-label">Últimos 7 días</div>
        </div>
      </div>
    </section>

    <!-- ══ FILTROS ══ -->
    <section class="filter-bar">
      <div class="filter-tabs">
        <button
          v-for="tab in STATUS_TABS"
          :key="tab.value"
          class="ftab"
          :class="{ active: activeStatus === tab.value }"
          @click="setStatus(tab.value)"
        >
          <i :class="tab.icon"></i>
          {{ tab.label }}
          <span class="ftab-count" v-if="tab.value !== 'all'">{{ statsCount(tab.value) }}</span>
        </button>
      </div>
      <div class="search-wrap">
        <i class="fas fa-search search-ico"></i>
        <input
          v-model="searchQ"
          class="search-input"
          placeholder="Buscar folio, cliente, pedido..."
          @keyup.enter="load"
        />
        <button v-if="searchQ" class="search-clear" @click="searchQ = ''; load()">
          <i class="fas fa-xmark"></i>
        </button>
      </div>
    </section>

    <!-- ══ LISTADO POR DÍA ══ -->
    <section class="dv-list">

      <!-- Loading skeleton -->
      <template v-if="loading">
        <div class="day-group" v-for="n in 3" :key="'sk'+n">
          <div class="day-label"><span class="day-text skeleton-text" style="width:120px;height:14px;display:inline-block;border-radius:4px;background:var(--bg-muted)"></span></div>
          <div class="dv-card skeleton-card" v-for="m in 2" :key="'skc'+m"></div>
        </div>
      </template>

      <!-- Sin resultados -->
      <div v-else-if="!loading && grouped.length === 0" class="empty-state">
        <i class="fas fa-box-open empty-ico"></i>
        <p>No hay devoluciones{{ activeStatus !== 'all' ? ' con este estado' : '' }}</p>
        <button v-if="canCreateDevolution" class="btn-create mt-2" @click="openCreate">
          <i class="fas fa-plus"></i> Crear primera devolución
        </button>
      </div>

      <!-- Grupos por día -->
      <template v-else>
        <div class="day-group" v-for="group in grouped" :key="group.label">
          <div class="day-label">
            <span class="day-text">{{ group.label }}</span>
            <span class="day-count">{{ group.items.length }}</span>
          </div>

          <div class="dv-card" v-for="dev in group.items" :key="dev._id">
            <!-- Franja de estado -->
            <div class="card-stripe" :class="'stripe-' + dev.status"></div>

            <div class="card-body">
              <!-- Cabecera -->
              <div class="card-head">
                <div class="card-id-block">
                  <span class="card-folio">{{ dev.folio }}</span>
                  <span v-if="dev.orderFolio" class="card-order-folio">
                    <i class="fas fa-link"></i> {{ dev.orderFolio }}
                  </span>
                </div>
                <span class="status-badge" :class="'badge-' + dev.status">
                  <i :class="statusIcon(dev.status)"></i>
                  {{ statusLabel(dev.status) }}
                </span>
              </div>

              <!-- Info principal -->
              <div class="card-info-row">
                <div class="info-cell">
                  <i class="fas fa-user info-ico"></i>
                  <span>{{ dev.cliente }}</span>
                </div>
                <div class="info-cell" v-if="dev.clientePhone">
                  <i class="fas fa-phone info-ico"></i>
                  <span>{{ dev.clientePhone }}</span>
                </div>
                <div class="info-cell">
                  <i class="fas fa-tag info-ico"></i>
                  <span>{{ reasonLabel(dev.reason) }}</span>
                </div>
                <div class="info-cell">
                  <i class="fas fa-calendar info-ico"></i>
                  <span>{{ fmtTime(dev.createdAt) }}</span>
                </div>
                <div class="info-cell" v-if="dev.createdBy?.name">
                  <i class="fas fa-pen info-ico"></i>
                  <span>{{ dev.createdBy.name }}</span>
                </div>
              </div>

              <!-- Resumen de ítems -->
              <div class="card-items" v-if="dev.items?.length">
                <span class="item-chip" v-for="(it, i) in dev.items.slice(0, 4)" :key="i">
                  <span class="item-cb">{{ it.codebar || it.sku || '—' }}</span>
                  <span class="item-qty">×{{ it.qty }}</span>
                  <span class="item-cond" :class="'cond-' + it.condition">{{ condLabel(it.condition) }}</span>
                  <span v-if="it.restoreStock" class="item-restore" title="Reingresa stock"><i class="fas fa-arrow-up-to-line"></i></span>
                </span>
                <span class="item-chip item-more" v-if="dev.items.length > 4">+{{ dev.items.length - 4 }} más</span>
              </div>

              <!-- Detalle/notas -->
              <div class="card-notes" v-if="dev.reasonDetail || dev.notes">
                <i class="fas fa-comment-dots notes-ico"></i>
                <span>{{ dev.reasonDetail || dev.notes }}</span>
              </div>

              <!-- Procesado por -->
              <div class="card-processed" v-if="dev.processedBy?.name">
                <i class="fas fa-user-check proc-ico"></i>
                <span>Procesado por <strong>{{ dev.processedBy.name }}</strong>
                  {{ dev.processedAt ? '· ' + fmtDate(dev.processedAt) : '' }}</span>
                <span v-if="dev.stockRestored" class="stock-restored-badge">
                  <i class="fas fa-boxes-stacked"></i> Stock restaurado
                </span>
              </div>
            </div>

            <!-- Acciones inline (solo para gestores) -->
            <div class="card-actions" v-if="canManageDevolutions">
              <!-- Transiciones rápidas para supervisor/eurovision -->
              <template v-if="dev.status === 'pendiente'">
                <button class="act-btn act-review" @click="quickAction(dev, 'en_revision')" title="Poner en revisión">
                  <i class="fas fa-magnifying-glass"></i> En revisión
                </button>
                <button class="act-btn act-reject" @click="openReject(dev)" title="Rechazar">
                  <i class="fas fa-xmark"></i> Rechazar
                </button>
              </template>
              <template v-if="dev.status === 'en_revision'">
                <button class="act-btn act-approve" @click="quickAction(dev, 'aprobada')" title="Aprobar">
                  <i class="fas fa-check"></i> Aprobar
                </button>
                <button class="act-btn act-reject" @click="openReject(dev)" title="Rechazar">
                  <i class="fas fa-xmark"></i> Rechazar
                </button>
              </template>
              <template v-if="dev.status === 'aprobada'">
                <button class="act-btn act-process" @click="openProcess(dev)" title="Marcar como procesada">
                  <i class="fas fa-box-archive"></i> Procesar
                </button>
              </template>

              <!-- Ver detalle siempre -->
              <button class="act-btn act-detail" @click="openDetail(dev)">
                <i class="fas fa-eye"></i> Detalle
              </button>
            </div>
            <div class="card-actions" v-else>
              <button class="act-btn act-detail" @click="openDetail(dev)">
                <i class="fas fa-eye"></i> Ver detalle
              </button>
            </div>
          </div>
        </div>

        <!-- Paginación -->
        <div class="pagination-row" v-if="meta.pages > 1">
          <button class="pg-btn" :disabled="meta.page <= 1" @click="changePage(meta.page - 1)">
            <i class="fas fa-chevron-left"></i>
          </button>
          <span class="pg-info">Página {{ meta.page }} de {{ meta.pages }}</span>
          <button class="pg-btn" :disabled="meta.page >= meta.pages" @click="changePage(meta.page + 1)">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </template>
    </section>

    <!-- ══ MODAL: DETALLE ══ -->
    <div class="dv-modal-overlay" v-if="detailDev" @click.self="detailDev = null">
      <div class="dv-modal">
        <button class="modal-close" @click="detailDev = null"><i class="fas fa-xmark"></i></button>

        <div class="modal-header">
          <span class="modal-folio">{{ detailDev.folio }}</span>
          <span class="status-badge" :class="'badge-' + detailDev.status">
            <i :class="statusIcon(detailDev.status)"></i>
            {{ statusLabel(detailDev.status) }}
          </span>
        </div>

        <div class="modal-section">
          <div class="modal-row"><span class="mrow-label">Cliente</span><span>{{ detailDev.cliente }}</span></div>
          <div class="modal-row" v-if="detailDev.clientePhone"><span class="mrow-label">Teléfono</span><span>{{ detailDev.clientePhone }}</span></div>
          <div class="modal-row" v-if="detailDev.orderFolio"><span class="mrow-label">Pedido vinculado</span><span>{{ detailDev.orderFolio }}</span></div>
          <div class="modal-row"><span class="mrow-label">Motivo</span><span>{{ reasonLabel(detailDev.reason) }}</span></div>
          <div class="modal-row" v-if="detailDev.reasonDetail"><span class="mrow-label">Detalle</span><span>{{ detailDev.reasonDetail }}</span></div>
          <div class="modal-row" v-if="detailDev.notes"><span class="mrow-label">Notas internas</span><span>{{ detailDev.notes }}</span></div>
          <div class="modal-row"><span class="mrow-label">Creado por</span><span>{{ detailDev.createdBy?.name || '—' }}</span></div>
          <div class="modal-row"><span class="mrow-label">Fecha</span><span>{{ fmtDate(detailDev.createdAt) }}</span></div>
          <div class="modal-row" v-if="detailDev.processedBy?.name"><span class="mrow-label">Procesado por</span><span>{{ detailDev.processedBy.name }}</span></div>
          <div class="modal-row" v-if="detailDev.stockRestored"><span class="mrow-label">Stock</span><span class="stock-ok"><i class="fas fa-check"></i> Restaurado al inventario</span></div>
        </div>

        <div class="modal-section" v-if="detailDev.items?.length">
          <div class="msec-title">Ítems ({{ detailDev.items.length }})</div>
          <div class="item-row" v-for="(it, i) in detailDev.items" :key="i">
            <div class="item-row-main">
              <span class="item-cb-big">{{ it.codebar || it.sku || '—' }}</span>
              <span v-if="it.description" class="item-desc">{{ it.description }}</span>
            </div>
            <div class="item-row-meta">
              <span class="item-qty-big">×{{ it.qty }}</span>
              <span class="item-cond" :class="'cond-' + it.condition">{{ condLabel(it.condition) }}</span>
              <span v-if="it.restoreStock" class="item-restore">
                <i class="fas fa-arrow-up-to-line"></i> Reingresa stock
              </span>
            </div>
          </div>
        </div>

        <!-- Acción desde modal si es gestor -->
        <div class="modal-actions" v-if="canManageDevolutions && detailDev.status !== 'procesada' && detailDev.status !== 'rechazada'">
          <div class="modal-notes-row">
            <textarea v-model="actionNotes" class="modal-textarea" placeholder="Notas (opcional)..." rows="2"></textarea>
          </div>
          <div class="modal-btn-row">
            <button
              v-if="detailDev.status === 'pendiente'"
              class="act-btn act-review"
              @click="applyAction(detailDev, 'en_revision')"
            ><i class="fas fa-magnifying-glass"></i> En revisión</button>
            <button
              v-if="detailDev.status === 'en_revision' || detailDev.status === 'pendiente'"
              class="act-btn act-approve"
              @click="applyAction(detailDev, 'aprobada')"
            ><i class="fas fa-check"></i> Aprobar</button>
            <button
              v-if="detailDev.status === 'aprobada'"
              class="act-btn act-process"
              @click="applyAction(detailDev, 'procesada')"
            ><i class="fas fa-box-archive"></i> Procesar</button>
            <button
              v-if="['pendiente','en_revision','aprobada'].includes(detailDev.status)"
              class="act-btn act-reject"
              @click="applyAction(detailDev, 'rechazada')"
            ><i class="fas fa-xmark"></i> Rechazar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ MODAL: RECHAZAR ══ -->
    <div class="dv-modal-overlay" v-if="rejectTarget" @click.self="rejectTarget = null">
      <div class="dv-modal dv-modal-sm">
        <button class="modal-close" @click="rejectTarget = null"><i class="fas fa-xmark"></i></button>
        <div class="modal-header">
          <span class="modal-folio">Rechazar {{ rejectTarget.folio }}</span>
        </div>
        <div class="modal-section">
          <label class="modal-label">Motivo del rechazo</label>
          <textarea v-model="rejectNotes" class="modal-textarea" rows="3" placeholder="Explica por qué se rechaza..."></textarea>
        </div>
        <div class="modal-btn-row">
          <button class="act-btn act-reject" @click="confirmReject">
            <i class="fas fa-xmark"></i> Confirmar rechazo
          </button>
          <button class="act-btn act-detail" @click="rejectTarget = null">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- ══ MODAL: PROCESAR (con opción de restaurar stock) ══ -->
    <div class="dv-modal-overlay" v-if="processTarget" @click.self="processTarget = null">
      <div class="dv-modal dv-modal-sm">
        <button class="modal-close" @click="processTarget = null"><i class="fas fa-xmark"></i></button>
        <div class="modal-header">
          <span class="modal-folio">Procesar {{ processTarget.folio }}</span>
        </div>
        <div class="modal-section">
          <div class="process-info">
            <i class="fas fa-circle-info process-info-ico"></i>
            <p>Al procesar esta devolución, se marcará como completada.
              <template v-if="processTarget.restoreStock && !processTarget.stockRestored">
                El sistema restaurará automáticamente el stock de los ítems marcados.
              </template>
              <template v-else-if="processTarget.stockRestored">
                El stock ya fue restaurado previamente.
              </template>
            </p>
          </div>
          <label class="modal-label">Notas de cierre (opcional)</label>
          <textarea v-model="processNotes" class="modal-textarea" rows="2" placeholder="Observaciones..."></textarea>
        </div>
        <div class="modal-btn-row">
          <button class="act-btn act-process" @click="confirmProcess">
            <i class="fas fa-box-archive"></i> Confirmar procesado
          </button>
          <button class="act-btn act-detail" @click="processTarget = null">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- ══ MODAL: CREAR DEVOLUCIÓN ══ -->
    <div class="dv-modal-overlay" v-if="showCreate" @click.self="showCreate = false">
      <div class="dv-modal dv-modal-lg">
        <button class="modal-close" @click="showCreate = false"><i class="fas fa-xmark"></i></button>
        <div class="modal-header">
          <span class="modal-folio">Nueva devolución</span>
        </div>

        <div class="modal-section">
          <div class="form-grid">
            <div class="form-field">
              <label class="modal-label">Cliente <span class="req">*</span></label>
              <input v-model="form.cliente" class="form-input" placeholder="Nombre del cliente" />
            </div>
            <div class="form-field">
              <label class="modal-label">Teléfono</label>
              <input v-model="form.clientePhone" class="form-input" placeholder="Teléfono" />
            </div>
            <div class="form-field">
              <label class="modal-label">Folio del pedido (opcional)</label>
              <input v-model="form.orderFolio" class="form-input" placeholder="LAB-XXXXXXXX-XXXX" />
            </div>
            <div class="form-field">
              <label class="modal-label">Motivo <span class="req">*</span></label>
              <select v-model="form.reason" class="form-input">
                <option value="">— Seleccionar —</option>
                <option v-for="r in REASONS" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
            </div>
          </div>
          <div class="form-field mt-2">
            <label class="modal-label">Descripción del problema</label>
            <textarea v-model="form.reasonDetail" class="modal-textarea" rows="2" placeholder="Describe el problema en detalle..."></textarea>
          </div>
          <div class="form-field mt-2">
            <label class="modal-label">Notas internas</label>
            <textarea v-model="form.notes" class="modal-textarea" rows="2" placeholder="Notas solo visibles para el equipo..."></textarea>
          </div>
        </div>

        <!-- Ítems -->
        <div class="modal-section">
          <div class="msec-title">
            Ítems devueltos
            <button class="add-item-btn" @click="addItem">
              <i class="fas fa-plus"></i> Agregar ítem
            </button>
          </div>
          <div class="form-item-row" v-for="(it, i) in form.items" :key="i">
            <input v-model="it.codebar" class="form-input fi-code" placeholder="Código de barras" />
            <input v-model="it.description" class="form-input fi-desc" placeholder="Descripción" />
            <input v-model.number="it.qty" type="number" min="1" class="form-input fi-qty" placeholder="Cant." />
            <select v-model="it.condition" class="form-input fi-cond">
              <option value="bueno">Bueno</option>
              <option value="danado">Dañado</option>
              <option value="defectuoso">Defectuoso</option>
            </select>
            <label class="fi-restore" :title="'Reingresa stock al inventario'">
              <input type="checkbox" v-model="it.restoreStock" />
              <i class="fas fa-arrow-up-to-line"></i>
            </label>
            <button class="fi-del" @click="removeItem(i)" title="Eliminar ítem">
              <i class="fas fa-trash"></i>
            </button>
          </div>
          <div class="form-restore-note" v-if="form.items.some(i => i.restoreStock)">
            <i class="fas fa-circle-info"></i>
            Los ítems marcados con <i class="fas fa-arrow-up-to-line"></i> reingresarán stock al inventario cuando se procese la devolución.
          </div>
        </div>

        <div class="modal-btn-row">
          <button class="act-btn act-approve" @click="submitCreate" :disabled="creating">
            <i class="fas fa-floppy-disk"></i>
            {{ creating ? 'Guardando…' : 'Crear devolución' }}
          </button>
          <button class="act-btn act-detail" @click="showCreate = false">Cancelar</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, toRef } from "vue";
import {
  fetchDevolutions,
  fetchDevolutionStats,
  createDevolution,
  updateDevolutionStatus,
} from "@/services/devolutions.js";
import { useDashboardStats } from "@/composables/useDashboardStats.js";
import { labToast } from "@/composables/useLabToast.js";

// ── Props (DashboardLayout pasa :user a todos los hijos) ─────────────────────
const props = defineProps({ user: Object, loading: Boolean });
const userRef = toRef(props, "user");

const { canManageDevolutions, canSeeDevolutions, role } = useDashboardStats(userRef);

const canCreateDevolution = computed(() =>
  ["root", "eurovision", "supervisor", "ventas"].includes(role.value)
);

// ── State ────────────────────────────────────────────────────────────────────
const items      = ref([]);
const meta       = ref({ total: 0, page: 1, limit: 20, pages: 1 });
const loading    = ref(false);
const stats      = ref(null);

const activeStatus = ref("all");
const searchQ      = ref("");
const currentPage  = ref(1);

const detailDev    = ref(null);
const actionNotes  = ref("");
const rejectTarget = ref(null);
const rejectNotes  = ref("");
const processTarget = ref(null);
const processNotes  = ref("");
const showCreate   = ref(false);
const creating     = ref(false);

const form = ref(defaultForm());

function defaultForm() {
  return {
    cliente:      "",
    clientePhone: "",
    orderFolio:   "",
    reason:       "",
    reasonDetail: "",
    notes:        "",
    items:        [],
  };
}

// ── Constantes ───────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { value: "all",        label: "Todas",       icon: "fas fa-list" },
  { value: "pendiente",  label: "Pendientes",  icon: "fas fa-clock" },
  { value: "en_revision",label: "En revisión", icon: "fas fa-magnifying-glass" },
  { value: "aprobada",   label: "Aprobadas",   icon: "fas fa-check" },
  { value: "rechazada",  label: "Rechazadas",  icon: "fas fa-xmark" },
  { value: "procesada",  label: "Procesadas",  icon: "fas fa-box-archive" },
];

const REASONS = [
  { value: "defecto_fabricacion",   label: "Defecto de fabricación" },
  { value: "error_prescripcion",    label: "Error en prescripción" },
  { value: "insatisfaccion_cliente",label: "Insatisfacción del cliente" },
  { value: "dano_transporte",       label: "Daño en transporte" },
  { value: "lente_roto",            label: "Lente roto" },
  { value: "pedido_incorrecto",     label: "Pedido incorrecto" },
  { value: "garantia",              label: "Garantía" },
  { value: "otro",                  label: "Otro" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function statusLabel(s) {
  const map = { pendiente:"Pendiente", en_revision:"En revisión", aprobada:"Aprobada", rechazada:"Rechazada", procesada:"Procesada" };
  return map[s] || s;
}
function statusIcon(s) {
  const map = { pendiente:"fas fa-clock", en_revision:"fas fa-magnifying-glass", aprobada:"fas fa-check", rechazada:"fas fa-xmark", procesada:"fas fa-box-archive" };
  return map[s] || "fas fa-circle";
}
function reasonLabel(r) {
  return REASONS.find(x => x.value === r)?.label || r || "—";
}
function condLabel(c) {
  return { bueno:"Bueno", danado:"Dañado", defectuoso:"Defectuoso" }[c] || c;
}
function statsCount(status) {
  if (!stats.value) return 0;
  return { pendiente: stats.value.pendientes, en_revision: stats.value.enRevision, aprobada: stats.value.aprobadas, rechazada: stats.value.rechazadas, procesada: stats.value.procesadas }[status] ?? 0;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}
function dayLabel(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (+day === +today) return "Hoy";
  if (+day === +yesterday) return "Ayer";
  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
}

// ── Computed: agrupación por día ─────────────────────────────────────────────
const grouped = computed(() => {
  const groups = [];
  const seen = new Map();
  for (const dev of items.value) {
    const label = dayLabel(dev.createdAt);
    if (!seen.has(label)) {
      seen.set(label, []);
      groups.push({ label, items: seen.get(label) });
    }
    seen.get(label).push(dev);
  }
  return groups;
});

// ── Data loading ─────────────────────────────────────────────────────────────
async function load() {
  loading.value = true;
  try {
    const params = { page: currentPage.value, limit: 20 };
    if (activeStatus.value !== "all") params.status = activeStatus.value;
    if (searchQ.value.trim()) params.q = searchQ.value.trim();

    const [listRes, statsRes] = await Promise.all([
      fetchDevolutions(params),
      fetchDevolutionStats(),
    ]);

    if (listRes.data?.ok) {
      items.value = listRes.data.data;
      meta.value  = listRes.data.meta;
    }
    if (statsRes.data?.ok) {
      stats.value = statsRes.data.data;
    }
  } catch (e) {
    labToast.danger("Error al cargar devoluciones");
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function setStatus(s) {
  activeStatus.value = s;
  currentPage.value  = 1;
  load();
}

function changePage(p) {
  currentPage.value = p;
  load();
}

// ── Acciones ─────────────────────────────────────────────────────────────────
async function quickAction(dev, newStatus) {
  try {
    await updateDevolutionStatus(dev._id, newStatus, "");
    labToast.success(`Devolución ${dev.folio} → ${statusLabel(newStatus)}`);
    load();
  } catch (e) {
    labToast.danger(e?.response?.data?.error || "Error al actualizar estado");
  }
}

async function applyAction(dev, newStatus) {
  try {
    await updateDevolutionStatus(dev._id, newStatus, actionNotes.value);
    labToast.success(`Devolución ${dev.folio} → ${statusLabel(newStatus)}`);
    detailDev.value = null;
    actionNotes.value = "";
    load();
  } catch (e) {
    labToast.danger(e?.response?.data?.error || "Error al actualizar estado");
  }
}

function openReject(dev) {
  rejectTarget.value = dev;
  rejectNotes.value  = "";
}
async function confirmReject() {
  if (!rejectTarget.value) return;
  try {
    await updateDevolutionStatus(rejectTarget.value._id, "rechazada", rejectNotes.value);
    labToast.success(`Devolución ${rejectTarget.value.folio} rechazada`);
    rejectTarget.value = null;
    load();
  } catch (e) {
    labToast.danger(e?.response?.data?.error || "Error al rechazar");
  }
}

function openProcess(dev) {
  processTarget.value = dev;
  processNotes.value  = "";
}
async function confirmProcess() {
  if (!processTarget.value) return;
  try {
    const res = await updateDevolutionStatus(processTarget.value._id, "procesada", processNotes.value);
    const warnings = res.data?.stockWarnings;
    if (warnings?.length) {
      labToast.warning(`Devolución procesada. ${warnings.length} ítem(s) no pudo(eron) restaurar stock.`);
    } else {
      labToast.success(`Devolución ${processTarget.value.folio} procesada${processTarget.value.restoreStock ? ' · Stock restaurado' : ''}`);
    }
    processTarget.value = null;
    load();
  } catch (e) {
    labToast.danger(e?.response?.data?.error || "Error al procesar");
  }
}

function openDetail(dev) {
  detailDev.value   = dev;
  actionNotes.value = "";
}

// ── Crear devolución ─────────────────────────────────────────────────────────
function openCreate() {
  form.value  = defaultForm();
  showCreate.value = true;
}
function addItem() {
  form.value.items.push({ codebar: "", description: "", qty: 1, condition: "defectuoso", restoreStock: false });
}
function removeItem(i) {
  form.value.items.splice(i, 1);
}
async function submitCreate() {
  if (!form.value.cliente || !form.value.reason) {
    labToast.warning("Cliente y motivo son requeridos");
    return;
  }
  creating.value = true;
  try {
    await createDevolution({
      cliente:      form.value.cliente,
      clientePhone: form.value.clientePhone || null,
      orderFolio:   form.value.orderFolio   || null,
      reason:       form.value.reason,
      reasonDetail: form.value.reasonDetail,
      notes:        form.value.notes,
      items:        form.value.items,
      restoreStock: form.value.items.some(i => i.restoreStock),
    });
    labToast.success("Devolución creada exitosamente");
    showCreate.value = false;
    load();
  } catch (e) {
    labToast.danger(e?.response?.data?.error || "Error al crear devolución");
  } finally {
    creating.value = false;
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────
onMounted(load);
</script>

<!-- ─────────────────────────────────────────────────────────────────────────
     STYLES — Glassmorphism ajustado al sistema de tokens del proyecto
──────────────────────────────────────────────────────────────────────────── -->
<style>
/* Tokens glassmorphism (mismos valores que DashboardHome + Analiticas) */
.dv-root {
  --g-bg:       var(--surface);
  --g-border:   var(--border);
  --g-shadow:   var(--shadow-sm);
  --g-hover:    var(--bg-muted);
  --g-action:   var(--bg-subtle);
  --g-blur:     blur(8px) saturate(140%);
}
[data-theme="dark"] .dv-root {
  --g-bg:       var(--surface);
  --g-border:   var(--border);
  --g-shadow:   var(--shadow-md);
  --g-hover:    var(--bg-muted);
  --g-action:   var(--bg-subtle);
}
</style>

<style scoped>
/* ── Root ── */
.dv-root {
  position: relative;
  min-height: 100vh;
  background: var(--bg-base);
  padding: 1.5rem 1.75rem 3rem;
  overflow-x: hidden;
}

/* ── Orbs ── */
.glass-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.orb { position: absolute; border-radius: 50%; filter: blur(72px); }
.orb-1 { width: 340px; height: 340px; background: rgba(124,58,237,0.07); top: -80px; right: 10%; }
.orb-2 { width: 280px; height: 280px; background: rgba(59,130,246,0.06); top: 40%; left: -60px; }
.orb-3 { width: 240px; height: 240px; background: rgba(16,185,129,0.05); bottom: 5%; right: 15%; }

/* ── Hero ── */
.dv-hero {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: var(--g-bg);
  border: 1px solid var(--g-border);
  border-radius: 16px;
  padding: 1.25rem 1.5rem;
  box-shadow: var(--g-shadow);
  backdrop-filter: var(--g-blur);
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}
.hero-left { display: flex; align-items: center; gap: 1rem; }
.hero-icon-wrap {
  width: 48px; height: 48px; border-radius: 12px;
  background: linear-gradient(135deg, #7c3aed, #3b82f6);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.hero-icon { font-size: 1.25rem; color: #fff; }
.hero-title { font-size: 1.4rem; font-weight: 700; color: var(--text-primary); margin: 0; line-height: 1.2; }
.hero-sub { font-size: 0.8rem; color: var(--text-muted); margin: 0; }
.hero-right { display: flex; gap: 0.5rem; align-items: center; }

.btn-create {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.5rem 1rem; border-radius: 8px; border: none; cursor: pointer;
  background: linear-gradient(135deg, #7c3aed, #3b82f6);
  color: #fff; font-size: 0.82rem; font-weight: 600;
  transition: opacity .15s;
}
.btn-create:hover { opacity: .85; }
.btn-refresh {
  width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--g-border);
  background: var(--g-bg); color: var(--text-muted); cursor: pointer; font-size: .9rem;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.btn-refresh:hover { background: var(--g-hover); }
.btn-refresh.spinning i { animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── KPI Strip ── */
.kpi-strip {
  position: relative; z-index: 1;
  display: flex; gap: 0.75rem; flex-wrap: wrap;
  margin-bottom: 1.25rem;
}
.kpi-card {
  flex: 1 1 140px; min-width: 130px;
  background: var(--g-bg); border: 1px solid var(--g-border);
  border-radius: 12px; padding: 0.9rem 1rem;
  box-shadow: var(--g-shadow); backdrop-filter: var(--g-blur);
  display: flex; align-items: center; gap: 0.75rem;
}
.kpi-icon {
  width: 36px; height: 36px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-size: .9rem; flex-shrink: 0;
}
.kpi-orange { background: rgba(249,115,22,.12); color: #f97316; }
.kpi-blue   { background: rgba(59,130,246,.12);  color: #3b82f6; }
.kpi-green  { background: rgba(16,185,129,.12);  color: #10b981; }
.kpi-red    { background: rgba(239,68,68,.12);   color: #ef4444; }
.kpi-purple { background: rgba(124,58,237,.12);  color: #7c3aed; }
.kpi-cyan   { background: rgba(6,182,212,.12);   color: #06b6d4; }
.kpi-val  { font-size: 1.3rem; font-weight: 700; color: var(--text-primary); line-height: 1; }
.kpi-label{ font-size: 0.72rem; color: var(--text-muted); margin-top: 2px; }

/* ── Filter Bar ── */
.filter-bar {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
  background: var(--g-bg); border: 1px solid var(--g-border);
  border-radius: 12px; padding: 0.65rem 1rem;
  box-shadow: var(--g-shadow); backdrop-filter: var(--g-blur);
  margin-bottom: 1.25rem;
}
.filter-tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; flex: 1; }
.ftab {
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.35rem 0.75rem; border-radius: 8px; border: 1px solid transparent;
  background: transparent; color: var(--text-muted); font-size: 0.78rem; cursor: pointer;
  transition: background .15s, color .15s;
}
.ftab:hover { background: var(--g-hover); color: var(--text-primary); }
.ftab.active { background: var(--g-action); border-color: var(--g-border); color: var(--text-primary); font-weight: 600; }
.ftab-count {
  background: var(--bg-muted); border-radius: 9px; padding: 0 6px;
  font-size: 0.7rem; font-weight: 700; color: var(--text-muted);
}
.ftab.active .ftab-count { background: rgba(124,58,237,.15); color: #7c3aed; }

.search-wrap { position: relative; display: flex; align-items: center; }
.search-ico { position: absolute; left: 0.7rem; color: var(--text-muted); font-size: .8rem; pointer-events: none; }
.search-input {
  padding: 0.4rem 2.2rem; border-radius: 8px;
  border: 1px solid var(--g-border); background: var(--g-action);
  color: var(--text-primary); font-size: 0.82rem; outline: none; width: 220px;
}
.search-input:focus { border-color: #7c3aed; }
.search-clear {
  position: absolute; right: 0.5rem;
  background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: .8rem;
}

/* ── List ── */
.dv-list { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 1.5rem; }

.day-group { display: flex; flex-direction: column; gap: 0.6rem; }
.day-label {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0 0.25rem;
}
.day-text { font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: capitalize; }
.day-count {
  background: var(--bg-muted); border-radius: 9px; padding: 1px 7px;
  font-size: 0.7rem; font-weight: 700; color: var(--text-muted);
}

/* ── Card ── */
.dv-card {
  display: flex; gap: 0;
  background: var(--g-bg); border: 1px solid var(--g-border);
  border-radius: 12px; box-shadow: var(--g-shadow); backdrop-filter: var(--g-blur);
  overflow: hidden; transition: box-shadow .15s;
}
.dv-card:hover { box-shadow: var(--shadow-md); }

.skeleton-card { height: 100px; animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: .7; } 50% { opacity: .35; } }

.card-stripe { width: 4px; flex-shrink: 0; }
.stripe-pendiente  { background: #f97316; }
.stripe-en_revision{ background: #3b82f6; }
.stripe-aprobada   { background: #10b981; }
.stripe-rechazada  { background: #ef4444; }
.stripe-procesada  { background: #7c3aed; }

.card-body { flex: 1; padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.45rem; min-width: 0; }
.card-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.card-id-block { display: flex; align-items: center; gap: 0.6rem; }
.card-folio { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); }
.card-order-folio { font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.25rem; }

.status-badge {
  display: inline-flex; align-items: center; gap: 0.3rem;
  padding: 0.2rem 0.65rem; border-radius: 9px; font-size: 0.73rem; font-weight: 600;
}
.badge-pendiente   { background: rgba(249,115,22,.12); color: #f97316; }
.badge-en_revision { background: rgba(59,130,246,.12);  color: #3b82f6; }
.badge-aprobada    { background: rgba(16,185,129,.12);  color: #10b981; }
.badge-rechazada   { background: rgba(239,68,68,.12);   color: #ef4444; }
.badge-procesada   { background: rgba(124,58,237,.12);  color: #7c3aed; }

.card-info-row { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.info-cell { display: flex; align-items: center; gap: 0.3rem; font-size: 0.78rem; color: var(--text-muted); }
.info-ico { font-size: 0.7rem; opacity: 0.6; }

.card-items { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.item-chip {
  display: flex; align-items: center; gap: 0.35rem;
  background: var(--g-action); border: 1px solid var(--g-border);
  border-radius: 7px; padding: 0.2rem 0.55rem; font-size: 0.72rem;
}
.item-cb  { font-weight: 600; color: var(--text-primary); }
.item-qty { color: var(--text-muted); }
.item-cond { border-radius: 5px; padding: 0 5px; font-size: 0.68rem; }
.cond-bueno       { background: rgba(16,185,129,.12); color: #10b981; }
.cond-danado      { background: rgba(249,115,22,.12); color: #f97316; }
.cond-defectuoso  { background: rgba(239,68,68,.12);  color: #ef4444; }
.item-restore { color: #10b981; font-size: 0.7rem; }
.item-more { color: var(--text-muted); font-style: italic; }

.card-notes { font-size: 0.76rem; color: var(--text-muted); display: flex; align-items: flex-start; gap: 0.35rem; }
.notes-ico { opacity: .5; font-size: .7rem; margin-top: 2px; }
.card-processed { font-size: 0.74rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.proc-ico { opacity: .5; }
.stock-restored-badge {
  display: inline-flex; align-items: center; gap: 0.3rem;
  background: rgba(16,185,129,.12); color: #10b981;
  border-radius: 6px; padding: 0.15rem 0.5rem; font-size: 0.7rem; font-weight: 600;
}

/* ── Card Actions ── */
.card-actions {
  display: flex; flex-direction: column; justify-content: center; gap: 0.4rem;
  padding: 0.75rem 0.85rem;
  border-left: 1px solid var(--g-border);
  background: var(--g-action);
  flex-shrink: 0;
}
.act-btn {
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.38rem 0.75rem; border-radius: 7px; border: 1px solid transparent;
  font-size: 0.76rem; font-weight: 500; cursor: pointer; white-space: nowrap;
  transition: opacity .12s, background .12s;
}
.act-btn:hover { opacity: .82; }
.act-review  { background: rgba(59,130,246,.14);  color: #3b82f6; border-color: rgba(59,130,246,.2); }
.act-approve { background: rgba(16,185,129,.14);  color: #10b981; border-color: rgba(16,185,129,.2); }
.act-reject  { background: rgba(239,68,68,.12);   color: #ef4444; border-color: rgba(239,68,68,.18); }
.act-process { background: rgba(124,58,237,.12);  color: #7c3aed; border-color: rgba(124,58,237,.18); }
.act-detail  { background: var(--g-hover); color: var(--text-muted); border-color: var(--g-border); }

/* ── Pagination ── */
.pagination-row { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 1rem 0; }
.pg-btn {
  width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--g-border);
  background: var(--g-bg); color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.pg-btn:disabled { opacity: .4; cursor: default; }
.pg-btn:not(:disabled):hover { background: var(--g-hover); }
.pg-info { font-size: 0.8rem; color: var(--text-muted); }

/* ── Empty state ── */
.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.75rem; padding: 4rem 1rem; color: var(--text-muted); text-align: center;
}
.empty-ico { font-size: 3rem; opacity: .3; }
.empty-state p { font-size: 0.9rem; }

/* ── Modal overlay ── */
.dv-modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(15,23,42,.45);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; padding: 1rem;
}
.dv-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  max-width: 680px; width: 100%;
  max-height: 90vh; overflow-y: auto;
  padding: 1.5rem;
  position: relative;
}
.dv-modal-sm { max-width: 440px; }
.dv-modal-lg { max-width: 780px; }

.modal-close {
  position: absolute; top: 1rem; right: 1rem;
  background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 8px;
  width: 30px; height: 30px; cursor: pointer; color: var(--text-muted);
  display: flex; align-items: center; justify-content: center;
}
.modal-close:hover { background: var(--bg-muted); }

.modal-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
.modal-folio { font-size: 1.05rem; font-weight: 700; color: var(--text-primary); }

.modal-section { margin-bottom: 1rem; border-top: 1px solid var(--border); padding-top: 0.75rem; }
.msec-title {
  font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase;
  letter-spacing: .04em; margin-bottom: 0.6rem;
  display: flex; align-items: center; justify-content: space-between;
}
.modal-row { display: flex; gap: 0.75rem; font-size: 0.82rem; padding: 0.25rem 0; color: var(--text-secondary); }
.mrow-label { font-weight: 600; color: var(--text-muted); min-width: 140px; flex-shrink: 0; }
.stock-ok { color: #10b981; font-weight: 600; }

/* Item rows in detail modal */
.item-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border); }
.item-row:last-child { border-bottom: none; }
.item-row-main { display: flex; flex-direction: column; gap: 0.2rem; }
.item-cb-big { font-weight: 700; font-size: 0.85rem; color: var(--text-primary); }
.item-desc { font-size: 0.76rem; color: var(--text-muted); }
.item-row-meta { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }
.item-qty-big { font-size: 0.85rem; font-weight: 700; color: var(--text-primary); }

.modal-actions { border-top: 1px solid var(--border); padding-top: 0.75rem; display: flex; flex-direction: column; gap: 0.6rem; }
.modal-notes-row textarea { width: 100%; }
.modal-btn-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.modal-label { font-size: 0.78rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 0.35rem; }
.modal-textarea {
  width: 100%; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg-subtle); color: var(--text-primary); font-size: 0.82rem;
  padding: 0.5rem 0.75rem; resize: vertical; outline: none;
}
.modal-textarea:focus { border-color: #7c3aed; }

/* Process info box */
.process-info { display: flex; gap: 0.5rem; background: var(--bg-subtle); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.75rem; }
.process-info-ico { color: #3b82f6; font-size: .9rem; flex-shrink: 0; margin-top: 2px; }
.process-info p { font-size: 0.82rem; color: var(--text-secondary); margin: 0; line-height: 1.5; }

/* Reject notes */
.req { color: #ef4444; }

/* ── Create Form ── */
.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; }
.form-field { display: flex; flex-direction: column; }
.form-input {
  border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg-subtle); color: var(--text-primary); font-size: 0.82rem;
  padding: 0.45rem 0.75rem; outline: none;
}
.form-input:focus { border-color: #7c3aed; }
select.form-input { cursor: pointer; }
.add-item-btn {
  display: inline-flex; align-items: center; gap: 0.3rem;
  background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 7px;
  padding: 0.25rem 0.65rem; font-size: 0.75rem; cursor: pointer; color: var(--text-muted);
}
.add-item-btn:hover { background: var(--bg-muted); }
.form-item-row {
  display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;
  padding: 0.4rem 0; border-bottom: 1px solid var(--border);
}
.fi-code { flex: 2; min-width: 110px; }
.fi-desc { flex: 3; min-width: 130px; }
.fi-qty  { width: 70px; }
.fi-cond { width: 110px; }
.fi-restore {
  display: flex; align-items: center; gap: 0.25rem; cursor: pointer;
  font-size: 0.75rem; color: var(--text-muted);
}
.fi-restore input { cursor: pointer; }
.fi-del {
  background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.2); border-radius: 7px;
  color: #ef4444; cursor: pointer; padding: 0.35rem 0.6rem; font-size: 0.78rem;
}
.fi-del:hover { background: rgba(239,68,68,.2); }
.form-restore-note {
  margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-muted);
  background: var(--bg-subtle); border-radius: 8px; padding: 0.5rem 0.75rem;
  display: flex; gap: 0.4rem; align-items: flex-start;
}
.mt-2 { margin-top: 0.5rem; }
</style>
