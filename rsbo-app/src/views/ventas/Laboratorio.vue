<template>
  <div class="view-laboratorio-root">
    <div class="view-hero">
      <div class="maintenance-hero">
        <div class="mh-icon"><i class="fas fa-flask-vial"></i></div>
        <div>
          <h1 class="mh-title">Laboratorio Óptico</h1>
          <p class="mh-sub">Módulo en proceso de actualización tecnológica</p>
        </div>
      </div>
    </div>

    <section class="view-main">
      <div class="glass">
        <DynamicTabs v-model="activeMainTab" :tabs="LAB_TABS">
          <template v-for="tab in LAB_TABS" #[tab.key]>
            <div class="tab-maintenance">
              <div class="tm-icon"><i :class="'fas fa-' + tab.icon"></i></div>
              <h3>{{ tab.label }} en mantenimiento</h3>
              <p>Esta sección del laboratorio está siendo optimizada. Los procesos de escaneo y gestión se reanudarán pronto.</p>
            </div>
          </template>
        </DynamicTabs>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from "vue";
import DynamicTabs from "@/components/DynamicTabs.vue";

const LAB_TABS = [
  { key: "pedidos",      label: "Pedidos",      icon: "clipboard-list" },
  { key: "bandeja",      label: "Bandeja",      icon: "inbox" },
  { key: "catalogo",     label: "Catálogo",     icon: "qrcode" },
  { key: "correcciones", label: "Correcciones", icon: "tools" },
];

const activeMainTab = ref("pedidos");

defineProps({
  user: Object,
  loading: Boolean,
});
</script>

<style scoped>
.view-laboratorio-root {
  padding: 1.5rem;
}

.maintenance-hero {
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
  background: linear-gradient(135deg, #06b6d4, #3b82f6);
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

.tab-maintenance {
  padding: 4rem 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tm-icon {
  font-size: 3rem;
  color: #06b6d4;
  margin-bottom: 1.5rem;
  opacity: 0.5;
}

.tab-maintenance h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.tab-maintenance p {
  color: var(--text-muted, #666);
  max-width: 400px;
}

.glass {
  background: var(--surface-overlay, white);
  border-radius: 20px;
  border: 1px solid var(--border, #eee);
  overflow: hidden;
}
</style>
