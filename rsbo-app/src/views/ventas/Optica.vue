<template>
  <section class="optica-ventas-section" v-motion-fade-visible-once>
    <header class="page-section-header">
      <div>
        <span class="optica-pill">
          <b-icon icon="eye" size="is-small" class="mr-1" />
          Ventas
        </span>
        <h2>Óptica — Ventas</h2>
        <p class="psh-desc">Registra ventas de armazones, accesorios y equipos ópticos.</p>

        <div class="psh-quick mt-3">
          <div class="psh-quick__card">
            <div class="psh-quick__icon"><i class="fas fa-glasses"></i></div>
            <div>
              <p class="psh-quick__title">Armazones</p>
              <p class="psh-quick__text">Selecciona y registra la venta</p>
            </div>
          </div>
          <div class="psh-quick__card">
            <div class="psh-quick__icon"><i class="fas fa-tools"></i></div>
            <div>
              <p class="psh-quick__title">Próximamente</p>
              <p class="psh-quick__text">Módulo en desarrollo</p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="coming-soon-box">
      <i class="fas fa-hard-hat coming-soon-box__icon"></i>
      <p class="coming-soon-box__title">Módulo en desarrollo</p>
      <p class="coming-soon-box__sub">La gestión de ventas de óptica estará disponible próximamente.</p>
    </div>
  </section>
</template>

<script setup>
// Placeholder para gestión de óptica en ventas
</script>

<style scoped>
.optica-ventas-section {
  padding: 1.5rem;
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
  margin-bottom: 0.35rem;
}

.coming-soon-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 3rem 2rem;
  border-radius: 14px;
  border: 1.5px dashed var(--border);
  background: var(--surface);
  text-align: center;
}

.coming-soon-box__icon {
  font-size: 2rem;
  color: var(--text-subtle);
  margin-bottom: 0.5rem;
}

.coming-soon-box__title {
  font-size: 1rem;
  font-weight: 900;
  color: var(--text-primary);
  margin: 0;
}

.coming-soon-box__sub {
  font-size: 0.83rem;
  font-weight: 700;
  color: var(--text-muted);
  margin: 0;
}
</style>
