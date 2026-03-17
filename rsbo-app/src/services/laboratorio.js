// src/services/laboratorio.js
import api from "@/api/axios";

const BASE = "/laboratory";

// ORDERS
export function listOrders(params = {}) {
  return api.get(`${BASE}/orders`, { params });
}

export function getOrder(orderId) {
  return api.get(`${BASE}/orders/${orderId}`);
}

export function createOrder(payload) {
  return api.post(`${BASE}/orders`, payload);
}

export function scanOrder(orderId, payload) {
  return api.post(`${BASE}/orders/${orderId}/scan`, payload);
}

export function closeOrder(orderId, actor) {
  return api.post(`${BASE}/orders/${orderId}/close`, { actor });
}

export function resetOrder(orderId, actor) {
  return api.post(`${BASE}/orders/${orderId}/reset`, { actor });
}

// EVENTS
export function listEvents(params = {}) {
  return api.get(`${BASE}/events`, { params });
}

// CORRECTIONS
export function requestCorrection(payload) {
  return api.post(`${BASE}/corrections`, payload);
}

export function cancelOrder(orderId, actor) {
  return api.post(`${BASE}/orders/${orderId}/cancel`, { actor });
}

export function updateOrder(orderId, payload) {
  return api.patch(`${BASE}/orders/${orderId}`, payload);
}