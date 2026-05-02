<template>
  <div class="template-popover" @click.stop>
    <div class="popover-header">
      <h3>Catálogo de Plantillas</h3>
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Buscar por nombre o SKU..."
          ref="searchInput"
          @keydown.enter="forceSearch"
        />
        <div v-if="searching" class="search-spinner"></div>
      </div>
      <div class="popover-tabs">
        <button
          v-for="section in SECTIONS"
          :key="section.key"
          type="button"
          class="popover-tab"
          :class="{ active: activeSection === section.key }"
          @click="selectSection(section.key)"
        >
          {{ section.label }}
        </button>
      </div>
    </div>

    <div class="popover-content custom-scrollbar">
      <!-- Searching state -->
      <div v-if="searching" class="popover-loader">
        <div class="spinner"></div>
        <p>Buscando en el catálogo...</p>
      </div>

      <!-- Results section (either search or recent) -->
      <div v-else-if="displayTemplates.length > 0" class="template-section">
        <div class="section-label">
          {{ sectionLabel }}
        </div>
        <div 
          v-for="item in displayTemplates" 
          :key="item.id || item._id" 
          class="template-row"
          :class="{ 'is-deleted': item.isDeleted }"
          @click="item.isDeleted ? null : selectTemplate(item)"
        >
          <div class="template-info">
            <span class="template-name">
              {{ item.name || item.nombre }}
              <span v-if="item.isDeleted" class="trash-indicator" title="Esta plantilla está en la papelera">
                <i class="fas fa-trash-alt"></i> En Papelera
              </span>
            </span>
            <div class="template-meta-row">
              <span v-if="item.sku" class="sku-tag">{{ item.sku }}</span>
              <span class="date-tag">{{ formatDate(item.lastModified || item.updatedAt) }}</span>
            </div>
          </div>
          <div class="row-actions">
            <button 
              v-if="activeSection === 'recent_opened'"
              class="delete-btn" 
              @click.stop="handleDeleteRecent(item.id)"
              title="Eliminar de recientes"
            >
              <i class="fas fa-times"></i>
            </button>
            <i v-else class="fas fa-chevron-right"></i>
          </div>
        </div>
      </div>

      <!-- Empty state for search -->
      <div v-else-if="hasActiveSearch" class="empty-state">
        <i class="fas fa-search-minus"></i>
        <div class="empty-text">
          <p class="main-msg">No se encontraron plantillas</p>
          <p class="sub-msg">Prueba con otro nombre o SKU</p>
        </div>
      </div>

      <!-- Initial empty state (no search, no recents) -->
      <div v-else class="empty-state">
        <i class="fas fa-folder-open"></i>
        <div class="empty-text">
          <p class="main-msg">Sin resultados recientes</p>
          <p class="sub-msg">Cambia de pestaña o realiza una búsqueda</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useWorkspaceTabs } from "@/composables/tabsmanager/useWorkspaceTabs";
import { useSheetApi } from "@/composables/api/useSheetApi";
import * as prefsService from "@/services/preferencesService";
import { useDebounceFn } from "@vueuse/core";

const props = defineProps({
  apiType: { type: String, default: "inventory" }
});
const emit = defineEmits(["close"]);
const { recentTemplates, openTemplate, removeRecentTemplate, hydrate, catalogDefaultSection } = useWorkspaceTabs(props.apiType);
const { listSheets } = useSheetApi(() => props.apiType);

const searchQuery = ref("");
const searchInput = ref(null);
const searchResults = ref([]);
const searching = ref(false);
const recentModified = ref([]);
const activeSection = ref("search");

const SECTIONS = [
  { key: "search", label: "Buscar" },
  { key: "recent_modified", label: "Recientes" },
  { key: "recent_opened", label: "Últimas" }
];

const hasActiveSearch = computed(() => searchQuery.value.trim().length >= 3);

onMounted(async () => {
  searchInput.value?.focus();
  // Ensure we have latest recents
  await hydrate();
  activeSection.value = catalogDefaultSection.value || "search";
  if (activeSection.value === "recent_modified") {
    await fetchRecentModified();
  }
});

const debouncedSearch = useDebounceFn(async (q) => {
  if (q.length < 3) {
    searchResults.value = [];
    searching.value = false;
    return;
  }

  searching.value = true;
  try {
    const res = await listSheets({ q, limit: 10 });
    // Handle different possible response structures
    const rawData = res.data?.data || res.data || {};
    const sheets = Array.isArray(rawData.sheets) ? rawData.sheets : 
                  Array.isArray(rawData) ? rawData : [];
    
    searchResults.value = sheets.map(s => ({
      ...s,
      id: s._id || s.id,
      name: s.nombre || s.name,
      isDeleted: s.isDeleted || false
    }));
  } catch (e) {
    console.error("[TemplatePopover] Search error:", e);
    searchResults.value = [];
  } finally {
    searching.value = false;
  }
}, 400);

const forceSearch = () => {
  debouncedSearch(searchQuery.value.trim());
};

watch(searchQuery, (newVal) => {
  if (!newVal.trim()) {
    searchResults.value = [];
    searching.value = false;
    return;
  }
  debouncedSearch(newVal.trim());
});

watch(activeSection, async (section) => {
  if (section === "recent_modified" && recentModified.value.length === 0) {
    await fetchRecentModified();
  }
});

