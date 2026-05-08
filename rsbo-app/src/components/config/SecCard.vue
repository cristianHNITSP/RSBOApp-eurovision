<template>
  <div class="sec-card" :class="{ 'sec-card--wide': wide }">
    <div class="sec-card__head">
      <slot name="head" />
    </div>
    <div class="sec-card__body">
      <slot />
    </div>
  </div>
</template>

<script setup>
import './SecCard.css';

defineProps({
  wide: { type: Boolean, default: false },
});
</script>
