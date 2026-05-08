import { computed, ref, watch } from 'vue';
import { SEARCH_CATALOG } from '../data/searchCatalog.js';

export function useHelpSearch(faqSectionsRef) {
  const search = ref('');
  const openMap = ref({});

  const onSearchInput = (payload) => {
    if (typeof payload === 'string' || typeof payload === 'number') {
      search.value = String(payload);
      return;
    }
    const t = payload?.target || payload?.srcElement;
    if (t && typeof t.value !== 'undefined') {
      search.value = String(t.value ?? '');
      return;
    }
    if (payload && typeof payload === 'object' && 'value' in payload) {
      search.value = String(payload.value ?? '');
      return;
    }
    search.value = '';
  };

  const clearSearch = () => { search.value = ''; };

  const quickMatches = computed(() => {
    const q = search.value.trim().toLowerCase();
    if (!q) return [];
    const has = (t) => String(t || '').toLowerCase().includes(q);
    return SEARCH_CATALOG.filter((x) => has(x.title) || has(x.text)).slice(0, 6);
  });

  const filteredSections = computed(() => {
    const q = search.value.trim().toLowerCase();
    const sections = faqSectionsRef.value || [];
    if (!q) return sections;
    const has = (txt) => String(txt || '').toLowerCase().includes(q);
    return sections
      .map((sec) => {
        const items = (sec.items || []).filter(
          (it) => has(it.q) || (it.a || []).some(has) || (it.tags || []).some(has),
        );
        return { ...sec, items };
      })
      .filter((sec) => sec.items.length > 0);
  });

  const hasAnyResults = computed(() => filteredSections.value.length > 0);

  watch(
    () => search.value,
    (q) => {
      const query = q.trim().toLowerCase();
      if (!query) {
        openMap.value = {};
        return;
      }
      const next = {};
      filteredSections.value.forEach((sec) =>
        sec.items.forEach((it) => (next[it.id] = true)),
      );
      openMap.value = next;
    },
  );

  return {
    search,
    onSearchInput,
    clearSearch,
    quickMatches,
    filteredSections,
    hasAnyResults,
    openMap,
  };
}
