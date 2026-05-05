// src/services/session.js
import api from "@/api/axios";

export function fetchSessionInfo() {
  return api.get("/access/session-info");
}

export function forceRenew() {
  return api.get("/access/check-session");
}
