<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue';
import { useSheetExplorer } from '@/composables/tabsmanager/useSheetExplorer';
import SheetSidebarItem from './SheetSidebarItem.vue';
import Sortable from 'sortablejs';
import { RecycleScroller } from 'vue-virtual-scroller';
import { useDebounceFn } from '@vueuse/core';

const props = defineProps({
  api: { type: Object, required: true },
  apiType: { type: String, default: 'inventory' },
  activeId: { type: String, default: "" },
  openSheets: { type: Array, default: () => [] }
});

const emit = defineEmits(['select', 'close', 'reorder', 'new']);

const { sheets: explorerItems, q, isLoading, isEnd, total, search, loadMore } = useSheetExplorer(props.api);

const openListRef = ref(null);
let sortableInstance = null;

// R6: Clave de recientes por apiType
const recentsKey = computed(() => `tm_recent_sheets:${props.apiType}`);
const recentSheets = ref([]);

// R1: Carga defensiva de localStorage
const loadRecents = () => {
  try {
    const raw = localStorage.getItem(recentsKey.value);
    recentSheets.value = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('[ss] recents corruptos, reset:', e);
    recentSheets.value = [];
  }
};

// R9: Normalización de IDs para evitar duplicados en el filtro
const normalizedOpenIds = computed(() => new Set(props.openSheets.map(s => String(s.id || s._id))));

const filteredExplorerItems = computed(() => {
  return explorerItems.value.filter(s => !normalizedOpenIds.has(String(s.id || s._id)));
});

// R10: Persistir shape mínimo para evitar QuotaExceededError
const handleSelect = (sheet) => {
  emit('select', sheet);
  const compact = { 
    id: sheet.id || sheet._id, 
    name: sheet.name || sheet.nombre, 
    sku: sheet.sku, 
    tipo_matriz: sheet.tipo_matriz,
    material: sheet.material
  };
  const updated = [compact, ...recentSheets.value.filter(s => s.id !== compact.id)].slice(0, 20);
  recentSheets.value = updated;
  try {
    localStorage.setItem(recentsKey.value, JSON.stringify(updated));
  } catch (e) {
    console.error('[ss] Error guardando recientes:', e);
  }
};

const setupSortable = () => {
  if (sortableInstance) sortableInstance.destroy();
  if (openListRef.value) {
    sortableInstance = Sortable.create(openListRef.value, {
      animation: 150,
      handle: '.ssi',
      // R4: Evitar que el botón cerrar o el badge inicien drag
      filter: '.ssi-close, .ssi-cat-badge',
      preventOnFilter: true,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      onEnd: (evt) => {
        emit('reorder', { oldIndex: evt.oldIndex, newIndex: evt.newIndex });
      }
    });
  }
};

// R3: Debounce local para evitar doble fetch concurrente
const debouncedSearch = useDebounceFn(() => search(true), 350);

onMounted(() => {
  loadRecents();
  search(true);
  setupSortable();
});

// R6: Recargar si cambia el apiType (navegación SPA)
watch(recentsKey, loadRecents);

// R5: Sortable se mantiene mejor sin recrearse constantemente con timeouts
watch(() => props.openSheets.length, (newLen, oldLen) => {
  if (newLen !== oldLen) {
    nextTick(setupSortable);
  }
});

onUnmounted(() => {
  if (sortableInstance) sortableInstance.destroy();
});
</script>

