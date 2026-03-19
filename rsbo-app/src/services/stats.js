// src/services/stats.js
import { api } from "@/api/axios";

export function fetchDashboardStats() {
  return api.get("/stats/dashboard");
}
