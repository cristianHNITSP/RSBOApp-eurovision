<template>
  <router-view />
  <LabToast />
</template>

<script setup>
import { onMounted } from "vue";
import LabToast from "@/components/ui/LabToast.vue";
import { initLabSocket } from "@/composables/shared/useLabSocket.js";

onMounted(() => {
  initLabSocket();
});
</script>
