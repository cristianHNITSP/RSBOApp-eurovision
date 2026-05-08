import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VALID_TABS, TAB_LABELS, SECTION_TAB } from '../data/helpTabs.js';

export function useHelpTabs(defaultTab = 'inicio') {
  const router = useRouter();
  const route = useRoute();
  const activeTab = ref(defaultTab);

  const syncTabFromRoute = () => {
    const t = route.query.tab;
    activeTab.value =
      typeof t === 'string' && VALID_TABS.includes(t) ? t : defaultTab;
  };
  syncTabFromRoute();

  watch(() => route.query.tab, syncTabFromRoute);

  watch(
    () => activeTab.value,
    (newTab) => {
      if (route.query.tab === newTab) return;
      router
        .replace({
          name: route.name,
          params: route.params,
          query: { ...route.query, tab: newTab },
          hash: route.hash,
        })
        .catch(() => {});
    },
  );

  const tabLabelForSection = (sectionId) =>
    TAB_LABELS[SECTION_TAB[sectionId]] ?? '';

  const tabForSection = (sectionId) => SECTION_TAB[sectionId];

  return { activeTab, tabLabelForSection, tabForSection, route, router };
}
