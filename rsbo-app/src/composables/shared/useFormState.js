// src/composables/shared/useFormState.js
import { ref, reactive } from "vue";

/**
 * useFormState.js
 * Abstracción para el estado común de formularios (loading, errores, mensajes de feedback).
 * Ayuda a atomizar la lógica y reducir la deuda técnica en composables de formularios.
 */
export function useFormState(initialErrors = {}) {
  const loading = ref(false);
  const success = ref(true);
  const message = ref("");
  const isEditing = ref(false);

  // Estado reactivo para errores de validación
  const errors = reactive({ ...initialErrors });

  /** Limpia todos los errores del estado */
  function clearErrors() {
    Object.keys(errors).forEach((k) => (errors[k] = ""));
  }

  /** Limpia un error específico y el mensaje general si era de error */
  function clearFieldError(field) {
    if (errors[field]) errors[field] = "";
    if (message.value && !success.value) message.value = "";
  }

  /** Inicia el estado de carga y limpia mensajes previos */
  function startLoading() {
    loading.value = true;
    message.value = "";
    success.value = true;
  }

  /** Finaliza la carga con un resultado */
  function finishLoading(isOk, msg = "") {
    loading.value = false;
    success.value = isOk;
    message.value = msg;
    if (isOk) {
      clearErrors();
    }
  }

  /** Alterna el modo edición */
  function toggleEditing(val) {
    isEditing.value = val !== undefined ? val : !isEditing.value;
    if (!isEditing.value) {
      message.value = "";
      clearErrors();
    }
  }

  return {
    loading,
    success,
    message,
    errors,
    isEditing,
    clearErrors,
    clearFieldError,
    startLoading,
    finishLoading,
    toggleEditing,
  };
}
