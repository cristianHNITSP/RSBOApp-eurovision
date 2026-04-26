import { reactive } from "vue";

/**
 * useOpticaConfirm.js
 * Gestiona el estado del modal de confirmación personalizado.
 */
export function useOpticaConfirm() {
  const confirm = reactive({
    active: false,
    title: "",
    message: "",
    type: "is-danger",
    btnLabel: "Confirmar",
    resolve: null,
  });

  /**
   * Abre el modal de confirmación y devuelve una promesa.
   */
  function openConfirm({ title, message, type = "is-danger", btnLabel = "Confirmar" }) {
    return new Promise((resolve) => {
      Object.assign(confirm, {
        title,
        message,
        type,
        btnLabel,
        resolve,
        active: true,
      });
    });
  }

  function onConfirmOk() {
    confirm.active = false;
    confirm.resolve?.(true);
  }

  function onConfirmCancel() {
    confirm.active = false;
    confirm.resolve?.(false);
  }

  return {
    confirm,
    openConfirm,
    onConfirmOk,
    onConfirmCancel,
  };
}
