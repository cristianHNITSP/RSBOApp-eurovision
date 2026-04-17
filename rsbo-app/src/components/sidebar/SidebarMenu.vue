<template>
  <div class="sidebar-menu" :class="{ 'is-tree-mode': mode === 'tree' }">
    <template v-for="(item, index) in menuItems" :key="index">
      <!-- GRUPO -->
      <div v-if="item.group" class="menu-group">
        <span class="menu-group-title" v-if="!isCollapsed">{{ item.group }}</span>
        <span class="menu-group-divider" v-if="!isCollapsed"></span>
      </div>

      <!-- ITEM CON SUBMENU -->
      <div v-else-if="item.children" class="menu-item-container">
        <div
          class="menu-item has-submenu is-clickable"
          :class="{ 'is-active': isChildActive(item.children), 'is-expanded': mode === 'tree' && isExpanded(item) }"
          @click="handleSubmenuClick(item)"
          :title="isCollapsed ? item.label : ''"
          role="button"
          tabindex="0"
        >
          <div class="menu-item-inner">
            <span class="menu-item-icon" style="position:relative;">
              <b-icon :icon="item.icon" size="is-small" />
              <span v-if="item.badge && isCollapsed" class="menu-item-dot-badge">{{ item.badge }}</span>
            </span>
            <span v-if="!isCollapsed" class="menu-item-label">
              {{ item.label }}
            </span>
          </div>

          <b-tag
            v-if="item.badge && !isCollapsed"
            class="menu-item-badge"
            rounded
            :type="item.badgeType || 'is-primary'"
          >
            {{ item.badge }}
          </b-tag>

          <b-icon
            v-if="!isCollapsed"
            icon="angle-right"
            size="is-small"
            class="menu-item-chevron"
            :class="{ 'is-open': (mode === 'tree' && isExpanded(item)) || (mode === 'panel' && activeSubmenu && activeSubmenu.label === item.label) }"
          />
        </div>

        <!-- Inline Tree Submenu -->
        <transition name="menu-expand" v-if="mode === 'tree'">
          <div v-show="isExpanded(item)" class="menu-submenu-tree">
            <router-link
              v-for="(child, cIdx) in item.children"
              :key="cIdx"
              :to="child.path"
              class="menu-item is-child"
              active-class="is-active"
              exact-active-class="is-exact-active"
              @click.native="$emit('navigate')"
              @click="$emit('navigate')"
            >
              <div class="menu-item-inner">
                <span class="menu-item-icon">
                  <b-icon :icon="child.icon" size="is-small" />
                </span>
                <span class="menu-item-label">
                  {{ child.label }}
                </span>
              </div>
            </router-link>
          </div>
        </transition>
      </div>

      <!-- ITEM NORMAL -->
      <router-link
        v-else
        :to="item.path"
        class="menu-item"
        active-class="is-active"
        exact-active-class="is-exact-active"
        :title="isCollapsed ? item.label : ''"
        @click.native="$emit('navigate')"
        @click="$emit('navigate')"
      >
        <div class="menu-item-inner">
          <span class="menu-item-icon">
            <b-icon :icon="item.icon" size="is-small" />
          </span>
          <span class="menu-item-label" v-if="!isCollapsed">
            {{ item.label }}
          </span>
        </div>

        <b-tag
          v-if="item.badge && !isCollapsed"
          class="menu-item-badge"
          rounded
          :type="item.badgeType || 'is-primary'"
        >
          {{ item.badge }}
        </b-tag>
      </router-link>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  menuItems: { type: Array, required: true },
  isCollapsed: { type: Boolean, default: false },
  activeSubmenu: { type: Object, default: null },
  isChildActive: { type: Function, required: true },
  mode: { type: String, default: 'panel' } // 'panel' or 'tree'
})

const emit = defineEmits(['toggle-submenu', 'navigate'])

const expandedItems = ref([]);

function isExpanded(item) {
  return expandedItems.value.includes(item.label);
}

function handleSubmenuClick(item) {
  if (props.mode === 'tree') {
    const idx = expandedItems.value.indexOf(item.label);
    if (idx > -1) expandedItems.value.splice(idx, 1);
    else expandedItems.value.push(item.label);
  } else {
    emit('toggle-submenu', item);
  }
}
</script>

<style scoped>
@import "./SidebarMenu.css";
</style>
