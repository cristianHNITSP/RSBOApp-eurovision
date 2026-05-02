<template>
  <router-view />
  <LabToast />
</template>

<script setup>
import { onMounted } from "vue";
import LabToast from "@/components/ui/LabToast.vue";
import { useAccessibility } from "@/composables/ui/useAccessibility";

onMounted(() => {
  useAccessibility();
});
</script>
