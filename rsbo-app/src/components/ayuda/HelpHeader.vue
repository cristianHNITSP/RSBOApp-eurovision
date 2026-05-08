<template>
  <div class="view-hero">
    <header class="help-header">
      <div class="help-title-block">
        <span class="help-pill">
          <b-icon icon="life-ring" size="is-small" class="mr-1" />
          Centro de ayuda
        </span>
        <h2>Guía completa del sistema RSBO</h2>
        <p>
          Todo lo que necesitas saber para usar el sistema: inventario, ventas, laboratorio,
          avisos y configuración de tu cuenta.
        </p>

        <div class="help-quick">
          <HelpQuickTip icon="save" title="Siempre guarda">
            Si editas el inventario, siempre termina con <strong>Guardar cambios</strong>.
          </HelpQuickTip>
          <HelpQuickTip icon="bell" title="Avisos">
            El ícono de campana en la barra lateral te avisa de pedidos y eventos nuevos.
          </HelpQuickTip>
          <HelpQuickTip icon="sync-alt" title="¿Algo raro?">
            Presiona <strong>Actualizar</strong> o <strong>Recargar</strong> para traer la información más reciente.
          </HelpQuickTip>
        </div>
      </div>

      <div class="help-meta">
        <p class="help-meta-line">
          <b-icon icon="user" size="is-small" class="mr-1" />
          <strong>{{ displayRole }}</strong>
        </p>
        <p v-if="appVersion" class="help-meta-line">
          <b-icon icon="code-branch" size="is-small" class="mr-1" />
          Versión: <strong>{{ appVersion }}</strong>
        </p>
      </div>
    </header>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import './HelpHeader.css';
import HelpQuickTip from './HelpQuickTip.vue';

const props = defineProps({
  user: { type: Object, default: () => null },
  appVersion: { type: String, default: '' },
});

const displayRole = computed(() => {
  if (!props.user) return 'Usuario';
  return props.user.role?.name || props.user.name || 'Usuario';
});
</script>
