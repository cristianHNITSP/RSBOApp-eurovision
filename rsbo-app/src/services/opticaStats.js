// src/services/opticaStats.js
import api from "@/api/axios";

export const fetchOpticaStockSummary = () => {
  return api.get("/optica/stats/summary");
};
