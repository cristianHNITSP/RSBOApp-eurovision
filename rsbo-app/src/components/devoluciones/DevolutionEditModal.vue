<template>
  <b-modal
    :model-value="modelValue"
    has-modal-card
    trap-focus
    :destroy-on-hide="true"
    animation="zoom-in"
    :can-cancel="['escape', 'outside']"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="modal-card" style="max-width: 720px;">
      <header class="modal-card-head">
        <p class="modal-card-title">Editar devolución{{ devolution?.folio ? ` · ${devolution.folio}` : '' }}</p>
        <button class="delete" aria-label="close" @click="close" />
      </header>

      <section class="modal-card-body">
        <p v-if="!editable" class="has-text-warning is-size-7 mb-2">
          <i class="fas fa-lock mr-1" />
          Solo se puede editar en estado <strong>pendiente</strong> o <strong>en_revision</strong>.
        </p>

        <b-field grouped>
          <b-field label="Cliente *" expanded>
            <b-input v-model="form.cliente" :disabled="!editable" />
          </b-field>
          <b-field label="Teléfono" expanded>
            <b-input v-model="form.clientePhone" :disabled="!editable" />
          </b-field>
        </b-field>

        <b-field label="Motivo">
          <b-select v-model="form.reason" :disabled="!editable" expanded>
            <option v-for="r in REASONS" :key="r.value" :value="r.value">{{ r.label }}</option>
          </b-select>
        </b-field>

        <b-field label="Detalle del motivo">
          <b-input v-model="form.reasonDetail" :disabled="!editable" type="textarea" rows="2" />
        </b-field>

        <b-field label="Notas internas">
          <b-input v-model="form.notes" :disabled="!editable" type="textarea" rows="2" />
        </b-field>

        <hr class="my-3" />

        <p class="has-text-weight-semibold mb-2">Items ({{ form.items.length }})</p>
        <div v-if="!form.items.length" class="has-text-grey is-size-7">Sin items.</div>
        <div v-for="(it, i) in form.items" :key="i" class="dev-edit-item">
          <div class="dev-edit-item__top">
            <span class="dev-edit-item__cb">
              <i class="fas fa-barcode mr-1" />
              {{ it.codebar || '—' }}
            </span>
            <span v-if="it.description" class="dev-edit-item__desc">{{ it.description }}</span>
          </div>
          <b-field grouped class="mt-1">
            <b-field label="Qty" expanded>
              <b-input
                v-model.number="it.qty"
                :disabled="!editable"
                type="number"
                min="1"
                size="is-small"
              />
            </b-field>
            <b-field label="Condición" expanded>
              <b-select
                v-model="it.condition"
                :disabled="!editable"
                size="is-small"
                expanded
                @update:model-value="onConditionChange(it)"
              >
                <option value="bueno">Bueno</option>
                <option value="danado">Dañado</option>
                <option value="defectuoso">Defectuoso</option>
              </b-select>
            </b-field>
            <b-field label="Reingreso" expanded>
              <b-checkbox
                v-model="it.restoreStock"
                :disabled="!editable || it.condition !== 'bueno'"
              >
                {{ it.condition === 'bueno' ? 'Reingresar a stock' : 'No aplica (se generará merma)' }}
              </b-checkbox>
            </b-field>
          </b-field>
        </div>

        <p v-if="errorMsg" class="has-text-danger is-size-7 mt-2">{{ errorMsg }}</p>
      </section>

      <footer class="modal-card-foot" style="justify-content: flex-end; gap: 0.5rem">
        <b-button @click="close">Cancelar</b-button>
        <b-button
          type="is-primary"
          :loading="saving"
          :disabled="!editable || !canSave"
          @click="submit"
        >
          Guardar cambios
        </b-button>
      </footer>
    </div>
  </b-modal>
</template>

<script setup>
import { reactive, ref, computed, watch } from "vue";
import { updateDevolution } from "@/services/devolutions";

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  devolution: { type: Object, default: null },
});
const emit = defineEmits(["update:modelValue", "saved"]);

const saving = ref(false);
const errorMsg = ref("");

const REASONS = [
  { value: "defecto_fabricacion",    label: "Defecto de fabricación" },
  { value: "error_prescripcion",     label: "Error de prescripción" },
  { value: "insatisfaccion_cliente", label: "Insatisfacción del cliente" },
  { value: "dano_transporte",        label: "Daño en transporte" },
  { value: "lente_roto",             label: "Lente roto" },
  { value: "pedido_incorrecto",      label: "Pedido incorrecto" },
  { value: "garantia",               label: "Garantía" },
  { value: "otro",                   label: "Otro" },
];

const form = reactive({
  cliente: "",
  clientePhone: "",
  reason: "otro",
  reasonDetail: "",
  notes: "",
  restoreStock: false,
  items: [],
});

const editable = computed(() => {
  const s = props.devolution?.status;
  return s === "pendiente" || s === "en_revision";
});

const canSave = computed(() => {
  if (!form.cliente?.trim()) return false;
  if (!form.items.length)     return false;
  return form.items.every(i => Number.isFinite(Number(i.qty)) && Number(i.qty) >= 1);
});

watch(() => [props.modelValue, props.devolution], ([open, dev]) => {
  if (!open || !dev) return;
  errorMsg.value = "";
  form.cliente      = dev.cliente || "";
  form.clientePhone = dev.clientePhone || "";
  form.reason       = dev.reason || "otro";
  form.reasonDetail = dev.reasonDetail || "";
  form.notes        = dev.notes || "";
  form.restoreStock = Boolean(dev.restoreStock);
  form.items = (dev.items || []).map(it => ({
    codebar:     it.codebar || "",
    description: it.description || "",
    sku:         it.sku || null,
    qty:         Number(it.qty) || 1,
    condition:   ["bueno","danado","defectuoso"].includes(it.condition) ? it.condition : "defectuoso",
    restoreStock: it.condition === "bueno" ? Boolean(it.restoreStock) : false,
    sheet:       it.sheet || null,
    matrixKey:   it.matrixKey || null,
    eye:         it.eye || null,
  }));
}, { immediate: true });

function onConditionChange(it) {
  if (it.condition !== "bueno") it.restoreStock = false;
}

function close() {
  emit("update:modelValue", false);
}

async function submit() {
  if (!editable.value || !canSave.value) return;
  saving.value = true;
  errorMsg.value = "";
  try {
    const payload = {
      cliente:      form.cliente.trim(),
      clientePhone: form.clientePhone || null,
      reason:       form.reason,
      reasonDetail: form.reasonDetail || "",
      notes:        form.notes || "",
      restoreStock: Boolean(form.restoreStock),
      items: form.items.map(i => ({ ...i })),
    };
    const { data } = await updateDevolution(props.devolution._id, payload);
    emit("saved", data?.data || null);
    close();
  } catch (e) {
    errorMsg.value = e?.response?.data?.error || e.message || "Error al actualizar devolución";
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.dev-edit-item {
  border: 1px solid rgba(120,120,120,0.2);
  border-radius: 8px;
  padding: .5rem .75rem;
  margin-bottom: .5rem;
  background: rgba(255,255,255,0.02);
}
.dev-edit-item__top { display: flex; align-items: center; gap: .75rem; }
.dev-edit-item__cb  { font-family: monospace; font-weight: 600; }
.dev-edit-item__desc { color: var(--text-muted, #888); font-size: .85rem; }
</style>
