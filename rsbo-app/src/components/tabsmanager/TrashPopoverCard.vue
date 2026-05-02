<template>
  <div class="trash-popover" @click.stop>
    <div class="popover-header">
      <div class="header-title">
        <i class="fas fa-trash-alt mr-2"></i>
        <h3>Papelera de Reciclaje</h3>
      </div>
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Buscar en papelera..."
          ref="searchInput"
        />
        <div v-if="loading" class="search-spinner"></div>
      </div>
    </div>

    <div class="popover-content custom-scrollbar">
      <div v-if="loading" class="popover-loader">
        <div class="spinner"></div>
        <p>Cargando papelera...</p>
      </div>

      <div v-else-if="deletedSheets.length > 0">
        <div class="section-label">Hojas Eliminadas ({{ deletedSheets.length }})</div>
        <div 
          v-for="item in filteredSheets" 
          :key="item.id || item._id" 
          class="trash-row"
        >
          <div class="trash-card-grid">
            <!-- FILA 1: NOMBRE Y SKU -->
            <div class="grid-row grid-row--top">
              <h4 class="sheet-name">{{ item.nombre || item.name || 'Sin nombre' }}</h4>
              <span v-if="item.sku" class="sku-tag">{{ item.sku }}</span>
            </div>

            <!-- FILA 2: PROPIEDADES Y ACCIONES -->
            <div class="grid-row grid-row--middle">
              <div class="technical-row">
                <span class="type-tag">{{ tipoHuman(item.tipo_matriz) }}</span>
                <span class="separator">•</span>
                <span class="material-tag">{{ item.material || 'Material N/A' }}</span>
              </div>

              <div class="trash-actions">
                <template v-if="confirmingPurgeId !== (item._id || item.id)">
                  <button 
                    class="action-btn restore" 
                    :class="{ 'is-loading': itemLoadingId === (item._id || item.id) }"
                    :disabled="itemLoadingId === (item._id || item.id)"
                    @click.stop="handleRestore(item)"
                    title="Restaurar"
                  >
                    <i v-if="itemLoadingId !== (item._id || item.id)" class="fas fa-undo"></i>
                    <i v-else class="fas fa-spinner fa-spin"></i>
                  </button>
                  <button 
                    class="action-btn purge" 
                    :disabled="itemLoadingId === (item._id || item.id)"
                    @click.stop="askPurge(item)"
                    title="Eliminar permanentemente"
                  >
                    <i class="fas fa-fire"></i>
                  </button>
                </template>
                <template v-else>
                  <div class="purge-confirmation-overlay">
                    <button 
                      class="confirm-pill confirm" 
                      :disabled="itemLoadingId === (item._id || item.id)"
                      @click.stop="handlePurge(item)"
                    >
                      <span v-if="itemLoadingId !== (item._id || item.id)">ELIMINAR</span>
                      <i v-else class="fas fa-spinner fa-spin"></i>
                    </button>
                    <button class="confirm-pill cancel" :disabled="itemLoadingId === (item._id || item.id)" @click.stop="confirmingPurgeId = null">
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </template>
              </div>
            </div>

            <!-- FILA 3: DATOS EXTRA -->
            <div class="grid-row grid-row--bottom">
              <div class="meta-bottom">
                <div class="meta-item">
                  <i class="fas fa-calendar-alt"></i>
                  <span>Eliminado: {{ formatDate(item.deletedAt || item.updatedAt) }}</span>
                </div>
                <div v-if="item.proveedor?.name || item.marca?.name" class="meta-item">
                  <i class="fas fa-industry"></i>
                  <span>{{ item.proveedor?.name || '' }} {{ item.marca?.name ? '— ' + item.marca.name : '' }}</span>
                </div>
                <div v-if="item.tratamientos && item.tratamientos.length" class="meta-item">
                  <i class="fas fa-layer-group"></i>
                  <span>{{ item.tratamientos.join(', ') }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="filteredSheets.length === 0 && searchQuery" class="empty-state">
           <p class="main-msg">Sin coincidencias</p>
        </div>
      </div>

      <div v-else class="empty-state">
        <i class="fas fa-trash-restore"></i>
        <div class="empty-text">
          <p class="main-msg">La papelera está vacía</p>
          <p class="sub-msg">Las hojas que elimines aparecerán aquí</p>
        </div>
      </div>
    </div>
    
    <div v-if="deletedSheets.length > 0" class="popover-footer">
       <p class="footer-hint">Las hojas en papelera no ocupan espacio en tus pestañas activas.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useSheetApi } from "@/composables/api/useSheetApi";
import { labToast } from "@/composables/shared/useLabToast.js";
import { useDebounceFn } from "@vueuse/core";
import { tipoHuman } from "@/composables/tabsmanager/useSheetNormalizer";

const props = defineProps({
  apiType: { type: String, default: "inventory" },
  actor: { type: Object, default: null }
});

const emit = defineEmits(["close", "restored"]);

const { listSheets, restoreSheet, purgeSheet } = useSheetApi(() => props.apiType);

const deletedSheets = ref([]);
const loading = ref(false);
const searchQuery = ref("");
const searchInput = ref(null);
const confirmingPurgeId = ref(null);
const itemLoadingId = ref(null);

const fetchDeleted = async () => {
  loading.value = true;
  try {
    const res = await listSheets({ onlyDeleted: true, limit: 50 });
    const rawData = res.data?.data || res.data || [];
    deletedSheets.value = Array.isArray(rawData) ? rawData : (rawData.sheets || []);
  } catch (e) {
    console.error("[TrashPopover] Error fetching deleted sheets:", e);
    labToast.danger("Error al cargar la papelera");
  } finally {
    loading.value = false;
  }
};

