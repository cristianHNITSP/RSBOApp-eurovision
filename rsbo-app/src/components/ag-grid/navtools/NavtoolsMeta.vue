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

        <!-- ── Internal Tabs Switcher (Fullscreen ONLY) ── -->
        <div class="level-item ml-3" v-if="isFullscreen && internalTabs && internalTabs.length > 0">
          <div class="field has-addons tab-switcher">
            <p class="control" v-for="tab in internalTabs" :key="tab.id">
              <b-button size="is-small" class="tab-switcher__btn"
                :type="activeInternalTab === tab.id ? 'is-primary' : 'is-light'"
                @click="$emit('update:internal', tab.id)">
                {{ tab.label }}
              </b-button>
            </p>
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

        <!-- ── Fullscreen toggle ── -->
        <b-tooltip :label="isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'" position="is-left"
          type="is-dark">
          <b-button type="is-light" size="is-small" class="meta-pill" icon-pack="fas"
            @click="$emit('toggle-fullscreen')">
            <b-icon :icon="isFullscreen ? 'compress-arrows-alt' : 'expand-arrows-alt'" size="is-small" />
          </b-button>
        </b-tooltip>
      </div>
    </nav>
  </div>
</template>

<script setup>
defineProps({
  tipoHuman: String,
  material: String,
  tratamientosLabel: String,
  totalRows: Number,
  serverBadge: Object,
  lastSavedLabel: String,
  isFullscreen: Boolean,
  internalTabs: { type: Array, default: () => [] },
  activeInternalTab: { type: String, default: '' }
})
defineEmits(['toggle-fullscreen', 'update:internal'])
</script>
