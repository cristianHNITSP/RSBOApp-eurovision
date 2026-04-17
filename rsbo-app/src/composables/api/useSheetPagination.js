// src/composables/useSheetPagination.js
import { reactive, ref, computed } from "vue";

const DEFAULT_PAGE_SIZE = 6;

/**
 * Manages paginated, bidirectional loading of inventory/CL sheets.
 *
 * Usage:
 *   const pager = useSheetPagination(listSheets, mapRawSheet);
 *   await pager.init();                 // load page 1
 *   await pager.init("sheetId123");     // load page centered on that sheet
 *   await pager.loadNext();             // load next page (append)
 *   await pager.loadPrior();            // load prev page (prepend)
 *
 * @param {Function} apiFn   - async (params) => axios response with { data: { data[], meta{} } }
 * @param {Function} mapFn   - (rawSheet) => normalized sheet object | null
 * @param {number}   [pageSize=6]
 */
export function useSheetPagination(apiFn, mapFn, pageSize = DEFAULT_PAGE_SIZE) {
  /** Loaded real sheets (no "nueva" tab - views add that separately) */
  const sheets = reactive([]);

  /** Pagination metadata from last server response */
  const meta = ref({ total: 0, page: 1, limit: pageSize, totalPages: 1, hasMore: false, hasPrior: false });

  const loadingForward  = ref(false);
  const loadingBackward = ref(false);

  /** Set of page numbers already fetched */
  const loadedPages = new Set();

  /** Window boundaries of what's been loaded */
  const windowStart = ref(0);
  const windowEnd   = ref(0);

  const hasMore   = computed(() => meta.value.hasMore  && !loadingForward.value);
  const hasPrior  = computed(() => meta.value.hasPrior && windowStart.value > 1);

  /** Approximate count of sheets before the loaded window */
  const priorCount = computed(() =>
    windowStart.value > 1 ? (windowStart.value - 1) * pageSize : 0
  );

  // ─── internal helpers ────────────────────────────────────────

  async function _fetch(params) {
    const { data } = await apiFn({ limit: pageSize, ...params });
    const arr       = (data?.data || []).map(mapFn).filter(Boolean);
    const serverMeta = data?.meta || {};
    return { arr, serverMeta };
  }

  function _dedupe(arr) {
    const ids = new Set(sheets.map((s) => s.id));
    return arr.filter((s) => !ids.has(s.id));
  }

  // ─── public API ──────────────────────────────────────────────

  /**
   * Initial load. If focusId is given the backend returns the page that
   * contains that sheet; otherwise page 1 is used.
   * Always resets the loaded window.
   */
  async function init(focusId = null) {
    if (loadingForward.value) return;
    loadingForward.value = true;
    sheets.splice(0); // clear
    loadedPages.clear();
    windowStart.value = 0;
    windowEnd.value   = 0;

    try {
      const params = focusId ? { focusId } : { page: 1 };
      const { arr, serverMeta } = await _fetch(params);
      const loadedPage = serverMeta.page || 1;

      meta.value = serverMeta;
      sheets.push(...arr);
      loadedPages.add(loadedPage);
      windowStart.value = loadedPage;
      windowEnd.value   = loadedPage;
    } finally {
      loadingForward.value = false;
    }
  }

  /** Load the next page and append it to sheets. */
  async function loadNext() {
    if (loadingForward.value || !meta.value.hasMore) return;
    const nextPage = windowEnd.value + 1;
    if (nextPage > meta.value.totalPages) return;
    if (loadedPages.has(nextPage)) return;

    loadingForward.value = true;
    try {
      const { arr, serverMeta } = await _fetch({ page: nextPage });
      meta.value = { ...meta.value, ...serverMeta };
      const fresh = _dedupe(arr);
      sheets.push(...fresh);
      loadedPages.add(nextPage);
      windowEnd.value = nextPage;
    } finally {
      loadingForward.value = false;
    }
  }

  /** Load the previous page and prepend it to sheets. */
  async function loadPrior() {
    if (loadingBackward.value || windowStart.value <= 1) return;
    const prevPage = windowStart.value - 1;
    if (prevPage < 1) return;
    if (loadedPages.has(prevPage)) return;

    loadingBackward.value = true;
    try {
      const { arr, serverMeta } = await _fetch({ page: prevPage });
      // Keep forward meta unchanged, only update totals
      meta.value = { ...meta.value, total: serverMeta.total ?? meta.value.total, totalPages: serverMeta.totalPages ?? meta.value.totalPages };
      const fresh = _dedupe(arr);
      sheets.unshift(...fresh);
      loadedPages.add(prevPage);
      windowStart.value = prevPage;
    } finally {
      loadingBackward.value = false;
    }
  }

  /**
   * Add a freshly-created sheet to the front of the list
   * (newly created sheets are most-recently-updated → page 1 top).
   */
  function prependSheet(sheet) {
    const norm = mapFn(sheet);
    if (!norm) return;
    if (sheets.find((s) => s.id === norm.id)) return;
    sheets.unshift(norm);
    meta.value = { ...meta.value, total: (meta.value.total || 0) + 1 };
  }

  return {
    sheets,
    meta,
    loadingForward,
    loadingBackward,
    hasMore,
    hasPrior,
    priorCount,
    init,
    loadNext,
    loadPrior,
    prependSheet,
  };
}
