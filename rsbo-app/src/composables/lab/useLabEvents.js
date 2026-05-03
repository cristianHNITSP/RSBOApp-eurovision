// rsbo-app/src/composables/lab/useLabEvents.js
import { ref, computed } from "vue";
import { listEvents } from "@/services/laboratorio";
import { mapEntryEvent, mapExitEvent } from "./useLabMappers";

export function useLabEvents() {
  const entryEvents = ref([]);
  const exitEvents = ref([]);
  const orderEntries = ref([]);
  const orderExits = ref([]);
  const correctionEvents = ref([]);
  const loadingEvents = ref(false);
  const loadingOrderEvents = ref(false);
  const orderHistory = ref([]);
  const loadingOrderHistory = computed(() => loadingOrderEvents.value);

  const _inFlight = { events: null };

  const mapCorrectionEvent = (e) => ({
    id: String(e._id || e.id),
    folio: e?.details?.folio || "—",
    at: e?.createdAt ? new Date(e.createdAt).toLocaleString() : "—", // Simplified or use fmtShort
    rawCreatedAt: e?.createdAt || null,
    sheetId: e?.details?.sheetId || (e?.sheet ? String(e.sheet) : null),
    orderId: e?.order ? String(e.order) : null,
    codebar: e?.details?.codebar || "",
    message: e?.details?.message || "",
    actorName: e?.actor?.name || "—"
  });

  let _eventsAbort = null;
  async function loadEvents() {
    if (_inFlight.events) return _inFlight.events;

    if (_eventsAbort) _eventsAbort.abort();
    _eventsAbort = new AbortController();

    loadingEvents.value = true;
    _inFlight.events = (async () => {
      try {
        const { data } = await listEvents({
          type: "ORDER_CREATE,EXIT_SCAN,CORRECTION_REQUEST",
          limit: 600,
          signal: _eventsAbort.signal,
          _t: Date.now() // Cache buster
        });

        const all = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        entryEvents.value = all.filter(r => r.type === "ORDER_CREATE").map(mapEntryEvent);
        exitEvents.value = all.filter(r => r.type === "EXIT_SCAN").map(mapExitEvent);
        correctionEvents.value = all.filter(r => r.type === "CORRECTION_REQUEST").map(mapCorrectionEvent);
      } catch (e) {
        if (e?.name !== "CanceledError" && e?.code !== "ERR_CANCELED") {
          console.error("[LAB] loadEvents", e?.response?.data || e);
          entryEvents.value = [];
          exitEvents.value = [];
          correctionEvents.value = [];
        }
      } finally {
        loadingEvents.value = false;
        _inFlight.events = null;
      }
    })();
    return _inFlight.events;
  }

  let _orderEventsAbort = null;
  async function loadOrderEvents(orderId) {
    if (!orderId) {
      orderEntries.value = [];
      orderExits.value = [];
      return;
    }

    if (_orderEventsAbort) _orderEventsAbort.abort();
    _orderEventsAbort = new AbortController();
    const signal = _orderEventsAbort.signal;

    loadingOrderEvents.value = true;
    try {
      const { data } = await listEvents({
          orderId,
          type: "ORDER_CREATE,EXIT_SCAN,ORDER_EDIT,ORDER_CANCEL,CORRECTION_REQUEST",
          limit: 500,
          signal,
          _t: Date.now() // Cache buster
        });
        const rows = Array.isArray(data?.data) ? data.data : [];
        
        // Mantener compatibilidad con mappers específicos si se usan en otros lados
        const ent = rows.filter(r => r.type === "ORDER_CREATE").map(mapEntryEvent);
        const sal = rows.filter(r => r.type === "EXIT_SCAN").map(mapExitEvent);
        orderEntries.value = ent;
        orderExits.value = sal;

        // Nuevo: Historial unificado para CorrectionDetail
        orderHistory.value = rows;
    } catch (e) {
      if (e?.name !== "CanceledError" && e?.code !== "ERR_CANCELED") {
        console.error("[LAB] loadOrderEvents", e?.response?.data || e);
        orderEntries.value = [];
        orderExits.value = [];
      }
    } finally {
      loadingOrderEvents.value = false;
    }
  }

  const todayEntries = computed(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return entryEvents.value.filter((e) => {
      if (!e.rawCreatedAt) return false;
      return new Date(e.rawCreatedAt) >= start;
    });
  });

  return {
    entryEvents,
    exitEvents,
    orderEntries,
    orderExits,
    correctionEvents,
    loadingEvents,
    loadingOrderEvents,
    loadEvents,
    loadOrderEvents,
    loadOrderHistory: loadOrderEvents,
    orderHistory,
    loadingOrderHistory,
    todayEntries
  };
}
