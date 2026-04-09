<template>
  <!-- ───────────────────────────────────────────────────────────────
       GlobalSearch.vue
       Barra de búsqueda global. Atajos: Ctrl+K / Cmd+K para abrir,
       Esc para cerrar. Historial en localStorage, dioptrias de la
       planilla como chips, rutas e inventario en un dropdown unificado.
  ─────────────────────────────────────────────────────────────────── -->
  <div class="gs-wrapper" ref="wrapperRef" @keydown.esc="close">

    <!-- ── Trigger input ─────────────────────────────────────────── -->
    <b-field class="dashboard-search gs-field" position="is-centered">
      <b-input
        v-model="query"
        placeholder="Buscar…"
        rounded
        expanded
        icon-pack="fas"
        icon="search"
        :icon-right="query ? 'times-circle' : ''"
        icon-right-clickable
        ref="inputRef"
        autocomplete="off"
        role="combobox"
        aria-haspopup="listbox"
        :aria-expanded="isOpen"
        aria-controls="gs-dropdown"
        @input="onInput"
        @focus="onFocus"
        @keydown.down.prevent="moveCursor(1)"
        @keydown.up.prevent="moveCursor(-1)"
        @keydown.enter.prevent="selectCurrent"
        @icon-right-click="clear"
      />
    </b-field>

    <!-- ── Dropdown ───────────────────────────────────────────────── -->
    <transition name="gs-fade">
      <div
        v-if="isOpen"
        id="gs-dropdown"
        class="gs-dropdown"
        role="listbox"
        ref="dropdownRef"
      >
        <!-- Loading skeleton -->
        <template v-if="loading">
          <div class="gs-skeleton" v-for="n in 4" :key="n">
            <div class="gs-sk-icon" />
            <div class="gs-sk-lines">
              <div class="gs-sk-line gs-sk-line--title" />
              <div class="gs-sk-line gs-sk-line--sub" />
            </div>
          </div>
        </template>

        <!-- Empty state -->
        <template v-else-if="!loading && flatItems.length === 0 && query.length >= 2">
          <div class="gs-empty">
            <span class="gs-empty__icon"><i class="fas fa-search-minus" /></span>
            <p class="gs-empty__title">Sin resultados para <strong>"{{ query }}"</strong></p>
            <p class="gs-empty__sub">Intenta con otra palabra clave, número de dioptría o nombre de proveedor.</p>
          </div>
        </template>

        <!-- Hint + historial (query muy corta o vacía) -->
        <template v-else-if="query.length < 2">
          <!-- Historial reciente -->
          <template v-if="history.length">
            <div class="gs-group-header">
              <i class="fas fa-history gs-group-header__icon" />
              Recientes
              <button class="gs-clear-history" @click.stop="onClearHistory" title="Borrar historial">
                <i class="fas fa-trash-alt" />
              </button>
            </div>
            <div
              v-for="(h, idx) in history"
              :key="h.id"
              class="gs-item gs-item--history"
              :class="{ 'gs-item--active': cursor === idx }"
              role="option"
              tabindex="-1"
              @click="selectHistoryItem(h)"
              @mouseenter="cursor = idx"
            >
              <span class="gs-item__icon gs-item__icon--history">
                <i :class="`fas fa-${iconForType(h.type)}`" />
              </span>
              <span class="gs-item__body">
                <span class="gs-item__title">{{ historyLabel(h) }}</span>
                <span class="gs-item__sub">
                  <span class="gs-item__badge" :class="badgeClassForHistory(h)">{{ labelForType(h.type) }}</span>
                  <span v-if="h.sub" class="gs-item__material">{{ h.sub }}</span>
                </span>
              </span>
              <button
                class="gs-remove-history"
                @click.stop="onRemoveHistory(h.id)"
                title="Quitar del historial"
              ><i class="fas fa-times" /></button>
            </div>
          </template>

          <!-- Hint -->
          <div class="gs-hint">
            <i class="fas fa-keyboard gs-hint__icon" />
            <span>Escribe nombre, proveedor, marca o dioptría (ej. <code>-2.50</code>)…</span>
            <span class="gs-hint__kbd"><kbd>Ctrl</kbd><kbd>K</kbd></span>
          </div>
        </template>

        <!-- Results -->
        <template v-else>
          <template v-for="(item, idx) in flatItems" :key="idx">
            <!-- Group header -->
            <div v-if="item.type === 'header'" class="gs-group-header">
              <i :class="`fas fa-${item.icon}`" class="gs-group-header__icon" />
              {{ item.label }}
              <span v-if="item.count" class="gs-group-count">{{ item.count }}</span>
            </div>

            <!-- Route item -->
            <div
              v-else-if="item.type === 'route'"
              class="gs-item"
              :class="{ 'gs-item--active': cursor === selectableIndex(idx) }"
              role="option"
              :aria-selected="cursor === selectableIndex(idx)"
              tabindex="-1"
              @click="selectItem(item)"
              @mouseenter="cursor = selectableIndex(idx)"
            >
              <span class="gs-item__icon gs-item__icon--route">
                <i :class="`fas fa-${item.icon || 'link'}`" />
              </span>
              <span class="gs-item__body">
                <span class="gs-item__title" v-html="highlight(item.label)" />
                <span class="gs-item__badge gs-item__badge--page">Página</span>
              </span>
              <i class="fas fa-arrow-right gs-item__arrow" />
            </div>

            <!-- Sheet item -->
            <div
              v-else-if="item.type === 'sheet'"
              class="gs-item"
              :class="{ 'gs-item--active': cursor === selectableIndex(idx) }"
              role="option"
              :aria-selected="cursor === selectableIndex(idx)"
              tabindex="-1"
              @click="selectItem(item)"
              @mouseenter="cursor = selectableIndex(idx)"
            >
              <span class="gs-item__icon" :class="iconClassForCategory(item.category)">
                <i :class="faIconForCategory(item.category)" />
              </span>
              <span class="gs-item__body">
                <span class="gs-item__title" v-html="highlight(item.nombre)" />
                <span class="gs-item__sub">
                  <span class="gs-item__badge gs-item__badge--tipo">{{ item.tipoLabel }}</span>
                  <span v-if="item.material" class="gs-item__material" v-html="highlight(item.material)" />
                  <span v-if="item.proveedor" class="gs-item__trat">
                    · <span v-html="highlight(item.proveedor)" />
                  </span>
                  <span v-if="item.marca" class="gs-item__trat">
                    · <span v-html="highlight(item.marca)" />
                  </span>
                  <span v-if="item.tratamiento" class="gs-item__trat">
                    · {{ item.tratamiento }}{{ item.variante ? ` (${item.variante})` : '' }}
                  </span>
                </span>
                <!-- Chips de dioptrias -->
                <span v-if="rangeChips(item).length" class="gs-item__chips">
                  <span
                    v-for="chip in rangeChips(item)"
                    :key="chip"
                    class="gs-chip"
                    :class="{ 'gs-chip--match': isNumericSearch && chipMatchesQuery(chip) }"
                  >{{ chip }}</span>
                </span>
              </span>
              <i class="fas fa-arrow-right gs-item__arrow" />
            </div>

            <!-- Order item -->
            <div
              v-else-if="item.type === 'order'"
              class="gs-item"
              :class="{ 'gs-item--active': cursor === selectableIndex(idx) }"
              role="option"
              :aria-selected="cursor === selectableIndex(idx)"
              tabindex="-1"
              @click="selectItem(item)"
              @mouseenter="cursor = selectableIndex(idx)"
            >
              <span class="gs-item__icon gs-item__icon--order">
                <i class="fas fa-flask" />
              </span>
              <span class="gs-item__body">
                <span class="gs-item__title" v-html="highlight(item.folio)" />
                <span class="gs-item__sub">
                  <span class="gs-item__badge" :class="`gs-item__badge--status-${item.status}`">{{ item.status }}</span>
                  <span class="gs-item__material" v-html="highlight(item.cliente)" />
                </span>
              </span>
              <i class="fas fa-arrow-right gs-item__arrow" />
            </div>
          </template>
        </template>

        <!-- Footer -->
        <div class="gs-footer" v-if="!loading && (flatItems.length > 0 || (query.length < 2 && history.length))">
          <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
          <span><kbd>↵</kbd> abrir</span>
          <span><kbd>Esc</kbd> cerrar</span>
          <span class="gs-footer__shortcut"><kbd>Ctrl</kbd><kbd>K</kbd> buscar</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useDebounceFn } from '@vueuse/core';
