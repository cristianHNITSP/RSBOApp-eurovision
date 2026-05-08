<template>
  <div class="help-shortcuts-grid">
    <div class="help-shortcuts-block">
      <p class="help-shortcuts-block__title">En el inventario</p>
      <div v-for="s in inventoryShortcuts" :key="s.keys" class="help-shortcut-row">
        <span class="help-shortcut-key">{{ s.keys }}</span>
        <span>{{ s.desc }}</span>
      </div>
    </div>

    <div class="help-shortcuts-block">
      <p class="help-shortcuts-block__title">Navegación general</p>
      <div v-for="s in globalShortcuts" :key="s.keys" class="help-shortcut-row">
        <span class="help-shortcut-key">{{ s.keys }}</span>
        <span>{{ s.desc }}</span>
      </div>

      <p class="help-shortcuts-block__title" style="margin-top: 0.65rem;">En la búsqueda global</p>
      <div v-for="s in searchShortcuts" :key="s.keys" class="help-shortcut-row">
        <span>{{ s.desc }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import './HelpKeyboardShortcuts.css';
import {
  SHORTCUTS_INVENTORY as inventoryShortcuts,
  SHORTCUTS_GLOBAL as globalShortcuts,
  SHORTCUTS_SEARCH as searchShortcuts,
} from './data/shortcuts.js';
</script>
