import api from "@/api/axios";

export async function createOpticaSale(payload) {
  const res = await api.post("/optica/sales", payload);
  return res.data;
}

export async function searchOpticaSales(query) {
  const res = await api.get("/optica/sales/search", { params: { q: query } });
  return res.data;
}
