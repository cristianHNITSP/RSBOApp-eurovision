<template>
  <div class="bm-voucher" v-if="order">
    <!-- ── Nota de Venta (formato imprimible) ─────────────────────── -->
    <div class="nv-nota">
      <div class="nv-nota__title">NOTA DE VENTA</div>
      <div class="nv-nota__info">
        <span>CLIENTE: {{ order.clienteDisplay || order.cliente }}</span>
        <span>FECHA: {{ fmtDateShort(order.fecha) }}</span>
      </div>
      <table class="nv-nota__table">
        <thead>
          <tr>
            <th>CANTIDAD</th>
            <th>PRODUCTO</th>
            <th>PRECIO UNITARIO</th>
            <th>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, i) in order.lineas" :key="i">
            <td class="nv-td-center">{{ line.qty }}</td>
            <td>{{ line.title }}</td>
            <td class="nv-td-center">
              {{ line.precio ? `${Number(line.precio).toFixed(2)} MXN` : '—' }}
            </td>
            <td class="nv-td-right">
              {{ line.precio ? (line.qty * line.precio).toFixed(2) : '—' }}
            </td>
          </tr>
        </tbody>
      </table>
      <div class="nv-nota__footer">
        <div class="nv-nota__pago">
          <div class="nv-nota__pago-label">CONDICIONES DE PAGO:</div>
          <div class="nv-nota__pago-val">{{ order.pagoDisplay || '—' }}</div>
        </div>
        <div class="nv-nota__total">
          <div class="nv-nota__total-label">PRECIO TOTAL</div>
          <div class="nv-nota__total-val">
            {{ order.totalMonto ? order.totalMonto.toFixed(2) : '—' }}
          </div>
        </div>
      </div>
    </div>

    <!-- ── Detalles adicionales ───────────────────────────────────── -->
    <div class="bm-voucher__meta" style="margin-top:0.75rem">
      <div class="bm-voucher__row">
        <span class="bm-voucher__label">Total piezas</span>
        <span class="bm-voucher__val">{{ order.totalPiezas }}</span>
      </div>
      <div v-if="order.note" class="bm-voucher__row">
        <span class="bm-voucher__label">Notas</span>
        <span class="bm-voucher__val">{{ order.note }}</span>
      </div>
      <div v-if="order.clienteEmpresa" class="bm-voucher__row">
        <span class="bm-voucher__label">Empresa</span>
        <span class="bm-voucher__val">{{ order.clienteEmpresa }}</span>
      </div>
      <div v-if="order.clienteContacto" class="bm-voucher__row">
        <span class="bm-voucher__label">Contacto</span>
        <span class="bm-voucher__val">{{ order.clienteContacto }}</span>
      </div>
      <div class="bm-voucher__row">
        <span class="bm-voucher__label">Atendido por</span>
        <span class="bm-voucher__val">{{ order.actor }}</span>
      </div>
      <div v-if="order.ventaFolio" class="bm-voucher__row">
        <span class="bm-voucher__label">Folio venta</span>
        <span class="bm-voucher__val mono">{{ order.ventaFolio }}</span>
      </div>
      <div v-if="order.labFolio" class="bm-voucher__row">
        <span class="bm-voucher__label">Folio lab</span>
        <span class="bm-voucher__val mono">{{ order.labFolio }}</span>
      </div>
    </div>

    <!-- ── Lab order info ─────────────────────────────────────────── -->
    <div v-if="order.labFolio" class="bm-voucher__lab-order">
      <i class="fas fa-flask bm-voucher__lab-icon"></i>
      <div>
        <div class="bm-voucher__lab-folio mono">{{ order.labFolio }}</div>
        <div class="bm-voucher__lab-status">
          <span
            v-if="order.labOrderId && labStatuses[order.labOrderId]"
            class="lab-status-pill"
            :class="`lab-status-pill--${labStatuses[order.labOrderId]?.status}`"
          >
            {{ labStatusHuman(labStatuses[order.labOrderId]?.status) }}
          </span>
          <span v-else class="lab-status-pill lab-status-pill--pendiente">
            Pendiente de surtir
          </span>
        </div>
      </div>
      <b-button
        v-if="order.labOrderId"
        size="is-small"
        type="is-light"
        icon-left="sync"
        @click="$emit('check-status', order)"
      />
    </div>

    <!-- ── Acciones ───────────────────────────────────────────────── -->
    <div class="bm-voucher__actions">
      <b-button type="is-primary" icon-left="print" expanded @click="$emit('print')">
        Imprimir / PDF
      </b-button>
      <b-button type="is-light" expanded @click="$emit('close')">
        Cerrar
      </b-button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  order: { type: Object, default: null },
  labStatuses: { type: Object, default: () => ({}) },
  fmtDateShort: { type: Function, required: true },
  labStatusHuman: { type: Function, required: true }
});

defineEmits(["close", "print", "check-status"]);
</script>

<style src="./BasesMicasVoucher.css" scoped></style>