import {
  globalSearch,
  flattenResults,
  formatRangeChips,
  getSearchHistory,
  pushSearchHistory,
  clearSearchHistory,
  removeHistoryItem
} from '../services/search.service';

// ── State ─────────────────────────────────────────────────────────────────────
const query       = ref('');
const loading     = ref(false);
const isOpen      = ref(false);
const flatItems   = ref([]);
const cursor      = ref(-1);
const history     = ref(getSearchHistory());
const wrapperRef  = ref(null);
const inputRef    = ref(null);
const dropdownRef = ref(null);

const router = useRouter();

const debouncedSearch = useDebounceFn(runSearch, 320);

// ── Computed ──────────────────────────────────────────────────────────────────
const selectableIndexes = computed(() =>
  flatItems.value
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.type !== 'header')
    .map(({ idx }) => idx)
);

/** true si la query es un número (búsqueda de dioptría) */
const isNumericSearch = computed(() =>
  /^[-+]?\d+(\.\d+)?$/.test(query.value.trim())
);

// ── Methods ───────────────────────────────────────────────────────────────────
function selectableIndex(flatIdx) {
  return selectableIndexes.value.indexOf(flatIdx);
}

function onFocus() {
  isOpen.value = true;
  if (query.value.length >= 2 && flatItems.value.length === 0) {
    runSearch();
  }
}

