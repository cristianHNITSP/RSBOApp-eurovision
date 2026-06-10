<template>
  <div class="column is-12-mobile" :class="wide ? 'is-12' : 'is-6-tablet'">
    <div class="sec-card">
      <div class="sec-card__head">
        <slot name="head" />
      </div>
      <div class="sec-card__body">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import './SecCard.css';

defineProps({
  wide: { type: Boolean, default: false },
});
</script>
