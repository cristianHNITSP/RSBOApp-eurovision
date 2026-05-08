<template>
  <div v-if="tags?.length" class="help-tags">
    <span v-for="t in tags" :key="t" class="help-tag">#{{ t }}</span>
  </div>
</template>

<script setup>
import './HelpTagList.css';

defineProps({
  tags: { type: Array, default: () => [] },
});
</script>