function onInput() {
  cursor.value = -1;
  isOpen.value = true;
  if (query.value.length < 2) {
    flatItems.value = [];
    loading.value   = false;
    return;
  }
  loading.value = true;
  debouncedSearch();
}

async function runSearch() {
  if (query.value.length < 2) return;
  loading.value = true;
  try {
    const result    = await globalSearch(query.value);
    flatItems.value = flattenResults(result);
  } catch (e) {
    console.error('[GlobalSearch] error:', e);
    flatItems.value = [];
  } finally {
    loading.value = false;
  }
}

function clear() {
  query.value     = '';
  flatItems.value = [];
  cursor.value    = -1;
  loading.value   = false;
  nextTick(() => inputRef.value?.$el?.querySelector('input')?.focus());
}

function close() {
  isOpen.value = false;
  cursor.value = -1;
}

function openSearch() {
  isOpen.value = true;
  nextTick(() => inputRef.value?.$el?.querySelector('input')?.focus());
}

function moveCursor(dir) {
  if (!isOpen.value) { isOpen.value = true; return; }
  // En estado de historial (query < 2) navegar sobre history
  if (query.value.length < 2 && history.value.length) {
    const max = history.value.length - 1;
    cursor.value = Math.max(0, Math.min(max, cursor.value + dir));
    return;
  }
  const max = selectableIndexes.value.length - 1;
  if (max < 0) return;
  cursor.value = Math.max(0, Math.min(max, cursor.value + dir));
  nextTick(() => {
    const active = dropdownRef.value?.querySelector('.gs-item--active');
    active?.scrollIntoView({ block: 'nearest' });
  });
}

function selectCurrent() {
  // En estado historial
  if (query.value.length < 2 && history.value.length) {
    if (cursor.value >= 0 && cursor.value < history.value.length) {
      selectHistoryItem(history.value[cursor.value]);
    }
    return;
  }
  if (cursor.value < 0 || cursor.value >= selectableIndexes.value.length) return;
  const flatIdx = selectableIndexes.value[cursor.value];
  selectItem(flatItems.value[flatIdx]);
}

