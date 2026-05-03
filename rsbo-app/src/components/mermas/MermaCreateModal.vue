<template>

  <teleport to="body">

    <b-modal :model-value="modelValue" has-modal-card trap-focus :destroy-on-hide="true" animation="zoom-in"
      :can-cancel="['escape', 'outside']" @update:model-value="emit('update:modelValue', $event)">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Registrar merma</p>
          <button class="delete" aria-label="close" @click="close" />
        </header>

        <section class="modal-card-body" v-if="!showSuccess">
          <b-field grouped>
            <b-field label="Origen" expanded>
              <b-select v-model="form.origin" expanded :disabled="originLocked">
                <option value="LAB">Laboratorio</option>
                <option value="VENTAS">Ventas</option>
                <option value="INVENTARIO">Inventario</option>
              </b-select>
            </b-field>
            <b-field label="Motivo" expanded>
              <b-select v-model="form.reason" expanded>
                <option value="ROTURA">Rotura</option>
                <option value="DEFECTO">Defecto</option>
                <option value="CADUCIDAD">Caducidad</option>
                <option value="EXTRAVIO">Extravío</option>
                <option value="OTRO">Otro</option>
              </b-select>
            </b-field>
            <b-field label="Cantidad" expanded>
              <b-input v-model.number="form.qty" type="number" min="1" :max="maxQty || undefined" />
            </b-field>
          </b-field>

          <!-- Selector de ítem si no viene pre-cargado -->
          <b-field v-if="!form.sheet" label="Escanear producto o ingresar código identificador (SKU)" type="is-info">
            <b-input v-model="searchCodebar" placeholder="Ejem: 1234567890" icon="barcode" :loading="resolving"
              @keyup.enter.native="handleResolve" />
          </b-field>

          <div v-if="resolvedItem"
            class="notification is-light is-info py-2 px-4 mb-4 animate__animated animate__fadeIn">
            <div class="is-flex is-align-items-center">
              <span class="icon is-medium mr-2">
                <i class="mdi mdi-check-circle mdi-24px"></i>
              </span>
              <div>
                <p class="is-size-6 has-text-weight-bold">{{ resolvedItem.sheet?.nombre || 'Producto encontrado' }}</p>
                <p class="is-size-7">{{ resolvedItem.matrixKey }} {{ resolvedItem.eye ? `| ${resolvedItem.eye}` : '' }}
                  | Stock: {{ resolvedItem.item?.existencias || 0 }}</p>
              </div>
            </div>
          </div>

          <b-field label="Código de barras" v-if="form.codebar">
            <b-input v-model="form.codebar" disabled />
          </b-field>

          <b-field label="Notas">
            <b-input v-model="form.notes" type="textarea" maxlength="500" />
          </b-field>

          <p v-if="errorMsg" class="has-text-danger is-size-7 mt-2">{{ errorMsg }}</p>
          <p v-if="hint" class="has-text-grey is-size-7 mt-2">{{ hint }}</p>
        </section>

        <section v-if="showSuccess" class="modal-card-body has-text-centered py-6 animate__animated animate__zoomIn">
          <span class="icon is-large has-text-success mb-4">
            <i class="mdi mdi-check-circle mdi-48px"></i>
          </span>
          <h2 class="title is-4">¡Merma registrada!</h2>
          <p class="subtitle is-6">El inventario ha sido actualizado.</p>
        </section>

        <footer class="modal-card-foot" style="justify-content: flex-end; gap: 0.5rem">
          <b-button :disabled="saving || showSuccess" @click="close">Cancelar</b-button>
          <b-button type="is-danger" :loading="saving" :disabled="!canSubmit || showSuccess" @click="submit">
            Registrar merma
          </b-button>
        </footer>
      </div>
    </b-modal>
  </teleport>

</template>

<script setup>
import { reactive, ref, computed, watch } from "vue";
import { createMerma } from "@/services/mermas";
import { resolveCodebar } from "@/services/inventory";

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  prefill: { type: Object, default: () => ({}) },
  maxQty: { type: Number, default: 0 },
});
const emit = defineEmits(["update:modelValue", "created"]);

const saving = ref(false);
const resolving = ref(false);
const showSuccess = ref(false);
const errorMsg = ref("");
const searchCodebar = ref("");
const resolvedItem = ref(null);

const form = reactive({
  origin: "INVENTARIO",
  reason: "ROTURA",
  qty: 1,
  notes: "",
  // técnicos / trazabilidad (no editables, vienen de prefill)
  sheet: null,
  matrixKey: null,
  eye: null,
  codebar: null,
  params: {},
  laboratoryOrder: null,
  laboratoryLineId: null,
  devolution: null,
  ventaFolio: null,
});

const originLocked = computed(() => Boolean(props.prefill?.origin));
const hint = computed(() => {
  if (props.maxQty > 0) return `Stock disponible: ${props.maxQty}`;
  return "";
});

const canSubmit = computed(() => {
  if (!form.sheet || !form.matrixKey) return false;
  if (!Number.isFinite(form.qty) || form.qty < 1) return false;
  if (props.maxQty > 0 && form.qty > props.maxQty) return false;
  return true;
});

watch(() => props.modelValue, (open) => {
  if (!open) return;
  errorMsg.value = "";
  searchCodebar.value = "";
  resolvedItem.value = null;
  showSuccess.value = false;
  Object.assign(form, {
    origin: props.prefill?.origin || "INVENTARIO",
    reason: "ROTURA",
    qty: 1,
    notes: "",
    sheet: props.prefill?.sheet || null,
    matrixKey: props.prefill?.matrixKey || null,
    eye: props.prefill?.eye || null,
    codebar: props.prefill?.codebar || null,
    params: props.prefill?.params || {},
    laboratoryOrder: props.prefill?.laboratoryOrder || null,
    laboratoryLineId: props.prefill?.laboratoryLineId || null,
    devolution: props.prefill?.devolution || null,
    ventaFolio: props.prefill?.ventaFolio || null,
  });
}, { immediate: true });

async function handleResolve() {
  if (!searchCodebar.value) return;
  resolving.value = true;
  errorMsg.value = "";
  resolvedItem.value = null;
  try {
    const { data } = await resolveCodebar(searchCodebar.value);
    if (data) {
      resolvedItem.value = data;
      form.sheet = data.sheet?._id;
      form.matrixKey = data.matrixKey;
      form.eye = data.eye;
      form.codebar = searchCodebar.value;
      // Actualizar maxQty localmente si es posible
    }
  } catch (e) {
    errorMsg.value = "No se encontró ningún producto con ese código";
  } finally {
    resolving.value = false;
  }
}

function close() {
  emit("update:modelValue", false);
}

async function submit() {
  if (!canSubmit.value) return;
  saving.value = true;
  errorMsg.value = "";
  try {
    const { data } = await createMerma({ ...form });
    emit("created", data?.data || null);
    showSuccess.value = true;
    setTimeout(() => {
      close();
    }, 1500);
  } catch (e) {
    errorMsg.value = e?.response?.data?.error || e.message || "Error al registrar merma";
  } finally {
    saving.value = false;
  }
}
</script>
