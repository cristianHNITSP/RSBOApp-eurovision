<!-- rsbo-app/src/components/tabsmanager/TabLimitWarningModal.vue -->
<template>
  <div v-if="showLimitModal" class="modal-overlay" @click.self="dismissLimitModal()">
    <div class="modal-card">
      <div class="modal-header">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Límite de Pestañas Alcanzado</h3>
      </div>
      
      <div class="modal-body">
        <template v-if="allPinned">
          <p>Has alcanzado el límite máximo de <strong>6 pestañas abiertas</strong> simultáneamente.</p>
          <p>Todas las pestañas están fijadas. Desfija una para poder abrir otra plantilla.</p>
        </template>
        <template v-else>
          <p>Has alcanzado el límite máximo de <strong>6 pestañas abiertas</strong> simultáneamente.</p>
          <p>Para abrir la plantilla <strong>"{{ pendingTemplate?.name }}"</strong>, debes cerrar o reemplazar una de las pestañas actuales.</p>
          <div class="quick-actions">
            <button class="replace-btn replace-btn--primary" @click="handleCloseMostRecent">
              Cerrar la más reciente
            </button>
          </div>
          <div class="active-tabs-list custom-scrollbar">
            <div
              v-for="tab in activeTabs"
              :key="tab.id"
              class="tab-replace-item"
              :class="{ 'is-pinned': tab.isPinned }"
            >
              <div class="tab-info">
                <span class="tab-name">{{ tab.name }}</span>
                <span v-if="tab.isPinned" class="pinned-badge"><i class="fas fa-thumbtack"></i> Fijada</span>
              </div>

              <button
                v-if="!tab.isPinned"
                class="replace-btn"
                @click="replaceTab(tab.id, pendingTemplate)"
              >
                Reemplazar
              </button>
              <span v-else class="lock-icon" title="Desfija para cerrar"><i class="fas fa-lock"></i></span>
            </div>
          </div>
        </template>
      </div>
      
      <div class="modal-footer">
        <button class="cancel-btn" @click="dismissLimitModal()">Cancelar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useWorkspaceTabs } from "@/composables/tabsmanager/useWorkspaceTabs";

const { 
  showLimitModal, 
  pendingTemplate, 
  activeTabs, 
  replaceTab,
  closeMostRecentUnpinned,
  dismissLimitModal
} = useWorkspaceTabs();

const allPinned = computed(() => {
  const openTabs = activeTabs.value.filter((t) => t.id !== "nueva");
  return openTabs.length > 0 && openTabs.every((t) => t.isPinned);
});

const handleCloseMostRecent = () => {
  const closed = closeMostRecentUnpinned();
  if (closed && pendingTemplate.value) {
    replaceTab(closed.id, pendingTemplate.value);
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-card {
  background: #222;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  width: 90%;
  max-width: 480px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  color: white;
  animation: modal-pop 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modal-pop {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  padding: 24px;
  background: linear-gradient(135deg, #ff416c, #ff4b2b);
  display: flex;
  align-items: center;
  gap: 15px;
}

.modal-header i {
  font-size: 2rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
}

.modal-body {
  padding: 24px;
}

.modal-body p {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
  margin-bottom: 16px;
}

.quick-actions {
  display: flex;
  gap: 12px;
  margin: 16px 0 8px;
}

.replace-btn--primary {
  background: rgba(121, 87, 213, 0.3);
  border-color: rgba(121, 87, 213, 0.5);
}

.active-tabs-list {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  margin-top: 20px;
  max-height: 250px;
  overflow-y: auto;
}

.tab-replace-item {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.tab-replace-item:last-child {
  border-bottom: none;
}

.tab-info {
  display: flex;
  flex-direction: column;
}

.tab-name {
  font-weight: 500;
}

.pinned-badge {
  font-size: 0.7rem;
  color: #3498db;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.replace-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.replace-btn:hover {
  background: var(--primary, #007bff);
  border-color: var(--primary, #007bff);
}

.lock-icon {
  color: rgba(255, 255, 255, 0.2);
}

.modal-footer {
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.03);
  display: flex;
  justify-content: flex-end;
}

.cancel-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  color: white;
  background: rgba(255, 255, 255, 0.05);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}
</style>
