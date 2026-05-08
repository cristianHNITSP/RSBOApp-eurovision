<!-- A single problem / solution pair inside a .help-fixes wrapper. -->
<template>
  <div class="help-fix">
    <div class="help-fix__q">{{ question }}</div>
    <div class="help-fix__a">{{ answer }}</div>
  </div>
</template>

<script setup>
import './HelpFix.css';

defineProps({
  question: { type: String, required: true },
  answer: { type: String, required: true },
});
</script>
