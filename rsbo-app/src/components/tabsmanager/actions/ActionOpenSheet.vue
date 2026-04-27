<!-- rsbo-app/src/components/tabsmanager/actions/ActionOpenSheet.vue -->
<template>
  <div class="action-card primary">
    <div class="action-icon">
      <i class="far fa-table"></i>
    </div>
    <div class="action-content">
      <h3 class="action-title">Abrir planilla</h3>
      <p class="action-desc">Ir a la planilla y gestionarla</p>
    </div>
    <div class="action-button">
      <b-button label="Abrir" type="is-primary" size="is-small" @click="$emit('open')" />
    </div>
  </div>
</template>

<script setup>
defineEmits(["open"]);
</script>

<style scoped src="./ActionCard.css"></style>
