<template>
  <div class="panel panel--sticky">
    <div class="panel__head panel__head--compact">
      <div>
        <h2 class="panel__title">
          Carrito
          <span class="panel__badge">{{ cartItems.length }}</span>
        </h2>
      </div>
      <b-button v-if="cartItems.length" size="is-small" type="is-light" icon-left="trash"
        @click="$emit('ask-clear-cart')">
        Limpiar
      </b-button>
    </div>

    <div class="panel__body">
      <b-field label="Cliente *" class="mb-3">
        <b-autocomplete
          :model-value="cartCliente"
          @update:model-value="onTyping"
          :data="suggestions"
          field="nombre"
          placeholder="Buscar cliente o escribir nombre…"
          icon="user"
          :clearable="true"
          :loading="isSearching"
          :keep-first="false"
          :open-on-focus="true"
          @select="onSelect"
        >
          <template #default="{ option }">
            <div class="cliente-opt">
              <div class="cliente-opt__info">
                <span class="cliente-opt__name">{{ option.display || option.nombre }}</span>
                <div class="cliente-opt__details" v-if="option.empresa || option.contacto">
                  <span v-if="option.empresa" class="cliente-opt__detail">
                    <i class="fas fa-building mr-1"></i>{{ option.empresa }}
                  </span>
                  <span v-if="option.contacto" class="cliente-opt__detail ml-3">
                    <i class="fas fa-phone mr-1"></i>{{ option.contacto }}
                  </span>
                </div>
              </div>
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
          :model-value="cartNote"
          @update:model-value="$emit('update:cartNote', $event)"
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
                :model-value="cartClienteNombres"
                @update:model-value="$emit('update:cartClienteNombres', $event)"
                placeholder="Nombre(s)"
                size="is-small"
              />
            </b-field>
          </div>
          <div class="column">
            <b-field label="Apellidos" class="mb-2">
              <b-input
                :model-value="cartClienteApellidos"
                @update:model-value="$emit('update:cartClienteApellidos', $event)"
                placeholder="Apellidos"
                size="is-small"
              />
            </b-field>
          </div>
        </div>
        <div class="columns is-mobile is-variable is-2 mb-0">
          <div class="column">
            <b-field label="Empresa" class="mb-0">
              <b-input
                :model-value="cartClienteEmpresa"
                @update:model-value="$emit('update:cartClienteEmpresa', $event)"
                placeholder="Empresa"
                size="is-small"
                icon="building"
              />
            </b-field>
          </div>
          <div class="column">
            <b-field label="Contacto" class="mb-0">
              <b-input
                :model-value="cartClienteContacto"
                @update:model-value="$emit('update:cartClienteContacto', $event)"
                placeholder="Tel / Email"
                size="is-small"
                icon="phone"
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
            :model-value="cartPago"
            @update:model-value="$emit('update:cartPago', $event)"
            :native-value="op.value"
            size="is-small"
          >
            {{ op.label }}
          </b-checkbox>
        </div>
      </div>

      <hr class="soft-hr" />

      <!-- Items del carrito -->
      <div v-if="!cartItems.length" class="empty empty--mini">
        <i class="fas fa-shopping-cart empty__icon"></i>
        <p class="empty__title">Carrito vacío</p>
        <p class="empty__text">Agrega productos desde el catálogo.</p>
      </div>

      <transition-group v-else name="cart-item-anim" tag="div" class="cart__items">
        <div v-for="ci in cartItems" :key="ci.key" class="cart-item">
          <div class="order-line__top">
            <div>
              <div class="order-line__title">{{ ci.title }}</div>
              <span class="order-line__sub">{{ ci.params }}</span>
              <span v-if="ci.sheet && ci.sheet.nombre" class="order-line__sub muted">{{ ci.sheet.nombre }}</span>
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
            <MermaButton
              v-if="ci.row?.matrixKey && ci.sheet?.id"
              :prefill="mermaPrefillFor(ci)"
              :max-qty="Number(ci.row.existencias) || 0"
              size="is-small"
              type="is-warning is-light"
              icon-left="trash-can"
              label="Merma"
              @created="$emit('merma:created', $event)"
            />
          </div>
        </div>
      </transition-group>

      <hr class="soft-hr" />

      <!-- Total -->
      <div class="cart__summary liquid-glass">
        <div class="ventas-cart-summary">
          <span class="muted">Total piezas:</span>
          <span class="ventas-cart-summary__val">{{ cartTotal }}</span>
        </div>
        <div v-if="cartTotalMonto > 0" class="ventas-cart-summary mt-1">
          <span class="muted">Total:</span>
          <span class="ventas-cart-summary__val" style="font-size:1.05rem">
            ${{ cartTotalMonto.toFixed(2) }} MXN
          </span>
        </div>
      </div>

      <b-button
        :type="kind === 'lab' ? 'is-primary' : 'is-success'"
        :icon-left="kind === 'lab' ? 'flask' : 'cash-register'"
        expanded
        :loading="loadingSale"
        :disabled="!cartItems.length || !cartCliente.trim()"
        class="mt-3 premium-btn"
        @click="$emit('checkout')"
      >
        {{ kind === 'lab' ? 'Enviar a Laboratorio' : 'Cobrar y Entregar' }}
      </b-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { searchClients } from "@/services/laboratorio";
