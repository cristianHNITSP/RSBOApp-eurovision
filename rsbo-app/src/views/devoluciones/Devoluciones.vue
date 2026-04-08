<template>
  <div class="dv-root">

    <!-- ══ HERO ══ -->
    <header class="dv-hero">
      <div class="dv-hero-accent"></div>
      <div class="dv-hero-inner">
        <div class="dv-hero-left">
          <span class="dv-pill"><i class="fas fa-rotate-left"></i> Devoluciones</span>
          <h2 class="dv-hero-title">
            <span class="dv-brand-grad">Gestión de Devoluciones</span>
          </h2>
          <p class="dv-hero-sub">
            {{ canManageDevolutions ? 'Vista completa · gestión y seguimiento' : 'Vista de lectura' }}
          </p>
        </div>
        <div class="dv-hero-right">
          <div class="dv-badge" v-if="stats">
            <i class="fas fa-rotate-left"></i>
            <span>{{ (stats.pendientes ?? 0) + (stats.enRevision ?? 0) }} activas</span>
          </div>
          <b-button
            v-if="canCreateDevolution"
            type="is-primary"
            icon-left="plus"
            @click="openCreate"
          >Nueva devolución</b-button>
          <b-button
            type="is-light"
            icon-left="arrows-rotate"
            :loading="loading"
            @click="load"
          />
        </div>
      </div>
    </header>

    <!-- ══ KPI STRIP ══ -->
    <section class="dv-kpis" v-if="stats">
      <div class="dv-kpi-grid">
        <div class="dv-kpi-card">
          <div class="dv-kpi-bar" style="background:linear-gradient(90deg,#f97316,#fb923c)"></div>
          <div class="dv-kpi-inner">
            <div class="dv-kpi-ico" style="background:rgba(249,115,22,.12);color:#f97316"><i class="fas fa-clock"></i></div>
            <div>
              <div class="dv-kpi-lbl">Pendientes</div>
              <div class="dv-kpi-num" style="color:#f97316">{{ stats.pendientes ?? 0 }}</div>
              <div class="dv-kpi-cap">En espera</div>
            </div>
          </div>
        </div>
        <div class="dv-kpi-card">
          <div class="dv-kpi-bar" style="background:linear-gradient(90deg,#3b82f6,#60a5fa)"></div>
          <div class="dv-kpi-inner">
            <div class="dv-kpi-ico" style="background:rgba(59,130,246,.12);color:#3b82f6"><i class="fas fa-magnifying-glass"></i></div>
            <div>
              <div class="dv-kpi-lbl">En revisión</div>
              <div class="dv-kpi-num" style="color:#3b82f6">{{ stats.enRevision ?? 0 }}</div>
              <div class="dv-kpi-cap">En proceso</div>
            </div>
          </div>
        </div>
        <div class="dv-kpi-card">
          <div class="dv-kpi-bar" style="background:linear-gradient(90deg,#10b981,#34d399)"></div>
          <div class="dv-kpi-inner">
            <div class="dv-kpi-ico" style="background:rgba(16,185,129,.12);color:#10b981"><i class="fas fa-circle-check"></i></div>
            <div>
              <div class="dv-kpi-lbl">Aprobadas</div>
              <div class="dv-kpi-num" style="color:#10b981">{{ stats.aprobadas ?? 0 }}</div>
              <div class="dv-kpi-cap">Aceptadas</div>
            </div>
          </div>
        </div>
        <div class="dv-kpi-card">
          <div class="dv-kpi-bar" style="background:linear-gradient(90deg,#ef4444,#f87171)"></div>
          <div class="dv-kpi-inner">
            <div class="dv-kpi-ico" style="background:rgba(239,68,68,.12);color:#ef4444"><i class="fas fa-circle-xmark"></i></div>
            <div>
              <div class="dv-kpi-lbl">Rechazadas</div>
              <div class="dv-kpi-num" style="color:#ef4444">{{ stats.rechazadas ?? 0 }}</div>
              <div class="dv-kpi-cap">No aprobadas</div>
            </div>
          </div>
        </div>
        <div class="dv-kpi-card">
          <div class="dv-kpi-bar" style="background:linear-gradient(90deg,#7c3aed,#a78bfa)"></div>
          <div class="dv-kpi-inner">
            <div class="dv-kpi-ico" style="background:rgba(124,58,237,.12);color:#7c3aed"><i class="fas fa-box-archive"></i></div>
            <div>
              <div class="dv-kpi-lbl">Procesadas</div>
              <div class="dv-kpi-num" style="color:#7c3aed">{{ stats.procesadas ?? 0 }}</div>
              <div class="dv-kpi-cap">Completadas</div>
            </div>
          </div>
        </div>
        <div class="dv-kpi-card">
          <div class="dv-kpi-bar" style="background:linear-gradient(90deg,#06b6d4,#0891b2)"></div>
          <div class="dv-kpi-inner">
            <div class="dv-kpi-ico" style="background:rgba(6,182,212,.12);color:#06b6d4"><i class="fas fa-calendar-days"></i></div>
            <div>
              <div class="dv-kpi-lbl">Últimos 7 días</div>
              <div class="dv-kpi-num" style="color:#06b6d4">{{ stats.total7d ?? 0 }}</div>
              <div class="dv-kpi-cap">Esta semana</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ FILTROS + LISTADO ══ -->
    <section class="dv-main">
      <div class="gcard">
        <div class="gcard-bar" style="background:linear-gradient(90deg,#7c3aed,#3b82f6,#ec4899)"></div>

        <!-- Filtros -->
        <div class="gc-head gc-head-filter">
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
        </div>

        <!-- Listado -->
        <div class="gc-body dv-list">

          <!-- Loading skeleton -->
          <template v-if="loading">
            <div class="day-group" v-for="n in 3" :key="'sk'+n">
              <div class="day-label">
                <b-skeleton :width="120" :height="14" animated />
              </div>
              <div class="dv-card" v-for="m in 2" :key="'skc'+m" style="padding:0.85rem 1rem;gap:0.5rem;flex-direction:column">
                <b-skeleton :width="'60%'" :height="16" animated />
                <b-skeleton :width="'90%'" :height="12" animated />
                <b-skeleton :width="'40%'" :height="12" animated />
              </div>
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
                <div class="card-stripe" :class="'stripe-' + dev.status"></div>

                <div class="card-body">
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

                  <div class="card-items" v-if="dev.items?.length">
                    <span class="item-chip" v-for="(it, i) in dev.items.slice(0, 4)" :key="i">
                      <span class="item-cb">{{ it.codebar || it.sku || '—' }}</span>
                      <span class="item-qty">×{{ it.qty }}</span>
                      <span class="item-cond" :class="'cond-' + it.condition">{{ condLabel(it.condition) }}</span>
                      <span v-if="it.restoreStock" class="item-restore" title="Reingresa stock"><i class="fas fa-arrow-up-to-line"></i></span>
                    </span>
                    <span class="item-chip item-more" v-if="dev.items.length > 4">+{{ dev.items.length - 4 }} más</span>
                  </div>

                  <div class="card-notes" v-if="dev.reasonDetail || dev.notes">
                    <i class="fas fa-comment-dots notes-ico"></i>
                    <span>{{ dev.reasonDetail || dev.notes }}</span>
                  </div>

                  <div class="card-processed" v-if="dev.processedBy?.name">
                    <i class="fas fa-user-check proc-ico"></i>
                    <span>Procesado por <strong>{{ dev.processedBy.name }}</strong>
                      {{ dev.processedAt ? '· ' + fmtDate(dev.processedAt) : '' }}</span>
                    <span v-if="dev.stockRestored" class="stock-restored-badge">
                      <i class="fas fa-boxes-stacked"></i> Stock restaurado
                    </span>
                  </div>
                </div>

                <!-- Acciones inline -->
                <div class="card-actions" v-if="canManageDevolutions">
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

        </div>
      </div>
    </section>

    <!-- ══ MODAL: DETALLE ══ -->
    <b-modal v-model="detailOpen" has-modal-card trap-focus :destroy-on-hide="true" animation="zoom-in">
      <div class="modal-card" v-if="detailDev">
        <header class="modal-card-head">
          <div class="modal-card-head-content">
            <div class="modal-head-icon accent-purple"><i class="fas fa-eye"></i></div>
            <div>
              <p class="modal-card-title">{{ detailDev.folio }}</p>
              <span class="status-badge" :class="'badge-' + detailDev.status">
                <i :class="statusIcon(detailDev.status)"></i>
                {{ statusLabel(detailDev.status) }}
              </span>
            </div>
          </div>
          <button class="delete" aria-label="close" @click="detailOpen = false"></button>
        </header>

        <section class="modal-card-body">
          <div class="modal-rows">
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

          <div v-if="detailDev.items?.length" class="mt-4">
            <p class="msec-title">Ítems ({{ detailDev.items.length }})</p>
            <div class="item-row" v-for="(it, i) in detailDev.items" :key="i">
              <div class="item-row-main">
                <span class="item-cb-big">{{ it.codebar || it.sku || '—' }}</span>
                <span v-if="it.description" class="item-desc">{{ it.description }}</span>
              </div>
              <div class="item-row-meta">
                <span class="item-qty-big">×{{ it.qty }}</span>
                <span class="item-cond" :class="'cond-' + it.condition">{{ condLabel(it.condition) }}</span>
                <span v-if="it.restoreStock" class="item-restore"><i class="fas fa-arrow-up-to-line"></i> Reingresa stock</span>
              </div>
            </div>
          </div>

          <div v-if="canManageDevolutions && detailDev.status !== 'procesada' && detailDev.status !== 'rechazada'" class="mt-4">
            <b-field label="Notas (opcional)">
              <b-input v-model="actionNotes" type="textarea" rows="2" placeholder="Notas (opcional)..." />
            </b-field>
          </div>
        </section>

        <footer class="modal-card-foot" style="justify-content:flex-end;gap:0.5rem;flex-wrap:wrap"
          v-if="canManageDevolutions && detailDev.status !== 'procesada' && detailDev.status !== 'rechazada'">
          <b-button @click="detailOpen = false">Cerrar</b-button>
          <b-button
            v-if="detailDev.status === 'pendiente'"
            type="is-info"
            icon-left="magnifying-glass"
            @click="applyAction(detailDev, 'en_revision')"
          >En revisión</b-button>
          <b-button
            v-if="detailDev.status === 'en_revision' || detailDev.status === 'pendiente'"
            type="is-success"
            icon-left="check"
            @click="applyAction(detailDev, 'aprobada')"
          >Aprobar</b-button>
          <b-button
            v-if="detailDev.status === 'aprobada'"
            type="is-primary"
            icon-left="box-archive"
            @click="applyAction(detailDev, 'procesada')"
          >Procesar</b-button>
          <b-button
            v-if="['pendiente','en_revision','aprobada'].includes(detailDev.status)"
            type="is-danger"
            icon-left="xmark"
            @click="applyAction(detailDev, 'rechazada')"
          >Rechazar</b-button>
        </footer>
        <footer class="modal-card-foot" style="justify-content:flex-end" v-else>
          <b-button @click="detailOpen = false">Cerrar</b-button>
        </footer>
      </div>
    </b-modal>

    <!-- ══ MODAL: RECHAZAR ══ -->
    <b-modal v-model="rejectOpen" has-modal-card trap-focus :destroy-on-hide="true" animation="zoom-in">
      <div class="modal-card" v-if="rejectTarget">
        <header class="modal-card-head">
          <div class="modal-card-head-content">
            <div class="modal-head-icon accent-red"><i class="fas fa-xmark"></i></div>
            <p class="modal-card-title">Rechazar {{ rejectTarget.folio }}</p>
          </div>
          <button class="delete" aria-label="close" @click="rejectOpen = false"></button>
        </header>
        <section class="modal-card-body">
          <b-field label="Motivo del rechazo">
            <b-input v-model="rejectNotes" type="textarea" rows="3" placeholder="Explica por qué se rechaza..." />
          </b-field>
        </section>
        <footer class="modal-card-foot" style="justify-content:flex-end;gap:0.5rem">
          <b-button @click="rejectOpen = false">Cancelar</b-button>
          <b-button type="is-danger" icon-left="xmark" @click="confirmReject">Confirmar rechazo</b-button>
        </footer>
      </div>
    </b-modal>

    <!-- ══ MODAL: PROCESAR ══ -->
    <b-modal v-model="processOpen" has-modal-card trap-focus :destroy-on-hide="true" animation="zoom-in">
      <div class="modal-card" v-if="processTarget">
        <header class="modal-card-head">
          <div class="modal-card-head-content">
            <div class="modal-head-icon accent-purple"><i class="fas fa-box-archive"></i></div>
            <p class="modal-card-title">Procesar {{ processTarget.folio }}</p>
          </div>
          <button class="delete" aria-label="close" @click="processOpen = false"></button>
        </header>
        <section class="modal-card-body">
          <div class="process-info mb-4">
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
          <b-field label="Notas de cierre (opcional)">
            <b-input v-model="processNotes" type="textarea" rows="2" placeholder="Observaciones..." />
          </b-field>
        </section>
        <footer class="modal-card-foot" style="justify-content:flex-end;gap:0.5rem">
          <b-button @click="processOpen = false">Cancelar</b-button>
          <b-button type="is-primary" icon-left="box-archive" @click="confirmProcess">Confirmar procesado</b-button>
        </footer>
      </div>
    </b-modal>

    <!-- ══ MODAL: CREAR DEVOLUCIÓN ══ -->
    <b-modal v-model="showCreate" has-modal-card trap-focus :destroy-on-hide="true" animation="zoom-in">
      <div class="modal-card dv-create-card">
        <header class="modal-card-head">
          <div class="modal-card-head-content">
            <div class="modal-head-icon accent-purple"><i class="fas fa-plus"></i></div>
            <p class="modal-card-title">Nueva devolución</p>
          </div>
          <button class="delete" aria-label="close" @click="showCreate = false"></button>
        </header>

        <section class="modal-card-body">
          <!-- Datos principales: 2 columnas fijas -->
          <div class="form-grid">
            <b-field label="Cliente *">
              <b-input v-model="form.cliente" placeholder="Nombre del cliente" />
            </b-field>
            <b-field label="Teléfono">
              <b-input v-model="form.clientePhone" placeholder="Teléfono" />
            </b-field>
            <b-field label="Folio del pedido (opcional)">
              <b-input v-model="form.orderFolio" placeholder="LAB-XXXXXXXX-XXXX" />
            </b-field>
            <b-field label="Motivo *">
              <b-select v-model="form.reason" expanded>
                <option value="">— Seleccionar —</option>
                <option v-for="r in REASONS" :key="r.value" :value="r.value">{{ r.label }}</option>
              </b-select>
            </b-field>
          </div>

          <b-field label="Descripción del problema" class="mt-3">
            <b-input v-model="form.reasonDetail" type="textarea" rows="2" placeholder="Describe el problema en detalle..." />
          </b-field>
          <b-field label="Notas internas">
            <b-input v-model="form.notes" type="textarea" rows="2" placeholder="Notas solo visibles para el equipo..." />
          </b-field>

          <!-- Ítems -->
          <div class="items-section mt-4">
            <div class="msec-title">
              Ítems devueltos
              <b-button size="is-small" type="is-light" icon-left="plus" @click="addItem">Agregar ítem</b-button>
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
              <label class="fi-restore" title="Reingresa stock al inventario">
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
        </section>

        <footer class="modal-card-foot" style="justify-content:flex-end;gap:0.5rem">
          <b-button @click="showCreate = false">Cancelar</b-button>
          <b-button type="is-primary" icon-left="floppy-disk" :loading="creating" @click="submitCreate">
            Crear devolución
          </b-button>
        </footer>
      </div>
    </b-modal>

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
const detailOpen   = ref(false);
const actionNotes  = ref("");
const rejectTarget = ref(null);
const rejectOpen   = ref(false);
const rejectNotes  = ref("");
const processTarget = ref(null);
const processOpen   = ref(false);
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
    detailOpen.value  = false;
    detailDev.value   = null;
    actionNotes.value = "";
    load();
  } catch (e) {
    labToast.danger(e?.response?.data?.error || "Error al actualizar estado");
  }
}

