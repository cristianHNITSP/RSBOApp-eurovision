<!-- src/components/ag-grid/navtools/NavtoolsMeta.vue -->
<template>
  <div class="navtools-card navtools-card--meta">
    <nav class="level is-mobile navtools-header">
      <div class="level-left">
        <div class="level-item">
          <div class="meta-tags-scroll" aria-label="Metadatos de hoja">
            <b-taglist class="meta-taglist">
              <b-tag v-if="tipoHuman" type="is-light" size="is-small" class="meta-pill">
                <b-icon icon="layer-group" size="is-small" class="mr-1" />
                {{ tipoHuman }}
              </b-tag>

              <b-tag v-if="material" type="is-light" size="is-small" class="meta-pill">
                <b-icon icon="gem" size="is-small" class="mr-1" />
                {{ material }}
              </b-tag>

              <b-tag v-if="tratamientosLabel" type="is-light" size="is-small" class="meta-pill">
                <b-icon icon="magic" size="is-small" class="mr-1" />
                {{ tratamientosLabel }}
              </b-tag>

              <b-tag v-if="totalRows != null" type="is-light" size="is-small" class="meta-pill">
                <b-icon icon="database" size="is-small" class="mr-1" />
                {{ totalRows }} filas
              </b-tag>
            </b-taglist>
          </div>
        </div>
      </div>

      <div class="level-right">
        <div class="level-item" v-if="serverBadge">
          <b-tag :type="serverBadge.type" size="is-small" class="server-pill">
            <b-icon :icon="serverBadge.icon" size="is-small" class="mr-1" />
            {{ serverBadge.text }}
          </b-tag>
        </div>

        <div class="level-item" v-if="lastSavedLabel">
          <span class="is-size-7 has-text-grey last-saved">
            <b-icon icon="clock" size="is-small" class="mr-1" />
            {{ lastSavedLabel }}
          </span>
        </div>
      </div>
    </nav>
  </div>
</template>

<script setup>
defineProps({
  tipoHuman:         String,
  material:          String,
  tratamientosLabel: String,
  totalRows:         Number,
  serverBadge:       Object,
  lastSavedLabel:    String
})
</script>