import MermaButton from "@/components/mermas/MermaButton.vue";

function mermaPrefillFor(ci) {
  return {
    origin: "VENTAS",
    sheet:     ci.sheet?.id || ci.sheetId,
    matrixKey: ci.row?.matrixKey,
    eye:       ci.row?.eye || null,
    codebar:   ci.row?.codebar || null,
    params: {
      sph:      ci.row?.sph      ?? null,
      cyl:      ci.row?.cyl      ?? null,
      add:      ci.row?.add      ?? null,
      base:     ci.row?.base     ?? null,
      base_izq: ci.row?.base_izq ?? null,
      base_der: ci.row?.base_der ?? null,
      eye:      ci.row?.eye      ?? null,
    },
  };
}

const props = defineProps({
  kind: { type: String, default: 'direct', validator: v => ['lab', 'direct'].includes(v) },
  cartItems: { type: Array, default: () => [] },
  cartCliente: { type: String, default: "" },
  cartNote: { type: String, default: "" },
  cartClienteNombres: { type: String, default: "" },
  cartClienteApellidos: { type: String, default: "" },
  cartClienteEmpresa: { type: String, default: "" },
  cartClienteContacto: { type: String, default: "" },
  cartPago: { type: Array, default: () => [] },
  cartTotal: { type: Number, default: 0 },
  cartTotalMonto: { type: Number, default: 0 },
  loadingSale: { type: Boolean, default: false }
});

const emit = defineEmits([
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
  "checkout"
]);

const PAGO_OPCIONES = [
  { value: "trans",   label: "Transferencia (TRANS)" },
  { value: "efec",    label: "Efectivo (EFEC)" },
  { value: "credito", label: "Crédito" },
  { value: "tarjeta", label: "Tarjeta C|D" },
];

const suggestions = ref([]);
const isSearching = ref(false);

async function onTyping(text) {
  emit('update:cartCliente', text);
  if (!text || text.length < 2) {
    suggestions.value = [];
    return;
  }
  
  isSearching.value = true;
  try {
    const res = await searchClients(text);
    suggestions.value = res.data?.data || [];
  } catch (e) {
    console.error("Search failed:", e);
  } finally {
    isSearching.value = false;
  }
}

function onSelect(client) {
  if (!client) return;
  emit('update:cartClienteNombres', client.nombres || "");
  emit('update:cartClienteApellidos', client.apellidos || "");
  emit('update:cartClienteEmpresa', client.empresa || "");
  emit('update:cartClienteContacto', client.contacto || "");
  if (client.nota) emit('update:cartNote', client.nota);
  emit('update:cartCliente', client.nombre || "");
  emit('select-cliente', client);
}
</script>

<style src="./VentasCart.css" scoped></style>