function openReject(dev) {
  rejectTarget.value = dev;
  rejectNotes.value  = "";
  rejectOpen.value   = true;
}
async function confirmReject() {
  if (!rejectTarget.value) return;
  try {
    await updateDevolutionStatus(rejectTarget.value._id, "rechazada", rejectNotes.value);
    labToast.success(`Devolución ${rejectTarget.value.folio} rechazada`);
    rejectOpen.value   = false;
    rejectTarget.value = null;
    load();
  } catch (e) {
    labToast.danger(e?.response?.data?.error || "Error al rechazar");
  }
}

function openProcess(dev) {
  processTarget.value = dev;
  processNotes.value  = "";
  processOpen.value   = true;
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
    processOpen.value   = false;
    processTarget.value = null;
    load();
  } catch (e) {
    labToast.danger(e?.response?.data?.error || "Error al procesar");
  }
}

function openDetail(dev) {
  detailDev.value   = dev;
  detailOpen.value  = true;
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

<!-- Glass token vars (no scoped) -->
<style>
.dv-root {
  --g-bg:       var(--card);
  --g-border:   var(--border);
  --g-shadow:   var(--shadow);
  --g-action:   var(--surface-overlay);
  --g-hover:    var(--bg-muted);
}
</style>

<style scoped>
/* ── Root ── */
.dv-root {
  position: relative;
  min-height: 100%;
  background: var(--bg-base);
}

/* ══════════════════════════════════════════
   HERO
══════════════════════════════════════════ */
.dv-hero {
  position: relative;
  z-index: 1;
  margin: 1.25rem;
  border-radius: 18px;
  overflow: hidden;
  background:
    radial-gradient(circle at 0 0,   rgba(124,58,237,0.12),  transparent 55%),
    radial-gradient(circle at 100% 0, rgba(236,72,153,0.10), transparent 55%),
    radial-gradient(circle at 60% 100%, rgba(59,130,246,0.10), transparent 55%),
    var(--surface-solid);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}
.dv-hero-accent {
  height: 3.5px;
  width: 100%;
  background: linear-gradient(90deg, #7c3aed, #3b82f6, #ec4899);
}
.dv-hero-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.15rem 1.6rem;
  flex-wrap: wrap;
}
.dv-hero-left  { flex: 1; min-width: 0; }
.dv-hero-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; flex-wrap: wrap; }

