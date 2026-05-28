<template>
  <teleport to="body">
    <transition :name="transitionName">
      <div v-if="activeSubmenu" class="submenu-strip-wrap">
        <!-- Backdrop transparente para cerrar -->
        <div class="submenu-strip__backdrop" @click="$emit('close')" />

        <!-- Panel flotante -->
        <div
          ref="panelRef"
          class="submenu-strip"
          :class="`submenu-strip--${variant}`"
          :style="panelStyle"
          role="menu"
          @keydown.escape="$emit('close')"
        >
          <div
            class="submenu-strip__items"
            :class="variant === 'bottom-nav' ? 'submenu-strip__items--column' : 'submenu-strip__items--row'"
          >
            <a
              v-for="child in activeSubmenu.children"
              :key="child.path"
              class="submenu-strip__item"
              :class="{ 'is-active': isActive(child.path) }"
              role="menuitem"
              @click="handleSelect(child.path)"
            >
              <span class="submenu-strip__item-icon">
                <b-icon :icon="child.icon" size="is-small" />
              </span>
              <span class="submenu-strip__item-label">{{ child.label }}</span>
              <b-tag
                v-if="child.badge"
                class="submenu-strip__item-badge"
                rounded
                :type="child.badgeType || 'is-warning'"
                size="is-small"
              >{{ child.badge }}</b-tag>
            </a>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue';

const VIEWPORT_PADDING = 8;
const GAP = 12;

const props = defineProps({
  activeSubmenu: { type: Object, default: null },
  anchorRect: { type: Object, default: null },
  variant: { type: String, default: 'sidebar' },
  isActive: { type: Function, required: true },
});

const emit = defineEmits(['select', 'close']);

const panelRef = ref(null);
const panelStyle = ref({});

const transitionName = computed(() =>
  props.variant === 'bottom-nav' ? 'strip-up' : 'strip-slide'
);

function updatePosition() {
  const anchor = props.anchorRect;
  if (!anchor || !panelRef.value) return;

  const panelEl = panelRef.value;
  const pw = panelEl.offsetWidth || 0;
  const ph = panelEl.offsetHeight || 0;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (props.variant === 'sidebar') {
    let left = anchor.right + GAP;
    left = Math.min(left, vw - pw - VIEWPORT_PADDING);
    left = Math.max(left, VIEWPORT_PADDING);

    let top = anchor.top;
    top = Math.min(top, vh - ph - VIEWPORT_PADDING);
    top = Math.max(top, VIEWPORT_PADDING);

    panelStyle.value = { position: 'fixed', left: `${left}px`, top: `${top}px` };
  } else {
    const centerX = anchor.left + anchor.width / 2;
    let left = centerX - pw / 2;
    left = Math.min(left, vw - pw - VIEWPORT_PADDING);
    left = Math.max(left, VIEWPORT_PADDING);

    const bottom = vh - anchor.top + GAP;

    panelStyle.value = { position: 'fixed', left: `${left}px`, bottom: `${bottom}px` };
  }
}

watch(() => props.activeSubmenu, async (val) => {
  if (!val) { panelStyle.value = {}; return; }
  await nextTick();
  updatePosition();
});

watch(() => props.anchorRect, async (val) => {
  if (!val || !props.activeSubmenu) return;
  await nextTick();
  updatePosition();
});

function onResize() { if (props.activeSubmenu) updatePosition(); }
function onKey(e) { if (e.key === 'Escape') emit('close'); }

window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
window.addEventListener('keydown', onKey);

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
  window.removeEventListener('orientationchange', onResize);
  window.removeEventListener('keydown', onKey);
});

function handleSelect(path) {
  emit('select', path);
  emit('close');
}
</script>

<style scoped>
@import "./SidebarSubmenuStrip.css";
</style>
