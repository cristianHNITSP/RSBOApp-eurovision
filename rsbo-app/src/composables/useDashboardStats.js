// src/composables/useDashboardStats.js
import { ref, computed } from "vue";
import { fetchDashboardStats } from "@/services/stats";

/**
 * Composable que carga las estadísticas del dashboard y las filtra por rol.
 *
 * Roles (del seed):
 *  - root:        acceso total irrestricto
 *  - eurovision:  encargado general — inventario, ventas, reportes, devoluciones
 *  - supervisor:  operaciones — ventas, reportes, devoluciones
 *  - ventas:      pedidos, clientes, crear devolución
 *  - laboratorio: pedidos (view/progress/close), ver devoluciones
 */
export function useDashboardStats(userRef) {
  const stats   = ref(null);
  const loading = ref(false);
  const error   = ref(null);

  async function load() {
    loading.value = true;
    error.value   = null;
    try {
      const { data } = await fetchDashboardStats();
      if (data?.ok) stats.value = data.data;
    } catch (e) {
      error.value = e?.response?.data?.message || e.message;
    } finally {
      loading.value = false;
    }
  }

  // ── Rol actual ──────────────────────────────────────────────────────────────
  const role = computed(() => {
    const r = userRef?.value?.role?.name || userRef?.value?.role || "";
    return typeof r === "string" ? r.toLowerCase() : "";
  });

  // ── Permisos por rol ────────────────────────────────────────────────────────
  const canSeeInventory  = computed(() => ["eurovision", "root"].includes(role.value));
  const canSeeOrders     = computed(() => ["eurovision", "root", "supervisor", "ventas", "laboratorio"].includes(role.value));
  const canSeeReports    = computed(() => ["eurovision", "root", "supervisor"].includes(role.value));
  const canSeeLab        = computed(() => ["eurovision", "root", "laboratorio"].includes(role.value));
  const canSeeMovements  = computed(() => ["eurovision", "root"].includes(role.value));
  const canManageUsers   = computed(() => ["root", "eurovision"].includes(role.value));
  const canSeeDevolutions= computed(() => ["root", "eurovision", "supervisor", "laboratorio", "ventas"].includes(role.value));
  const canManageDevolutions = computed(() => ["root", "eurovision", "supervisor"].includes(role.value));
  const canExportReports = computed(() => ["root", "eurovision", "supervisor"].includes(role.value));
  const isRoot           = computed(() => role.value === "root");
  const isLab            = computed(() => role.value === "laboratorio");
  const isVentas         = computed(() => role.value === "ventas");
  const isSupervisor     = computed(() => role.value === "supervisor");

  return {
    stats,
    loading,
    error,
    load,
    role,
    canSeeInventory,
    canSeeOrders,
    canSeeReports,
    canSeeLab,
    canSeeMovements,
    canManageUsers,
    canSeeDevolutions,
    canManageDevolutions,
    canExportReports,
    isRoot,
    isLab,
    isVentas,
    isSupervisor,
  };
}
