<template>
  <span class="status-badge" :class="statusClass">
    <span class="status-badge__dot"></span>
    <span class="status-badge__text">{{ statusLabel }}</span>
  </span>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  status: {
    type: String,
    required: true,
  },
});

const STATUS_MAP = {
  SOLICITADO: { label: "Solicitado", class: "is-solicitado" },
  PEDIDO_PROVEEDOR: { label: "Pedido a Prov.", class: "is-pedido" },
  RECIBIDO: { label: "Recibido", class: "is-recibido" },
  LISTO_ENTREGA: { label: "Listo para Entrega", class: "is-listo" },
  ENTREGADO: { label: "Entregado", class: "is-entregado" },
  CANCELADO: { label: "Cancelado", class: "is-cancelado" },
};

const statusInfo = computed(() => STATUS_MAP[props.status] || { label: props.status, class: "" });
const statusLabel = computed(() => statusInfo.value.label);
const statusClass = computed(() => statusInfo.value.class);
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: var(--surface-overlay);
  backdrop-filter: blur(4px);
  white-space: nowrap;
}

.status-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

/* Variants */
.is-solicitado { color: #3b82f6; background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.2); }
.is-pedido { color: #f59e0b; background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.2); }
.is-recibido { color: #06b6d4; background: rgba(6, 182, 212, 0.1); border-color: rgba(6, 182, 212, 0.2); }
.is-listo { color: #8b5cf6; background: rgba(139, 92, 246, 0.1); border-color: rgba(139, 92, 246, 0.2); }
.is-entregado { color: #10b981; background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); }
.is-cancelado { color: #6b7280; background: rgba(107, 114, 128, 0.1); border-color: rgba(107, 114, 128, 0.2); }

[data-theme="dark"] .status-badge {
  background: rgba(0, 0, 0, 0.2);
}
</style>
