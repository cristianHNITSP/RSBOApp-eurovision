<script setup>
import { ref, computed } from "vue";
import NotificationCellList from "../shared/NotificationCellList.vue";
import { useNotificationNavigate } from "@/composables/notifi/useNotificationNavigate.js";

const props = defineProps({ notif: { type: Object, required: true } });

const { goToNotification } = useNotificationNavigate();
const openSheet = () => goToNotification(props.notif);
const openCell = (cell) => goToNotification(props.notif, { cell });

const isExpanded = ref(false);

const meta = computed(() => props.notif.metadata || {});
const sheet = computed(() => meta.value.sheet || {});
const sheetTags = computed(() => {
  const s = sheet.value;
  return [s.tipoLabel, s.baseKey, s.material, s.tratamiento, s.marca].filter(Boolean);
});
const cells = computed(() => meta.value.cells || []);
const critCount = computed(() => meta.value.critCount ?? cells.value.filter((c) => c.level === "CRITICO").length);
const lowCount = computed(() => meta.value.lowCount ?? cells.value.filter((c) => c.level === "BAJO").length);
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

    <!-- Identidad de la planilla: click → abre y enfoca la planilla/producto -->
    <div class="sheet-id sheet-id--clickable" role="button" tabindex="0"
      title="Abrir y enfocar en el inventario"
      @click="openSheet" @keydown.enter="openSheet">
      <b-icon pack="fas" icon="layer-group" size="is-small" class="sheet-id__icon" />
      <span class="sheet-id__name">{{ sheet.name || meta.sheetLabel || "Planilla" }}</span>
      <b-icon pack="fas" icon="arrow-up-right-from-square" size="is-small" class="sheet-id__go" />
    </div>
    <div v-if="sheetTags.length || sheet.proveedor" class="sheet-tags">
      <b-tag v-for="(t, i) in sheetTags" :key="i" type="is-light" size="is-small">{{ t }}</b-tag>
      <span v-if="sheet.proveedor" class="sheet-prov">
        <b-icon pack="fas" icon="truck" size="is-small" /> {{ sheet.proveedor }}
      </span>
    </div>

    <!-- Toggle propio (confiable): arranca colapsado y alterna isExpanded -->
    <button
      v-if="cells.length"
      type="button"
      class="detail-toggle"
      :aria-expanded="isExpanded"
      :aria-controls="`notif-detail-${notif._id}`"
      @click="isExpanded = !isExpanded"
    >
      <span>{{ isExpanded ? "Ocultar detalle" : "Ver detalle" }}</span>
      <b-icon pack="fas" :icon="isExpanded ? 'chevron-up' : 'chevron-down'" size="is-small" />
    </button>

    <!-- Detalle: transición barata (opacity/transform/max-height acotado), lista extraída -->
    <transition name="detail-expand">
      <div v-if="isExpanded && cells.length" :id="`notif-detail-${notif._id}`" class="detail-panel">
        <div class="is-flex is-justify-content-space-between is-align-items-center mb-1">
          <span class="is-size-7 has-text-weight-bold is-uppercase has-text-grey">{{ meta.sheetLabel }}</span>
          <span v-if="critCount > 0" class="tag is-danger is-small">{{ critCount }} CRÍTICO</span>
        </div>

        <NotificationCellList :cells="cells" @cell-click="openCell" />
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
.sheet-id--clickable {
  cursor: pointer;
  border-radius: 6px;
  padding: 0.15rem 0.3rem;
  margin: -0.15rem -0.3rem 0.3rem;
  transition: background 140ms ease;
}
.sheet-id--clickable:hover { background: var(--c-primary-alpha); }
.sheet-id__go { margin-left: auto; color: var(--c-primary); opacity: 0.65; }
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
</style>
