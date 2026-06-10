<template>
  <div class="maintenance-view">
    <div class="maintenance-card">
      <div class="maintenance-icon">
        <i class="fas fa-boxes-packing"></i>
      </div>
      <h1 class="maintenance-title">Gestión de Encargos</h1>
      <p class="maintenance-subtitle">Mantenimiento de Backorders</p>
      <div class="maintenance-description">
        Estamos actualizando el sistema de seguimiento de encargos para brindarte información más precisa en tiempo real. Regresa pronto.
      </div>
      <div class="maintenance-footer">
        <b-button type="is-primary" icon-left="arrow-left" @click="$router.back()">
          Regresar
        </b-button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  user: Object,
  loading: Boolean,
});
</script>

<style scoped>
.maintenance-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 2rem;
  background: radial-gradient(circle at top right, rgba(14, 165, 233, 0.05), transparent),
              radial-gradient(circle at bottom left, var(--c-info-alpha), transparent);
}

.maintenance-card {
  max-width: 500px;
  width: 100%;
  background: var(--surface-overlay, white);
  border: 1px solid var(--border, #eee);
  border-radius: 24px;
  padding: 3rem;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  backdrop-filter: none;
}

.maintenance-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #0ea5e9, var(--c-info));
  color: white;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  margin: 0 auto 2rem;
  box-shadow: 0 10px 20px rgba(14, 165, 233, 0.3);
}

.maintenance-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-primary, #111);
  margin-bottom: 0.5rem;
}

.maintenance-subtitle {
  font-size: 1.1rem;
  font-weight: 600;
  color: #0ea5e9;
  margin-bottom: 1.5rem;
}

.maintenance-description {
  font-size: 0.95rem;
  color: var(--text-muted, #666);
  line-height: 1.6;
  margin-bottom: 2.5rem;
}

.maintenance-footer {
  display: flex;
  justify-content: center;
}
</style>
