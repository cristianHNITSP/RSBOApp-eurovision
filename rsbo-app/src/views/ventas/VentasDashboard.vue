<template>
  <div class="ventas-dashboard-view mesh-bg">
    <section class="view-main">
      <div class="maintenance-hero-ventas">
        <div class="mh-icon"><i class="fas fa-cash-register"></i></div>
        <div>
          <h1 class="mh-title">Panel de Ventas</h1>
          <p class="mh-sub">Sincronizando sistemas de facturación y catálogo</p>
        </div>
      </div>

      <div class="glass-container liquid-glass">
        <DynamicTabs v-model="activeTab" :tabs="VENTAS_TABS">
          <template v-for="tab in VENTAS_TABS" #[tab.key]>
            <div class="tab-maintenance">
              <div class="tm-icon"><i :class="'fas fa-' + tab.icon"></i></div>
              <h3>Módulo {{ tab.label }} en mantenimiento</h3>
              <p>Estamos actualizando el catálogo y los sistemas de pago para ofrecerte un servicio más fluido. Disculpa las molestias.</p>
            </div>
          </template>
        </DynamicTabs>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import DynamicTabs from '@/components/DynamicTabs.vue';

const VENTAS_TABS = [
  { key: 'armazones',       label: 'Armazones',       icon: 'glasses' },
  { key: 'soluciones',      label: 'Soluciones',      icon: 'droplet' },
  { key: 'lentes-contacto', label: 'Lentes Contacto', icon: 'eye' },
  { key: 'accesorios',      label: 'Accesorios',      icon: 'briefcase' },
  { key: 'estuches',        label: 'Estuches',        icon: 'box-open' },
  { key: 'equipos',         label: 'Equipos',         icon: 'microscope' },
  { key: 'historial',       label: 'Historial',       icon: 'history' },
  { key: 'cortes',          label: 'Cortes Caja',     icon: 'calculator' },
];

const activeTab = ref('armazones');

defineProps({
  user: { type: Object, default: null }
});
</script>

<style scoped>
.ventas-dashboard-view {
  padding: 1.5rem;
  min-height: 100vh;
}

.maintenance-hero-ventas {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: var(--surface-overlay, white);
  padding: 2rem;
  border-radius: 20px;
  border: 1px solid var(--border, #eee);
  margin-bottom: 2rem;
  box-shadow: var(--shadow-sm);
}

.mh-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
}

.mh-title {
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 0.25rem;
}

.mh-sub {
  color: var(--text-muted, #666);
  font-size: 0.9rem;
}

.glass-container {
  background: var(--surface-overlay, white);
  border-radius: 20px;
  border: 1px solid var(--border, #eee);
  overflow: hidden;
}

.tab-maintenance {
  padding: 5rem 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tm-icon {
  font-size: 3.5rem;
  color: #f59e0b;
  margin-bottom: 1.5rem;
  opacity: 0.6;
}

.tab-maintenance h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.tab-maintenance p {
  color: var(--text-muted, #666);
  max-width: 500px;
  font-size: 1.05rem;
}
</style>
