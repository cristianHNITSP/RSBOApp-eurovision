<template>
  <router-view />
  <LabToast />
</template>

<script setup>
import { onMounted } from "vue";
import LabToast from "@/components/ui/LabToast.vue";
import { initLabSocket } from "@/composables/shared/useLabSocket.js";
import { useAccessibility } from "@/composables/ui/useAccessibility";

onMounted(() => {
  useAccessibility(); // Inicializa preferencias de accesibilidad globales
  initLabSocket();
});
</script>