const fetchRecentModified = async () => {
  try {
    const res = await listSheets({ sortBy: "updatedAt", order: "desc", limit: 20 });
    const rawData = res.data?.data || res.data || {};
    const sheets = Array.isArray(rawData.sheets) ? rawData.sheets :
                  Array.isArray(rawData) ? rawData : [];
    recentModified.value = sheets.map((s) => ({
      ...s,
      id: s._id || s.id,
      name: s.nombre || s.name,
      isDeleted: s.isDeleted || false
    }));
  } catch (e) {
    console.error("[TemplatePopover] Recent modified error:", e);
    recentModified.value = [];
  }
};

const sectionLabel = computed(() => {
  if (hasActiveSearch.value) return "Resultados de Búsqueda";
  if (activeSection.value === "recent_modified") return "Recientes Modificadas";
  if (activeSection.value === "recent_opened") return "Últimas Abiertas";
  return "Buscar";
});

const displayTemplates = computed(() => {
  if (hasActiveSearch.value) return searchResults.value;
  if (activeSection.value === "recent_modified") return recentModified.value.slice(0, 20);
  if (activeSection.value === "recent_opened") return recentTemplates.value.slice(0, 20);
  return [];
});

const selectSection = async (section) => {
  if (!section || section === activeSection.value) return;
  activeSection.value = section;
  try {
    await prefsService.setCatalogSection(section, props.apiType);
  } catch (e) {
    console.warn("[TemplatePopover] Failed to persist section", e);
  }

  if (section === "recent_modified" && recentModified.value.length === 0) {
    await fetchRecentModified();
  }
};

const selectTemplate = (template) => {
  if (template.isDeleted) return;
  openTemplate(template);
  emit("close");
};

const handleDeleteRecent = async (id) => {
  await removeRecentTemplate(id, props.apiType);
  recentModified.value = [];
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
</script>

<style scoped>
.template-popover {
  width: 320px;
  background: var(--surface-overlay);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  box-shadow: var(--shadow-xl);
  z-index: 1000;
  overflow: hidden;
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  max-height: 100%;
}

.popover-header {
  padding: 16px;
  background: var(--surface-raised);
  border-bottom: 1px solid var(--border);
}

.popover-header h3 {
  margin: 0 0 12px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box i {
  position: absolute;
  left: 12px;
  color: var(--text-subtle);
}

.search-box input {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 8px 8px 36px;
  color: var(--text-primary);
  outline: none;
  transition: all 0.2s ease;
}

.search-box input:focus {
  background: var(--surface-raised);
  border-color: var(--c-primary);
}

.popover-tabs {
  display: flex;
  gap: 6px;
  margin-top: 12px;
}

.popover-tab {
  flex: 1;
  background: var(--surface-overlay);
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 6px 8px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.popover-tab:hover {
  background: var(--surface-raised);
  color: var(--text-primary);
}

.popover-tab.active {
  background: var(--c-primary-alpha);
  border-color: var(--c-primary);
  color: var(--c-primary);
}

.popover-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  background: var(--surface-solid);
}

.section-label {
  padding: 8px 16px;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-subtle);
  letter-spacing: 0.05rem;
}

.template-row {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: background 0.2s ease;
  border-bottom: 1px solid var(--border-subtle);
}

.template-row:last-child {
  border-bottom: none;
}

.template-row:hover {
  background: var(--surface-raised);
}

.template-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.template-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
}

.template-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sku-tag {
  font-size: 0.65rem;
  background: var(--c-primary-alpha);
  border: 1px solid var(--c-primary-alpha);
  padding: 1px 6px;
  border-radius: 4px;
  color: var(--c-primary);
  font-family: monospace;
}

.date-tag {
  font-size: 0.7rem;
  color: var(--text-subtle);
}

.template-row i {
  color: var(--text-subtle);
  font-size: 0.8rem;
  transition: transform 0.2s ease;
}

.template-row:hover i {
  color: var(--text-muted);
  transform: translateX(2px);
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.delete-btn {
  background: transparent;
  border: none;
  color: var(--text-subtle);
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.template-row:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: var(--c-danger-alpha);
  color: var(--c-danger);
}

.delete-btn i {
  font-size: 0.85rem !important;
}

.search-spinner {
  position: absolute;
  right: 12px;
  width: 14px;
  height: 14px;
  border: 2px solid var(--border);
  border-top-color: var(--c-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.empty-state {
  padding: 48px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.empty-state i {
  font-size: 2.5rem;
  color: var(--text-subtle);
  opacity: 0.2;
}

.empty-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.main-msg {
  font-size: 0.95rem;
  color: var(--text-muted);
  font-weight: 500;
}

.sub-msg {
  font-size: 0.8rem;
  color: var(--text-subtle);
}

.popover-loader {
  padding: 48px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-muted);
}

.spinner {
  width: 28px;
  height: 28px;
  border: 2px solid var(--border);
  border-top-color: var(--c-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--text-subtle);
}

.template-row.is-deleted {
  opacity: 0.6;
}

.trash-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.6rem;
  background: var(--c-danger-alpha);
  color: var(--c-danger);
  padding: 1px 6px;
  border-radius: 4px;
  margin-left: 8px;
  font-weight: 800;
  text-transform: uppercase;
  border: 1px solid rgba(239, 68, 68, 0.2);
}
</style>
