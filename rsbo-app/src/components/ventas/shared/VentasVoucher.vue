<template>
  <div class="ventas-voucher-wrapper" v-if="order">
    <div class="modal-card premium-glass-card animate__animated animate__fadeIn">
      <header class="modal-card-head glass-modal-header">
        <p class="modal-card-title glass-modal-title">
          <i class="fas fa-file-invoice-dollar mr-2 text-primary"></i>
          Comprobante de Venta
        </p>
        <button type="button" class="delete" @click="$emit('close')" />
      </header>

      <section class="modal-card-body glass-modal-body">
        <!-- ── Nota de Venta (formato imprimible estilizado) ──────────── -->
        <div class="voucher-ticket">
          <div class="ticket-header">
            <h2 class="ticket-title">RSBO APP</h2>
            <p class="ticket-subtitle">NOTA DE VENTA</p>
          </div>

          <div class="ticket-info">
            <div class="ticket-info-row">
              <span class="ticket-label">Cliente:</span>
              <span class="ticket-val">{{ order.clienteDisplay || order.cliente }}</span>
            </div>
            <div class="ticket-info-row">
              <span class="ticket-label">Fecha:</span>
              <span class="ticket-val">{{ fmtDateShort(order.fecha) }}</span>
            </div>
            <div v-if="order.ventaFolio || order.folio" class="ticket-info-row">
              <span class="ticket-label">Folio:</span>
              <span class="ticket-val mono">{{ order.ventaFolio || order.folio }}</span>
            </div>
          </div>

          <table class="ticket-table">
            <thead>
              <tr>
                <th>CANT.</th>
                <th>PRODUCTO</th>
                <th class="has-text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, i) in order.lineas" :key="i">
                <td>{{ line.qty }}</td>
                <td class="ticket-prod-name">{{ line.title }}</td>
                <td class="has-text-right">{{ line.precio ? (line.qty * line.precio).toFixed(2) : '—' }}</td>
              </tr>
            </tbody>
          </table>

          <div class="ticket-footer">
            <div class="ticket-total-row">
              <span>TOTAL</span>
              <span class="ticket-grand-total">{{ order.totalMonto ? order.totalMonto.toFixed(2) : '—' }} MXN</span>
            </div>
            <div class="ticket-payment-info">
              <span class="uppercase-label">Forma de Pago:</span>
              <span class="has-text-weight-bold">{{ order.pagoDisplay || 'No especificada' }}</span>
            </div>
          </div>
        </div>

        <!-- ── Detalles adicionales del sistema ────────────────────────── -->
        <div class="voucher-system-meta mt-4">
          <h3 class="section-title-premium mb-3">Detalles de Gestión</h3>
          <div class="closure-grid">
            <div class="closure-stat-card">
              <span class="closure-stat-label">Atendido por</span>
              <span class="closure-stat-val">{{ order.actor }}</span>
            </div>
            <div class="closure-stat-card" v-if="order.totalPiezas">
              <span class="closure-stat-label">Piezas Totales</span>
              <span class="closure-stat-val">{{ order.totalPiezas }}</span>
            </div>
          </div>

          <div v-if="order.note" class="voucher-note-box mt-3">
            <span class="uppercase-label">Observaciones:</span>
            <p class="is-italic">"{{ order.note }}"</p>
          </div>
        </div>

        <!-- ── Estado de Laboratorio ──────────────────────────────────── -->
        <div v-if="order.labFolio" class="voucher-lab-status-box mt-4">
          <div class="is-flex is-align-items-center">
            <div class="lab-icon-box mr-3">
              <i class="fas fa-flask"></i>
            </div>
            <div class="is-flex-grow-1">
              <p class="uppercase-label mb-0">Estado de Laboratorio</p>
              <div class="is-flex is-align-items-center is-justify-content-space-between">
                <span class="has-text-weight-bold mono">{{ order.labFolio }}</span>
                <b-tag
                  v-if="order.labStatus"
                  :type="`${labStatusClass(order.labStatus)} is-light`"
                  size="is-medium"
                  class="font-900"
                >
                  {{ labStatusHuman(order.labStatus) }}
                </b-tag>
              </div>
            </div>
            <b-button
              type="is-ghost"
              icon-left="sync"
              class="ml-2"
              @click="$emit('check-status', order)"
            />
          </div>
        </div>
      </section>

      <footer class="modal-card-foot glass-modal-footer">
        <b-button @click="$emit('close')" class="is-rounded">Cerrar</b-button>
        <b-button 
          type="is-primary" 
          icon-left="print" 
          class="premium-btn" 
          @click="$emit('print')"
        >
          Imprimir Ticket
        </b-button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { fmtDateShort } from '@/utils/formatters';