.dv-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.67rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: var(--c-primary);
  background: var(--c-primary-alpha);
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  margin-bottom: 0.4rem;
}
.dv-hero-title {
  font-size: 1.35rem;
  font-weight: 800;
  margin: 0 0 0.2rem;
  line-height: 1.2;
}
.dv-brand-grad {
  background: linear-gradient(90deg, #7c3aed, #3b82f6, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.dv-hero-sub { font-size: 0.78rem; color: var(--text-muted); margin: 0; }

.dv-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.73rem;
  color: var(--text-muted);
  background: var(--g-action);
  border: 1px solid var(--g-border);
  padding: 0.28rem 0.7rem;
  border-radius: 999px;
}
.dv-badge i { color: #ec4899; font-size: 0.72rem; }


/* ══════════════════════════════════════════
   KPI STRIP
══════════════════════════════════════════ */
.dv-kpis {
  position: relative; z-index: 1;
  padding: 0 1.25rem;
  margin-bottom: 1.25rem;
}
.dv-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
  gap: 0.75rem;
}
.dv-kpi-card {
  border-radius: 16px;
  background: var(--g-bg);
  border: 1px solid var(--g-border);
  box-shadow: var(--g-shadow);
  overflow: hidden;
  transition: transform 0.15s, box-shadow 0.15s;
}
.dv-kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.dv-kpi-bar   { height: 2.5px; width: 100%; }
.dv-kpi-inner { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.85rem 1rem; }
.dv-kpi-ico   {
  width: 34px; height: 34px; border-radius: 0.55rem;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.88rem; flex-shrink: 0;
}
.dv-kpi-lbl { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); font-weight: 600; }
.dv-kpi-num { font-size: 1.5rem; font-weight: 800; line-height: 1.1; margin: 0.1rem 0; }
.dv-kpi-cap { font-size: 0.65rem; color: var(--text-muted); }

