/**
 * rsbo-app/src/composables/tabsmanager/useRenameAction.js
 */
import { ref, computed } from "vue";
import { normalizeSheet } from "./useSheetNormalizer";

export function useRenameAction({ selectedSheet, updateSheet, _updateLocalSheet, actorRef, emit }) {
  const renameName = ref("");
  const renaming = ref(false);
  const renameStatus = ref("idle");
  const renameStatusMessage = ref("");
  const renameGlow = ref(false);

  const initRename = () => {
    renameName.value = selectedSheet.value?.name || "";
    renameStatus.value = "idle";
    renameStatusMessage.value = "";
    renameGlow.value = false;
  };

  const canRename = computed(() => {
    if (!selectedSheet.value || renaming.value) return false;
    const current = String(selectedSheet.value?.name || "").trim();
    const next = String(renameName.value || "").trim();
    return next.length > 0 && next !== current;
  });

  const confirmRename = async () => {
    if (!canRename.value) return;
    renaming.value = true;
    renameStatus.value = "saving";
    renameStatusMessage.value = "Guardando…";
    renameGlow.value = false;

    try {
      const id = selectedSheet.value.id;
      const payload = { nombre: String(renameName.value || "").trim(), actor: actorRef.value || undefined };
      const { data } = await updateSheet(id, payload);
      
      const updated = data?.data?.sheet;
      if (!updated) throw new Error("Falta data.sheet en respuesta");
      
      const norm = normalizeSheet(updated);
      _updateLocalSheet(id, norm);
      if (emit) emit('renamed', { id, name: norm.name });
      
      renameStatus.value = "saved";
      renameStatusMessage.value = "Nombre guardado";
      renameGlow.value = true;
      setTimeout(() => { renameGlow.value = false; renameStatus.value = "idle"; }, 1500);
    } catch (e) {
      renameStatus.value = "error";
      renameStatusMessage.value = e?.response?.data?.message || e?.message || "Error al renombrar";
    } finally {
      renaming.value = false;
    }
  };

  return {
    renameName, renaming, renameStatus, renameStatusMessage, renameGlow,
    initRename, canRename, confirmRename
  };
}