import { labStatusHuman, labStatusClass } from '@/utils/statusHelpers';

defineProps({
  order: { type: Object, default: null }
});

defineEmits(["close", "print", "check-status"]);
</script>

<style scoped>
.premium-glass-card {
  background: rgba(255, 255, 255, 0.92) !important;
  backdrop-filter: none !important;
  border: 1px solid rgba(255, 255, 255, 0.5) !important;
  border-radius: 28px !important;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.15) !important;
  width: auto;
  max-width: 520px;
}

.glass-modal-header {
  background: transparent !important;
  border-bottom: 1px solid rgba(0,0,0,0.05) !important;
  padding: 1.5rem !important;
}

.glass-modal-title {
  font-weight: 1000 !important;
  font-size: 1.4rem !important;
  color: var(--text-primary) !important;
  letter-spacing: -0.02em;
}

.glass-modal-body {
  background: transparent !important;
  padding: 1.5rem !important;
}

.glass-modal-footer {
  background: transparent !important;
  border-top: 1px solid rgba(0,0,0,0.05) !important;
  padding: 1.2rem 1.5rem !important;
  justify-content: flex-end !important;
  gap: 0.75rem;
}

/* ── Ticket Estilizado ── */
.voucher-ticket {
  background: #fff;
  padding: 1.5rem;
  border-radius: 20px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  border: 1px solid var(--border-light);
  position: relative;
}

.ticket-header {
  text-align: center;
  border-bottom: 2px dashed var(--border);
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.ticket-title {
  font-weight: 1000;
  font-size: 1.5rem;
  color: var(--text-primary);
  letter-spacing: 0.1em;
}

.ticket-subtitle {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--text-muted);
  letter-spacing: 0.2em;
}

.ticket-info {
  margin-bottom: 1rem;
}

.ticket-info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  margin-bottom: 0.2rem;
}

.ticket-label { color: var(--text-muted); font-weight: 700; }
.ticket-val { color: var(--text-primary); font-weight: 800; }

.ticket-table {
  width: 100%;
  font-size: 0.8rem;
  border-collapse: collapse;
  margin-bottom: 1rem;
}

.ticket-table th {
  border-bottom: 1px solid var(--border);
  padding: 0.5rem 0;
  text-align: left;
  color: var(--text-muted);
}

.ticket-table td {
  padding: 0.5rem 0;
}

.ticket-prod-name { font-weight: 700; color: var(--text-primary); }

.ticket-footer {
  border-top: 2px dashed var(--border);
  padding-top: 1rem;
}

.ticket-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-weight: 1000;
  font-size: 1.25rem;
}

.ticket-grand-total { color: var(--c-primary); }

.ticket-payment-info {
  background: var(--bg-muted);
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

/* ── Comunes ── */
.section-title-premium {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 950;
  color: var(--c-primary);
  border-bottom: 2px solid var(--c-primary-alpha);
  display: inline-block;
  padding-bottom: 2px;
}

.closure-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.closure-stat-card {
  background: var(--surface-overlay);
  border: 1px solid var(--border);
  padding: 0.75rem;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
}

.closure-stat-label {
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
}

.closure-stat-val {
  font-size: 0.9rem;
  font-weight: 900;
  color: var(--text-primary);
}

.voucher-note-box {
  background: rgba(var(--c-primary-rgb), 0.05);
  padding: 0.75rem;
  border-radius: 14px;
  border: 1px solid var(--c-primary-alpha);
}

.voucher-lab-status-box {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  padding: 1rem;
  border-radius: 20px;
}

.lab-icon-box {
  width: 40px;
  height: 40px;
  background: var(--c-primary-alpha);
  color: var(--c-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 1.1rem;
}

.uppercase-label {
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 900;
  font-size: 0.7rem !important;
  color: var(--text-muted);
}

.mono { font-family: ui-monospace, monospace; }
.font-900 { font-weight: 900 !important; }
</style>