function selectItem(item) {
  close();

  // Guardar en historial
  const histEntry = buildHistoryEntry(item);
  if (histEntry) {
    pushSearchHistory(histEntry);
    history.value = getSearchHistory();
  }

  // Navegar
  if (item.type === 'route') {
    const target = item.routeQuery
      ? { path: item.routePath, query: item.routeQuery }
      : item.routePath;
    router.push(target);
  } else if (item.type === 'sheet') {
    const path = item.category === 'Lentes de contacto'
      ? '/l/inventario/lentes-contacto'
      : '/l/inventario/bases-micas';
    router.push({ path, query: { sheetId: item.id } });
  } else if (item.type === 'order') {
    router.push({ path: '/l/ventas/laboratorio', query: { orderId: item.id } });
  }

  query.value = '';
}

function selectHistoryItem(h) {
  close();
  if (h.routePath) {
    const target = h.routeQuery ? { path: h.routePath, query: h.routeQuery } : h.routePath;
    router.push(target);
  }
}

/** Resalta los caracteres que coinciden con la búsqueda */
function highlight(text) {
  if (!query.value || !text) return text;
  const escaped = query.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(text).replace(
    new RegExp(`(${escaped})`, 'gi'),
    '<mark class="gs-mark">$1</mark>'
  );
}

/** Genera chips de dioptrias para un sheet */
function rangeChips(item) {
  return formatRangeChips(item.ranges);
}

/** true si el chip contiene el número buscado (para resaltarlo) */
function chipMatchesQuery(chip) {
  if (!isNumericSearch.value) return false;
  const val = parseFloat(query.value);
  const match = chip.match(/[-+]?\d+\.?\d*/g);
  if (!match || match.length < 2) return false;
  const [lo, hi] = match.map(Number).sort((a, b) => a - b);
  return val >= lo && val <= hi;
}

// ── Historial helpers ─────────────────────────────────────────────────────────
function buildHistoryEntry(item) {
  if (item.type === 'route') {
    return { id: item.id, type: 'route', label: item.label, routePath: item.routePath, routeQuery: item.routeQuery || null }
  }
  if (item.type === 'sheet') {
    const path = item.category === 'Lentes de contacto' ? '/l/inventario/lentes-contacto' : '/l/inventario/bases-micas';
    return { id: item.id, type: 'sheet', label: item.nombre, sub: item.tipoLabel, routePath: path, routeQuery: { sheetId: item.id } };
  }
  if (item.type === 'order') {
    return { id: item.id, type: 'order', label: item.folio, sub: item.cliente, routePath: '/l/ventas/laboratorio', routeQuery: { orderId: item.id } };
  }
  return null;
}

function onClearHistory() {
  clearSearchHistory();
  history.value = [];
  cursor.value  = -1;
}

function onRemoveHistory(id) {
  removeHistoryItem(id);
  history.value = getSearchHistory();
  if (cursor.value >= history.value.length) cursor.value = history.value.length - 1;
}

function historyLabel(h)  { return h.label || h.folio || ''; }

function iconForType(type) {
  return type === 'route' ? 'link' : type === 'sheet' ? 'glasses' : 'flask';
}

function labelForType(type) {
  return type === 'route' ? 'Página' : type === 'sheet' ? 'Planilla' : 'Orden';
}

function badgeClassForHistory(h) {
  return h.type === 'route' ? 'gs-item__badge--page'
       : h.type === 'sheet' ? 'gs-item__badge--tipo'
       : 'gs-item__badge--status-pendiente';
}

function iconClassForCategory(cat) {
  return cat === 'Lentes de contacto' ? 'gs-item__icon--lc' : 'gs-item__icon--sheet';
}

function faIconForCategory(cat) {
  return cat === 'Lentes de contacto' ? 'fas fa-eye' : 'fas fa-glasses';
}

