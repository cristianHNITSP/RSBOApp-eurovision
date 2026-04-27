/**
 * rsbo-app/src/composables/tabsmanager/useMetaNotes.js
 * Gestión de notas y observaciones de la planilla.
 */
import { ref, computed } from "vue";

export function useMetaNotes({ selectedSheet, updateSheet, _updateLocalSheet, actorRef }) {
  const metaForm = ref({ observaciones: "", notas: "" });
  const savingMeta = ref(false);
  const metaStatus = ref("idle");
  const metaStatusMessage = ref("");
  const metaGlow = ref(false);

  const initMeta = () => {
    metaForm.value.observaciones = selectedSheet.value?.meta?.observaciones || "";
    metaForm.value.notas = selectedSheet.value?.meta?.notas || "";
    metaStatus.value = "idle";
    metaStatusMessage.value = "";
  };

  const canSaveMeta = computed(() => {
    const s = selectedSheet.value;
    if (!s) return false;
    const oldObs = s.meta?.observaciones || "";
    const oldNotes = s.meta?.notas || "";
    return metaForm.value.observaciones !== oldObs || metaForm.value.notas !== oldNotes;
  });

  const confirmSaveMeta = async () => {
    if (!canSaveMeta.value || savingMeta.value) return;

    savingMeta.value = true;
    metaStatus.value = "saving";
    metaStatusMessage.value = "Guardando notas...";

    try {
      const payload = {
        meta: {
          observaciones: metaForm.value.observaciones,
          notas: metaForm.value.notas
        }
      };
      
      if (actorRef.value) payload.actor = actorRef.value;

      await updateSheet(selectedSheet.value.id, payload);
      
      _updateLocalSheet(selectedSheet.value.id, payload);
      
      metaStatus.value = "saved";
      metaStatusMessage.value = "Notas actualizadas";
      metaGlow.value = true;
      setTimeout(() => (metaGlow.value = false), 2000);
    } catch (e) {
      console.error("Error saving meta:", e);
      metaStatus.value = "error";
      metaStatusMessage.value = "Error al guardar";
    } finally {
      savingMeta.value = false;
    }
  };

  return {
    metaForm, savingMeta, metaStatus, metaStatusMessage, metaGlow,
    initMeta, canSaveMeta, confirmSaveMeta
  };
}
