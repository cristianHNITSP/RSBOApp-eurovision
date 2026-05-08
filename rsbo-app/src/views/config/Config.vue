<template>
  <section class="section-config" v-motion-fade-visible-once>

    <ConfigHeader />

    <DynamicTabs v-model="activeTab" :tabs="CONFIG_TABS">
      <template #profile>
        <MiUser :user="props.user" :loading="props.loading" />
      </template>
      <template #preferences>
        <Preferencias />
      </template>
      <template #security>
        <Seguridad :user="props.user" />
      </template>
    </DynamicTabs>

  </section>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import './Config.css';

import DynamicTabs  from '@/components/DynamicTabs.vue';
import ConfigHeader from '@/components/config/ConfigHeader.vue';
import MiUser       from './options/MiUser.vue';
import Preferencias from './options/Preferencias.vue';
import Seguridad    from './options/Seguridad.vue';

const CONFIG_TABS = [
  { key: 'profile',     label: 'Mi perfil',    icon: 'user' },
  { key: 'preferences', label: 'Preferencias', icon: 'sliders-h' },
  { key: 'security',    label: 'Seguridad',    icon: 'shield-alt' },
];

const props = defineProps({
  user:    { type: Object,  default: null },
  loading: { type: Boolean, default: false },
});

const router = useRouter();
const route  = useRoute();

const VALID_TABS = CONFIG_TABS.map((t) => t.key);
const activeTab  = ref('profile');

const syncTabFromRoute = () => {
  const t = route.query.tab;
  activeTab.value = typeof t === 'string' && VALID_TABS.includes(t) ? t : 'profile';
};
syncTabFromRoute();

watch(() => route.query.tab, syncTabFromRoute);

watch(() => activeTab.value, (newTab) => {
  if (route.query.tab === newTab) return;
  router.replace({
    name: route.name || 'configuración',
    params: route.params,
    query: { ...route.query, tab: newTab },
  });
});
</script>
