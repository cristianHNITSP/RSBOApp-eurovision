<template>
  <div class="panel panel--sticky">
    <div class="panel__head panel__head--compact">
      <div>
        <h2 class="panel__title">
          Carrito
          <span class="panel__badge">{{ cartItems.length }}</span>
        </h2>
      </div>
      <b-button
        v-if="cartItems.length"
        size="is-small"
        type="is-light"
        icon-left="trash"
        @click="$emit('ask-clear-cart')"
      >
        Limpiar
      </b-button>
    </div>

    <div class="panel__body">
      <b-field label="Cliente *" class="mb-3">
        <b-autocomplete
          :value="cartCliente"
          @input="$emit('update:cartCliente', $event)"
          :data="clienteSuggestions"
          field="nombre"
          placeholder="Buscar cliente recurrente o escribir nombre…"
          icon="user"
          :open-on-focus="true"
          :keep-first="false"
          :clearable="true"
          @select="$emit('select-cliente', $event)"
        >
          <template #default="{ option }">
            <div class="cliente-opt">
              <div class="cliente-opt__info">
                <span class="cliente-opt__name">{{ option.nombre }}</span>
                <span v-if="option.nota" class="cliente-opt__note">{{ option.nota }}</span>
              </div>
              <span class="cliente-opt__badge">{{ option.pedidos }} pedido{{ option.pedidos > 1 ? 's' : '' }}</span>
            </div>
          </template>
          <template #empty>
            <span class="cliente-opt__empty">
              <i class="fas fa-user-plus mr-1"></i>Nuevo cliente
            </span>
          </template>
        </b-autocomplete>
      </b-field>

      <b-field label="Notas" class="mb-3">
        <b-input
          :value="cartNote"
          @input="$emit('update:cartNote', $event)"
          placeholder="Observaciones (opcional)"
          icon="sticky-note"
        />
      </b-field>

      <!-- Datos adicionales del cliente (siempre visibles, opcionales) -->
      <p class="nv-cliente-section-label mb-2">
        <i class="fas fa-user-tag mr-1"></i>Datos adicionales del cliente
      </p>
      <div class="nv-cliente-form mb-3">
        <div class="columns is-mobile is-variable is-2 mb-0">
          <div class="column">
            <b-field label="Nombre(s)" class="mb-2">
              <b-input 
                :value="cartClienteNombres" 
                @input="$emit('update:cartClienteNombres', $event)" 
                placeholder="Nombre(s)" size="is-small" 
              />
            </b-field>
          </div>
          <div class="column">
            <b-field label="Apellidos" class="mb-2">
              <b-input 
                :value="cartClienteApellidos" 
                @input="$emit('update:cartClienteApellidos', $event)" 
                placeholder="Apellidos" size="is-small" 
              />
            </b-field>
          </div>
        </div>
        <div class="columns is-mobile is-variable is-2 mb-0">
          <div class="column">
            <b-field label="Empresa" class="mb-0">
              <b-input 
                :value="cartClienteEmpresa" 
                @input="$emit('update:cartClienteEmpresa', $event)" 
                placeholder="Empresa" size="is-small" icon="building" 
              />
            </b-field>
          </div>
          <div class="column">
            <b-field label="Contacto" class="mb-0">
              <b-input 
                :value="cartClienteContacto" 
                @input="$emit('update:cartClienteContacto', $event)" 
                placeholder="Tel / Email" size="is-small" icon="phone" 
              />
            </b-field>
          </div>
        </div>
      </div>

      <!-- Condiciones de pago -->
      <div class="nv-pago-check mb-3">
        <p class="nv-pago-check__label">Condiciones de pago</p>
        <div class="nv-pago-check__opts">
          <b-checkbox
            v-for="op in PAGO_OPCIONES"
            :key="op.value"
            :value="cartPago"
            @input="$emit('update:cartPago', $event)"
            :native-value="op.value"
            size="is-small"
          >
            {{ op.label }}
          </b-checkbox>
        </div>
      </div>

      <hr class="soft-hr" />

      <!-- Carrito vacío -->
      <div v-if="!cartItems.length" class="empty empty--mini">
        <i class="fas fa-shopping-cart empty__icon"></i>
        <p class="empty__title">Carrito vacío</p>
        <p class="empty__text">Agrega productos desde el catálogo.</p>
      </div>

      <!-- Items del carrito -->
      <div v-else class="order-lines">
        <div
          v-for="ci in cartItems"
          :key="ci.key"
          class="order-line"
        >
          <div class="order-line__top">
            <div>
              <div class="order-line__title">{{ ci.title }}</div>
              <span class="order-line__sub">{{ ci.params }}</span>
              <span class="order-line__sub muted">{{ ci.sheet.nombre }}</span>
            </div>
            <b-button
              size="is-small"
              type="is-light"
              icon-left="times"
              @click="$emit('remove-from-cart', ci.key)"
            />
          </div>

          <div class="order-line__bottom">
            <div class="qty-control">
              <b-button
                size="is-small"
                type="is-light"
                icon-left="minus"
                @click="$emit('dec-cart-qty', ci)"
              />
              <span class="mono" style="min-width:28px;text-align:center;font-weight:900">
                {{ ci.qty }}
              </span>
              <b-button
                size="is-small"
                type="is-light"
                icon-left="plus"
                @click="$emit('inc-cart-qty', ci)"
              />
            </div>
            <span v-if="ci.precio" class="nv-precio-tag">
              ${{ ci.precio.toFixed(2) }} MXN
            </span>
            <span class="stock-hint">stock: {{ ci.row.existencias }}</span>
          </div>
        </div>
      </div>

      <hr class="soft-hr" />

      <!-- Total -->
      <div class="bm-cart-summary">
        <span class="muted">Total piezas:</span>
        <span class="bm-cart-summary__val">{{ cartTotal }}</span>
      </div>
      <div v-if="cartTotalMonto > 0" class="bm-cart-summary mt-1">
        <span class="muted">Total:</span>
        <span class="bm-cart-summary__val" style="font-size:1.05rem">
          ${{ cartTotalMonto.toFixed(2) }} MXN
        </span>
      </div>

      <b-button
        type="is-primary"
        icon-left="flask"
        expanded
        :loading="loadingSale"
        :disabled="!cartItems.length || !cartCliente.trim()"
        class="mt-3"
        @click="$emit('ask-send-to-lab')"
      >
        Enviar a Laboratorio
      </b-button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  cartItems: { type: Array, default: () => [] },
  cartCliente: { type: String, default: "" },
  cartNote: { type: String, default: "" },
  cartClienteNombres: { type: String, default: "" },
  cartClienteApellidos: { type: String, default: "" },
  cartClienteEmpresa: { type: String, default: "" },
  cartClienteContacto: { type: String, default: "" },
  cartPago: { type: Array, default: () => [] },
  clienteSuggestions: { type: Array, default: () => [] },
  cartTotal: { type: Number, default: 0 },
  cartTotalMonto: { type: Number, default: 0 },
  loadingSale: { type: Boolean, default: false }
});

const PAGO_OPCIONES = [
  { value: "trans",   label: "Transferencia (TRANS)" },
  { value: "efec",    label: "Efectivo (EFEC)" },
  { value: "credito", label: "Crédito" },
  { value: "tarjeta", label: "Tarjeta C|D" },
];

defineEmits([
  "update:cartCliente",
  "update:cartNote",
  "update:cartClienteNombres",
  "update:cartClienteApellidos",
  "update:cartClienteEmpresa",
  "update:cartClienteContacto",
  "update:cartPago",
  "select-cliente",
  "ask-clear-cart",
  "remove-from-cart",
  "dec-cart-qty",
  "inc-cart-qty",
  "ask-send-to-lab"
]);
</script>

<style src="./BasesMicasCart.css" scoped></style>
