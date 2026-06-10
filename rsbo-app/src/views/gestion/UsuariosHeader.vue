<script setup>
import PageSectionHeader from "@/components/ui/PageSectionHeader.vue";

defineProps({
  stats: { type: Object, required: true },
  roles: { type: Array, required: true },
});

const quickItems = [
  { icon: "user-plus", title: "Crear usuario", text: "Asigna rol, nombre y correo" },
  { icon: "trash-restore", title: "Papelera", text: "Los eliminados se pueden restaurar" },
];
</script>

<template>
  <PageSectionHeader
    pill="Gestión de usuarios"
    icon="users"
    title="Usuarios del sistema"
    description="Control de cuentas, roles y accesos del personal. Crea, edita, activa o desactiva usuarios."
    :quick-items="quickItems"
  >
    <template #meta>
      <b-taglist attached class="is-justify-content-flex-end mb-1">
        <b-tag type="is-primary">{{ stats.totalUsers }} usuarios</b-tag>
        <b-tag type="is-success">{{ stats.activeUsers }} activos</b-tag>
      </b-taglist>
      <p class="is-size-7 has-text-grey">{{ roles.length }} roles actuales</p>
    </template>
  </PageSectionHeader>
</template>
