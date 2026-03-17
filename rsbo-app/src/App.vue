<template>
  <router-view />
  <LabToast />
</template>

<script setup>
import { onMounted } from "vue";
import LabToast from "@/components/laboratorio/LabToast.vue";
import { initLabSocket } from "@/composables/useLabSocket.js";

onMounted(() => {
  initLabSocket();
});
</script>
