<template>
  <div class="um-card um-card--glass p-4">
    <!-- Header -->
    <div class="card-head">
      <div class="card-head__title">
        <div class="pill-row">
          <span class="pill pill--primary">
            <span class="icon is-small mr-1"><i class="fas fa-user-edit"></i></span>
            Perfil
          </span>
        </div>

        <p class="has-text-weight-semibold mb-0 mt-2">Información del perfil</p>
      </div>

      <div class="card-head__actions">
        <b-button
          v-if="!isEditing"
          size="is-small"
          type="is-primary"
          icon-left="pencil-alt"
          class="btn-cta"
          @click="$emit('start-edit')"
        >
          Editar
        </b-button>

        <template v-else>
          <b-button size="is-small" icon-left="times" @click="$emit('cancel-edit')">
            Cancelar
          </b-button>
          <b-button
            size="is-small"
            type="is-primary"
            icon-left="check"
            class="btn-cta"
            :loading="loading"
            :disabled="loading"
            @click="$emit('save')"
          >
            Guardar
          </b-button>
        </template>
      </div>
    </div>

    <transition name="slide-fade">
      <b-message
        v-if="message"
        :type="success ? 'is-success' : 'is-danger'"
        :icon="success ? 'check-circle' : 'exclamation-circle'"
        class="mb-4 um-message"
        :closable="true"
        :has-animation="true"
        @close="$emit('update:message', '')"
      >
        {{ message }}
      </b-message>
    </transition>

    <div class="columns is-multiline is-variable is-3">
      <div class="column is-12">
        <b-field
          label="Nombre completo"
          :type="errors.name ? 'is-danger' : ''"
          :message="errors.name"
        >
          <b-input
            v-model="form.name"
            placeholder="Tu nombre"
            :disabled="!isEditing || loading"
            expanded
            icon="user"
            @input="clearError('name')"
          />
        </b-field>
      </div>

      <div class="column is-12">
        <b-field label="Nombre de usuario">
          <b-input :value="user?.username || ''" expanded icon="at" disabled />
        </b-field>
      </div>

      <div class="column is-12-tablet is-6-desktop">
        <b-field
          label="Teléfono"
          :type="errors.phone ? 'is-danger' : ''"
          :message="errors.phone"
        >
          <b-input
            v-model="form.phone"
            placeholder="Tu teléfono"
            :disabled="!isEditing || loading"
            expanded
            icon="phone"
            @input="clearError('phone')"
          />
        </b-field>
      </div>

      <div class="column is-12-tablet is-6-desktop">
        <b-field label="Rol asignado">
          <b-input :value="roleName" icon="user-tag" disabled />
        </b-field>
      </div>

      <div class="column is-12">
        <b-field
          label="Biografía"
          :type="errors.bio ? 'is-danger' : ''"
          :message="errors.bio"
        >
          <b-input
            type="textarea"
            v-model="form.bio"
            placeholder="Cuéntanos sobre ti..."
            maxlength="500"
            show-counter
            rows="6"
            custom-class="textarea-bio"
            :disabled="!isEditing || loading"
            @input="clearError('bio')"
          />
        </b-field>
      </div>

      <div class="column is-12">
        <div class="hint-line">
          <span class="icon is-small mr-1"><i class="fas fa-info-circle"></i></span>
          <span>Tip: usa un nombre consistente para reportes y auditoría.</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  user:       { type: Object,   default: null },
  form:       { type: Object,   default: () => ({}) },
  errors:     { type: Object,   default: () => ({}) },
  isEditing:  { type: Boolean,  default: false },
  loading:    { type: Boolean,  default: false },
  message:    { type: String,   default: '' },
  success:    { type: Boolean,  default: false },
  roleName:   { type: String,   default: '' },
  clearError: { type: Function, default: () => {} },
});

defineEmits(['start-edit', 'cancel-edit', 'save', 'update:message']);
</script>