// ── Ctrl+K / Cmd+K global shortcut ────────────────────────────────────────────
function onGlobalKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    if (isOpen.value) {
      const inp = inputRef.value?.$el?.querySelector('input');
      inp ? inp.focus() : openSearch();
    } else {
      openSearch();
    }
  }
}

// ── Click outside ─────────────────────────────────────────────────────────────
function onClickOutside(e) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target)) {
    close();
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside);
  document.addEventListener('keydown', onGlobalKeydown);
});
onUnmounted(() => {
  document.removeEventListener('mousedown', onClickOutside);
  document.removeEventListener('keydown', onGlobalKeydown);
});
</script>

<style scoped>
/* ── Wrapper ──────────────────────────────────────────────────────────────── */
.gs-wrapper {
  position: relative;
  width: 100%;
  max-width: 540px;
  margin: 0 auto;
}

.gs-field {
  margin-bottom: 0 !important;
}

/* ── Dropdown ─────────────────────────────────────────────────────────────── */
.gs-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--surface-solid);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.07),
    0 12px 30px -4px rgba(0, 0, 0, 0.12);
  z-index: 9999;
  overflow: hidden;
  max-height: 460px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.gs-dropdown::-webkit-scrollbar { width: 5px; }
.gs-dropdown::-webkit-scrollbar-thumb { background: var(--border); border-radius: 8px; }

/* ── Fade transition ──────────────────────────────────────────────────────── */
.gs-fade-enter-active,
.gs-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.gs-fade-enter-from,
.gs-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ── Group header ─────────────────────────────────────────────────────────── */
.gs-group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px 5px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.gs-group-header__icon { font-size: 0.7rem; }

.gs-group-count {
  margin-left: auto;
  background: var(--bg-muted);
  border-radius: 20px;
  padding: 1px 7px;
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-subtle);
  letter-spacing: 0;
  text-transform: none;
}

