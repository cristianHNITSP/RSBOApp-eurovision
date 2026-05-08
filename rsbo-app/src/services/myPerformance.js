import { api } from "@/api/axios";

export function fetchMyPerformance() {
  return api.get("/stats/my-performance");
}
