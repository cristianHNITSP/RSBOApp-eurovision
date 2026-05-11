// src/services/stats.js
import { api } from "@/api/axios";

export function fetchInventoryStats() {
  return api.get("/stats/dashboard");
}

export function fetchOpticaStats() {
  return api.get("/optica/stats/summary");
}
