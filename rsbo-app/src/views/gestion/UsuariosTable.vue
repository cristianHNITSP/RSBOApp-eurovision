<template>
  <div class="usuarios-table-container">
    <b-table
      :data="users"
      sticky-header
      :height="360"
      hoverable
      focusable
      paginated
      backend-pagination
      backend-sorting
      :total="total"
      :per-page="perPage"
      :current-page="currentPage"
      @page-change="$emit('page-change', $event)"
      @sort="$emit('sort', $event.field, $event.order)"
      @click="$emit('row-click', $event)"
      :selected="selectedUser"
      @update:selected="$emit('update:selectedUser', $event)"
      :row-class="rowClass"
      :loading="loading"
    >
      <b-table-column field="name" label="Usuario" sortable v-slot="props">
        <div class="user-cell">
          <div class="user-cell__avatar-wrap">
            <AvatarPicker
              :model-value="props.row.profile?.avatar || ''"
              :placeholder="fallbackAvatar"
              :edit-mode="canEditAvatar(props.row)"
              :size="32"
              @update:model-value="$emit('avatar-picked', props.row, $event)"
            />
          </div>

          <div class="user-cell__meta">
            <div class="user-cell__meta-header">
              <span class="user-cell__name">
                {{ props.row.name }}
                <b-tag v-if="props.row.isMe" type="is-light" size="is-small" class="ml-2">Yo</b-tag>
              </span>

              <b-tag :type="roleTagType(props.row.roleName)" size="is-small" class="user-cell__role-tag">
                {{ props.row.roleLabel }}
              </b-tag>

              <b-tag v-if="props.row.deletedAt" type="is-warning" size="is-small">Papelera</b-tag>
            </div>

            <p class="has-background-light px-3 py-2 is-size-7 has-text-grey-dark user-bio-pill">
              {{ props.row.profile?.bio || "—" }}
            </p>
          </div>
        </div>
      </b-table-column>

      <b-table-column field="username" label="Usuario" sortable v-slot="props">
        <span class="tag is-light is-size-7 has-text-grey-dark">
          <b-icon icon="at" size="is-small" class="mr-1 has-text-grey-dark" />
          {{ props.row.username }}
        </span>
      </b-table-column>

      <b-table-column field="lastLogin" label="Último acceso" sortable centered v-slot="props">
        <span class="tag is-light is-size-7">{{ formatDateTime(props.row.lastLogin) }}</span>
      </b-table-column>

      <b-table-column field="isActive" label="Estado" centered v-slot="props">
        <b-tag v-if="props.row.deletedAt" type="is-warning" size="is-small">Eliminado</b-tag>
        <b-tag v-else :type="props.row.isActive ? 'is-success' : 'is-danger'" size="is-small">
          {{ props.row.isActive ? "Activo" : "Inactivo" }}
        </b-tag>
      </b-table-column>

      <b-table-column field="createdAt" label="Alta" sortable centered v-slot="props">
        <span class="is-size-7">{{ formatDate(props.row.createdAt) }}</span>
      </b-table-column>

      <template #empty>
        <div class="has-text-centered has-text-grey py-5">
          No se encontraron usuarios con los filtros actuales.
        </div>
      </template>
    </b-table>
  </div>
</template>

<script setup>
import AvatarPicker from "@/components/AvatarPicker.vue";
import { formatRoleLabel, roleTagType } from "@/utils/roleHelpers.js";
import { canEditAvatar, formatDateTime, formatDate, rowClass } from "@/composables/gestion/usuarios/useUsuariosLogic.js";

defineProps({
  users:          { type: Array,   required: true },
  total:          { type: Number,  required: true },
  perPage:        { type: Number,  required: true },
  currentPage:    { type: Number,  required: true },
  loading:        { type: Boolean, required: true },
  selectedUser:   { type: Object,  default: null },
  fallbackAvatar: { type: String,  required: true },
});

defineEmits([
  "page-change",
  "sort",
  "row-click",
  "avatar-picked",
  "update:selectedUser"
]);
</script>

<style src="./UsuariosTable.css" scoped />
