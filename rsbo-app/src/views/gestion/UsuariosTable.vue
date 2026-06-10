<template>
  <div class="usuarios-table-container lq-enter">
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
        <article class="media is-align-items-flex-start mb-0">
          <figure class="media-left mr-3">
            <AvatarPicker
              :model-value="props.row.profile?.avatar || ''"
              :placeholder="getAvatar(props.row.profile?.avatar, 'PROFILE')"
              :edit-mode="canEditAvatar(props.row)"
              :size="32"
              @update:model-value="$emit('avatar-picked', props.row, $event)"
            />
          </figure>

          <div class="media-content">
            <div class="tags mb-1">
              <span class="has-text-weight-semibold mr-2">{{ props.row.name }}</span>
              <b-tag v-if="props.row.isMe" type="is-light" size="is-small">Yo</b-tag>
              <b-tag :type="roleTagType(props.row.roleName)" size="is-small" class="is-capitalized">
                {{ props.row.roleLabel }}
              </b-tag>
              <b-tag v-if="props.row.deletedAt" type="is-warning" size="is-small">Papelera</b-tag>
            </div>

            <p class="px-3 py-2 is-size-7 user-bio-pill">
              {{ props.row.profile?.bio || "—" }}
            </p>
          </div>
        </article>
      </b-table-column>

      <b-table-column field="username" label="Usuario" sortable v-slot="props">
        <b-tag size="is-small" icon="at">{{ props.row.username }}</b-tag>
      </b-table-column>

      <b-table-column
        field="lastLogin"
        label="Último acceso"
        sortable
        centered
        :visible="isMobile || isWidescreen"
        v-slot="props"
      >
        <b-tag size="is-small">{{ formatDateTime(props.row.lastLogin) }}</b-tag>
      </b-table-column>

      <b-table-column field="isActive" label="Estado" centered v-slot="props">
        <b-tag v-if="props.row.deletedAt" type="is-warning" size="is-small">Eliminado</b-tag>
        <b-tag v-else :type="props.row.isActive ? 'is-success' : 'is-danger'" size="is-small">
          {{ props.row.isActive ? "Activo" : "Inactivo" }}
        </b-tag>
      </b-table-column>

      <b-table-column
        field="createdAt"
        label="Alta"
        sortable
        centered
        :visible="isMobile || isWidescreen"
        v-slot="props"
      >
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
import { roleTagType } from "@/utils/roleHelpers.js";
import { canEditAvatar, formatDateTime, formatDate, rowClass } from "@/composables/gestion/usuarios/useUsuariosLogic.js";
import { getAvatar } from "@/utils/avatarHelper";
import { useBreakpoint } from "@/composables/ui/useBreakpoint.js";

const { isMobile, isWidescreen } = useBreakpoint();

defineProps({
  users:          { type: Array,   required: true },
  total:          { type: Number,  required: true },
  perPage:        { type: Number,  required: true },
  currentPage:    { type: Number,  required: true },
  loading:        { type: Boolean, required: true },
  selectedUser:   { type: Object,  default: null },
});

defineEmits([
  "page-change",
  "sort",
  "row-click",
  "avatar-picked",
  "update:selectedUser"
]);
</script>

<style scoped>
/* Solo color/estado vía tokens — layout y responsive son Buefy/Bulma */
.user-bio-pill {
  background: var(--bg-muted);
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  line-height: 1.25rem;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

/* Fila seleccionada / hover: tinte primario mate con texto legible */
:deep(.b-table .table tbody tr.is-selected),
:deep(.b-table .table tbody tr:hover) {
  background: var(--row-hover-bg);
}

:deep(.b-table .table tr.is-selected td),
:deep(.b-table .table tr.is-selected th) {
  color: var(--text-primary);
}

:deep(.b-table .table tbody tr:focus-within) {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--row-selected-accent);
}

:deep(.b-table .table td),
:deep(.b-table .table th) {
  vertical-align: middle;
}

/* Mobile cards de Buefy: superficie y selección mate (solo color) */
:deep(.b-table .table-wrapper.has-mobile-cards tr) {
  background: var(--surface-overlay);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

:deep(.b-table .table-wrapper.has-mobile-cards tr.is-selected) {
  background: var(--row-selected-bg);
  border-color: var(--row-selected-accent);
  box-shadow: inset 0 0 0 2px var(--row-selected-accent);
}

:deep(.user-row--inactive) {
  background-color: var(--c-danger-alpha);
}
</style>
