<template>
  <section class="db-kpis" v-motion-fade-visible-once>
    <div class="kpi-grid">
      <div
        v-for="kpi in visibleKpis"
        :key="kpi.key"
        class="kpi-glass"
        :class="`kpi-${kpi.accent}`"
      >
        <div class="kpi-glow-dot"></div>
        <div class="kpi-top">
          <div class="kpi-icon" :class="`ki-${kpi.accent}`">
            <i :class="`fas fa-${kpi.icon}`"></i>
          </div>
          <div class="kpi-trend-badge" v-if="kpi.alert">
            <i class="fas fa-circle-exclamation"></i>
          </div>
        </div>
        <div class="kpi-val-wrap" v-if="!isLoading">
          <span class="kpi-number" :class="`kn-${kpi.accent}`">{{ kpi.formattedValue }}</span>
        </div>
        <b-skeleton v-else :width="70" :height="28" animated class="mt-2 mb-1" />
        <div class="kpi-label">{{ kpi.title }}</div>
        <div class="kpi-cap">{{ kpi.caption }}</div>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  visibleKpis: { type: Array, required: true },
  isLoading:   { type: Boolean, default: false }
})
</script>
