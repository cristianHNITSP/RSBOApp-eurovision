<template>
  <div>
    <aside v-if="activeSubmenu" ref="submenu" class="submenu-panel" :style="submenuStyles">
      <div class="submenu-header">
        <div class="submenu-header-main">
          <span class="submenu-pill">Módulo</span>
          <span class="submenu-title">
            {{ activeSubmenu.label }}
          </span>
        </div>
        <b-button type="is-text" size="is-small" icon-right="times" class="submenu-close" @click="$emit('close')" />
      </div>

      <div class="submenu-body">
        <nav class="submenu-list">
          <a v-for="(sub, index) in activeSubmenu.children" :key="index" class="submenu-item"
            :class="{ 'is-active': isActive(sub.path) }" @click="$emit('navigate', sub.path)">
            <span class="submenu-item-bar"></span>
            <span class="submenu-item-icon">
              <b-icon :icon="sub.icon" size="is-small" />
            </span>
            <span class="submenu-item-label">{{ sub.label }}</span>
            <b-tag v-if="sub.badge" class="submenu-item-badge" rounded :type="sub.badgeType || 'is-warning'"
              size="is-small">{{ sub.badge }}</b-tag>
          </a>
        </nav>
      </div>
    </aside>

    <!-- OVERLAY -->
    <div v-if="activeSubmenu" class="submenu-overlay" @click="$emit('close')"></div>
  </div>
</template>

<script setup>
import { ref, defineExpose } from 'vue'

defineProps({
  activeSubmenu: { type: Object, default: null },
  submenuStyles: { type: Object, default: () => ({}) },
  isActive: { type: Function, required: true }
})

defineEmits(['close', 'navigate'])

const submenu = ref(null)

defineExpose({
  submenu
})
</script>

<style scoped>
@import "./SidebarSubmenuPanel.css";
</style>
