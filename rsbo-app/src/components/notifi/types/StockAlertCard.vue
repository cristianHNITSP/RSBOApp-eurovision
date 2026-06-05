<script setup>
import { ref, computed } from "vue";
import { coordChips } from "../shared/useNotifFormat.js";

const props = defineProps({ notif: { type: Object, required: true } });

const isExpanded = ref(false);
const selectedAxis = ref(null);

const meta = computed(() => props.notif.metadata || {});
const sheet = computed(() => meta.value.sheet || {});
const sheetTags = computed(() => {
  const s = sheet.value;
  return [s.tipoLabel, s.baseKey, s.material, s.tratamiento, s.marca].filter(Boolean);
});
const cells = computed(() => meta.value.cells || []);
const critCount = computed(() => meta.value.critCount ?? cells.value.filter((c) => c.level === "CRITICO").length);
const lowCount = computed(() => meta.value.lowCount ?? cells.value.filter((c) => c.level === "BAJO").length);

const hasAxisData = computed(() => cells.value.some((c) => c.axis !== null && c.axis !== undefined));
const axes = computed(() =>
  [...new Set(cells.value.map((c) => String(c.axis)).filter((a) => a !== "null" && a !== "undefined"))]
    .sort((a, b) => Number(b) - Number(a))
);
const activeAxis = computed(() => selectedAxis.value || axes.value[0]);
const currentCells = computed(() =>
  hasAxisData.value ? cells.value.filter((c) => String(c.axis) === String(activeAxis.value)) : cells.value
);
</script>

<template>
  <div class="stock-alert-card">
    <!-- Resumen colapsado: identidad de la planilla + conteos (sin "|") -->
    <div class="notif-summary">
      <b-tag v-if="critCount > 0" type="is-danger" rounded size="is-small" class="summary-tag">
        {{ critCount }} crítico{{ critCount > 1 ? "s" : "" }}
      </b-tag>
      <b-tag v-if="lowCount > 0" type="is-warning" rounded size="is-small" class="summary-tag">
        {{ lowCount }} bajo{{ lowCount > 1 ? "s" : "" }}
      </b-tag>
      <code v-if="sheet.sku" class="summary-sku">{{ sheet.sku }}</code>
    </div>

    <!-- Identidad de la planilla: nombre/SKU + tipo · baseKey · material · tratamiento · marca -->
    <div class="sheet-id">
      <b-icon pack="fas" icon="layer-group" size="is-small" class="sheet-id__icon" />
      <span class="sheet-id__name">{{ sheet.name || meta.sheetLabel || "Planilla" }}</span>
    </div>
    <div v-if="sheetTags.length || sheet.proveedor" class="sheet-tags">
      <b-tag v-for="(t, i) in sheetTags" :key="i" type="is-light" size="is-small">{{ t }}</b-tag>
      <span v-if="sheet.proveedor" class="sheet-prov">
        <b-icon pack="fas" icon="truck" size="is-small" /> {{ sheet.proveedor }}
      </span>
    </div>

    <button v-if="cells.length" class="detail-toggle" @click="isExpanded = !isExpanded">
      <span>{{ isExpanded ? "Ocultar detalle" : "Ver detalle" }}</span>
      <b-icon pack="fas" :icon="isExpanded ? 'chevron-up' : 'chevron-down'" size="is-small" />
    </button>

    <transition name="detail-expand">
      <div v-if="isExpanded && cells.length" class="detail-panel">
        <div class="detail-header">
          <span class="detail-header__label">{{ meta.sheetLabel }}</span>
          <span class="detail-header__counts">
            <span v-if="critCount > 0" class="level-badge level-badge--critico">{{ critCount }} CRÍTICO</span>
          </span>
        </div>

        <!-- Navegador de grados (ejes) -->
        <div v-if="hasAxisData" class="axis-navigator-mini mb-3">
          <div class="axis-pills-mini">
            <button
              v-for="ax in axes"
              :key="ax"
              class="axis-pill-mini"
              :class="{ active: activeAxis === ax }"
              @click="selectedAxis = ax"
            >{{ ax }}°</button>
          </div>
        </div>

        <div class="cell-list-container-mini" :style="{ maxHeight: hasAxisData ? '250px' : '400px' }">
          <ul class="cell-list">
            <li v-for="(cell, idx) in currentCells" :key="idx" class="cell-row">
              <span
                class="level-badge"
                :class="cell.level === 'CRITICO' ? 'level-badge--critico' : 'level-badge--bajo'"
              >{{ cell.level }}</span>
              <span class="cell-coords">
                <span v-for="(chip, ci) in coordChips(cell)" :key="ci" class="coord-chip">
                  <span v-if="chip.k" class="coord-chip__k">{{ chip.k }}</span>
                  <span class="coord-chip__v">{{ chip.v }}</span>
                </span>
              </span>
              <span class="cell-stock">{{ cell.existencias }} pza{{ cell.existencias !== 1 ? "s" : "" }}</span>
            </li>
          </ul>
        </div>

        <div v-if="hasAxisData" class="detail-footer-mini pt-2">
          Mostrando eje {{ activeAxis }}° ({{ currentCells.length }} ítems)
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.notif-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.4rem;
}
.summary-tag { font-weight: 800 !important; }
.summary-sku {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--c-primary);
  background: var(--c-primary-alpha);
  padding: 0.05rem 0.4rem;
  border-radius: 5px;
}
.sheet-id {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.3rem;
}
.sheet-id__icon { color: var(--c-primary); opacity: 0.8; }
.sheet-id__name {
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.25;
  word-break: break-word;
}
.sheet-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-bottom: 0.4rem;
}
.sheet-prov {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-muted);
}
.cell-coords {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.coord-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.05rem 0.35rem;
  border-radius: 5px;
  background: var(--c-primary-alpha);
  font-size: 0.62rem;
  line-height: 1.3;
}
.coord-chip__k {
  font-weight: 700;
  color: var(--c-primary);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.coord-chip__v {
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}
</style>
