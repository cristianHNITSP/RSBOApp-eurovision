// src/composables/useDashboardStats.js
import { ref, computed } from "vue";
import { fetchDashboardStats } from "@/services/stats";

/**
 * Composable que carga las estadísticas del dashboard y las filtra por rol.
 *
 * Roles:
 *  - eurovision: todo el sistema
 *  - supervisor:  ventas + reportes (sin inventario)
 *  - ventas:      ventas (sin reportes ni inventario)
 *  - laboratorio: solo stats de laboratorio
 */
export function useDashboardStats(userRef) {
  const stats = ref(null);
  const loading = ref(false);
  const error = ref(null);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await fetchDashboardStats();
      if (data?.ok) {
        stats.value = data.data;
      }
    } catch (e) {
      error.value = e?.response?.data?.message || e.message;
    } finally {
      loading.value = false;
    }
  }

  const role = computed(() => {
    const r = userRef?.value?.role?.name || userRef?.value?.role || "";
    return typeof r === "string" ? r.toLowerCase() : "";
  });

  // Permisos por rol
  const canSeeInventory = computed(() =>
    ["eurovision", "root"].includes(role.value)
  );
  const canSeeOrders = computed(() =>
    ["eurovision", "root", "supervisor", "ventas", "laboratorio"].includes(role.value)
  );
  const canSeeReports = computed(() =>
    ["eurovision", "root", "supervisor"].includes(role.value)
  );
  const canSeeLab = computed(() =>
    ["eurovision", "root", "laboratorio"].includes(role.value)
  );
  const canSeeMovements = computed(() =>
    ["eurovision", "root"].includes(role.value)
  );

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
  };
}
