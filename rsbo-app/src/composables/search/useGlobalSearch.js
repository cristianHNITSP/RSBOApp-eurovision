// src/composables/search/useGlobalSearch.js
// Estado + lógica del buscador global (sin DOM). Lo consume GlobalSearch.vue.
import { ref, computed } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { RESULT_GROUPS } from "@/data/search/resultTypes.js";
import { useSearchNavigate } from "./useSearchNavigate.js";
import {
  globalSearch, getSearchHistory, clearSearchHistory, removeHistoryItem,
} from "@/services/search.service.js";

const MIN_CHARS = 1;

export function useGlobalSearch(opts = {}) {
  const nav = useSearchNavigate();
  const onCloseCb = typeof opts.onClose === "function" ? opts.onClose : null;

  const query = ref("");
  const loading = ref(false);
  const isOpen = ref(false);
  const groups = ref({});           // { diopters, optica, sheets, routes }
  const cursor = ref(-1);
  const history = ref(getSearchHistory());

  // Lista plana: [{kind:'header',...}|{kind:'item', def, data}] ordenada por registry.
  const flatItems = computed(() => {
    const out = [];
    for (const g of RESULT_GROUPS) {
      const rows = groups.value[g.key];
      if (!rows?.length) continue;
      out.push({ kind: "header", label: g.group, icon: g.icon, count: rows.length });
      for (const data of rows) out.push({ kind: "item", def: g, data });
    }
    return out;
  });

  const itemIndexes = computed(() =>
    flatItems.value.reduce((acc, it, i) => (it.kind === "item" && acc.push(i), acc), [])
  );
  const hasResults = computed(() => itemIndexes.value.length > 0);
  const showHistory = computed(() => query.value.trim().length < MIN_CHARS);

  const runSearch = useDebounceFn(async () => {
    const q = query.value.trim();
    if (q.length < MIN_CHARS) { groups.value = {}; loading.value = false; return; }
    loading.value = true;
    try {
      groups.value = await globalSearch(q);
    } catch (e) {
      console.error("[search] error:", e?.message);
      groups.value = {};
    } finally {
      loading.value = false;
    }
  }, 300);

  function onInput() {
    cursor.value = -1;
    isOpen.value = true;
    if (query.value.trim().length < MIN_CHARS) { groups.value = {}; loading.value = false; return; }
    loading.value = true;
    runSearch();
  }

  function open() { isOpen.value = true; }
  function close() { isOpen.value = false; cursor.value = -1; onCloseCb?.(); }
  function clear() { query.value = ""; groups.value = {}; cursor.value = -1; loading.value = false; }

  // ── Navegación por teclado ──
  function moveCursor(dir) {
    if (!isOpen.value) { isOpen.value = true; return; }
    const len = showHistory.value ? history.value.length : itemIndexes.value.length;
    if (len === 0) return;
    cursor.value = Math.max(0, Math.min(len - 1, cursor.value + dir));
  }

  function selectCurrent() {
    if (cursor.value < 0) return;
    if (showHistory.value) {
      const h = history.value[cursor.value];
      if (h) selectHistory(h);
      return;
    }
    const flatIdx = itemIndexes.value[cursor.value];
    const it = flatItems.value[flatIdx];
    if (it) selectItem(it);
  }

  function selectItem(it) {
    close();
    nav.go(it.def, it.data);
    history.value = getSearchHistory();
    query.value = "";
    groups.value = {};
  }

  function selectHistory(h) {
    close();
    nav.goHistory(h);
    history.value = getSearchHistory();
  }

  function onClearHistory() { clearSearchHistory(); history.value = []; cursor.value = -1; }
  function onRemoveHistory(id) {
    removeHistoryItem(id);
    history.value = getSearchHistory();
    if (cursor.value >= history.value.length) cursor.value = history.value.length - 1;
  }

  return {
    // state
    query, loading, isOpen, flatItems, cursor, history,
    hasResults, showHistory, itemIndexes, MIN_CHARS,
    // actions
    onInput, open, close, clear, moveCursor, selectCurrent,
    selectItem, selectHistory, onClearHistory, onRemoveHistory,
  };
}
