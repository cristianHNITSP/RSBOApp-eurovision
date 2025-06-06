<template>
  <div class="card has-text-centered" style="max-width: 400px; margin: auto; padding: 1.5rem;">
    <h2 class="title is-4">Estado del Servidor</h2>

    <div v-if="connectionStatus === 'connecting'">
      <p class="has-text-info">🔄 Conectando al servidor...</p>
      <LoadingBar />
    </div>

    <div v-else-if="connectionStatus === 'disconnected'">
      <p class="has-text-danger">❌ Conexión perdida con el servidor</p>
    </div>

    <div v-else-if="health">
      <p :class="health.status === 'ok' ? 'has-text-success' : 'has-text-danger'">
        {{ health.status === 'ok' ? '✅ Servidor Activo' : '❌ Servidor Caído' }}
      </p>

      <p>
        Base de datos:
        <span :class="health.services?.database === 'connected' ? 'has-text-success' : 'has-text-danger'">
          {{ health.services?.database || 'Desconocido' }}
        </span>
      </p>

      <p>Tiempo activo: {{ health.uptime }}</p>
      <p class="is-size-7 has-text-grey">
        Última actualización: {{ new Date(health.timestamp).toLocaleTimeString() }}
      </p>
    </div>

    <div v-else>
      <p>Cargando estado...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import LoadingBar from './LoadingBar.vue';
import { connectWebSocket } from '../services/healthService.js';

const health = ref(null);
const connectionStatus = ref('connecting');
let socket = null;

function handleOpen() {
  console.log('WebSocket abierto');
  connectionStatus.value = 'connecting';
}

function handleMessage(event) {
  try {
    const data = JSON.parse(event.data);
    if (data.type === 'health') {
      health.value = data;
      connectionStatus.value = 'connected';
    }
  } catch (error) {
    console.error('Error parsing WebSocket message:', error);
  }
}

function handleError(error) {
  console.error('WebSocket error:', error);
  connectionStatus.value = 'disconnected';
}

function handleClose() {
  console.log('WebSocket cerrado');
  connectionStatus.value = 'disconnected';
}

onMounted(() => {
  socket = connectWebSocket(handleMessage, handleOpen, handleError, handleClose);
});

onBeforeUnmount(() => {
  if (socket) socket.close();
});
</script>
