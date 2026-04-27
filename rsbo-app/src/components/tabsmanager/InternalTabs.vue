<!-- rsbo-app/src/components/tabsmanager/InternalTabs.vue -->
<template>
  <div v-if="tabs.length > 0" class="sheet-tabs">
    <div
      v-for="tab in tabs"
      :key="tab.id"
      class="sheet-tab"
      :class="{ active: activeTabId === tab.id }"
      @click="$emit('select', tab.id)"
    >
      {{ tab.label }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  tabs: { type: Array, required: true },
  activeTabId: { type: String, default: null }
});

defineEmits(["select"]);
</script>

<style scoped src="./InternalTabs.css"></style>