/* ══════════════════════════════════════════
   MAIN SECTION + GLASS CARD
══════════════════════════════════════════ */
.dv-main {
  position: relative; z-index: 1;
  padding: 0 1.25rem 2rem;
}

.gcard {
  background: var(--g-bg);
  border: 1px solid var(--g-border);
  border-radius: 18px;
  box-shadow: var(--g-shadow);
  overflow: hidden;
}
.gcard-bar { height: 2.5px; width: 100%; }

.gc-head {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.85rem 1.25rem;
}
.gc-head-filter {
  flex-wrap: wrap;
  border-bottom: 1px solid var(--g-border);
  gap: 0.6rem;
}
.gc-body { padding: 1rem 1.25rem; }

/* ── Filter tabs ── */
.filter-tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; flex: 1; }
.ftab {
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.35rem 0.75rem; border-radius: 8px; border: 1px solid transparent;
  background: transparent; color: var(--text-muted); font-size: 0.78rem; cursor: pointer;
  transition: background .15s, color .15s;
}
.ftab:hover { background: var(--g-hover); color: var(--text-primary); }
.ftab.active {
  background: var(--g-action); border-color: var(--g-border);
  color: var(--text-primary); font-weight: 600;
}
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

/* ══════════════════════════════════════════
   LIST + CARDS
══════════════════════════════════════════ */
.dv-list { display: flex; flex-direction: column; gap: 1.5rem; }

