import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue';

const SCROLL_OFFSET = 88;

const isScrollable = (el) => {
  if (!el) return false;
  const st = window.getComputedStyle(el);
  return /(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight;
};

const getScrollParent = (el) => {
  let p = el?.parentElement;
  while (p && p !== document.body) {
    if (isScrollable(p)) return p;
    p = p.parentElement;
  }
  return window;
};

export const scrollToId = async (id) => {
  await nextTick();
  const el = document.getElementById(id);
  if (!el) return;
  const parent = getScrollParent(el);
  if (parent === window) {
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.pageYOffset - SCROLL_OFFSET,
      behavior: 'smooth',
    });
    return;
  }
  const parentRect = parent.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  parent.scrollTo({
    top: elRect.top - parentRect.top + parent.scrollTop - SCROLL_OFFSET,
    behavior: 'smooth',
  });
};

// Composable that wires keyboard shortcut "/" → focusSearch and "Esc" → clearSearch,
// plus URL hash → tab+scroll, and exposes a goTo(sectionId) helper.
export function useHelpScroll({ activeTab, tabForSection, focusSearch, clearSearch, route, router }) {
  const goTo = async (id) => {
    const tab = tabForSection(id);
    if (tab && activeTab.value !== tab) {
      activeTab.value = tab;
      await nextTick();
      await nextTick();
    }
    try {
      await router.replace({ ...route, hash: `#${id}` });
    } catch {
      // ignore
    }
    await scrollToId(id);
  };

  watch(
    () => route.hash,
    async (h) => {
      const id = String(h || '').replace('#', '').trim();
      if (!id) return;
      const tab = tabForSection(id);
      if (tab && activeTab.value !== tab) {
        activeTab.value = tab;
        await nextTick();
        await nextTick();
      }
      await scrollToId(id);
    },
    { immediate: true },
  );

  const onKeyDown = (e) => {
    const tag = (e.target?.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable;
    if (typing) return;
    if (e.key === '/') {
      e.preventDefault();
      focusSearch?.();
    } else if (e.key === 'Escape') {
      clearSearch?.();
    }
  };

  onMounted(() => window.addEventListener('keydown', onKeyDown));
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));

  return { goTo, scrollToId };
}
