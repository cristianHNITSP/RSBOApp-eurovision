<template>
  <header class="panel-usuarios-header page-section-header m-0">
    <div>
      <span class="usuarios-pill">
        <b-icon icon="users" size="is-small" class="mr-1" />
        Gestión de usuarios
      </span>
      <h2>Usuarios del sistema</h2>
      <p class="psh-desc">Control de cuentas, roles y accesos del personal. Crea, edita, activa o desactiva usuarios.
      </p>

      <div class="psh-quick mt-3">
        <div class="psh-quick__card">
          <div class="psh-quick__icon"><i class="fas fa-user-plus"></i></div>
          <div>
            <p class="psh-quick__title">Crear usuario</p>
            <p class="psh-quick__text">Asigna rol, nombre y correo</p>
          </div>
        </div>
        <div class="psh-quick__card">
          <div class="psh-quick__icon"><i class="fas fa-trash-restore"></i></div>
          <div>
            <p class="psh-quick__title">Papelera</p>
            <p class="psh-quick__text">Los eliminados se pueden restaurar</p>
          </div>
        </div>
      </div>
    </div>

    <div class="panel-usuarios-summary">
      <b-taglist attached>
        <b-tag type="is-primary">{{ stats.totalUsers }} usuarios</b-tag>
        <b-tag type="is-success">{{ stats.activeUsers }} activos</b-tag>
      </b-taglist>
      <p class="is-size-7 has-text-grey mt-1">{{ roles.length }} roles actuales</p>
    </div>
  </header>
</template>

<script setup>
defineProps({
  stats: { type: Object, required: true },
  roles: { type: Array, required: true },
});
</script>

<style src="./UsuariosHeader.css" scoped />