.day-group { display: flex; flex-direction: column; gap: 0.6rem; }
.day-label { display: flex; align-items: center; gap: 0.5rem; padding: 0 0.25rem; }
.day-text  { font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: capitalize; }
.day-count {
  background: var(--bg-muted); border-radius: 9px; padding: 1px 7px;
  font-size: 0.7rem; font-weight: 700; color: var(--text-muted);
}

.dv-card {
  display: flex;
  background: var(--surface-solid, var(--g-bg)); border: 1px solid var(--g-border);
  border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.04);
  overflow: hidden; transition: box-shadow .15s, transform .1s;
}
.dv-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }


.card-stripe { width: 4px; flex-shrink: 0; }
.stripe-pendiente   { background: #f97316; }
.stripe-en_revision { background: #3b82f6; }
.stripe-aprobada    { background: #10b981; }
.stripe-rechazada   { background: #ef4444; }
.stripe-procesada   { background: #7c3aed; }

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
.info-ico  { font-size: 0.7rem; opacity: 0.6; }

.card-items { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.item-chip {
  display: flex; align-items: center; gap: 0.35rem;
  background: var(--g-action); border: 1px solid var(--g-border);
  border-radius: 7px; padding: 0.2rem 0.55rem; font-size: 0.72rem;
}
.item-cb  { font-weight: 600; color: var(--text-primary); }
.item-qty { color: var(--text-muted); }
.item-cond { border-radius: 5px; padding: 0 5px; font-size: 0.68rem; }
.cond-bueno      { background: rgba(16,185,129,.12); color: #10b981; }
.cond-danado     { background: rgba(249,115,22,.12); color: #f97316; }
.cond-defectuoso { background: rgba(239,68,68,.12);  color: #ef4444; }
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

/* ── Card actions ── */
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
.act-btn:hover   { opacity: .82; }
.act-review  { background: rgba(59,130,246,.14);  color: #3b82f6; border-color: rgba(59,130,246,.2); }
.act-approve { background: rgba(16,185,129,.14);  color: #10b981; border-color: rgba(16,185,129,.2); }
.act-reject  { background: rgba(239,68,68,.12);   color: #ef4444; border-color: rgba(239,68,68,.18); }
.act-process { background: rgba(124,58,237,.12);  color: #7c3aed; border-color: rgba(124,58,237,.18); }
.act-detail  { background: var(--g-hover); color: var(--text-muted); border-color: var(--g-border); }

/* ── Pagination ── */
.pagination-row { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 1rem 0 0; }
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

/* ══════════════════════════════════════════
   MODAL HEADER INTERNO (b-modal head)
══════════════════════════════════════════ */
.modal-card-head-content {
  display: flex; align-items: center; gap: 0.65rem; flex: 1; min-width: 0;
}
.modal-head-icon {
  width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 0.9rem;
}
.accent-purple { background: var(--c-primary-alpha); color: var(--c-primary); }
.accent-blue   { background: rgba(59,130,246,.15);   color: #3b82f6; }
.accent-green  { background: rgba(16,185,129,.15);   color: #10b981; }
.accent-orange { background: rgba(245,158,11,.15);   color: #f59e0b; }
.accent-red    { background: rgba(239,68,68,.15);    color: #ef4444; }
.accent-cyan   { background: rgba(6,182,212,.15);    color: #06b6d4; }

/* ── Filas de detalle ── */
.modal-rows { display: flex; flex-direction: column; gap: 0; }
.modal-row { display: flex; gap: 0.75rem; font-size: 0.82rem; padding: 0.3rem 0; border-bottom: 1px solid var(--border); color: var(--text-secondary); }
.modal-row:last-child { border-bottom: none; }
.mrow-label { font-weight: 600; color: var(--text-muted); min-width: 140px; flex-shrink: 0; }
.stock-ok   { color: #10b981; font-weight: 600; }

.msec-title {
  font-size: 0.78rem; font-weight: 600; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: .04em; margin-bottom: 0.6rem;
  display: flex; align-items: center; justify-content: space-between;
}

.item-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border); }
.item-row:last-child { border-bottom: none; }
.item-row-main { display: flex; flex-direction: column; gap: 0.2rem; }
.item-cb-big   { font-weight: 700; font-size: 0.85rem; color: var(--text-primary); }
.item-desc     { font-size: 0.76rem; color: var(--text-muted); }
.item-row-meta { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }
.item-qty-big  { font-size: 0.85rem; font-weight: 700; color: var(--text-primary); }

.process-info { display: flex; gap: 0.5rem; background: var(--bg-subtle); border-radius: 8px; padding: 0.75rem; }
.process-info-ico { color: #3b82f6; font-size: .9rem; flex-shrink: 0; margin-top: 2px; }
.process-info p   { font-size: 0.82rem; color: var(--text-secondary); margin: 0; line-height: 1.5; }

/* ══════════════════════════════════════════
   MODAL CREAR — ancho fijo, no se adapta
   Tablet / PC / móvil horizontal → 780px
══════════════════════════════════════════ */
.dv-create-card {
  width: 780px !important;
  max-width: min(780px, calc(100vw - 2rem)) !important;
}

/* ── Formulario crear: 2 columnas fijas ──
   Tablet / PC / móvil horizontal → 2 col
   Móvil vertical                 → 1 col  */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 1rem;
}
@media (orientation: portrait) and (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
}

/* Items section */
.items-section { border-top: 1px solid var(--border); padding-top: 0.75rem; }

.form-input {
  border-radius: 6px; border: 1px solid var(--border);
  background: var(--bg-subtle); color: var(--text-primary); font-size: 0.82rem;
  padding: 0.45rem 0.75rem; outline: none;
}
.form-input:focus { border-color: #7c3aed; }
select.form-input { cursor: pointer; }

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
