// src/composables/auth/useProfileForm.js
import { reactive } from 'vue'
import { userService } from '@/services/myUserCRUD'
import { useAuth } from '@/composables/auth/useAuth'
import { useFormState } from '@/composables/shared/useFormState'

/**
 * Encapsula toda la lógica del formulario de perfil de usuario.
 * @param {import('vue').ComputedRef<string>} userId - ID del usuario a editar
 */
export function useProfileForm(userId) {
  const {
    loading, success, message, errors, isEditing,
    startLoading, finishLoading, toggleEditing, clearFieldError
  } = useFormState({ name: '', email: '', phone: '', bio: '' });

  const form = reactive({ name: '', email: '', phone: '', avatar: '', bio: '' });
  const _original = reactive({});

  function init(user) {
    if (!user) return;
    const data = {
      name:   user.name  || '',
      email:  user.email || '',
      phone:  user.phone || '',
      bio:    user.bio   || '',
      avatar: user.avatar || '',
    };
    Object.assign(form, data);
    Object.assign(_original, data);
  }

  function startEdit() {
    toggleEditing(true);
  }

  function cancelEdit() {
    Object.assign(form, _original);
    toggleEditing(false);
  }

  function validate() {
    let ok = true;
    if (!form.name.trim()) { errors.name = 'El nombre completo es requerido'; ok = false; }
    if (!form.email.trim()) { errors.email = 'El correo electrónico es requerido'; ok = false; }
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) { errors.email = 'El formato del correo es inválido'; ok = false; }
    return ok;
  }

  async function save() {
    if (!validate()) return false;
    if (!userId.value) { 
      finishLoading(false, 'No se pudo identificar al usuario'); 
      return false; 
    }

    startLoading();
    const payload = { ...form };
    try {
      const result = await userService.updateProfile(userId.value, payload);

      if (result.success) {
        finishLoading(true, 'Perfil actualizado correctamente');
        isEditing.value = false;
        Object.assign(_original, payload);
        
        // Propagar cambios a toda la app
        const auth = useAuth();
        auth.patchUser(payload);
        auth.fetchUser();
      } else {
        finishLoading(false, result.message || 'Error al actualizar el perfil');
      }
      return result.success;
    } catch (e) {
      finishLoading(false, 'Error de conexión');
      return false;
    }
  }

  return { 
    form, errors, isEditing, loading, message, success, 
    init, startEdit, cancelEdit, clearFieldError, save 
  };
}
