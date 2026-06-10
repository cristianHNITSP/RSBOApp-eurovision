<template>
  <section class="px-5 pt-4">
    <div class="columns is-multiline is-mobile is-variable is-3 lq-stagger mb-0">
      <div
        v-for="kpi in visibleKpis"
        :key="kpi.key"
        class="column is-6-mobile is-4-tablet is-3-desktop"
      >
        <div class="kpi-glass" :class="`kpi-${kpi.accent}`">
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
    </div>
  </section>
</template>

<script setup>
defineProps({
  visibleKpis: { type: Array, required: true },
  isLoading:   { type: Boolean, default: false }
})
</script>
