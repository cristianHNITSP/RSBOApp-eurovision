<template>
  <teleport to="body">
    <!-- Modal: cerrar una sesión -->
    <b-modal
      :model-value="showOne"
      has-modal-card
      trap-focus
      :destroy-on-hide="true"
      aria-role="dialog"
      aria-modal
      @update:model-value="$emit('update:showOne', $event)"
    >
      <div class="modal-card" style="max-width: 420px; width: 100%;">
        <header class="modal-card-head revoke-modal-head--warning">
          <p class="modal-card-title">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            Cerrar sesión
          </p>
          <button class="delete" aria-label="close" @click="$emit('update:showOne', false)" />
        </header>
        <section class="modal-card-body">
          <p>
            Se cerrará la sesión de
            <strong>{{ pendingSession ? getDisplayDevice(pendingSession) : 'este dispositivo' }}</strong>.
            El dispositivo perderá el acceso inmediatamente.
          </p>
        </section>
        <footer class="modal-card-foot">
          <b-button :disabled="revokingId !== null" @click="$emit('update:showOne', false)">
            Cancelar
          </b-button>
          <b-button
            type="is-danger"
            icon-pack="fas"
            icon-left="times"
            :loading="revokingId !== null"
            @click="$emit('confirm-one')"
          >
            Cerrar sesión
          </b-button>
        </footer>
      </div>
    </b-modal>

    <!-- Modal: cerrar todas las demás sesiones -->
    <b-modal
      :model-value="showAll"
      has-modal-card
      trap-focus
      :destroy-on-hide="true"
      aria-role="dialog"
      aria-modal
      @update:model-value="$emit('update:showAll', $event)"
    >
      <div class="modal-card" style="max-width: 440px; width: 100%;">
        <header class="modal-card-head revoke-modal-head--danger">
          <p class="modal-card-title">
            <i class="fas fa-sign-out-alt mr-2"></i>
            Cerrar otras sesiones
          </p>
          <button class="delete" aria-label="close" @click="$emit('update:showAll', false)" />
        </header>
        <section class="modal-card-body">
          <p class="mb-3">
            Se cerrarán
            <strong>{{ otherCount }} sesión(es)</strong>
            activas en otros dispositivos.
          </p>
          <div class="revoke-notice">
            <i class="fas fa-info-circle mr-2"></i>
            Esta acción no se puede deshacer. Los demás dispositivos perderán el acceso inmediatamente.
          </div>
        </section>
        <footer class="modal-card-foot">
          <b-button :disabled="loadingRevoke" @click="$emit('update:showAll', false)">
            Cancelar
          </b-button>
          <b-button
            type="is-danger"
            icon-pack="fas"
            icon-left="sign-out-alt"
            :loading="loadingRevoke"
            @click="$emit('confirm-all')"
          >
            Cerrar sesiones
          </b-button>
        </footer>
      </div>
    </b-modal>
  </teleport>
</template>

<script setup>
import './SecurityRevokeModals.css';

defineProps({
  showOne:         { type: Boolean,  default: false },
  showAll:         { type: Boolean,  default: false },
  pendingSession:  { type: Object,   default: null },
  revokingId:      { type: String,   default: null },
  loadingRevoke:   { type: Boolean,  default: false },
  otherCount:      { type: Number,   default: 0 },
  getDisplayDevice:{ type: Function, default: () => 'Dispositivo desconocido' },
});

defineEmits(['update:showOne', 'update:showAll', 'confirm-one', 'confirm-all']);
</script>
