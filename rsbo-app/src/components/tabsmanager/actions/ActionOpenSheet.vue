<!-- rsbo-app/src/components/tabsmanager/actions/ActionOpenSheet.vue -->
<template>
  <div class="action-box primary p-5 mb-4">
    <article class="media is-responsive-action is-align-items-center">
      <!-- Icono -->
      <div class="media-left">
        <div class="action-icon-circle icon-bg-primary">
          <b-icon icon="table" type="is-primary" size="is-medium"></b-icon>
        </div>
      </div>

      <!-- Contenido -->
      <div class="media-content">
        <div class="content mb-2">
          <h4 class="action-title is-size-5 mb-1">Abrir planilla</h4>
          <p class="action-desc is-size-7">
            Ir a la planilla activa para gestionar inventarios y existencias.
          </p>
        </div>

        <b-button 
          label="Abrir planilla" 
          type="is-primary" 
          size="is-small" 
          icon-left="arrow-right" 
          class="mt-1"
          @click="$emit('open')" 
        />
      </div>
    </article>
  </div>
</template>

<script setup>
defineEmits(["open"]);
</script>

<style scoped src="./ActionCard.css"></style>
