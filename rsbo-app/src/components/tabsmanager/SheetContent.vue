<!-- rsbo-app/src/components/tabsmanager/SheetContent.vue -->
<template>
  <div class="sheet-content-wrapper">
    <component
      v-if="ready"
      :is="gridComponent"
      :key="sheet.id"
      v-bind="gridProps"
      :actor="actor"
      @update:internal="$emit('update:internal', $event)"
    />
    <div v-else class="sheet-content-placeholder">
      <div class="sheet-content-placeholder__spinner"></div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, watch, ref, nextTick } from "vue";
import AgGridBifocal from "@/components/ag-grid/templates/AgGridBifocal.vue";
import AgGridBase from "@/components/ag-grid/templates/AgGridBase.vue";
import AgGridMonofocal from "@/components/ag-grid/templates/AgGridMonofocal.vue";
import AgGridProgresivo from "@/components/ag-grid/templates/AgGridProgresivo.vue";
import AgGridTorico from "@/components/ag-grid/templates/AgGridTorico.vue";

const props = defineProps({
  sheet: { type: Object, required: true },
  activeInternal: { type: String, default: null },
  actor: { type: Object, default: null },
  apiType: { type: String, default: "inventory" }
});

const emit = defineEmits(["update:internal"]);

const resolverGrid = (tipo) => {
  switch (tipo) {
    case "SPH_CYL":
      return AgGridMonofocal;
    case "SPH_CYL_AXIS":
      return AgGridTorico;
    case "SPH_ADD":
      return AgGridBifocal;
    case "BASE":
      return AgGridBase;
    case "BASE_ADD":
      return AgGridProgresivo;
    default:
      return AgGridMonofocal;
  }
};

const gridComponent = computed(() => resolverGrid(props.sheet?.tipo_matriz));

const resolverGridProps = (sheet, activeInternal) => {
  if (!sheet) return {};
  const base = { sheetId: sheet.id, apiType: props.apiType };

  if (sheet.tipo_matriz === "SPH_ADD" || sheet.tipo_matriz === "SPH_CYL" || sheet.tipo_matriz === "SPH_CYL_AXIS") {
    return { ...base, sphType: activeInternal || "sph-neg" };
  }
  if (sheet.tipo_matriz === "BASE" || sheet.tipo_matriz === "BASE_ADD") {
    return { ...base, sphType: activeInternal || "base-neg" };
  }
  return base;
};

const gridProps = computed(() => resolverGridProps(props.sheet, props.activeInternal));

const ready = ref(false);

// WebSocket lifecycle logging (actual WS handled inside grid components)
onMounted(() => {
  // Diferir montaje del grid: dar 1 frame al browser para pintar el layout
  requestAnimationFrame(() => {
    ready.value = true;
  });
  if (props.sheet?.id) {
    console.log(`[SheetContent] Mounted: ${props.sheet.id}`);
  }
});

onBeforeUnmount(() => {
  if (props.sheet?.id) {
    console.log(`[SheetContent] Unmounting: ${props.sheet.id}`);
  }
});

// Watch for sheet changes to log transitions
watch(
  () => props.sheet?.id,
  (newId, oldId) => {
    if (newId !== oldId) {
      console.log(`[SheetContent] Sheet changed: ${oldId} -> ${newId}`);
    }
  }
);
</script>

<style scoped>
.sheet-content-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.sheet-content-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-solid, #faf9ff);
}

.sheet-content-placeholder__spinner {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid rgba(121, 87, 213, 0.15);
  border-top-color: rgba(139, 92, 246, 0.85);
  animation: spin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