<template>
  <aside class="ss">
    <header class="ss-header">
      <h3>Planillas</h3>
      <span class="ss-counter">{{ openSheets.length }}/8</span>
      <button class="ss-new-btn" @click="$emit('new')">
        <i class="fas fa-plus"></i>
        <span>Nueva</span>
      </button>
    </header>

    <div class="ss-search">
      <i class="icon fas fa-search"></i>
      <input 
        v-model="q" 
        placeholder="Buscar planilla o SKU…" 
        @input="debouncedSearch"
        @keyup.enter="search(true)"
      />
    </div>

    <section class="ss-list">
      <!-- SECCIÓN: ABIERTAS -->
      <div v-if="openSheets.length" class="ss-section-label">Abiertas</div>
      <div ref="openListRef" class="ss-open-list">
        <SheetSidebarItem 
          v-for="sheet in openSheets" 
          :key="sheet.id || sheet._id"
          :sheet="sheet"
          :active="activeId === (sheet.id || sheet._id)"
          show-close
          @select="handleSelect"
          @close="$emit('close', $event)"
        />
      </div>

      <!-- SECCIÓN: RESULTADOS DE BÚSQUEDA -->
      <template v-if="q">
        <div class="ss-section-label">Resultados ({{ total }})</div>
        <RecycleScroller
          v-if="filteredExplorerItems.length"
          class="ss-scroller"
          :items="filteredExplorerItems"
          :item-size="64"
          key-field="id"
        >
          <template #default="{ item }">
            <SheetSidebarItem 
              :sheet="item"
              is-result
              @select="handleSelect"
            />
          </template>
        </RecycleScroller>
        <div v-else-if="isLoading" class="ss-info">
          <i class="fas fa-circle-notch fa-spin"></i>
          <span>Buscando...</span>
        </div>
        <div v-else class="ss-info">No se encontraron resultados</div>
      </template>

      <!-- SECCIÓN: RECIENTES -->
      <template v-else-if="recentSheets.length">
        <div class="ss-section-label">Recientes</div>
        <div class="ss-recent-list">
          <SheetSidebarItem 
            v-for="sheet in recentSheets" 
            :key="'recent-' + (sheet.id || sheet._id)"
            :sheet="sheet"
            is-result
            @select="handleSelect"
          />
        </div>
      </template>
    </section>
  </aside>
</template>

<style scoped>
.ss {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--tm-sidebar-bg);
  backdrop-filter: var(--tm-glass-blur);
  -webkit-backdrop-filter: var(--tm-glass-blur);
  border-right: 1px solid var(--border);
  border-radius: 18px 0 0 18px;
  box-shadow: var(--tm-elev-1);
  overflow: hidden;
  height: 100%;
}

/* Header */
.ss-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 16px 8px;
}
.ss-header h3 {
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 0;
}
.ss-counter {
  font-size: 0.7rem;
  background: var(--c-primary-alpha);
  color: var(--c-primary);
  padding: 2px 8px;
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
}
.ss-new-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--c-primary);
  color: #fff;
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 0.78rem; font-weight: 600;
  border: none; cursor: pointer;
  box-shadow: 0 6px 14px rgba(144,111,225,0.30);
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.ss-new-btn:hover { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(144,111,225,0.36); }
.ss-new-btn:active { transform: translateY(0); }

/* Search */
.ss-search {
  flex: 0 0 auto;
  position: relative;
  padding: 4px 12px 12px;
}
.ss-search input {
  width: 100%;
  height: 38px;
  padding: 0 12px 0 36px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface-raised);
  font-size: 0.85rem;
  color: var(--text);
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.ss-search input:focus {
  outline: none;
  border-color: var(--c-primary);
  box-shadow: 0 0 0 4px var(--c-primary-alpha);
}
.ss-search .icon {
  position: absolute; left: 24px; top: 50%; transform: translateY(-50%);
  color: var(--text-muted); pointer-events: none;
  z-index: 1;
}

/* Lists */
.ss-list { 
  flex: 1; 
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding: 4px 8px 12px; 
}

.ss-section-label {
  flex: 0 0 auto;
  font-size: 0.66rem;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 12px 10px 6px;
}

.ss-scroller {
  flex: 1;
  min-height: 0;
  scrollbar-width: thin;
}
.ss-scroller::-webkit-scrollbar { width: 6px; }
.ss-scroller::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.30); border-radius: 10px; }

