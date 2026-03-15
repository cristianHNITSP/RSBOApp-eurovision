<!-- NotFound.vue -->
<template>
  <section class="notfound">
    <!-- soft bg like the rest of the app -->
    <div class="notfound-bg" aria-hidden="true"></div>

    <div class="notfound-card" role="region" aria-label="Página no encontrada">
      <div class="notfound-badge">
        <span class="notfound-badge__dot" aria-hidden="true"></span>
        <span class="notfound-badge__text">Error</span>
      </div>

      <div class="notfound-main">
        <div class="notfound-left">
          <h1 class="notfound-code">404</h1>
          <p class="notfound-title">Página no encontrada</p>
          <p class="notfound-subtitle">
            La ruta que intentaste abrir no existe o fue movida.
          </p>

          <div class="notfound-actions">
            <router-link to="/" class="button is-primary is-rounded" role="button">
              <b-icon icon="home" size="is-small" class="mr-2" />
              Volver al inicio
            </router-link>

 
          </div>

   
        </div>

        <div class="notfound-right" aria-hidden="true">
          <figure class="notfound-figure">
            <img :src="notfoundlog" alt="Ilustración" class="notfound-img" />
          </figure>

          <div class="notfound-glow"></div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import notfoundlog from "@/assets/img/huohuo.png";
</script>

<script>
export default {
  name: "NotFound",
};
</script>

<style scoped>
/* ====== container ====== */
.notfound {
  position: relative;
  min-height: calc(var(--vh, 1vh) * 100);
  width: 100%;
  overflow: hidden;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 1.25rem;
}

/* soft background (matches your methodology) */
.notfound-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;

  background:
    radial-gradient(circle at 0% 0%, rgba(121, 87, 213, 0.12), transparent 55%),
    radial-gradient(circle at 100% 70%, rgba(236, 72, 153, 0.10), transparent 55%),
    radial-gradient(circle at 40% 110%, rgba(249, 115, 22, 0.10), transparent 55%),
    var(--surface-solid);
}

/* ====== card ====== */
.notfound-card {
  position: relative;
  z-index: 1;

  width: min(980px, 100%);
  border-radius: 18px;
  border: 1px solid var(--border);

  background: var(--surface);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  box-shadow: var(--shadow-lg);
  padding: 1.05rem 1.05rem;
}

/* small top badge */
.notfound-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;

  padding: 0.25rem 0.65rem;
  border-radius: 999px;

  background: var(--c-danger-alpha);
  border: 1px solid rgba(248, 113, 113, 0.22);
}

.notfound-badge__dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--c-danger);
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.14);
}

.notfound-badge__text {
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--c-danger);
}

/* ====== main layout ====== */
.notfound-main {
  margin-top: 0.85rem;

  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.9fr);
  gap: 1rem;
  align-items: center;
}

.notfound-left {
  min-width: 0;
}

.notfound-code {
  margin: 0;
  font-weight: 900;
  font-size: clamp(3.1rem, 6vw, 4.3rem);
  line-height: 0.95;

  color: var(--text-primary);
  letter-spacing: -0.03em;
}

.notfound-title {
  margin: 0.35rem 0 0;
  font-weight: 900;
  font-size: 1.25rem;
  color: var(--text-secondary);
}

.notfound-subtitle {
  margin: 0.45rem 0 0;
  font-size: 0.95rem;
  color: var(--text-muted);
  max-width: 62ch;
}

.notfound-actions {
  margin-top: 0.85rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

/* nicer Bulma button feel */
.notfound-actions :deep(.button) {
  border-radius: 999px !important;
  box-shadow: 0 0 0 1px rgba(148,163,184,0.18);
}
.notfound-actions :deep(.button.is-primary) {
  box-shadow: var(--shadow-primary);
}

.notfound-hint {
  margin: 0.75rem 0 0;
  font-size: 0.85rem;
  color: var(--text-subtle);
}

/* ====== right illustration ====== */
.notfound-right {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
}

.notfound-figure {
  width: min(320px, 100%);
  margin: 0;
  position: relative;
  z-index: 1;

  border-radius: 16px;
  overflow: hidden;

  background: var(--bg-subtle);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
}

.notfound-img {
  display: block;
  width: 100%;
  height: auto;
  object-fit: cover;
}

.notfound-glow {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;

  background:
    radial-gradient(circle at 30% 30%, rgba(121, 87, 213, 0.22), transparent 55%),
    radial-gradient(circle at 80% 60%, rgba(236, 72, 153, 0.16), transparent 55%),
    radial-gradient(circle at 50% 100%, rgba(249, 115, 22, 0.12), transparent 55%);
  filter: blur(18px);
  opacity: 0.9;
}

/* ====== responsive ====== */
@media screen and (max-width: 900px) {
  .notfound-main {
    grid-template-columns: 1fr;
  }
  .notfound-right {
    order: -1;
    min-height: unset;
  }
  .notfound-card {
    padding: 0.95rem;
  }
}

/* ====== reduced effects support (same methodology) ====== */
:global(html[data-reduced-effects="true"]) .notfound-card {
  background: var(--surface-solid);
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: var(--shadow-md);
}

:global(html[data-reduced-effects="true"]) .notfound-bg {
  background:
    radial-gradient(circle at 0% 0%, rgba(121, 87, 213, 0.03), transparent 55%),
    radial-gradient(circle at 100% 70%, rgba(236, 72, 153, 0.02), transparent 55%),
    radial-gradient(circle at 40% 110%, rgba(249, 115, 22, 0.02), transparent 55%),
    var(--surface-solid);
}

:global(html[data-reduced-effects="true"]) .notfound-glow {
  opacity: 0.25;
  filter: none;
}

/* prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .notfound-actions :deep(.button) {
    transition: none !important;
  }
}
</style>
