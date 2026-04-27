/**
 * rsbo-app/src/composables/tabsmanager/useDeleteAction.js
 */
import { ref } from "vue";
import { labToast } from "@/composables/shared/useLabToast.js";

export function useDeleteAction({ selectedSheet, deleteSheet, sheets, emit, actorRef, closeActions }) {
  const deleting = ref(false);

  const confirmDelete = async () => {
    if (!selectedSheet.value || deleting.value) return;
    deleting.value = true;
    try {
      const id = selectedSheet.value.id;
      await deleteSheet(id, { actor: actorRef.value || undefined });
      
      const idx = sheets.value.findIndex((s) => s.id === id);
      if (idx >= 0) sheets.value.splice(idx, 1);
      
      labToast.success(`Planilla eliminada.`);
      emit("deleted", id);
      closeActions();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "No se pudo eliminar la planilla";
      labToast.error(msg);
    } finally {
      deleting.value = false;
    }
  };

  return {
    deleting, confirmDelete
  };
}
