/**
 * Composable para gestión de Back Orders
 * Maneja listado, filtros, creación, y transiciones de estado
 */

import { ref, computed } from "vue";
import { logErr } from "../../api/logErr";
import {
  basesmicasService,
  lentesService,
  opticaService,
  backordersService,
} from "../../services/backorders";

/**
 * Mapa de categorías a services
 */
const SERVICE_MAP = {
  BASES_MICAS: basesmicasService,
  LENTES_CONTACTO: lentesService,
  OPTICA: opticaService,
};

export function useBackOrders() {
  // ─── Estado ───────────────────────────────────────────────────────
  const backorders = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const filters = ref({
    category: "BASES_MICAS", // BASES_MICAS, LENTES_CONTACTO, OPTICA
    status: null,
    search: "",
    skip: 0,
    limit: 50,
  });

  const stats = ref({
    basesMicas: { totals: { count: 0 } },
    lentes: { totals: { count: 0 } },
    optica: { totals: { count: 0 } },
    global: { count: 0 }
  });

  const pagination = ref({
    total: 0,
    page: 1,
    limit: 50,
    pages: 1,
    skip: 0,
  });

  // ─── Computed ─────────────────────────────────────────────────────
  const isLoading = computed(() => loading.value);
  const hasError = computed(() => !!error.value);
  const errorMessage = computed(() => error.value?.message || "Error desconocido");

  // ─── Métodos ──────────────────────────────────────────────────────

  /**
   * Obtener service según categoría
   */
  function getService(category) {
    return SERVICE_MAP[category] || basesmicasService;
  }

  /**
   * Listar back orders por categoría
   */
  async function listByCategory() {
    loading.value = true;
    error.value = null;
    try {
      const service = getService(filters.value.category);
      const response = await service.list({
        status: filters.value.status,
        search: filters.value.search,
        skip: filters.value.skip,
        limit: filters.value.limit,
      });
      const payload = response.data || { docs: [], meta: { total: 0, page: 1, limit: 50, pages: 1 } };
      backorders.value = payload.docs || [];
      pagination.value = payload.meta || { total: 0, page: 1, limit: 50, pages: 1, skip: filters.value.skip };
    } catch (err) {
      error.value = err;
      logErr(err, "useBackOrders.listByCategory");
    } finally {
      loading.value = false;
    }
  }

  /**
   * Listar todos los back orders (cross-catálogo)
   */
  async function listAll() {
    loading.value = true;
    error.value = null;
    try {
      const response = await backordersService.listAll({
        status: filters.value.status,
        search: filters.value.search,
        skip: filters.value.skip,
        limit: filters.value.limit,
      });
      const payload = response.data || { docs: [], meta: { total: 0, page: 1, limit: 50, pages: 1 } };
      backorders.value = payload.docs || [];
      pagination.value = payload.meta || { total: 0, page: 1, limit: 50, pages: 1, skip: filters.value.skip };
    } catch (err) {
      error.value = err;
      logErr(err, "useBackOrders.listAll");
    } finally {
      loading.value = false;
    }
  }

  /**
   * Obtener estadísticas
   */
  async function loadStats() {
    try {
      const response = await backordersService.getStats();
      stats.value = response.data || stats.value;
    } catch (err) {
      logErr(err, "useBackOrders.loadStats");
    }
  }

  /**
   * Obtener un BO específico
   */
  async function getById(id, category) {
    loading.value = true;
    error.value = null;
    try {
      const service = getService(category);
      const response = await service.get(id);
      return response.data;
    } catch (err) {
      error.value = err;
      logErr(err, "useBackOrders.getById");
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Crear un nuevo back order
   */
  async function create(data, category) {
    loading.value = true;
    error.value = null;
    try {
      const service = getService(category);
      const response = await service.create(data);
      backorders.value.unshift(response.data);
      return response.data;
    } catch (err) {
      error.value = err;
      logErr(err, "useBackOrders.create");
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Actualizar un back order (solo en SOLICITADO)
   */
  async function update(id, data, category) {
    loading.value = true;
    error.value = null;
    try {
      const service = getService(category);
      const response = await service.update(id, data);
      // Actualizar en el array local
      const idx = backorders.value.findIndex((bo) => bo._id === id);
      if (idx !== -1) {
        backorders.value[idx] = response.data;
      }
      return response.data;
    } catch (err) {
      error.value = err;
      logErr(err, "useBackOrders.update");
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Cambiar estado de un back order
   */
  async function changeStatus(id, newStatus, category, opts = {}) {
    loading.value = true;
    error.value = null;
    try {
      const service = getService(category);
      const response = await service.changeStatus(id, newStatus, opts);
      // Actualizar en el array local
      const idx = backorders.value.findIndex((bo) => bo._id === id);
      if (idx !== -1) {
        backorders.value[idx] = response.data;
      }
      return response.data;
    } catch (err) {
      error.value = err;
      logErr(err, "useBackOrders.changeStatus");
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Agregar un pago a un back order
   */
  async function addPayment(id, payment, category) {
    loading.value = true;
    error.value = null;
    try {
      const service = getService(category);
      const response = await service.addPayment(id, payment);
      // Actualizar en el array local
      const idx = backorders.value.findIndex((bo) => bo._id === id);
      if (idx !== -1) {
        backorders.value[idx] = response.data;
      }
      return response.data;
    } catch (err) {
      error.value = err;
      logErr(err, "useBackOrders.addPayment");
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Cambiar categoría de filtro
   */
  function setCategory(category) {
    filters.value.category = category;
    filters.value.skip = 0;
  }

  /**
   * Cambiar status de filtro
   */
  function setStatus(status) {
    filters.value.status = status;
    filters.value.skip = 0;
  }

  /**
   * Cambiar search
   */
  function setSearch(search) {
    filters.value.search = search;
    filters.value.skip = 0;
  }

  /**
   * Ir a página anterior
   */
  function previousPage() {
    filters.value.skip = Math.max(0, filters.value.skip - filters.value.limit);
  }

  /**
   * Ir a página siguiente
   */
  function nextPage() {
    filters.value.skip += filters.value.limit;
  }

  return {
    // State
    backorders,
    loading,
    error,
    filters,
    stats,
    pagination,

    // Computed
    isLoading,
    hasError,
    errorMessage,

    // Methods
    listByCategory,
    listAll,
    loadStats,
    getById,
    create,
    update,
    changeStatus,
    addPayment,
    setCategory,
    setStatus,
    setSearch,
    previousPage,
    nextPage,
  };
}
