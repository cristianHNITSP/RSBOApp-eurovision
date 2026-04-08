<template>
  <!-- ───────────────────────────────────────────────────────────────
       GlobalSearch.vue
       Barra de búsqueda global para el DashboardLayout toolbar.
       Busca rutas de la app + plantillas oftálmicas del backend
       y redirige al recurso al seleccionar.
  ─────────────────────────────────────────────────────────────────── -->
  <div class="gs-wrapper" ref="wrapperRef" @keydown.esc="close">

    <!-- ── Trigger input ─────────────────────────────────────────── -->
    <b-field class="dashboard-search gs-field" position="is-centered">
      <b-input
        v-model="query"
        placeholder="Buscar en el panel…"
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
            <span class="gs-empty__icon">
              <i class="fas fa-search-minus" />
            </span>
            <p class="gs-empty__title">Sin resultados para <strong>"{{ query }}"</strong></p>
            <p class="gs-empty__sub">Intenta con otra palabra clave.</p>
          </div>
        </template>

        <!-- Hint (query too short) -->
        <template v-else-if="query.length < 2">
          <div class="gs-hint">
            <i class="fas fa-keyboard gs-hint__icon" />
            <span>Escribe al menos 2 caracteres para buscar…</span>
          </div>
        </template>

        <!-- Results -->
        <template v-else>
          <template v-for="(item, idx) in flatItems" :key="idx">
            <!-- Group header -->
            <div v-if="item.type === 'header'" class="gs-group-header">
              <i :class="`fas fa-${item.icon}`" class="gs-group-header__icon" />
              {{ item.label }}
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
              <span class="gs-item__icon gs-item__icon--sheet">
                <i class="fas fa-glasses" />
              </span>
              <span class="gs-item__body">
                <span class="gs-item__title" v-html="highlight(item.nombre)" />
                <span class="gs-item__sub">
                  <span class="gs-item__badge gs-item__badge--tipo">{{ item.tipoLabel }}</span>
                  <span class="gs-item__material">{{ item.material }}</span>
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
        <div class="gs-footer" v-if="!loading && flatItems.length > 0">
          <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
          <span><kbd>↵</kbd> abrir</span>
          <span><kbd>Esc</kbd> cerrar</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useDebounceFn } from '@vueuse/core';
import { globalSearch, flattenResults } from '../services/search.service';

// ── State ─────────────────────────────────────────────────────────────────────
const query       = ref('');
const loading     = ref(false);
const isOpen      = ref(false);
const flatItems   = ref([]);
const cursor      = ref(-1);           // índice dentro de selectables[]
const wrapperRef  = ref(null);
const inputRef    = ref(null);
const dropdownRef = ref(null);

const router = useRouter();

const debouncedSearch = useDebounceFn(runSearch, 320);

// ── Computed ──────────────────────────────────────────────────────────────────
/**
 * Lista de índices (en flatItems) que son seleccionables (no headers).
 * Usamos esta lista para mapear "cursor" → índice real en flatItems.
 */
const selectableIndexes = computed(() =>
  flatItems.value
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.type !== 'header')
    .map(({ idx }) => idx)
);

/** Convierte índice global (en flatItems) → índice en selectables (para cursor) */
function selectableIndex(flatIdx) {
  return selectableIndexes.value.indexOf(flatIdx);
}

// ── Methods ───────────────────────────────────────────────────────────────────
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
    const result  = await globalSearch(query.value);
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

function moveCursor(dir) {
  if (!isOpen.value) { isOpen.value = true; return; }
  const max = selectableIndexes.value.length - 1;
  if (max < 0) return;
  cursor.value = Math.max(0, Math.min(max, cursor.value + dir));
  // Scroll el item activo a la vista
  nextTick(() => {
    const active = dropdownRef.value?.querySelector('.gs-item--active');
    active?.scrollIntoView({ block: 'nearest' });
  });
}

function selectCurrent() {
  if (cursor.value < 0 || cursor.value >= selectableIndexes.value.length) return;
  const flatIdx = selectableIndexes.value[cursor.value];
  selectItem(flatItems.value[flatIdx]);
}

function selectItem(item) {
  close();
  if (item.type === 'route') {
    // Usar routePath directo si está disponible (más fiable para rutas anidadas)
    if (item.routePath) {
      const navTarget = item.routeQuery
        ? { path: item.routePath, query: item.routeQuery }
        : item.routePath;
      router.push(navTarget);
    } else {
      router.push({ name: item.routeName, query: item.routeQuery || {} });
    }
  } else if (item.type === 'sheet') {
    router.push({ path: '/l/inventario/bases-micas', query: { sheetId: item.id } });
  } else if (item.type === 'order') {
    router.push({ path: '/l/ventas/laboratorio', query: { orderId: item.id } });
  }
  query.value = '';
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

// ── Click outside ─────────────────────────────────────────────────────────────
function onClickOutside(e) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target)) {
    close();
  }
}

onMounted(()  => document.addEventListener('mousedown', onClickOutside));
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside));
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
  max-height: 420px;
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

.gs-group-header__icon {
  font-size: 0.7rem;
}

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

.gs-item__icon--route {
  background: var(--c-primary-alpha);
  color: var(--c-primary);
}

.gs-item__icon--sheet {
  background: var(--c-success-alpha);
  color: var(--c-success);
}

.gs-item__icon--order {
  background: var(--c-warning-alpha);
  color: var(--c-warning);
}

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

.gs-item__material {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.gs-item__trat {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.gs-item__badge {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 20px;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.gs-item__badge--page {
  background: var(--c-primary-alpha);
  color: var(--c-primary);
}

.gs-item__badge--tipo {
  background: var(--c-success-alpha);
  color: var(--c-success);
}

.gs-item__badge--status-pendiente {
  background: var(--c-warning-alpha);
  color: var(--c-warning);
}
.gs-item__badge--status-parcial {
  background: var(--c-primary-alpha);
  color: var(--c-primary);
}
.gs-item__badge--status-cerrado {
  background: var(--c-success-alpha);
  color: var(--c-success);
}

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

.gs-empty__icon {
  font-size: 1.6rem;
  color: var(--text-subtle);
  margin-bottom: 4px;
}

.gs-empty__title {
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.gs-empty__sub {
  font-size: 0.78rem;
  color: var(--text-muted);
}

/* ── Hint ─────────────────────────────────────────────────────────────────── */
.gs-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.gs-hint__icon {
  font-size: 0.9rem;
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

.gs-sk-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

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
}

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