<template>
  <div class="view-usuarios-root">
    <div class="view-hero">
      <UserBanner
        ref="bannerRef"
        :user="selectedUser"
        :fallback-avatar="FALLBACK_AVATAR"
        :permission-catalog="permissionsCatalog"
        :loading="usersLoading"
        @avatar-picked="onAvatarPicked"
        @open-create="openCreate"
        @reload="loadUsers"
        @edit="openEdit"
        @change-password="openPassword"
        @soft-delete="confirmSoftDelete"
        @restore="confirmRestore"
      />
    </div>

    <section class="view-main">
      <UsuariosHeader :stats="stats" :roles="roles" />

      <UsuariosFilters
        v-model:search-query="searchQuery"
        v-model:role-filter="roleFilter"
        v-model:status-filter="statusFilter"
        :roles="roles"
        :is-mobile="isMobile"
      />

      <UsuariosTable
        :users="users"
        :total="total"
        :per-page="perPage"
        :current-page="currentPage"
        :loading="usersLoading"
        :selected-user="selectedUser"
        :fallback-avatar="FALLBACK_AVATAR"
        @page-change="onPageChange"
        @sort="onSort"
        @row-click="selectRow"
        @avatar-picked="onAvatarPicked"
        @update:selected-user="selectedUser = $event"
      />
    </section>

    <UserEditModal
      v-model="editOpen"
      :user="editUser"
      :roles="roles"
      :saving="saving"
      @save="saveEdit"
    />
    <UserPasswordModal
      v-model="passOpen"
      :user="passUser"
      :saving="saving"
      @save="savePassword"
      @toast="toast"
    />
    <b-modal
      v-model="createOpen"
      has-modal-card
      trap-focus
      :destroy-on-hide="true"
      aria-role="dialog"
      aria-modal
    >
      <UserCreateModal
        :roles="roles"
        :saving="saving"
        :fallback-avatar="FALLBACK_AVATAR"
        @save="createUser"
        @toast="toast"
      />
    </b-modal>
  </div>
</template>



<script setup>
import { onMounted } from "vue";
import { useUsuariosLogic } from "@/composables/gestion/usuarios/useUsuariosLogic.js";

const props = defineProps({
  user: { type: Object, default: null },
  loading: { type: Boolean, default: false }
});

import UserBanner        from "@/components/usuarios/UserBanner.vue";
import UserEditModal     from "@/components/usuarios/UserEditModal.vue";
import UserPasswordModal from "@/components/usuarios/UserPasswordModal.vue";
import UserCreateModal   from "@/components/usuarios/UserCreateModal.vue";

import UsuariosHeader  from "./UsuariosHeader.vue";
import UsuariosFilters from "./UsuariosFilters.vue";
import UsuariosTable   from "./UsuariosTable.vue";

const {
  roles, total, stats, permissionsCatalog,
  loading: usersLoading, saving, isMobile,
  searchQuery, roleFilter, statusFilter,
  perPage, currentPage,
  selectedUser, bannerRef,
  editOpen, passOpen, createOpen,
  editUser, passUser,
  users, FALLBACK_AVATAR,
  loadUsers, onPageChange, onSort, selectRow,
  onAvatarPicked,
  openEdit, saveEdit,
  openPassword, savePassword,
  openCreate, createUser,
  confirmSoftDelete, confirmRestore,
  toast, init,
} = useUsuariosLogic();

onMounted(init);
</script>

<style src="./usuarios.css" scoped />
