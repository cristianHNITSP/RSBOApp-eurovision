// src/composables/useDashboardStats.js
import { ref, computed } from "vue";
import { fetchDashboardStats } from "@/services/stats";

// Estado compartido globalmente para evitar peticiones redundantes
const sharedStats = ref(null);
const sharedLoading = ref(false);
const sharedError = ref(null);
let lastFetchPromise = null;

/**
 * Composable que carga las estadísticas del dashboard y las filtra por rol.
 */
export function useDashboardStats(userRef) {
  async function load(force = false) {
    if (sharedLoading.value && !force) return lastFetchPromise;
    if (sharedStats.value && !force) return Promise.resolve(sharedStats.value);

    sharedLoading.value = true;
    sharedError.value = null;

    lastFetchPromise = (async () => {
      try {
        const { data } = await fetchDashboardStats();
        if (data?.ok) {
          sharedStats.value = data.data;
          return data.data;
        }
      } catch (e) {
        sharedError.value = e?.response?.data?.message || e.message;
        throw e;
      } finally {
        sharedLoading.value = false;
        lastFetchPromise = null;
      }
    })();

    return lastFetchPromise;
  }

  // ── Rol actual ──────────────────────────────────────────────────────────────
  const role = computed(() => {
    const r = userRef?.value?.role?.name || userRef?.value?.role || "";
    return typeof r === "string" ? r.toLowerCase() : "";
  });

  // ── Permisos por rol ────────────────────────────────────────────────────────
  const canSeeInventory = computed(() => ["eurovision", "root"].includes(role.value));
  const canSeeOrders = computed(() => ["eurovision", "root", "supervisor", "ventas", "laboratorio"].includes(role.value));
  const canSeeReports = computed(() => ["eurovision", "root", "supervisor"].includes(role.value));
  const canSeeLab = computed(() => ["eurovision", "root", "laboratorio"].includes(role.value));
  const canSeeMovements = computed(() => ["eurovision", "root"].includes(role.value));
  const canManageUsers = computed(() => ["root", "eurovision"].includes(role.value));
  const canSeeDevolutions = computed(() => ["root", "eurovision", "supervisor", "laboratorio", "ventas"].includes(role.value));
  const canManageDevolutions = computed(() => ["root", "eurovision", "supervisor"].includes(role.value));
  const canExportReports = computed(() => ["root", "eurovision", "supervisor"].includes(role.value));
  const isRoot = computed(() => role.value === "root");
  const isLab = computed(() => role.value === "laboratorio");
  const isVentas = computed(() => role.value === "ventas");
  const isSupervisor = computed(() => role.value === "supervisor");

  return {
    stats: sharedStats,
    loading: sharedLoading,
    error: sharedError,
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
