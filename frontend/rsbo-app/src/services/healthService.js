import { API_URLS } from '../config/apiConfig.js';

export function connectWebSocket(onMessage, onOpen, onError, onClose) {
  const socket = new WebSocket(API_URLS.websocket);

  socket.onopen = () => {
    if (onOpen) onOpen();
  };

  socket.onmessage = (event) => {
    if (onMessage) onMessage(event);
  };

  socket.onerror = (error) => {
    if (onError) onError(error);
  };

  socket.onclose = () => {
    if (onClose) onClose();
  };

  return socket;
}

export async function fetchHealthData() {
  const response = await fetch(API_URLS.healthApi);
  if (!response.ok) {
    throw new Error('Error fetching health data');
  }
  return response.json();
}
