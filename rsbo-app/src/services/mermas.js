// src/services/mermas.js
import { api } from "@/api/axios";

export const listMermas    = (params = {}) => api.get("/mermas", { params });
export const getMerma      = (id)          => api.get(`/mermas/${id}`);
export const getMermaStats = (params = {}) => api.get("/mermas/stats", { params });
export const createMerma   = (payload)     => api.post("/mermas", payload);
