<!-- src/components/ui/PageSectionHeader.vue
     Encabezado de sección reutilizable (patrón page-section-header).
     Layout 100% Bulma: level + columns. Color vía tokens. -->
<template>
  <header class="box psh mb-5 lq-enter">
    <div class="columns is-variable is-4">
      <div class="column">
        <span class="tag is-primary is-light is-rounded is-uppercase psh__pill">
          <b-icon v-if="icon" :icon="icon" size="is-small" class="mr-1" />
          {{ pill }}
        </span>

        <h2 class="title is-5 mt-2 mb-1">{{ title }}</h2>
        <p v-if="description" class="is-size-7 has-text-weight-semibold psh__desc">
          {{ description }}
        </p>

        <div v-if="quickItems.length" class="columns is-multiline is-variable is-2 mt-1 mb-0">
          <div v-for="item in quickItems" :key="item.title" class="column is-narrow pb-0">
            <article class="media psh__quick px-3 py-2">
              <figure class="media-left mr-2">
                <span class="icon psh__quick-icon">
                  <i :class="quickIconClass(item.icon)"></i>
                </span>
              </figure>
              <div class="media-content">
                <p class="is-size-7 has-text-weight-bold mb-0">{{ item.title }}</p>
                <p class="is-size-7 psh__desc mb-0">{{ item.text }}</p>
              </div>
            </article>
          </div>
        </div>

        <slot />
      </div>

      <div v-if="$slots.meta" class="column is-narrow has-text-right-tablet">
        <slot name="meta" />
      </div>
    </div>
  </header>
</template>

<script setup>
defineProps({
  pill: { type: String, default: "" },
  icon: { type: String, default: "" },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  /** [{ icon, title, text }] accesos rápidos informativos.
      icon acepta nombre FA ("save") o clase completa ("fas fa-save"). */
  quickItems: { type: Array, default: () => [] },
});

function quickIconClass(icon) {
  return icon.includes(" ") ? icon : `fas fa-${icon}`;
}
</script>

<style scoped>
/* Solo identidad de color con tokens — layout es Bulma */
.psh {
  background: var(--surface-solid);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
}

.psh__pill {
  letter-spacing: 0.08em;
}

.psh__desc {
  color: var(--text-muted);
}

.psh__quick {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-overlay);
}

.psh__quick-icon {
  background: var(--c-primary-alpha);
  color: var(--c-primary);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
}
</style>
