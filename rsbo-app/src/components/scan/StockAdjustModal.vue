<template>
  <Teleport to="body">
  <b-modal
    v-model="scan.stockOpen.value"
    has-modal-card
    trap-focus
    :destroy-on-hide="true"
    :can-cancel="['escape', 'outside']"
    aria-role="dialog"
    aria-modal
  >
    <div v-if="data" class="modal-card stock-card">
      <header class="modal-card-head stock-card__head">
        <b-icon icon="box" pack="fas" type="is-primary" class="mr-2" />
        <p class="modal-card-title">Ajustar stock</p>
        <button class="delete" aria-label="close" @click="close" />
      </header>

      <section class="modal-card-body">
        <!-- Datos de la dioptría escaneada -->
        <div class="box stock-info mb-4">
          <p class="is-size-7 has-text-grey mb-2">{{ data.sheet.nombre }}</p>

          <!-- Dioptría: cada parámetro como segmento (signo + grado bien presentados) -->
          <div class="dioptria">
            <div v-for="(seg, i) in segments" :key="i" class="dioptria__seg">
              <span class="dioptria__label">{{ seg.label }}</span>
              <span class="dioptria__value">{{ seg.value }}</span>
            </div>
          </div>

          <div class="tags mb-0 mt-3">
            <span class="tag is-light">{{ familyLabel }}</span>
            <span v-if="eyeLabel" class="tag is-info is-light">
              <b-icon icon="eye" pack="fas" size="is-small" class="mr-1" />{{ eyeLabel }}
            </span>
            <span class="tag is-primary is-light">Stock actual: {{ data.existencias }}</span>
          </div>
        </div>

        <!-- Cantidad a agregar/quitar -->
        <b-field label="Cantidad (+ agrega / – quita)" class="has-text-centered">
          <b-numberinput
            v-model="delta"
            :step="1"
            controls-rounded
            controls-position="compact"
            type="is-primary"
            expanded
          />
        </b-field>

        <p class="has-text-centered mt-2">
          Resultado:
          <strong :class="resulting < 0 ? 'has-text-danger' : 'has-text-success'">{{ resulting }}</strong>
        </p>
      </section>

      <footer class="modal-card-foot is-justify-content-flex-end">
        <b-button @click="close">Cancelar</b-button>
        <b-button
          type="is-primary"
          icon-left="check"
          :loading="scan.saving.value"
          :disabled="delta === 0 || resulting < 0"
          @click="confirm"
        >
          Aplicar
        </b-button>
      </footer>
    </div>
  </b-modal>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useQrScan } from "@/composables/scan/useQrScan";

const scan = useQrScan();
const data = computed(() => scan.resolved.value);
const delta = ref(0);

watch(() => scan.stockOpen.value, (open) => { if (open) delta.value = 0; });

const resulting = computed(() => Number(data.value?.existencias || 0) + Number(delta.value || 0));

const FAMILY_LABEL = { inventory: "Bases y micas", contactlenses: "Lentes de contacto" };
const familyLabel = computed(() => FAMILY_LABEL[data.value?.family] || "Inventario");

const eyeLabel = computed(() =>
  data.value?.eye === "OD" ? "Ojo derecho" : data.value?.eye === "OI" ? "Ojo izquierdo" : null
);

// Graduación con signo y 2 decimales (Esf/Cil/Add); usa el signo menos tipográfico.
const signed = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(2)}`;
};
// Valor sin signo forzado (Base curva).
const plain2 = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : "—";
};

const segments = computed(() => {
  const d = data.value;
  if (!d) return [];
  const c = d.coords || {};
  switch (d.tipo) {
    case "BASE": return [{ label: "Base", value: plain2(c.base) }];
    case "SPH_CYL": return [{ label: "Esfera", value: signed(c.sph) }, { label: "Cilindro", value: signed(c.cyl) }];
    case "SPH_CYL_AXIS": return [
      { label: "Esfera", value: signed(c.sph) },
      { label: "Cilindro", value: signed(c.cyl) },
      { label: "Eje", value: `${Number(c.axis)}°` },
    ];
    case "SPH_ADD": return [{ label: "Esfera", value: signed(c.sph) }, { label: "Adición", value: signed(c.add) }];
    case "BASE_ADD": {
      const bi = plain2(c.base_izq);
      const bd = plain2(c.base_der);
      // Misma base en ambos lados → mostrarla una sola vez (no "0.50/0.50").
      return [
        { label: "Base", value: bi === bd ? bi : `${bi} / ${bd}` },
        { label: "Adición", value: signed(c.add) },
      ];
    }
    default: return [{ label: "SKU", value: d.sheet?.sku || "—" }];
  }
});

function confirm() {
  scan.adjustStock(delta.value);
}
function close() {
  scan.stockOpen.value = false;
  scan.reset();
}
</script>

<style scoped>
.stock-card {
  width: 100%;
  max-width: 420px;
  border-radius: 18px;
  overflow: hidden;
  background: var(--surface);
  box-shadow: var(--shadow-lg);
  animation: stock-liquid-in 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) both;
}

.stock-card__head {
  background: var(--surface-raised);
  border-bottom: 1px solid var(--border);
}

.stock-info {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  box-shadow: none;
}

/* Dioptría: segmentos (Esf / Cil / Eje…) bien presentados, con wrap en tórico */
.dioptria {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.dioptria__seg {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 4.5rem;
  padding: 0.4rem 0.75rem;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
}

.dioptria__label {
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 800;
  color: var(--text-muted);
}

.dioptria__value {
  font-size: 1.15rem;
  font-weight: 900;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

@keyframes stock-liquid-in {
  0%   { opacity: 0; transform: scale(0.94); filter: blur(var(--fx-blur, 10px)); }
  60%  { opacity: 1; transform: scale(1.012); filter: blur(0); }
  100% { transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .stock-card { animation: none; }
}
</style>
