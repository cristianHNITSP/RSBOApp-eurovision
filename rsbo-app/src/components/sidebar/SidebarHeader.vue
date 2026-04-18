<template>
  <div class="sidebar-header" :class="{ 'is-collapsed': isCollapsed }">
    <!-- Logo + título -->
    <div class="sidebar-brand" v-if="!isCollapsed">
      <figure class="sidebar-logo">
        <img src="/eurovision.svg" alt="Logo Eurovision RSBO" />
      </figure>
      <div class="sidebar-brand-text">
        <span class="sidebar-brand-title">RSBO</span>
        <span class="sidebar-brand-subtitle">Laboratorio Eurovisión</span>
      </div>
    </div>

    <!-- Logo compacto -->
    <div v-else class="sidebar-brand sidebar-brand--compact">
      <figure class="sidebar-logo sidebar-logo--compact">
        <img src="/eurovision.svg" alt="Laboratorio Eurovisión" />
      </figure>
    </div>

    <!-- Toggle -->
    <b-button
      class="sidebar-toggle"
      type="is-text"
      rounded
      @click="$emit('toggle')"
      :icon-right="isCollapsed ? 'arrow-right' : 'arrow-left'"
    />
  </div>
</template>

<script setup>
defineProps({
  isCollapsed: { type: Boolean, default: false }
})

defineEmits(['toggle'])
</script>

<style scoped>
@import "./SidebarHeader.css";
</style>
