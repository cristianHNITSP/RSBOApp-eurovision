import api from "@/api/axios";

export async function listTransactions(limit = 50) {
  try {
    const res = await api.get("/inventory/transactions", { params: { limit } });
    return res.data;
  } catch (err) {
    console.error("[TRANSACTIONS][API] listTransactions ERROR", err);
    throw err;
  }
}

/**
 * Busca transacciones (órdenes/ventas) por folio o nombre del cliente.
 * @param {string} query
 */
export async function searchTransactions(query) {
  try {
    const res = await api.get("/inventory/transactions/search", { params: { q: query } });
    return res.data;
  } catch (err) {
    console.error("[TRANSACTIONS][API] searchTransactions ERROR", err);
    throw err;
  }
}
