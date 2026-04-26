import { labToast } from "@/composables/shared/useLabToast.js";

/**
 * useOpticaActions.js
 * Gestiona las acciones de eliminación y restauración con confirmación integrada.
 */
export function useOpticaActions(openConfirm) {
  
  async function doSoftDelete(key, row, SVC, actor, loadCallback, onAfterAction) {
    const ok = await openConfirm({
      title: "Mover a papelera",
      message: `¿Mover "${row.sku || row.nombre}" a la papelera? Podrás restaurarlo después.`,
      type: "is-warning",
      btnLabel: "Mover a papelera",
    });
    
    if (!ok) return;
    
    const t = labToast.warning(`Moviendo "${row.sku || row.nombre}" a papelera…`, 0);
    try {
      await SVC[key].softDelete(row._id, actor);
      t.close();
      labToast.warning(`"${row.sku || row.nombre}" movido a papelera`);
      if (onAfterAction) onAfterAction(key);
      if (loadCallback) loadCallback(key);
    } catch (e) {
      t.close();
      labToast.danger(e?.response?.data?.error || "Error al mover a papelera");
    }
  }

  async function doHardDelete(key, row, SVC, actor, loadCallback, onAfterAction) {
    const ok = await openConfirm({
      title: "Eliminar permanentemente",
      message: `¿Eliminar "${row.sku || row.nombre}" de forma PERMANENTE? Esta acción no se puede deshacer.`,
      type: "is-danger",
      btnLabel: "Eliminar para siempre",
    });
    
    if (!ok) return;
    
    const t = labToast.danger(`Eliminando "${row.sku || row.nombre}"…`, 0);
    try {
      await SVC[key].hardDelete(row._id, actor);
      t.close();
      labToast.danger(`"${row.sku || row.nombre}" eliminado permanentemente`);
      if (onAfterAction) onAfterAction(key);
      if (loadCallback) loadCallback(key);
    } catch (e) {
      t.close();
      labToast.danger(e?.response?.data?.error || "Error al eliminar");
    }
  }

  async function doRestore(key, row, SVC, actor, loadCallback, onAfterAction) {
    const ok = await openConfirm({
      title: "Restaurar elemento",
      message: `¿Restaurar "${row.sku || row.nombre}" de la papelera?`,
      type: "is-success",
      btnLabel: "Restaurar",
    });
    
    if (!ok) return;
    
    const t = labToast.info(`Restaurando "${row.sku || row.nombre}"…`, 0);
    try {
      await SVC[key].restore(row._id, actor);
      t.close();
      labToast.success(`"${row.sku || row.nombre}" restaurado correctamente`);
      if (onAfterAction) onAfterAction(key);
      if (loadCallback) loadCallback(key);
    } catch (e) {
      t.close();
      labToast.danger(e?.response?.data?.error || "Error al restaurar");
    }
  }

  return {
    doSoftDelete,
    doHardDelete,
    doRestore,
  };
}
