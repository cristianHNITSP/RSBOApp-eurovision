<template>
  <b-collapse class="help-faq-item" animation="fade" :open="open">
    <template #trigger="{ open: isOpen }">
      <div class="help-faq-trigger">
        <span>{{ qa.q }}</span>
        <b-icon :icon="isOpen ? 'chevron-up' : 'chevron-down'" size="is-small" />
      </div>
    </template>
    <div class="help-faq-body">
      <p v-for="(p, idx) in qa.a" :key="idx">{{ p }}</p>
      <HelpTagList :tags="qa.tags" />
    </div>
  </b-collapse>
</template>

<script setup>
import './HelpFAQItem.css';
import HelpTagList from './HelpTagList.vue';

defineProps({
  qa: { type: Object, required: true },
  open: { type: Boolean, default: false },
});
</script>
