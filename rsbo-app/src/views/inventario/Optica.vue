<template>
  <div class="optica-container">
    <span class="optica-pill">
      <b-icon icon="eye" size="is-small" class="mr-1" />
      Óptica - Inventario
    </span>
    <p>Gestión de óptica en inventario</p>
  </div>
</template>

<script setup>
// Placeholder para gestión de óptica
</script>

<style scoped>
.optica-container {
  padding: 2rem;
  color: var(--text-primary);
}

.optica-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--c-primary);
  background: var(--c-primary-alpha);
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  margin-bottom: 1rem;
}

p {
  margin: 1rem 0 0;
  color: var(--text-secondary);
}
</style>
