<template>
  <div class="panel-usuarios-filters">
    <b-field grouped group-multiline>
      <b-field label="Buscar usuario" class="panel-usuarios-filter-field" expanded>
        <b-input
          :model-value="searchQuery"
          @update:model-value="$emit('update:searchQuery', $event)"
          :size="isMobile ? '' : 'is-small'"
          icon="search"
          placeholder="Buscar por nombre o correo…"
          expanded
        />
      </b-field>

      <b-field label="Filtrar por rol" class="panel-usuarios-filter-field" expanded>
        <b-select
          :model-value="roleFilter"
          @update:model-value="$emit('update:roleFilter', $event)"
          :size="isMobile ? '' : 'is-small'"
          expanded
        >
          <option value="all">Todos los roles</option>
          <option v-for="role in roles" :key="role._id" :value="role._id">
            {{ formatRoleLabel(role.name) }}
          </option>
        </b-select>
      </b-field>

      <b-field label="Filtrar por estado de usuario" class="panel-usuarios-filter-field" expanded>
        <b-select
          :model-value="statusFilter"
          @update:model-value="$emit('update:statusFilter', $event)"
          :size="isMobile ? '' : 'is-small'"
          expanded
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="trash">Papelera</option>
        </b-select>
      </b-field>
    </b-field>
  </div>
</template>

<script setup>
import { formatRoleLabel } from "@/utils/roleHelpers.js";

defineProps({
  searchQuery: String,
  roleFilter:  String,
  statusFilter: String,
  roles:     { type: Array, default: () => [] },
  isMobile:  { type: Boolean, default: false },
});

defineEmits(["update:searchQuery", "update:roleFilter", "update:statusFilter"]);
</script>

<style src="./UsuariosFilters.css" scoped />
