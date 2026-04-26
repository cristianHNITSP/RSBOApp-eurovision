<template>
  <section class="lab-view laboratorio-section" v-motion-fade-visible-once>
    <LabHero />

    <div class="glass">
      <DynamicTabs v-model="lab.activeMainTab.value" :tabs="LAB_TABS">
        <template #pedidos><PedidosTab /></template>
        <template #bandeja><BandejaTab /></template>
        <template #catalogo><CatalogoTab /></template>
        <template #correcciones><CorreccionesTab /></template>
      </DynamicTabs>
    </div>

    <BarcodeModal />
    <CorrectionModal />

  </section>
</template>

<script setup>
import { provide } from "vue";
import { useLaboratorioApi } from "@/composables/api/useLaboratorioApi";
import DynamicTabs from "@/components/DynamicTabs.vue";

import LabHero from "@/components/laboratorio/LabHero.vue";

const LAB_TABS = [
  { key: "pedidos",      label: "Pedidos",      icon: "clipboard-list" },
  { key: "bandeja",      label: "Bandeja",      icon: "inbox" },
  { key: "catalogo",     label: "Catálogo",     icon: "qrcode" },
  { key: "correcciones", label: "Correcciones", icon: "tools" },
];
import PedidosTab from "@/components/laboratorio/PedidosTab.vue";
import BandejaTab from "@/components/laboratorio/BandejaTab.vue";
import CatalogoTab from "@/components/laboratorio/CatalogoTab.vue";
import CorreccionesTab from "@/components/laboratorio/CorreccionesTab.vue";
import BarcodeModal from "@/components/laboratorio/modals/BarcodeModal.vue";
import CorrectionModal from "@/components/laboratorio/modals/CorrectionModal.vue";
import "./Laboratorio.css";

const props = defineProps({
  user: Object,
  loading: Boolean,
});

const lab = useLaboratorioApi(() => props.user);
provide("lab", lab);
</script>
