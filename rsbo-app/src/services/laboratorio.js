// src/services/laboratorio.js
import api from "@/api/axios";

const BASE = "/laboratory";

// ORDERS
export function listOrders(params = {}) {
  return api.get(`${BASE}/orders`, { params });
}

export function getOrderCounts() {
  return api.get(`${BASE}/orders/counts`);
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
  const { signal, ...rest } = params;
  return api.get(`${BASE}/events`, { params: rest, signal });
}

// CORRECTIONS
export function requestCorrection(payload) {
  return api.post(`${BASE}/corrections`, payload);
}

export function cancelOrder(orderId, actor, motivo) {
  return api.post(`${BASE}/orders/${orderId}/cancel`, { actor, motivo: motivo || null });
}

export function updateOrder(orderId, payload) {
  return api.patch(`${BASE}/orders/${orderId}`, payload);
}

export function getOrderHistory(orderId) {
  return api.get(`${BASE}/events`, {
    params: { orderId, type: "ORDER_EDIT,ORDER_CANCEL,CORRECTION_REQUEST", limit: 50 }
  });
}