<template>
  <div class="column is-12-mobile" :class="wide ? 'is-12' : 'is-12-tablet'">
    <div class="prefs-card">
      <div class="level is-mobile mb-3">
        <div class="level-left">
          <div class="prefs-title">
            <b-icon :icon="icon" size="is-small" class="mr-2" />
            {{ title }}
          </div>
        </div>
        <div class="level-right">
          <b-tag type="is-light" rounded size="is-small">{{ tag }}</b-tag>
        </div>
      </div>

      <slot />
    </div>
  </div>
</template>

<script setup>
import './PrefsCard.css';

defineProps({
  icon:  { type: String, default: '' },
  title: { type: String, default: '' },
  tag:   { type: String, default: '' },
  wide:  { type: Boolean, default: false },
});
</script>
