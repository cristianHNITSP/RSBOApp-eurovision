// rsbo-app/src/composables/lab/useLabExports.js
import { ref } from "vue";
import { exportToXlsx } from "@/composables/ag-grid/useExcelExport.js";
import { listEvents } from "@/services/laboratorio";
import { normalizeAck } from "@/utils/errorSanitizer";
import {
  getMicaTypeName,
  buildRowTitle,
  prettyTrat,
  sheetTitle,
  eyeLabel,
  mapEntryEvent,
  mapExitEvent
} from "./useLabMappers";
import { statusHuman } from "@/utils/statusHelpers";
import { fmtShort } from "@/utils/formatters";

export function useLabExports({ orders, items, events, sheets, notify }) {
  const loadingExportInv = ref(false);
  const loadingExportCat = ref(false);
  const loadingExportOrders = ref(false);

  const todaySlug = () => new Date().toISOString().slice(0, 10);

  async function exportInventoryCsv() {
    const sheet = sheets.selectedSheet.value;
    if (!sheet?.id) return;
    loadingExportInv.value = true;
    try {
      const rows = items.filteredItems.value;
      const columns = [
        { key: "_title", label: "Producto", transform: (r) => buildRowTitle(r, sheet), width: 32 },
        { key: "existencias", label: "Existencias", width: 14, align: "center" },
        { key: "codebar", label: "Codigo de Barras", width: 18 },
        { key: "sku", label: "Referencia", width: 14 }
      ];
      await exportToXlsx({
        filename: `reporte_inventario_${String(sheet.nombre).replace(/\s+/g, "_")}_${todaySlug()}`,
        sheetName: "Inventario",
        title: `Inventario — ${sheetTitle(sheet)}`,
        columns,
        rows,
        summaryCards: [{ label: "Productos", value: rows.length }]
      });
      notify(`Inventario exportado: ${rows.length} filas`, "is-success");
    } catch (e) {
      notify(normalizeAck(e, { errorFallback: "Error exportando inventario" })?.message, "is-danger");
    } finally {
      loadingExportInv.value = false;
    }
  }

  async function exportOrdersCsv() {
    loadingExportOrders.value = true;
    try {
      const rows = orders.ordersDB.value;
      const columns = [
        { key: "folio", label: "Folio", width: 16 },
        { key: "cliente", label: "Cliente", width: 22 },
        { key: "status", label: "Estatus", transform: (o) => statusHuman(o.status), width: 14 },
        { key: "createdAt", label: "Fecha", transform: (o) => fmtShort(o.createdAt), width: 20 }
      ];
      await exportToXlsx({
        filename: `reporte_pedidos_${todaySlug()}`,
        sheetName: "Pedidos",
        columns,
        rows
      });
      notify("Pedidos exportados", "is-success");
    } catch (e) {
      notify("Error exportando pedidos", "is-danger");
    } finally {
      loadingExportOrders.value = false;
    }
  }

  async function exportEntriesCsv(period = "all") {
    // Implementación simplificada basada en lo que espera BandejaTab
    notify(`Exportando movimientos (${period})...`, "is-info");
    try {
      const rows = events.entryEvents.value;
      const columns = [
        { key: "at", label: "Fecha", width: 20 },
        { key: "folio", label: "Folio", width: 16 },
        { key: "cliente", label: "Cliente", width: 22 },
        { key: "micaSummary", label: "Resumen", width: 30 }
      ];
      await exportToXlsx({
        filename: `movimientos_entrada_${period}_${todaySlug()}`,
        sheetName: "Movimientos",
        columns,
        rows
      });
      notify("Movimientos exportados", "is-success");
    } catch {
      notify("Error exportando movimientos", "is-danger");
    }
  }

  async function exportOrderCsv(order) {
    if (!order) return;
    notify(`Exportando pedido ${order.folio}...`, "is-info");
    try {
      const columns = [
        { key: "codebar", label: "Código", width: 18 },
        { key: "micaType", label: "Tipo", width: 20 },
        { key: "qty", label: "Cant.", width: 10 },
        { key: "picked", label: "Surtido", width: 10 }
      ];
      await exportToXlsx({
        filename: `pedido_${order.folio}_${todaySlug()}`,
        sheetName: "Líneas de Pedido",
        columns,
        rows: order.lines || []
      });
    } catch {
      notify("Error exportando pedido", "is-danger");
    }
  }

  function printOrder(order) {
    if (!order) return;
    notify(`Imprimiendo pedido ${order.folio}... (Simulado)`, "is-info");
  }

  return {
    loadingExportInv,
    loadingExportCat,
    loadingExportOrders,
    exportInventoryCsv,
    exportOrdersCsv,
    exportEntriesCsv,
    exportOrderCsv,
    printOrder
  };
}
