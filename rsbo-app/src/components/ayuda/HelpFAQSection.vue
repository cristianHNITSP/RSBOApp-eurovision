<template>
  <div class="help-faq-section">
    <div class="help-faq-section__title">
      <b-icon :icon="section.icon" size="is-small" />
      <strong>{{ section.title }}</strong>
      <span class="help-faq-section__count">{{ section.items.length }}</span>
    </div>
    <HelpFAQItem
      v-for="qa in section.items"
      :key="qa.id"
      :qa="qa"
      :open="openMap[qa.id] ?? qa.openByDefault ?? false"
    />
  </div>
</template>

<script setup>
import './HelpFAQSection.css';
import HelpFAQItem from './HelpFAQItem.vue';

defineProps({
  section: { type: Object, required: true },
  openMap: { type: Object, default: () => ({}) },
});
</script>
