<!-- rsbo-app/src/components/tabsmanager/shared/StatusPill.vue -->
<template>
  <transition name="fade-status">
    <div v-if="status !== 'idle'" class="meta-status" :class="status">
      <span v-if="status === 'saving'" class="dot-pulse"></span>
      <i v-else-if="status === 'saved'" class="far fa-check-circle"></i>
      <i v-else-if="status === 'error'" class="far fa-exclamation-triangle"></i>
      <span class="meta-status-text">{{ message }}</span>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  status: { type: String, default: "idle" },
  message: { type: String, default: "" }
});
</script>

<style scoped src="./StatusPill.css"></style>
