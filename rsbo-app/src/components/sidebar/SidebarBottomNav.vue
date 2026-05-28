<template>
  <nav class="bottom-nav is-hidden-desktop" role="navigation" aria-label="Navegación principal">
    <button
      v-for="navItem in resolvedNavItems"
      :key="navItem.id"
      ref="itemEls"
      type="button"
      class="bottom-nav__item"
      :class="{ 'is-active': isNavItemActive(navItem) }"
      @click="handleItemClick(navItem, $event)"
    >
      <span class="bottom-nav__item-icon">
        <b-icon :icon="navItem.icon" size="is-small" />
        <span
          v-if="navItem.badge && navItem.badge !== '0'"
          class="bottom-nav__dot-badge"
        >{{ navItem.badge }}</span>
      </span>
      <span class="bottom-nav__item-label">{{ navItem.label }}</span>
    </button>

    <SidebarSubmenuStrip
      :active-submenu="activeSubmenu"
      :anchor-rect="anchorRect"
      variant="bottom-nav"
      :is-active="isActive"
      @select="navigateTo"
      @close="closeStrip"
    />
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import SidebarSubmenuStrip from './SidebarSubmenuStrip.vue';
import { MOBILE_NAV, SIDEBAR_MENU } from '../../data/sidebar.data';

const props = defineProps({
  user: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  pendingOrders: { type: Number, default: 0 },
});

const route = useRoute();
const router = useRouter();

const itemEls = ref([]);
const activeSubmenu = ref(null);
const anchorRect = ref(null);

const isActive = (path) => route.fullPath === path || route.path === path;

const menuItemsFlat = SIDEBAR_MENU.filter(i => i.label && i.children);

const labBadge = computed(() => props.pendingOrders > 0 ? String(props.pendingOrders) : null);

const resolvedNavItems = computed(() => {
  return MOBILE_NAV.map(navItem => {
    if (!navItem.hasSubmenu) return navItem;

    const source = menuItemsFlat.find(m => m.label.toLowerCase() === navItem.label.toLowerCase());
    if (!source) return navItem;

    const children = source.children.map(child => {
      if (child.needsBadge === 'lab' && labBadge.value) {
        return { ...child, badge: labBadge.value, badgeType: 'is-warning' };
      }
      return child;
    });

    const hasBadge = children.some(c => c.badge);
    return {
      ...navItem,
      children,
      badge: (navItem.label === 'Ventas' && hasBadge) ? labBadge.value : null,
    };
  });
});

function isNavItemActive(navItem) {
  if (navItem.path) return isActive(navItem.path);
  if (navItem.children) return navItem.children.some(c => isActive(c.path));
  return false;
}

function handleItemClick(navItem, event) {
  if (navItem.hasSubmenu && navItem.children) {
    const isSame = activeSubmenu.value?.label === navItem.label;
    if (isSame) { closeStrip(); return; }

    const btnEls = Array.from(event.currentTarget.closest('nav').querySelectorAll('.bottom-nav__item'));
    const idx = btnEls.indexOf(event.currentTarget);
    anchorRect.value = event.currentTarget.getBoundingClientRect();
    activeSubmenu.value = navItem;
    return;
  }
  closeStrip();
  if (navItem.path) router.push(navItem.path);
}

function closeStrip() {
  activeSubmenu.value = null;
  anchorRect.value = null;
}

function navigateTo(path) {
  router.push(path);
  closeStrip();
}
</script>

<style scoped>
@import "./SidebarBottomNav.css";
</style>