const filteredSheets = computed(() => {
  if (!searchQuery.value.trim()) return deletedSheets.value;
  const q = searchQuery.value.toLowerCase();
  return deletedSheets.value.filter(s => 
    (s.nombre || s.name || "").toLowerCase().includes(q) || 
    (s.sku || "").toLowerCase().includes(q)
  );
});

const handleRestore = async (item) => {
  const id = item._id || item.id;
  if (itemLoadingId.value) return;

  itemLoadingId.value = id;
  try {
    await restoreSheet(id, props.actor);
    labToast.success(`"${item.nombre || item.name}" restaurada correctamente`);
    deletedSheets.value = deletedSheets.value.filter(s => (s._id || s.id) !== id);
    emit("restored", item);
    if (deletedSheets.value.length === 0) emit("close");
  } catch (e) {
    console.error("[TrashPopover] Restore error:", e);
    labToast.danger("No se pudo restaurar la hoja");
  } finally {
    itemLoadingId.value = null;
  }
};

const askPurge = (item) => {
  confirmingPurgeId.value = item._id || item.id;
};

const handlePurge = async (item) => {
  const id = item._id || item.id;
  if (itemLoadingId.value) return;

  itemLoadingId.value = id;
  confirmingPurgeId.value = null;

  try {
    await purgeSheet(id, props.actor);
    labToast.danger(`"${item.nombre || item.name}" eliminada definitivamente`);
    deletedSheets.value = deletedSheets.value.filter(s => (s._id || s.id) !== id);
    if (deletedSheets.value.length === 0) emit("close");
  } catch (e) {
    console.error("[TrashPopover] Purge error:", e);
    labToast.danger("No se pudo eliminar permanentemente");
  } finally {
    itemLoadingId.value = null;
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

onMounted(() => {
  fetchDeleted();
  searchInput.value?.focus();
});
</script>

<style scoped>
.trash-popover {
  width: 340px;
  background: var(--surface-overlay);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  box-shadow: var(--shadow-xl);
  z-index: 1000;
  overflow: hidden;
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  max-height: 500px;
}

.popover-header {
  padding: 16px;
  background: linear-gradient(to bottom, rgba(255,255,255,0.05), transparent);
  border-bottom: 1px solid var(--border);
}

.header-title {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.header-title i {
  color: var(--c-danger);
}

.popover-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
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
  font-size: 0.85rem;
}

.search-box input {
  width: 100%;
  background: var(--surface-solid);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 12px 8px 36px;
  color: var(--text-primary);
  outline: none;
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.search-box input:focus {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 3px var(--c-primary-alpha);
}

.popover-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.section-label {
  padding: 8px 16px;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-subtle);
  letter-spacing: 0.05rem;
}

.trash-row {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.2s ease;
}

.trash-row:hover {
  background: rgba(255,255,255,0.03);
}

.trash-card-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.grid-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.grid-row--top {
  margin-bottom: -2px;
}

.grid-row--middle {
  min-height: 36px;
}

.sheet-name {
  color: var(--c-primary);
  font-weight: 700;
  font-size: 1rem;
  margin: 0;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sku-tag {
  font-size: 0.65rem;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: var(--font-mono);
  white-space: nowrap;
  flex-shrink: 0;
}

.technical-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
}

.type-tag {
  font-weight: 700;
}

.separator {
  opacity: 0.4;
}

.trash-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-overlay);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
}

.action-btn.restore:hover {
  background: var(--c-success);
  color: white;
  border-color: var(--c-success);
}

.action-btn.purge:hover {
  background: var(--c-danger);
  color: white;
  border-color: var(--c-danger);
}

.purge-confirmation-overlay {
  display: flex;
  gap: 4px;
  align-items: center;
}

.confirm-pill {
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 800;
  cursor: pointer;
  border: 1px solid var(--border);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-pill.confirm {
  background: var(--c-danger);
  color: white;
  border-color: var(--c-danger);
}

.confirm-pill.cancel {
  background: var(--surface-raised);
  color: var(--text-muted);
  width: 32px;
  padding: 0;
}

.meta-bottom {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 2px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.meta-item i {
  width: 14px;
  opacity: 0.6;
}

.confirm-action-btn.cancel {
  width: 30px;
  padding: 0;
  color: var(--text-subtle);
}

.confirm-action-btn.cancel:hover {
  background: var(--surface-raised);
  color: var(--text-primary);
}

.confirm-action-btn.confirm {
  background: var(--c-danger);
  border-color: var(--c-danger);
  color: white;
  box-shadow: 0 0 10px var(--c-danger-alpha);
}

.confirm-action-btn.confirm:hover {
  transform: scale(1.02);
  filter: brightness(1.1);
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-state i {
  font-size: 2.5rem;
  color: var(--text-subtle);
  opacity: 0.15;
}

.main-msg {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-muted);
}

.sub-msg {
  font-size: 0.75rem;
  color: var(--text-subtle);
}

.popover-footer {
  padding: 10px 16px;
  background: var(--surface-raised);
  border-top: 1px solid var(--border);
}

.footer-hint {
  font-size: 0.65rem;
  color: var(--text-subtle);
  margin: 0;
  line-height: 1.3;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border);
  border-top-color: var(--c-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: 10px;
}
</style>