.gs-clear-history {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-subtle);
  font-size: 0.7rem;
  padding: 2px 4px;
  border-radius: 4px;
  transition: color 0.12s, background 0.12s;
}
.gs-clear-history:hover { color: var(--c-danger, #ef4444); background: var(--c-danger-alpha, rgba(239,68,68,0.08)); }

/* ── Item ─────────────────────────────────────────────────────────────────── */
.gs-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  cursor: pointer;
  transition: background 0.12s;
  border-radius: 0;
}

.gs-item:hover,
.gs-item--active {
  background: var(--c-primary-alpha);
}

.gs-item__icon {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
}

.gs-item__icon--route   { background: var(--c-primary-alpha);  color: var(--c-primary);  }
.gs-item__icon--sheet   { background: var(--c-success-alpha);  color: var(--c-success);  }
.gs-item__icon--lc      { background: var(--c-info-alpha, rgba(59,130,246,.12));    color: var(--c-info, #3b82f6); }
.gs-item__icon--order   { background: var(--c-warning-alpha);  color: var(--c-warning);  }
.gs-item__icon--history { background: var(--bg-muted);          color: var(--text-muted); }

.gs-item__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.gs-item__title {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gs-item__sub {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.gs-item__material { font-size: 0.75rem; color: var(--text-muted); }
.gs-item__trat     { font-size: 0.75rem; color: var(--text-muted); }

.gs-item__badge {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 20px;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.gs-item__badge--page              { background: var(--c-primary-alpha); color: var(--c-primary); }
.gs-item__badge--tipo              { background: var(--c-success-alpha);  color: var(--c-success); }
.gs-item__badge--status-pendiente  { background: var(--c-warning-alpha);  color: var(--c-warning); }
.gs-item__badge--status-parcial    { background: var(--c-primary-alpha);  color: var(--c-primary); }
.gs-item__badge--status-cerrado    { background: var(--c-success-alpha);  color: var(--c-success); }

/* ── Diopter chips ────────────────────────────────────────────────────────── */
.gs-item__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 3px;
}

.gs-chip {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  background: var(--bg-muted);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  white-space: nowrap;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}

.gs-chip--match {
  background: rgba(251, 191, 36, 0.2);
  color: var(--text-primary);
  border-color: rgba(251, 191, 36, 0.5);
  font-weight: 700;
}

/* ── History remove button ────────────────────────────────────────────────── */
.gs-remove-history {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-subtle);
  font-size: 0.7rem;
  padding: 4px 6px;
  border-radius: 6px;
  opacity: 0;
  transition: opacity 0.12s, color 0.12s, background 0.12s;
}
.gs-item--history:hover .gs-remove-history { opacity: 1; }
.gs-remove-history:hover { color: var(--c-danger, #ef4444); background: var(--c-danger-alpha, rgba(239,68,68,0.08)); }

/* ── Arrow ────────────────────────────────────────────────────────────────── */
.gs-item__arrow {
  flex-shrink: 0;
  font-size: 0.7rem;
  color: var(--text-subtle);
  transition: transform 0.12s, color 0.12s;
}

.gs-item:hover .gs-item__arrow,
.gs-item--active .gs-item__arrow {
  transform: translateX(3px);
  color: var(--text-muted);
}

/* ── Highlight mark ───────────────────────────────────────────────────────── */
:deep(.gs-mark) {
  background: rgba(251, 191, 36, 0.35);
  color: var(--text-primary);
  border-radius: 3px;
  padding: 0 1px;
  font-style: normal;
}

/* ── Empty state ──────────────────────────────────────────────────────────── */
.gs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 16px;
  gap: 6px;
}

.gs-empty__icon  { font-size: 1.6rem; color: var(--text-subtle); margin-bottom: 4px; }
.gs-empty__title { font-size: 0.88rem; color: var(--text-secondary); }
.gs-empty__sub   { font-size: 0.78rem; color: var(--text-muted); text-align: center; }

/* ── Hint ─────────────────────────────────────────────────────────────────── */
.gs-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 0.82rem;
  color: var(--text-muted);
  flex-wrap: wrap;
}

.gs-hint__icon { font-size: 0.9rem; flex-shrink: 0; }

.gs-hint code {
  background: var(--bg-muted);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0 4px;
  font-size: 0.78rem;
  color: var(--c-primary);
}

.gs-hint__kbd {
  margin-left: auto;
  display: flex;
  gap: 2px;
}

/* ── Loading skeleton ─────────────────────────────────────────────────────── */
.gs-skeleton {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
}

.gs-sk-icon {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(90deg, rgba(148, 163, 184, 0.15) 25%, rgba(148, 163, 184, 0.3) 50%, rgba(148, 163, 184, 0.15) 75%);
  background-size: 200% 100%;
  animation: gs-shimmer 1.4s infinite;
}

.gs-sk-lines { flex: 1; display: flex; flex-direction: column; gap: 6px; }

.gs-sk-line {
  height: 10px;
  border-radius: 6px;
  background: linear-gradient(90deg, rgba(148, 163, 184, 0.15) 25%, rgba(148, 163, 184, 0.3) 50%, rgba(148, 163, 184, 0.15) 75%);
  background-size: 200% 100%;
  animation: gs-shimmer 1.4s infinite;
}

.gs-sk-line--title { width: 60%; }
.gs-sk-line--sub   { width: 40%; }

@keyframes gs-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Footer ───────────────────────────────────────────────────────────────── */
.gs-footer {
  display: flex;
  gap: 12px;
  padding: 7px 14px;
  border-top: 1px solid var(--border);
  font-size: 0.72rem;
  color: var(--text-subtle);
  flex-wrap: wrap;
}

.gs-footer__shortcut { margin-left: auto; }

.gs-footer kbd {
  display: inline-block;
  background: var(--bg-muted);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0 4px;
  font-size: 0.68rem;
  font-family: inherit;
  color: var(--text-muted);
  margin-right: 2px;
  line-height: 1.6;
}
</style>
