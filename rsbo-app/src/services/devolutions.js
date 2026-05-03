// src/services/devolutions.js
import { api } from "@/api/axios";

export const fetchDevolutions    = (params = {}) => api.get("/devolutions", { params });
export const fetchDevolution     = (id)           => api.get(`/devolutions/${id}`);
export const fetchDevolutionStats= ()             => api.get("/devolutions/stats");
export const createDevolution    = (data)         => api.post("/devolutions", data);
export const updateDevolutionStatus = (id, status, notes) =>
  api.patch(`/devolutions/${id}/status`, { status, notes });
export const updateDevolution    = (id, payload)  => api.put(`/devolutions/${id}`, payload);
export const deleteDevolution    = (id)           => api.delete(`/devolutions/${id}`);
