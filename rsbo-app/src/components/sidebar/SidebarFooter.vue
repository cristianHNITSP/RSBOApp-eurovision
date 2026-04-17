<template>
  <div class="sidebar-footer">
    <div class="sidebar-footer-inner" v-if="!loading">
      <div class="user-profile">
        <div class="user-avatar">
          <b-skeleton
            v-if="!avatarLoaded"
            :width="34"
            :height="34"
            :animated="true"
            style="border-radius:50%;"
          />
          <img
            v-else
            :key="avatarUrl"
            class="is-rounded"
            :src="avatarUrl"
            alt="Avatar"
            @load="$emit('avatar-load')"
            @error="$emit('avatar-error')"
          />
        </div>

        <div class="user-info" v-if="!isCollapsed">
          <span class="user-name">{{ filteredUser.name }}</span>
          <span class="user-role">{{ filteredUser.role }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  loading: Boolean,
  avatarLoaded: Boolean,
  avatarUrl: String,
  isCollapsed: Boolean,
  filteredUser: Object
})

defineEmits(['avatar-load', 'avatar-error'])
</script>

<style scoped>
@import "./SidebarFooter.css";
</style>
