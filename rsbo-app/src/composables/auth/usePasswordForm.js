// src/composables/auth/usePasswordForm.js
import { reactive } from 'vue'
import { userService } from '@/services/myUserCRUD'
import { useFormState } from '@/composables/shared/useFormState'

/**
 * Encapsula toda la lógica del formulario de cambio de contraseña.
 * @param {import('vue').ComputedRef<string>} userId - ID del usuario
 */
export function usePasswordForm(userId) {
  const {
    loading, success, message, errors, isEditing,
    startLoading, finishLoading, toggleEditing, clearFieldError
  } = useFormState({ password: '', confirmPassword: '' });

  const form = reactive({ password: '', confirmPassword: '' });

  function toggle() {
    if (isEditing.value) {
      form.password = '';
      form.confirmPassword = '';
      toggleEditing(false);
    } else {
      toggleEditing(true);
    }
  }

  function validate() {
    let ok = true;
    if (!form.password) { errors.password = 'La nueva contraseña es requerida'; ok = false; }
    else if (form.password.length < 6) { errors.password = 'La contraseña debe tener al menos 6 caracteres'; ok = false; }
    
    if (!form.confirmPassword) { errors.confirmPassword = 'Debe confirmar la contraseña'; ok = false; }
    else if (form.password !== form.confirmPassword) { errors.confirmPassword = 'Las contraseñas no coinciden'; ok = false; }
    
    return ok;
  }

  async function save() {
    if (!validate()) return false;
    if (!userId.value) { 
      finishLoading(false, 'No se pudo identificar al usuario'); 
      return false; 
    }

    startLoading();
    try {
      const result = await userService.updatePassword(userId.value, form.password);

      if (result.success) {
        finishLoading(true, 'Contraseña actualizada correctamente');
        form.password = '';
        form.confirmPassword = '';
        isEditing.value = false;
      } else {
        finishLoading(false, result.message || 'Error al actualizar la contraseña');
      }
      return result.success;
    } catch (e) {
      finishLoading(false, 'Error de conexión');
      return false;
    }
  }

  return { form, errors, isEditing, loading, message, success, toggle, clearFieldError, save };
}
