<!-- NotFound.vue -->
<template>
  <section class="hero is-fullheight notfound-hero">
    <div class="hero-body">
      <div class="container">
        <div class="box notfound-card lq-enter" role="region" aria-label="Página no encontrada">
          <b-tag type="is-danger" rounded class="is-uppercase has-text-weight-bold">
            <span class="notfound-badge__dot mr-2" aria-hidden="true"></span>
            Error
          </b-tag>

          <div class="columns is-vcentered is-variable is-5 mt-1">
            <div class="column">
              <h1 class="title notfound-code mb-2">404</h1>
              <p class="title is-4 mb-2">Página no encontrada</p>
              <p class="subtitle is-6 notfound-subtitle">
                La ruta que intentaste abrir no existe o fue movida.
              </p>

              <div class="buttons">
                <router-link to="/" class="button is-primary is-rounded" role="button">
                  <b-icon icon="home" size="is-small" class="mr-2" />
                  Volver al inicio
                </router-link>
              </div>
            </div>

            <div class="column is-5-tablet" aria-hidden="true">
              <figure class="image">
                <img :src="notfoundlog" alt="Ilustración" />
              </figure>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import notfoundlog from "@/assets/img/endmin.svg";
</script>

<script>
export default {
  name: "NotFound",
};
</script>

<style scoped>
/* Solo color/identidad vía tokens — layout y responsive son Bulma */
.notfound-hero {
  background: var(--bg-base);
}

.notfound-card {
  background: var(--surface-solid);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
}

.notfound-badge__dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  background: currentColor;
}

.notfound-code {
  font-weight: 900;
  font-size: clamp(3.1rem, 6vw, 4.3rem);
  line-height: 0.95;
  color: var(--text-primary);
  letter-spacing: -0.03em;
}

.notfound-subtitle {
  color: var(--text-muted);
}
</style>
