<template>
  <b-button
    class="menu-toggle-btn"
    :type="type"
    :size="size"
    :icon-left="icon"
    @click="$emit('click')"
  />
</template>

<script setup>
defineProps({
  icon: { type: String, default: "bars" },
  type: { type: String, default: "is-primary" },
  size: { type: String, default: "is-small" }
});
defineEmits(['click']);
</script>

<style scoped>
.menu-toggle-btn {
  border-radius: 999px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
}

.menu-toggle-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.menu-toggle-btn:active {
  transform: scale(0.95);
}
</style>
