<template>
  <div class="columns is-multiline is-variable is-3">
    <div class="column is-12-mobile is-6-tablet is-4-desktop">
      <b-field label="Buscar usuario">
        <b-input
          :model-value="searchQuery"
          @update:model-value="$emit('update:searchQuery', $event)"
          icon="search"
          placeholder="Buscar por nombre o usuario…"
          expanded
        />
      </b-field>
    </div>

    <div class="column is-12-mobile is-6-tablet is-4-desktop">
      <b-field label="Filtrar por rol">
        <b-select
          :model-value="roleFilter"
          @update:model-value="$emit('update:roleFilter', $event)"
          expanded
        >
          <option value="all">Todos los roles</option>
          <option v-for="role in roles" :key="role._id" :value="role._id">
            {{ formatRoleLabel(role.name) }}
          </option>
        </b-select>
      </b-field>
    </div>

    <div class="column is-12-mobile is-6-tablet is-4-desktop">
      <b-field label="Filtrar por estado de usuario">
        <b-select
          :model-value="statusFilter"
          @update:model-value="$emit('update:statusFilter', $event)"
          expanded
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="trash">Papelera</option>
        </b-select>
      </b-field>
    </div>
  </div>
</template>

<script setup>
import { formatRoleLabel } from "@/utils/roleHelpers.js";

defineProps({
  searchQuery: String,
  roleFilter:  String,
  statusFilter: String,
  roles:     { type: Array, default: () => [] },
});

defineEmits(["update:searchQuery", "update:roleFilter", "update:statusFilter"]);
</script>