.ss-open-list, .ss-recent-list {
  flex: 0 1 auto;
  overflow-y: auto;
  scrollbar-width: thin;
}
.ss-open-list::-webkit-scrollbar, .ss-recent-list::-webkit-scrollbar { width: 6px; }
.ss-open-list::-webkit-scrollbar-thumb, .ss-recent-list::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.30); border-radius: 10px; }

.ss-info {
  padding: 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.8rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

/* Items */
.ssi {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 2px 4px;
  padding: 10px 12px;
  border-radius: var(--tm-item-radius);
  cursor: pointer;
  background: rgba(255,255,255,0.55);
  border: 1px solid var(--border-light);
  transition:
    background 180ms ease,
    border-color 180ms ease,
    transform 180ms cubic-bezier(0.22,0.61,0.36,1),
    box-shadow 180ms ease;
}
.ssi:hover:not(.is-active) {
  background: var(--c-primary-alpha);
  border-color: var(--c-primary);
  transform: translateX(2px);
}
.ssi.is-result { opacity: 0.92; }
.ssi.is-result:hover { opacity: 1; }

/* Active state — folder tab */
.ssi.is-active {
  background: var(--tm-grid-bg);
  border-color: var(--border);
  border-right-color: transparent;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  margin-right: -8px;
  padding-right: calc(12px + var(--tm-notch-width));
  box-shadow: -6px 0 18px rgba(15,23,42,0.04);
  z-index: 2;
}
.ssi.is-active::after {
  content: "";
  position: absolute;
  top: 0; bottom: 0;
  right: 0;
  width: var(--tm-notch-width);
  background: var(--tm-grid-bg);
  box-shadow: inset 1px 0 0 var(--border);
  animation: ssi-notch-grow 220ms cubic-bezier(0.22,0.61,0.36,1);
}
@keyframes ssi-notch-grow {
  from { width: 0; opacity: 0; }
  to   { width: var(--tm-notch-width); opacity: 1; }
}

.ssi-cat-badge {
  flex: 0 0 auto;
  font-size: 0.62rem; font-weight: 700;
  letter-spacing: 0.06em;
  padding: 3px 7px;
  border-radius: 6px;
  background: var(--c-primary-alpha);
  color: var(--c-primary);
  text-transform: uppercase;
}
.ssi-text { flex: 1; min-width: 0; }
.ssi-name {
  font-size: 0.86rem; font-weight: 600; color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ssi-sku {
  font-size: 0.68rem; color: var(--text-muted);
  font-family: ui-monospace, "JetBrains Mono", monospace;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ssi-close {
  flex: 0 0 auto;
  width: 22px; height: 22px;
  display: grid; place-items: center;
  border: none; background: transparent;
  border-radius: 6px; color: var(--text-muted);
  opacity: 0; transition: opacity 140ms ease, background 140ms ease;
  cursor: pointer;
}
.ssi:hover .ssi-close,
.ssi.is-active .ssi-close { opacity: 1; }
.ssi-close:hover { background: rgba(239,68,68,0.12); color: #ef4444; }

/* Drag state */
.ssi.sortable-ghost { opacity: 0.45; transform: scale(0.98); }
.ssi.sortable-chosen { box-shadow: var(--tm-elev-2); }

/* Skeleton */
.ssi-skeleton {
  height: 56px; margin: 4px;
  border-radius: var(--tm-item-radius);
  background: linear-gradient(90deg, rgba(0,0,0,0.04), rgba(0,0,0,0.08), rgba(0,0,0,0.04));
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s linear infinite;
}
@keyframes skeleton-shimmer { from {background-position: 200% 0} to {background-position: -200% 0} }

/* Responsive */
@media (max-width: 1100px) {
  :root { --tm-sidebar-width: 240px; }
  .ssi-cat-badge { display: none; }
}
@media (max-width: 820px) {
  .tm-shell { grid-template-columns: 1fr; }
  .ss { border-radius: 18px 18px 0 0; border-right: none; border-bottom: 1px solid var(--border); }
  .ssi.is-active::after { display: none; }
  .tm-workspace { border-radius: 0 0 18px 18px; }
}
</style>
