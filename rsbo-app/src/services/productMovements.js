import { api } from "@/api/axios";

export function fetchProductMovements(params) {
  return api.get("/stats/product-movements", { params });
}
