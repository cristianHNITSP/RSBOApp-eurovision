/**
 * useAgGridHandlers.js
 * Handlers estandarizados para los eventos de navtools (Save, Discard, Refresh, Export, Seed).
 */

import { useSheetApi } from "@/composables/api/useSheetApi";
import { ackOk, ackErr, msgFromErr, statusFromErr, normalizeAxiosOk } from "@/composables/ag-grid/useAgGridBase";
import { exportAgGridToXlsx } from "@/composables/ag-grid/useExcelExport";
import { labToast } from "@/composables/shared/useLabToast.js";

export function useAgGridHandlers({
  props,
  integration,
  loadAll,
  switchViewReload,
  effectiveActor,
  sheetName,
}) {
  const { saveChunk, reseedSheet, loadSheetMeta } = useSheetApi(() => props.apiType);
  const { dirty, saving, pendingChanges, lastSavedAt, gridHistory, unsavedGuard, gridApi, suppressNextWsRefresh, postMessage } = integration;

  async function handleSave(ack) {
    if (!dirty.value || pendingChanges.value.size === 0) {
      ackOk(ack, "No hay cambios por guardar.", 200);
      return;
    }
    saving.value = true;
    try {
      const rows = Array.from(pendingChanges.value.values());
      const res = await saveChunk(props.sheetId, rows, effectiveActor.value);
      const ok = normalizeAxiosOk(res);
      if (!ok.ok) return ackErr(ack, ok.message || "No se pudo guardar", ok.status);

      dirty.value = false;
      pendingChanges.value.clear();
      lastSavedAt.value = new Date();
      gridHistory.clear();
      unsavedGuard.clearStorage();
      ackOk(ack, ok.message || "Cambios guardados.", ok.status);
      suppressNextWsRefresh();
      postMessage({ type: "ROWS_CHANGED" });
    } catch (e) {
      console.error("[AgGridHandlers] Error saveChunk:", e?.response?.data || e);
      ackErr(ack, msgFromErr(e, "Error al guardar cambios"), statusFromErr(e));
    } finally {
      saving.value = false;
    }
  }

  async function handleDiscard() {
    pendingChanges.value.clear();
    dirty.value = false;
    gridHistory.clear();
    unsavedGuard.clearStorage();
    
    // Si la rejilla está lista, purgamos su caché interna de forma agresiva
    if (gridApi.value) {
      gridApi.value.purgeInfiniteCache();
    }
    
    await switchViewReload({ clearCache: true });
  }

  async function handleRefresh() {
    await loadAll();
    pendingChanges.value.clear();
  }

  async function handleSeed(ack) {
    try {
      saving.value = true;
      const res = await reseedSheet(props.sheetId, effectiveActor.value);
      const ok = normalizeAxiosOk(res);
      if (!ok.ok) return ackErr(ack, ok.message || "No se pudo hacer seed", ok.status);
      await loadAll();
      lastSavedAt.value = new Date();
      pendingChanges.value.clear();
      ackOk(ack, ok.message || "Seed generado.", ok.status);
    } catch (e) {
      console.error("[AgGridHandlers] Error reseed:", e?.response?.data || e);
      ackErr(ack, msgFromErr(e, "Error al generar seed"), statusFromErr(e));
    } finally {
      saving.value = false;
    }
  }

  async function handleExport(prefix = "reporte") {
    if (!gridApi.value) return;
    labToast.info("Generando archivo Excel...", 2000);
    try {
      const nameSlug = (sheetName.value || "grid").replace(/\s+/g, "_");
      const fecha = new Date().toISOString().slice(0, 10);
      await exportAgGridToXlsx(gridApi.value, {
        filename: `${prefix}_${nameSlug}_${fecha}`,
        sheetName: String(sheetName.value || "Hoja").slice(0, 31),
        title: `Inventario — ${sheetName.value || "Hoja"}`,
      });
      labToast.success("Excel descargado correctamente.");
    } catch (e) {
      console.error("[AgGridHandlers] Export error:", e);
      labToast.danger("No se pudo generar el Excel.");
    }
  }

  return {
    handleSave,
    handleDiscard,
    handleRefresh,
    handleSeed,
    handleExport,
  };
}
