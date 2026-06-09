<script setup>
defineProps({ rows: { type: Number, default: 4 } });
</script>

<template>
  <div class="gs-skeleton" v-for="n in rows" :key="n">
    <div class="gs-sk-icon" />
    <div class="gs-sk-lines">
      <div class="gs-sk-line gs-sk-line--title" />
      <div class="gs-sk-line gs-sk-line--sub" />
    </div>
  </div>
</template>
